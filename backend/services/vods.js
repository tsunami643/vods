// This module works both in Node.js (backend) and Cloudflare Workers
// Database connection handling for different environments

// Import pool directly - this works in Node.js backend
const pool = require('../db/connection');

// CORS headers configuration
const allowedOrigins = [
  'https://getvods.tsunami.workers.dev',
  'http://localhost:3000',
  'https://howdoiplay.com'
];

const corsHeaders = origin => ({
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Origin': origin
});

const checkOrigin = (originHeader) => {
  const foundOrigin = allowedOrigins.find(allowedOrigin => allowedOrigin.includes(originHeader));
  return foundOrigin ? foundOrigin : allowedOrigins[0];
};

/**
 * Get all VODs from PostgreSQL database
 * Returns data in the same format as the original MongoDB version
 */
async function getVods(dbConnectionOrConfig) {
  let client;
  
  try {
    // Use the imported connection pool
    client = await pool.connect();
    
    // Query to get VODs data with internal IDs
    const query = `
      SELECT 
        s.id as "streamId",
        s.game_name as "gameName",
        s.tags,
        p.id as "playlistId",
        s.stream_count as "streams",
        s.date_completed as "dateCompleted",
        v.id as "firstVideo",
        s.game_cover as "gameCover"
      FROM streams s
      LEFT JOIN playlists p ON s.playlist_id = p.id
      LEFT JOIN videos v ON s.first_video_id = v.id
      ORDER BY s.date_completed DESC NULLS LAST
    `;
    
    const result = await client.query(query);
    
    // Transform the data to match the original format
    const allPlaylists = result.rows.map(row => ({
      streamId: row.streamId,
      gameName: row.gameName,
      tags: Array.isArray(row.tags) ? row.tags : [],
      playlistId: row.playlistId,
      streams: row.streams || 1,
      dateCompleted: row.dateCompleted ? row.dateCompleted.toISOString() : null,
      firstVideo: row.firstVideo,
      gameCover: row.gameCover
    }));
    
    return allPlaylists;
    
  } catch (error) {
    console.error('Error getting VODs:', error);
    throw error;
  } finally {
    if (client) {
      // Release connection back to pool
      client.release();
    }
  }
}

/**
 * Create a new stream record
 */
async function createStream(streamData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert or get playlist
    const playlistResult = await client.query(
      'INSERT INTO playlists (youtube_id, name, tags) VALUES ($1, $2, $3) ON CONFLICT (youtube_id) DO UPDATE SET updated_at = NOW() RETURNING id',
      [streamData.playlistId, streamData.playlistName, JSON.stringify(streamData.playlistTags || [])]
    );
    
    const playlistId = playlistResult.rows[0].id;
    
    // Insert or get video
    const videoResult = await client.query(
      'INSERT INTO videos (yt_id, name, tags) VALUES ($1, $2, $3) ON CONFLICT (yt_id) DO UPDATE SET updated_at = NOW() RETURNING id',
      [streamData.firstVideo, streamData.videoName, JSON.stringify(streamData.videoTags || [])]
    );
    
    const videoId = videoResult.rows[0].id;
    
    // Insert stream
    const streamResult = await client.query(
      `INSERT INTO streams (game_name, tags, stream_count, playlist_id, first_video_id, date_completed, game_cover)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        streamData.gameName,
        JSON.stringify(streamData.tags || []),
        streamData.streams || 1,
        playlistId,
        videoId,
        streamData.dateCompleted ? new Date(streamData.dateCompleted) : null,
        streamData.gameCover || null
      ]
    );
    
    await client.query('COMMIT');
    return streamResult.rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update an existing stream record
 */
async function updateStream(streamId, streamData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update playlist if provided
    if (streamData.playlistId) {
      await client.query(
        'INSERT INTO playlists (youtube_id, name, tags) VALUES ($1, $2, $3) ON CONFLICT (youtube_id) DO UPDATE SET name = EXCLUDED.name, tags = EXCLUDED.tags, updated_at = NOW()',
        [streamData.playlistId, streamData.playlistName, JSON.stringify(streamData.playlistTags || [])]
      );
    }
    
    // Update video if provided
    if (streamData.firstVideo) {
      await client.query(
        'INSERT INTO videos (yt_id, name, tags) VALUES ($1, $2, $3) ON CONFLICT (yt_id) DO UPDATE SET name = EXCLUDED.name, tags = EXCLUDED.tags, updated_at = NOW()',
        [streamData.firstVideo, streamData.videoName, JSON.stringify(streamData.videoTags || [])]
      );
    }
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (streamData.gameName) {
      updateFields.push(`game_name = $${paramCount++}`);
      values.push(streamData.gameName);
    }
    
    if (streamData.tags) {
      updateFields.push(`tags = $${paramCount++}`);
      values.push(JSON.stringify(streamData.tags));
    }
    
    if (streamData.streams) {
      updateFields.push(`stream_count = $${paramCount++}`);
      values.push(streamData.streams);
    }
    
    if (streamData.dateCompleted) {
      updateFields.push(`date_completed = $${paramCount++}`);
      values.push(new Date(streamData.dateCompleted));
    }
    
    if (streamData.gameCover) {
      updateFields.push(`game_cover = $${paramCount++}`);
      values.push(streamData.gameCover);
    }
    
    updateFields.push(`updated_at = NOW()`);
    values.push(streamId);
    
    const updateQuery = `UPDATE streams SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id`;
    
    const result = await client.query(updateQuery, values);
    
    await client.query('COMMIT');
    return result.rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete a stream record
 */
async function deleteStream(streamId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query('DELETE FROM streams WHERE id = $1 RETURNING id', [streamId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// read-only helpers for user endpoints
async function getVideoById(videoId) {
  const client = await pool.connect();
  try {
    // find the stream/playlist that this video belongs to (as first video)
    const head = await client.query(
      `SELECT v.id,
              v.yt_id as "youtubeId",
              v.twitch_id as "twitchId",
              v.name,
              v.tags,
              v.created_at as "createdAt",
              s.playlist_id as "playlistId"
       FROM videos v
       LEFT JOIN streams s ON s.first_video_id = v.id
       WHERE v.id = $1
       LIMIT 1`,
      [videoId]
    );
    const row = head.rows[0];
    if (!row) return null;

    let order = 1;
    let total = 1;
    let prevId = null;
    let nextId = null;
    if (row.playlistId) {
      const listRes = await client.query(
        `SELECT v.id
         FROM streams s
         JOIN videos v ON v.id = s.first_video_id
         WHERE s.playlist_id = $1
         ORDER BY v.created_at`,
        [row.playlistId]
      );
      total = listRes.rows.length;
      const idx = listRes.rows.findIndex(r => r.id === videoId);
      order = idx + 1 || 1;
      if (idx > 0) prevId = listRes.rows[idx - 1].id;
      if (idx >= 0 && idx < listRes.rows.length - 1) nextId = listRes.rows[idx + 1].id;
    }

    return { ...row, order, total, prevId, nextId };
  } finally {
    client.release();
  }
}

async function getPlaylistById(playlistId) {
  const client = await pool.connect();
  try {
    const header = await client.query(
      `SELECT id, youtube_id as "youtubeId", name, tags FROM playlists WHERE id = $1`,
      [playlistId]
    );
    if (header.rowCount === 0) return null;

    const videos = await client.query(
      `SELECT
        v.id,
        v.yt_id as "youtubeId",
        v.twitch_id as "twitchId",
        v.name,
        v.tags,
        v.created_at as "createdAt",
        s.playlist_id as "playlistId"
       FROM videos v ON v.id = s.first_video_id
       WHERE s.playlist_id = $1
       ORDER BY v.created_at`,
      [playlistId]
    );

    return { ...header.rows[0], videos: videos.rows };
  } finally {
    client.release();
  }
}

/**
 * Find the first stream that uses a given playlist YouTube ID
 */
async function getStreamByPlaylistYoutubeId(playlistYoutubeId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT s.id
       FROM streams s
       JOIN playlists p ON s.playlist_id = p.id
       WHERE p.youtube_id = $1
       ORDER BY s.created_at
       LIMIT 1`,
      [playlistYoutubeId]
    );
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

module.exports = {
  getVods,
  getVideoById,
  getPlaylistById,
  getStreamByPlaylistYoutubeId,
  createStream,
  updateStream,
  deleteStream,
  corsHeaders,
  checkOrigin,
  allowedOrigins
};