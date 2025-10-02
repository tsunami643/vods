#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const pool = require('../db/connection');

/**
 * Check if the migration system is initialized
 */
async function checkMigrationSystemExists(client) {
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'system' 
        AND table_name = 'migrations'
      );
    `);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

/**
 * Get migration status information
 */
async function getMigrationStatus() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Migration Status Report');
    console.log('=' .repeat(50));
    
    // Check if migration system exists
    const systemExists = await checkMigrationSystemExists(client);
    
    if (!systemExists) {
      console.log('❌ Migration system not initialized');
      console.log('   Run "npm run migrate" to initialize the system');
      return;
    }
    
    // Get list of migration files
    const migrationDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Migration files found: ${migrationFiles.length}`);
    
    if (migrationFiles.length === 0) {
      console.log('   No migration files in the migrations directory');
      return;
    }
    
    // Get executed migrations from database
    const result = await client.query(`
      SELECT filename, checksum, executed_at, execution_time_ms, success
      FROM system.migrations 
      ORDER BY executed_at DESC
    `);
    
    const executedMigrations = new Map(
      result.rows.map(row => [row.filename, row])
    );
    
    console.log(`✅ Executed migrations: ${result.rows.length}`);
    console.log('');
    
    // Show status for each migration file
    console.log('Migration Status:');
    console.log('-'.repeat(80));
    console.log('Status'.padEnd(12) + 'File'.padEnd(25) + 'Executed At'.padEnd(25) + 'Time(ms)');
    console.log('-'.repeat(80));
    
    let pendingCount = 0;
    let failedCount = 0;
    let successCount = 0;
    
    for (const file of migrationFiles) {
      const executed = executedMigrations.get(file);
      
      if (!executed) {
        console.log('⏳ PENDING'.padEnd(12) + file.padEnd(25) + '-'.padEnd(25) + '-');
        pendingCount++;
      } else if (executed.success) {
        const executedAt = new Date(executed.executed_at).toISOString().slice(0, 19);
        const timeMs = executed.execution_time_ms || '-';
        console.log('✅ SUCCESS'.padEnd(12) + file.padEnd(25) + executedAt.padEnd(25) + timeMs);
        successCount++;
      } else {
        const executedAt = new Date(executed.executed_at).toISOString().slice(0, 19);
        console.log('❌ FAILED'.padEnd(12) + file.padEnd(25) + executedAt.padEnd(25) + '-');
        failedCount++;
      }
    }
    
    console.log('-'.repeat(80));
    console.log('');
    
    // Summary
    console.log('📈 Summary:');
    console.log(`   🟢 Successful: ${successCount}`);
    console.log(`   🟡 Pending:    ${pendingCount}`);
    console.log(`   🔴 Failed:     ${failedCount}`);
    console.log(`   📊 Total:      ${migrationFiles.length}`);
    
    if (failedCount > 0) {
      console.log('');
      console.log('⚠️  Some migrations have failed. Check the logs and fix any issues before proceeding.');
    } else if (pendingCount > 0) {
      console.log('');
      console.log('🚀 Run "npm run migrate" to execute pending migrations.');
    } else {
      console.log('');
      console.log('🎉 All migrations are up to date!');
    }
    
    // Show recent migration history if any
    if (result.rows.length > 0) {
      console.log('');
      console.log('📜 Recent Migration History (last 5):');
      console.log('-'.repeat(60));
      
      const recent = result.rows.slice(0, 5);
      for (const migration of recent) {
        const status = migration.success ? '✅' : '❌';
        const time = new Date(migration.executed_at).toISOString().slice(0, 19);
        const duration = migration.execution_time_ms ? `${migration.execution_time_ms}ms` : 'unknown';
        console.log(`${status} ${migration.filename} (${time}) - ${duration}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  getMigrationStatus();
}

module.exports = { getMigrationStatus };
