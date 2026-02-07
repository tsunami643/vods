#!/usr/bin/env node
/**
 * Batch Import Script for parseChat Test Data
 * 
 * This script imports playlists and chat logs from the parseChat test_data folder
 * into the vods database. It automatically updates existing entries if they exist.
 * 
 * Usage:
 *   node scripts/batch_import_parsechat.js                    # Import all playlists
 *   node scripts/batch_import_parsechat.js <playlist_name>    # Import specific playlist
 *   node scripts/batch_import_parsechat.js --list             # List available playlists
 *   node scripts/batch_import_parsechat.js <name> --game-id=N # Attach to existing game
 * 
 * Examples:
 *   node scripts/batch_import_parsechat.js
 *   node scripts/batch_import_parsechat.js alien__isolation_playlist
 *   node scripts/batch_import_parsechat.js mass_effect_playlist --game-id=45
 * 
 * The --game-id option attaches the playlist to an existing stream entry (by streams.id)
 * instead of creating/updating based on game name.
 */

const fs = require('fs');
const path = require('path');

// Load env from vods directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = require('../backend/db/connection');
const { saveChatData } = require('../backend/services/chat_db');
const { getGameCoverUrl } = require('../backend/utils/gameCover');

const PARSECHAT_TEST_DATA = path.join(__dirname, '../../parseChat/test_data');

function listAvailablePlaylists() {
  const files = fs.readdirSync(PARSECHAT_TEST_DATA);
  const playlists = files
    .filter(f => f.endsWith('_playlist.json'))
    .map(f => {
      const name = f.replace('.json', '');
      const chatDir = path.join(PARSECHAT_TEST_DATA, name.replace('_playlist', '_playlist_chat'));
      const hasChat = fs.existsSync(chatDir);
      const data = JSON.parse(fs.readFileSync(path.join(PARSECHAT_TEST_DATA, f), 'utf8'));
      return {
        filename: name,
        gameName: data.gameName,
        videoCount: data.videos.length,
        hasChat
      };
    });
  
  console.log('\nAvailable playlists in parseChat/test_data:\n');
  console.log('Filename                                      | Game Name                        | Videos | Chat');
  console.log('-'.repeat(100));
  
  playlists.forEach(p => {
    const fn = p.filename.padEnd(45);
    const gn = p.gameName.padEnd(32);
    const vc = String(p.videoCount).padStart(6);
    const hc = p.hasChat ? '  ✓' : '  -';
    console.log(`${fn} | ${gn} | ${vc} | ${hc}`);
  });
  
  console.log(`\nTotal: ${playlists.length} playlists`);
}

async function importPlaylistFromParseChat(playlistName, existingStreamId = null) {
  const client = await pool.connect();
  
  try {
    const playlistPath = path.join(PARSECHAT_TEST_DATA, `${playlistName}.json`);
    
    if (!fs.existsSync(playlistPath)) {
      throw new Error(`Playlist file not found: ${playlistPath}`);
    }
    
    const playlist = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
    console.log(`\nImporting: ${playlist.gameName}`);
    console.log(`  Playlist ID: ${playlist.playlistId}`);
    console.log(`  Videos: ${playlist.videos.length}`);
    
    await client.query('BEGIN');
    
    // Create or update playlist
    const playlistResult = await client.query(
      `INSERT INTO playlists (youtube_id, name, tags) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (youtube_id) DO UPDATE SET 
         name = EXCLUDED.name, 
         tags = EXCLUDED.tags
       RETURNING id`,
      [playlist.playlistId, playlist.gameName, JSON.stringify(playlist.tags || [])]
    );
    const playlistId = playlistResult.rows[0].id;
    console.log(`  Playlist DB ID: ${playlistId}`);
    
    const videoIds = [];
    
    // Import videos
    for (let i = 0; i < playlist.videos.length; i++) {
      const video = playlist.videos[i];
      
      // Extract stream title from description if present
      let subTitle = null;
      let description = video.description || null;
      
      if (description) {
        const match = description.match(/Stream Title :: (.*?) ::/s);
        if (match) {
          subTitle = match[1].trim();
          description = description.replace(match[0], '').trim();
        }
      }
      
      const videoResult = await client.query(
        `INSERT INTO videos (yt_id, name, sub_title, description, duration, published_at, playlist_id, playlist_order) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         ON CONFLICT (yt_id) DO UPDATE SET 
           name = EXCLUDED.name, 
           sub_title = EXCLUDED.sub_title,
           description = EXCLUDED.description,
           duration = EXCLUDED.duration,
           published_at = EXCLUDED.published_at,
           playlist_id = EXCLUDED.playlist_id,
           playlist_order = EXCLUDED.playlist_order
         RETURNING id`,
        [
          video.videoId,
          video.title,
          subTitle,
          description || null,
          video.duration || null,
          video.publishedAt ? new Date(video.publishedAt) : null,
          playlistId,
          i
        ]
      );
      
      videoIds.push(videoResult.rows[0].id);
      console.log(`  Video ${i}: ${video.title} -> ID ${videoResult.rows[0].id}`);
    }
    
    // Create or update stream entry
    // countOverride is a negative INT that should be added to videos.length
    const streamCount = playlist.videos.length + (playlist.countOverride || 0);
    
    const dateCompleted = playlist.dateOverride 
      ? new Date(playlist.dateOverride) 
      : (playlist.videos.length > 0 && playlist.videos[playlist.videos.length - 1].publishedAt 
          ? new Date(playlist.videos[playlist.videos.length - 1].publishedAt) 
          : null);
    
    if (existingStreamId) {
      // Attach to existing stream (game) by updating it with new playlist data
      await client.query(
        `UPDATE streams SET 
           playlist_id = $1, first_video_id = $2, stream_count = $3, 
           game_cover = COALESCE($4, game_cover), date_completed = COALESCE($5, date_completed),
           tags = $6
         WHERE id = $7`,
        [
          playlistId,
          videoIds[0],
          streamCount,
          playlist.gameCover || null,
          dateCompleted,
          JSON.stringify(playlist.tags || []),
          existingStreamId
        ]
      );
      console.log(`  Attached to existing stream/game (ID: ${existingStreamId})`);
    } else {
      // Check if stream already exists - first by YouTube playlist ID, then by game_name
      let existingStream = await client.query(
        `SELECT s.id FROM streams s
         JOIN playlists p ON s.playlist_id = p.id
         WHERE p.youtube_id = $1`,
        [playlist.playlistId]
      );
      
      // If not found by YouTube playlist ID, try by game_name (case-insensitive)
      if (existingStream.rows.length === 0) {
        existingStream = await client.query(
          `SELECT id FROM streams WHERE LOWER(game_name) = LOWER($1)`,
          [playlist.gameName]
        );
      }
      
      if (existingStream.rows.length === 0) {
        // Create new stream
        const result = await client.query(
          `INSERT INTO streams (game_name, tags, stream_count, playlist_id, first_video_id, game_cover, date_completed)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            playlist.gameName,
            JSON.stringify(playlist.tags || []),
            streamCount,
            playlistId,
            videoIds[0],
            playlist.gameCover || null,
            dateCompleted
          ]
        );
        console.log(`  Created new stream entry (ID: ${result.rows[0].id})`);
      } else {
        // Update existing stream
        const streamId = existingStream.rows[0].id;
        await client.query(
          `UPDATE streams SET 
             game_name = $1, tags = $2, stream_count = $3, playlist_id = $4,
             first_video_id = $5, game_cover = COALESCE($6, game_cover), 
             date_completed = COALESCE($7, date_completed)
           WHERE id = $8`,
          [
            playlist.gameName,
            JSON.stringify(playlist.tags || []),
            streamCount,
            playlistId,
            videoIds[0],
            playlist.gameCover || null,
            dateCompleted,
            streamId
          ]
        );
        console.log(`  Updated existing stream entry (ID: ${streamId})`);
      }
    }
    
    await client.query('COMMIT');
    
    // Import chat logs if they exist
    const chatDirName = playlistName.replace('_playlist', '_playlist_chat');
    const chatDirPath = path.join(PARSECHAT_TEST_DATA, chatDirName);
    
    if (fs.existsSync(chatDirPath)) {
      console.log(`  Importing chat logs from: ${chatDirName}/`);
      
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
    } else {
      console.log(`  No chat directory found`);
    }
    
    return { playlistId, videoIds };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function importAllPlaylists() {
  const files = fs.readdirSync(PARSECHAT_TEST_DATA);
  const playlists = files
    .filter(f => f.endsWith('_playlist.json'))
    .map(f => f.replace('.json', ''))
    .sort();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Importing ${playlists.length} playlists from parseChat/test_data`);
  console.log(`${'='.repeat(60)}`);
  
  let success = 0;
  let failed = 0;
  const errors = [];
  
  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i];
    console.log(`\n[${i + 1}/${playlists.length}] ${playlist}`);
    
    try {
      await importPlaylistFromParseChat(playlist);
      success++;
    } catch (error) {
      console.error(`  ❌ ERROR: ${error.message}`);
      errors.push({ playlist, error: error.message });
      failed++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Import complete: ${success} success, ${failed} failed`);
  
  if (errors.length > 0) {
    console.log(`\nFailed imports:`);
    errors.forEach(e => console.log(`  - ${e.playlist}: ${e.error}`));
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  node scripts/batch_import_parsechat.js                    # Import all playlists');
    console.log('  node scripts/batch_import_parsechat.js <playlist_name>    # Import specific playlist');
    console.log('  node scripts/batch_import_parsechat.js --list             # List available playlists');
    console.log('  node scripts/batch_import_parsechat.js <name> --game-id=N # Attach to existing game');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/batch_import_parsechat.js');
    console.log('  node scripts/batch_import_parsechat.js alien__isolation_playlist');
    console.log('  node scripts/batch_import_parsechat.js mass_effect_playlist --game-id=45');
    console.log('');
    console.log('The script automatically updates existing playlists/streams if they exist.');
    console.log('The --game-id option attaches the playlist to an existing stream/game entry.');
    process.exit(0);
  }
  
  if (args.includes('--list')) {
    listAvailablePlaylists();
    process.exit(0);
  }
  
  try {
    // Filter out flags to get the playlist name
    const playlistName = args.find(a => !a.startsWith('--'));
    const gameIdArg = args.find(a => a.startsWith('--game-id='));
    const gameId = gameIdArg ? parseInt(gameIdArg.split('=')[1]) : null;
    
    if (!playlistName || args.includes('--all')) {
      // Import all playlists
      await importAllPlaylists();
    } else {
      // Import specific playlist
      await importPlaylistFromParseChat(playlistName, gameId);
    }
    
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
  
  await pool.end();
}

if (require.main === module) {
  main();
}

module.exports = { importPlaylistFromParseChat, listAvailablePlaylists };
