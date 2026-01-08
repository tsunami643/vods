const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = require('../db/connection');
const { saveChatData } = require('../services/chat_db');

async function importPlaylist(playlistJsonPath, chatDirPath) {
  const client = await pool.connect();
  
  try {
    const playlist = JSON.parse(fs.readFileSync(playlistJsonPath, 'utf8'));
    console.log(`\nImporting: ${playlist.gameName}`);
    console.log(`  Playlist ID: ${playlist.playlistId}`);
    console.log(`  Videos: ${playlist.videos.length}`);
    
    await client.query('BEGIN');
    
    const playlistResult = await client.query(
      `INSERT INTO playlists (youtube_id, name, tags) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (youtube_id) DO UPDATE SET name = EXCLUDED.name, tags = EXCLUDED.tags
       RETURNING id`,
      [playlist.playlistId, playlist.gameName, JSON.stringify(playlist.tags || [])]
    );
    const playlistId = playlistResult.rows[0].id;
    console.log(`  Playlist DB ID: ${playlistId}`);
    
    const videoIds = [];
    
    for (let i = 0; i < playlist.videos.length; i++) {
      const video = playlist.videos[i];
      
      const videoResult = await client.query(
        `INSERT INTO videos (yt_id, name, description, duration, published_at, playlist_id, playlist_order) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         ON CONFLICT (yt_id) DO UPDATE SET 
           name = EXCLUDED.name, 
           description = EXCLUDED.description,
           duration = EXCLUDED.duration,
           published_at = EXCLUDED.published_at,
           playlist_id = EXCLUDED.playlist_id,
           playlist_order = EXCLUDED.playlist_order
         RETURNING id`,
        [
          video.videoId,
          video.title,
          video.description || null,
          video.duration || null,
          video.publishedAt ? new Date(video.publishedAt) : null,
          playlistId,
          i
        ]
      );
      
      videoIds.push(videoResult.rows[0].id);
      console.log(`  Video ${i}: ${video.title} -> ID ${videoResult.rows[0].id}`);
    }
    
    const existingStream = await client.query(
      `SELECT id FROM streams WHERE playlist_id = $1`,
      [playlistId]
    );
    
    if (existingStream.rows.length === 0) {
      await client.query(
        `INSERT INTO streams (game_name, tags, stream_count, playlist_id, first_video_id, game_cover, date_completed)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          playlist.gameName,
          JSON.stringify(playlist.tags || []),
          playlist.videos.length,
          playlistId,
          videoIds[0],
          playlist.gameCover || null,
          playlist.dateOverride ? new Date(playlist.dateOverride) : 
            (playlist.videos.length > 0 && playlist.videos[playlist.videos.length - 1].publishedAt 
              ? new Date(playlist.videos[playlist.videos.length - 1].publishedAt) 
              : null)
        ]
      );
      console.log(`  Created stream entry`);
    } else {
      console.log(`  Stream entry already exists`);
    }
    
    await client.query('COMMIT');
    
    if (chatDirPath && fs.existsSync(chatDirPath)) {
      console.log(`  Importing chat logs from: ${chatDirPath}`);
      
      const chatFiles = fs.readdirSync(chatDirPath)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => parseInt(a) - parseInt(b));
      
      for (let i = 0; i < chatFiles.length && i < videoIds.length; i++) {
        const chatFilePath = path.join(chatDirPath, chatFiles[i]);
        const chatData = JSON.parse(fs.readFileSync(chatFilePath, 'utf8'));
        
        if (chatData.chatList && chatData.chatList.length > 0) {
          const result = await saveChatData(videoIds[i], chatData);
          console.log(`    Chat ${i}: ${result.messageCount} messages saved`);
        } else {
          console.log(`    Chat ${i}: No messages`);
        }
      }
    }
    
    return { playlistId, videoIds };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: npm run import:playlist <playlist.json> [chat_dir]');
    console.log('');
    console.log('Examples:');
    console.log('  npm run import:playlist ./test_data/alien__isolation_playlist.json ./test_data/alien__isolation_playlist_chat/');
    process.exit(1);
  }
  
  const playlistPath = args[0];
  const chatDir = args[1] || null;
  
  if (!fs.existsSync(playlistPath)) {
    console.error(`Playlist file not found: ${playlistPath}`);
    process.exit(1);
  }
  
  try {
    await importPlaylist(playlistPath, chatDir);
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  await pool.end();
}

if (require.main === module) {
  main();
}

module.exports = { importPlaylist };
