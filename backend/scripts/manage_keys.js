#!/usr/bin/env node

const crypto = require('crypto');
const pool = require('../db/connection');

function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function createKey(name) {
  if (!name) {
    console.error('❌ Error: Key name is required');
    console.log('Usage: npm run manage-keys create "Key Name"');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    const apiKey = generateApiKey();
    
    const result = await client.query(
      'INSERT INTO api_secrets (name, secret_key, is_active, created_at) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, apiKey, true, new Date()]
    );

    console.log('✅ New API key created successfully!');
    console.log(`📋 Name: ${name}`);
    console.log(`🔑 Key: ${apiKey}`);
    console.log(`🆔 ID: ${result.rows[0].id}`);
    console.log('');
    console.log('⚠️  Keep this key secure! It won\'t be shown again.');
    console.log('💡 Add it to your requests as "x-access-key" header.');

  } catch (error) {
    console.error('❌ Error creating API key:', error.message);
  } finally {
    client.release();
  }
}

async function invalidateKey(identifier) {
  if (!identifier) {
    console.error('❌ Error: Key ID or name is required');
    console.log('Usage: npm run manage-keys invalidate <id|name>');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    let query, params;
    
    if (/^\d+$/.test(identifier)) {
      query = 'UPDATE api_secrets SET is_active = false WHERE id = $1 RETURNING id, name';
      params = [parseInt(identifier)];
    } else {
      query = 'UPDATE api_secrets SET is_active = false WHERE name = $1 RETURNING id, name';
      params = [identifier];
    }

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      console.log(`❌ No active key found with identifier: ${identifier}`);
    } else {
      const key = result.rows[0];
      console.log(`✅ Key invalidated successfully!`);
      console.log(`🆔 ID: ${key.id}`);
      console.log(`📋 Name: ${key.name}`);
    }

  } catch (error) {
    console.error('❌ Error invalidating API key:', error.message);
  } finally {
    client.release();
  }
}

async function invalidateAllKeys() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'UPDATE api_secrets SET is_active = false WHERE is_active = true RETURNING COUNT(*)'
    );

    const countResult = await client.query(
      'SELECT COUNT(*) FROM api_secrets WHERE is_active = false'
    );

    console.log('✅ All API keys have been invalidated!');
    console.log(`🔒 Total keys invalidated: ${countResult.rows[0].count}`);
    console.log('⚠️  No existing keys will work for admin access.');

  } catch (error) {
    console.error('❌ Error invalidating all API keys:', error.message);
  } finally {
    client.release();
  }
}

async function listKeys() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, name, is_active, created_at FROM api_secrets ORDER BY created_at DESC'
    );

    if (result.rows.length === 0) {
      console.log('📝 No API keys found');
      return;
    }

    console.log('\n📋 API Keys Status:');
    console.log('─'.repeat(80));
    console.log('ID'.padEnd(4) + 'Name'.padEnd(25) + 'Status'.padEnd(10) + 'Created');
    console.log('─'.repeat(80));

    result.rows.forEach(key => {
      const status = key.is_active ? '✅ Active' : '❌ Inactive';
      const created = new Date(key.created_at).toLocaleDateString();
      console.log(
        key.id.toString().padEnd(4) +
        key.name.substring(0, 24).padEnd(25) +
        status.padEnd(10) +
        created
      );
    });
    console.log('─'.repeat(80));

    const activeCount = result.rows.filter(k => k.is_active).length;
    console.log(`\n📊 Active keys: ${activeCount} | Total keys: ${result.rows.length}`);

  } catch (error) {
    console.error('❌ Error listing API keys:', error.message);
  } finally {
    client.release();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('🔑 API Key Management Tool');
    console.log('');
    console.log('Usage:');
    console.log('  npm run manage-keys create "Key Name"    # Create new API key');
    console.log('  npm run manage-keys invalidate <id|name> # Invalidate specific key');
    console.log('  npm run manage-keys invalidate-all       # Invalidate all keys');
    console.log('  npm run manage-keys list                 # List all keys');
    console.log('');
    console.log('Examples:');
    console.log('  npm run manage-keys create "Development Key"');
    console.log('  npm run manage-keys invalidate 1');
    console.log('  npm run manage-keys invalidate "Development Key"');
    process.exit(0);
  }

  try {
    switch (command.toLowerCase()) {
      case 'create':
        await createKey(args[1]);
        break;
      case 'invalidate':
        await invalidateKey(args[1]);
        break;
      case 'invalidate-all':
        await invalidateAllKeys();
        break;
      case 'list':
        await listKeys();
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "npm run manage-keys" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createKey,
  invalidateKey,
  invalidateAllKeys,
  listKeys
};
