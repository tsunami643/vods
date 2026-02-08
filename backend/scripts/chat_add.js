const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = require('../db/connection');
const { parseOrPassthrough } = require('../services/chat_parser');
const { saveChatData, getVideoIdByYoutubeId, getVideoIdByTwitchId } = require('../services/chat_db');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: npm run chat:add <file.json> <video_identifier>');
    console.log('');
    console.log('video_identifier can be:');
    console.log('  - Internal video ID (number)');
    console.log('  - YouTube video ID (e.g., dQw4w9WgXcQ)');
    console.log('  - twitch:<twitch_vod_id> (e.g., twitch:1234567890)');
    console.log('');
    console.log('The JSON file can be either raw Twitch chat format or pre-parsed format.');
    process.exit(1);
  }
  
  const filePath = args[0];
  const videoIdentifier = args[1];
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  console.log(`Reading ${filePath}...`);
  
  let rawData;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    rawData = JSON.parse(fileContent);
  } catch (error) {
    console.error('Failed to parse JSON file:', error.message);
    process.exit(1);
  }
  
  let internalVideoId = null;
  let twitchVideoId = null;
  
  if (videoIdentifier.startsWith('twitch:')) {
    const twitchId = videoIdentifier.slice(7);
    console.log(`Looking up video by Twitch ID: ${twitchId}`);
    internalVideoId = await getVideoIdByTwitchId(parseInt(twitchId));
    twitchVideoId = parseInt(twitchId);
    
    if (!internalVideoId) {
      console.error(`No video found with Twitch ID: ${twitchId}`);
      console.log('Make sure the video exists in the database with the twitch_id field set.');
      process.exit(1);
    }
  } else if (/^\d+$/.test(videoIdentifier)) {
    internalVideoId = parseInt(videoIdentifier);
    console.log(`Using internal video ID: ${internalVideoId}`);
  } else {
    console.log(`Looking up video by YouTube ID: ${videoIdentifier}`);
    internalVideoId = await getVideoIdByYoutubeId(videoIdentifier);
    
    if (!internalVideoId) {
      console.error(`No video found with YouTube ID: ${videoIdentifier}`);
      console.log('Make sure the video exists in the database first.');
      process.exit(1);
    }
  }
  
  console.log(`Video ID resolved to: ${internalVideoId}`);
  console.log('Parsing chat data...');
  
  const parsedData = parseOrPassthrough(rawData);
  
  console.log(`Found ${parsedData.chatList.length} messages`);
  console.log(`Found ${parsedData.badgeList.length} unique badges`);
  console.log(`Found ${parsedData.emoteList.length} unique emotes`);
  console.log(`Found ${parsedData.userList.length} unique users`);
  
  if (parsedData.chatList.length === 0) {
    console.error('No chat messages found in the file.');
    process.exit(1);
  }
  
  console.log('Saving to database...');
  
  try {
    const result = await saveChatData(internalVideoId, parsedData, twitchVideoId);
    console.log('');
    console.log('Chat data saved successfully!');
    console.log(`  Metadata ID: ${result.metadataId}`);
    console.log(`  Messages saved: ${result.messageCount}`);
  } catch (error) {
    console.error('Failed to save chat data:', error.message);
    process.exit(1);
  }
  
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
