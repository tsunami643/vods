const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const varsMap = {
  DB_HOST: 'Database host',
  DB_PORT: 'Database port',
  DB_NAME: 'Database name',
  DB_USER: 'Database username',
  DB_PASSWORD: 'Database password',
  
  YOUTUBE_API_KEY: 'YouTube API key',
  YOUTUBE_CHANNEL_ID: 'YouTube Channel ID',
};

const optionalVars = {
  BE_PORT: 3001,
  NODE_ENV: 'development'
};

function validateConfig() {
  const missing = [];
  const config = {};
  
  Object.keys(varsMap).forEach(key => {
    if (!process.env[key]) {
      missing.push(`${key} - ${varsMap[key]}`);
    } else {
      config[key] = process.env[key];
    }
  });
  
  Object.keys(optionalVars).forEach(key => {
    if (!config[key]) {
      config[key] = process.env[key] || optionalVars[key];
    }
  });
  
  config.BE_PORT = parseInt(config.BE_PORT, 10);
  config.DB_PORT = parseInt(config.DB_PORT, 10);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(variable => {
      console.error(`  - ${variable}`);
    });
    console.error('\nPlease create a .env file in the project root with these variables.');
    process.exit(1);
  }
  
  console.log('✅ Configuration loaded successfully');
  console.log(`🚀 Server will run on port ${config.BE_PORT}`);
  console.log(`📊 Database: ${config.DB_USER}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`);
  
  return config;
}

const config = validateConfig();

module.exports = config; 