const pool = require('../db/connection');

/**
 * Generate playlist name and tags based on game name and existing playlists
 */
async function generatePlaylistMetadata(gameName) {
  const client = await pool.connect();
  try {
    // Count existing playlists with the same game tag
    const countResult = await client.query(
      'SELECT COUNT(*) FROM playlists WHERE tags @> $1',
      [JSON.stringify([gameName])]
    );
    
    const playlistNumber = parseInt(countResult.rows[0].count) + 1;
    const playlistName = `${gameName} PLAYLIST ${playlistNumber}`;
    const playlistTags = [gameName];
    
    return { playlistName, playlistTags };
  } finally {
    client.release();
  }
}

/**
 * Generate video name and tags based on game name and existing videos
 */
async function generateVideoMetadata(gameName, playlistId) {
  const client = await pool.connect();
  try {
    // Count existing videos with the same game tag
    const countResult = await client.query(
      'SELECT COUNT(*) FROM videos WHERE tags @> $1',
      [JSON.stringify([gameName])]
    );
    
    const videoNumber = parseInt(countResult.rows[0].count) + 1;
    const videoName = `${gameName} VIDEO ${videoNumber} / ${playlistId}`;
    const videoTags = [gameName];
    
    return { videoName, videoTags };
  } finally {
    client.release();
  }
}

module.exports = {
  generatePlaylistMetadata,
  generateVideoMetadata
};
