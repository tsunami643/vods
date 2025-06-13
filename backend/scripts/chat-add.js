#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { convertChatData, validateChatData } = require('../services/chatConverter');
const pool = require('../db/connection');

/**
 * Adds a single chat log to the database
 * @param {number} chatId - Chat ID
 * @param {Object} chatLog - Chat log data
 * @returns {Promise<number>} Inserted record ID
 */
async function addChatToDatabase(chatId, chatLog) {
  const insertQuery = 'INSERT INTO chat_logs (message, user_data) VALUES ($1, $2) RETURNING id';
  
  // Create a message that includes the chat ID for tracking
  const message = `Chat log ${chatId}`;
  
  // Store the entire chat log in user_data field
  const userData = {
    chat_id: chatId,
    chat_log: chatLog,
    imported_at: new Date().toISOString()
  };
  
  const result = await pool.query(insertQuery, [message, JSON.stringify(userData)]);
  return result.rows[0].id;
}

/**
 * Extracts number from filename (e.g., "chat123.json" -> 123)
 * @param {string} filename - Filename to extract number from
 * @returns {number|null} Extracted number or null if not found
 */
function extractNumberFromFilename(filename) {
  const match = filename.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Processes a single chat file
 * @param {string} filePath - Path to the chat file
 * @param {number} chatId - Chat ID to use (from filename or provided)
 */
async function processChatFile(filePath, chatId = null) {
  const filename = path.basename(filePath);
  
  // Extract chat ID from filename if not provided
  if (chatId === null) {
    chatId = extractNumberFromFilename(filename);
    if (chatId === null) {
      console.warn(`⚠️  Could not extract chat ID from filename: ${filename}`);
      return;
    }
  }
  
  console.log(`📂 Processing file: ${filename} (Chat ID: ${chatId})`);
  
  try {
    // Read and parse the file
    const rawData = fs.readFileSync(filePath, 'utf8');
    let chatData;
    
    try {
      chatData = JSON.parse(rawData);
    } catch (parseError) {
      console.error(`❌ Invalid JSON in file ${filename}: ${parseError.message}`);
      return;
    }
    
    // Validate and convert chat data
    if (!validateChatData(chatData)) {
      console.error(`❌ Invalid chat data format in file: ${filename}`);
      return;
    }
    
    const convertedData = convertChatData(chatData);
    
    // Add to database
    const recordId = await addChatToDatabase(chatId, convertedData);
    console.log(`✅ Added chat ${chatId} to database (Record ID: ${recordId})`);
    
  } catch (error) {
    console.error(`❌ Error processing file ${filename}:`, error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: npm run chat:add <file-or-folder>');
    console.error('Examples:');
    console.error('  npm run chat:add ./data/chat123.json');
    console.error('  npm run chat:add ./data/chats/');
    process.exit(1);
  }
  
  const target = args[0];
  
  try {
    if (!fs.existsSync(target)) {
      console.error(`❌ File or folder not found: ${target}`);
      process.exit(1);
    }
    
    const stat = fs.statSync(target);
    
    if (stat.isFile()) {
      // Process single file
      console.log('📁 Processing single file...');
      await processChatFile(target);
    } else if (stat.isDirectory()) {
      // Process all JSON files in directory
      console.log('📁 Processing directory...');
      const files = fs.readdirSync(target)
        .filter(file => file.endsWith('.json'))
        .sort(); // Sort to ensure consistent processing order
      
      if (files.length === 0) {
        console.warn('⚠️  No JSON files found in directory');
        return;
      }
      
      console.log(`📂 Found ${files.length} JSON files to process`);
      
      for (const file of files) {
        const filePath = path.join(target, file);
        await processChatFile(filePath);
      }
    } else {
      console.error('❌ Target must be a file or directory');
      process.exit(1);
    }
    
    console.log('🎉 Chat processing completed!');
    
  } catch (error) {
    console.error('❌ Error during processing:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

main(); 