#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const pool = require('../db/connection');

async function importData(jsonFilePath = 'test_data/vods.json') {
  try {
    console.log('🚀 Starting data import...');
    
    // Read and parse the JSON data
    const fullPath = path.resolve(jsonFilePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    
    console.log(`📖 Reading data from: ${fullPath}`);
    const jsonData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`📊 Found ${jsonData.length} records to import`);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log('🔄 Transaction started');
      
      let playlistsInserted = 0;
      let videosInserted = 0;
      let streamsInserted = 0;
      
      for (const item of jsonData) {
        console.log(`\n🎮 Processing: ${item.gameName}`);
        
        // Insert or get playlist
        let playlistResult;
        try {
          playlistResult = await client.query(
            'INSERT INTO playlists (youtube_id, name, tags) VALUES ($1, $2, $3) ON CONFLICT (youtube_id) DO UPDATE SET updated_at = NOW() RETURNING id',
            [item.playlistId, `${item.gameName} Playlist`, JSON.stringify([item.gameName])]
          );
          if (playlistResult.rowCount > 0 && playlistResult.rows[0].id) {
            playlistsInserted++;
            console.log(`  ✅ Playlist inserted/updated: ${item.playlistId}`);
          }
        } catch (err) {
          playlistResult = await client.query(
            'SELECT id FROM playlists WHERE youtube_id = $1',
            [item.playlistId]
          );
          console.log(`  🔄 Found existing playlist: ${item.playlistId}`);
        }
        
        const playlistId = playlistResult.rows[0]?.id;
        if (!playlistId) {
          console.error(`  ❌ Failed to get playlist ID for ${item.playlistId}`);
          continue;
        }
        
        // Insert or get video
        let videoResult;
        try {
          videoResult = await client.query(
            'INSERT INTO videos (yt_id, name, tags) VALUES ($1, $2, $3) ON CONFLICT (yt_id) DO UPDATE SET updated_at = NOW() RETURNING id',
            [item.firstVideo, `${item.gameName} Video 1`, JSON.stringify([item.gameName])]
          );
          if (videoResult.rowCount > 0 && videoResult.rows[0].id) {
            videosInserted++;
            console.log(`  ✅ Video inserted/updated: ${item.firstVideo}`);
          }
        } catch (err) {
          videoResult = await client.query(
            'SELECT id FROM videos WHERE yt_id = $1',
            [item.firstVideo]
          );
          console.log(`  🔄 Found existing video: ${item.firstVideo}`);
        }
        
        const videoId = videoResult.rows[0]?.id;
        if (!videoId) {
          console.error(`  ❌ Failed to get video ID for ${item.firstVideo}`);
          continue;
        }
        
        // Insert stream record
        try {
          const streamResult = await client.query(
            `INSERT INTO streams (game_name, tags, stream_count, playlist_id, first_video_id, date_completed, game_cover)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [
              item.gameName,
              JSON.stringify(item.tags || []),
              item.streams || 1,
              playlistId,
              videoId,
              item.dateCompleted ? new Date(item.dateCompleted) : null,
              item.gameCover || null
            ]
          );
          
          if (streamResult.rowCount > 0) {
            streamsInserted++;
            console.log(`  ✅ Stream inserted: ${item.gameName}`);
          } else {
            console.log(`  🔄 Stream already exists: ${item.gameName}`);
          }
        } catch (err) {
          console.error(`  ❌ Failed to insert stream for ${item.gameName}:`, err.message);
        }
      }
      
      await client.query('COMMIT');
      console.log('\n🎉 Import completed successfully!');
      console.log(`📈 Summary:`);
      console.log(`  - Playlists inserted/updated: ${playlistsInserted}`);
      console.log(`  - Videos inserted/updated: ${videosInserted}`);
      console.log(`  - Streams inserted: ${streamsInserted}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the import if this script is executed directly
if (require.main === module) {
  const jsonPath = process.argv[2] || 'test_data/vods.json';
  importData(jsonPath);
}

module.exports = { importData };
