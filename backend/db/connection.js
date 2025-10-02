const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  user: config.DB_USER,
  host: config.DB_HOST,
  database: config.DB_NAME,
  password: config.DB_PASSWORD,
  port: config.DB_PORT,
});

pool.on('connect', (client) => {
  console.log('Connected to PostgreSQL database');
  // Set search path to use vods schema by default
  client.query('SET search_path TO vods, system, public');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool; 