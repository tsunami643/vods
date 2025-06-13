#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { convertChatData, validateChatData } = require('../services/chatConverter');

function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('Usage: npm run chat:convert <input-file> <output-file>');
    console.error('Example: npm run chat:convert ./data/chat1.json ./output/converted-chat1.json');
    process.exit(1);
  }
  
  const [inputFile, outputFile] = args;
  
  try {
    // Check if input file exists
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Input file not found: ${inputFile}`);
      process.exit(1);
    }
    
    console.log(`📂 Reading chat data from: ${inputFile}`);
    
    // Read and parse input file
    const rawData = fs.readFileSync(inputFile, 'utf8');
    let chatData;
    
    try {
      chatData = JSON.parse(rawData);
    } catch (parseError) {
      console.error(`❌ Invalid JSON in input file: ${parseError.message}`);
      process.exit(1);
    }
    
    // Validate chat data
    if (!validateChatData(chatData)) {
      console.error('❌ Invalid chat data format');
      process.exit(1);
    }
    
    console.log('🔄 Converting chat data...');
    
    // Convert the data
    const convertedData = convertChatData(chatData);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write converted data to output file
    fs.writeFileSync(outputFile, JSON.stringify(convertedData, null, 2));
    
    console.log(`✅ Chat data converted successfully!`);
    console.log(`📁 Output saved to: ${outputFile}`);
    
  } catch (error) {
    console.error('❌ Error during conversion:', error.message);
    process.exit(1);
  }
}

main(); 