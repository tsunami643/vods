const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = require('../db/connection');
const { saveChatData } = require('../services/chat_db');

const TEST_DATA_PATH = path.join(__dirname, '../../../parseChat/test_data');

const VIDEO_MAPPINGS = [
  { playlist: 'alien__isolation_playlist', youtubeIds: ['DeINYeCqcvY', 'iWqSRfxKmdM'] },
  { playlist: 'mouthwashing_playlist', youtubeIds: ['6n8w1zxdnbE'] },
  { playlist: 'the_quarry_playlist', youtubeIds: ['xxx', 'xxx'] },
];

async function ensureVideoExists(client, youtubeId, name) {
  const existing = await client.query(
    'SELECT id FROM videos WHERE yt_id = $1',
    [youtubeId]
  );
  
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }
  
  const result = await client.query(
    'INSERT INTO videos (yt_id, name) VALUES ($1, $2) RETURNING id',
    [youtubeId, name]
  );
  return result.rows[0].id;
}

async function importTestData() {
  const client = await pool.connect();
  
  try {
    console.log('Importing test chat data...\n');

    for (const mapping of VIDEO_MAPPINGS) {
      const playlistPath = path.join(TEST_DATA_PATH, `${mapping.playlist}.json`);
      const chatDir = path.join(TEST_DATA_PATH, `${mapping.playlist}_chat`);
      
      if (!fs.existsSync(playlistPath)) {
        console.log(`Skipping ${mapping.playlist} - playlist file not found`);
        continue;
      }
      
      if (!fs.existsSync(chatDir)) {
        console.log(`Skipping ${mapping.playlist} - chat directory not found`);
        continue;
      }
      
      const playlist = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
      console.log(`Processing: ${playlist.gameName}`);
      
      const chatFiles = fs.readdirSync(chatDir)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => parseInt(a) - parseInt(b));
      
      for (let i = 0; i < chatFiles.length && i < playlist.videos.length; i++) {
        const video = playlist.videos[i];
        const chatFile = path.join(chatDir, chatFiles[i]);
        
        console.log(`  - ${video.title}`);
        console.log(`    YouTube ID: ${video.videoId}`);
        
        const videoId = await ensureVideoExists(client, video.videoId, video.title);
        console.log(`    Internal ID: ${videoId}`);
        
        const chatData = JSON.parse(fs.readFileSync(chatFile, 'utf8'));
        console.log(`    Messages: ${chatData.chatList?.length || 0}`);
        
        if (chatData.chatList && chatData.chatList.length > 0) {
          const result = await saveChatData(videoId, chatData);
          console.log(`    Saved: ${result.messageCount} messages`);
        } else {
          console.log(`    Skipped: No messages`);
        }
      }
      
      console.log('');
    }
    
    console.log('Done!');
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importTestData().catch(err => {
  console.error(err);
  process.exit(1);
});
