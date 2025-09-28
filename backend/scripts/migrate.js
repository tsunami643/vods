const fs = require('fs');
const path = require('path');
const pool = require('../db/connection');

async function initializeMigrationSystem(client) {
  console.log('🔧 Initializing migration system...');
  
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS system;
  `);
  
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS vods;
  `);
  
  await client.query(`
    SET search_path TO vods, system, public;
  `);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS system.migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      checksum VARCHAR(64) NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW(),
      execution_time_ms INTEGER,
      success BOOLEAN DEFAULT TRUE
    );
  `);
  
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_migrations_filename ON system.migrations(filename);
  `);
  
  console.log('✅ Migration system initialized');
}

async function getExecutedMigrations(client) {
  const result = await client.query(
    'SELECT filename, checksum FROM system.migrations WHERE success = true ORDER BY executed_at'
  );
  return new Map(result.rows.map(row => [row.filename, row.checksum]));
}

function calculateChecksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function recordMigration(client, filename, checksum, executionTime) {
  await client.query(`
    INSERT INTO system.migrations (filename, checksum, execution_time_ms) 
    VALUES ($1, $2, $3)
    ON CONFLICT (filename) DO UPDATE SET
      checksum = EXCLUDED.checksum,
      executed_at = NOW(),
      execution_time_ms = EXCLUDED.execution_time_ms,
      success = true
  `, [filename, checksum, executionTime]);
}

async function recordFailedMigration(client, filename, checksum, error) {
  try {
    await client.query(`
      INSERT INTO system.migrations (filename, checksum, success) 
      VALUES ($1, $2, false)
      ON CONFLICT (filename) DO UPDATE SET
        checksum = EXCLUDED.checksum,
        executed_at = NOW(),
        success = false
    `, [filename, checksum]);
  } catch (recordError) {
    console.error('Failed to record migration failure:', recordError);
  }
}

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migrations...');
    
    await initializeMigrationSystem(client);
    
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (migrationFiles.length === 0) {
      console.log('📝 No migration files found');
      return;
    }
    
    const executedMigrations = await getExecutedMigrations(client);
    
    console.log(`📋 Found ${migrationFiles.length} migration files`);
    console.log(`✅ ${executedMigrations.size} migrations already executed`);
    
    let newMigrations = 0;
    let skippedMigrations = 0;
    
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(filePath, 'utf8');
      const checksum = calculateChecksum(migrationSQL);
      
      const existingChecksum = executedMigrations.get(file);
      
      if (existingChecksum) {
        if (existingChecksum === checksum) {
          console.log(`⏭️  Skipping ${file} (already executed)`);
          skippedMigrations++;
          continue;
        } else {
          console.warn(`⚠️  Migration ${file} has changed since last execution!`);
          console.warn(`   Previous checksum: ${existingChecksum}`);
          console.warn(`   Current checksum:  ${checksum}`);
          console.warn(`   This migration will be re-run`);
        }
      }
      
      console.log(`▶️  Running migration: ${file}`);
      const startTime = Date.now();
      
      try {
        await client.query('BEGIN');
        
        await client.query(migrationSQL);
        
        const executionTime = Date.now() - startTime;
        await recordMigration(client, file, checksum, executionTime);
        
        await client.query('COMMIT');
        
        console.log(`✅ Migration ${file} completed in ${executionTime}ms`);
        newMigrations++;
        
      } catch (error) {
        await client.query('ROLLBACK');
        
        await recordFailedMigration(client, file, checksum, error);
        
        console.error(`❌ Migration ${file} failed:`, error.message);
        throw error;
      }
    }
    
    console.log('\n🎉 Migration summary:');
    console.log(`   📊 Total files: ${migrationFiles.length}`);
    console.log(`   ✅ Already executed: ${skippedMigrations}`);
    console.log(`   🆕 New migrations: ${newMigrations}`);
    console.log(`   ${newMigrations > 0 ? '🚀 Database updated successfully!' : '💫 Database already up to date!'}`);
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.error('   Database may be in an inconsistent state');
    console.error('   Please check the error and re-run migrations');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
} 