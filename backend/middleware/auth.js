const pool = require('../db/connection');

/**
 * Middleware to verify API key for admin endpoints
 */
async function verifyApiKey(req, res, next) {
  const apiKey = req.headers['x-access-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Access denied: Missing x-access-key header' 
    });
  }
  
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT id, name, is_active FROM api_secrets WHERE secret_key = $1 AND is_active = true',
      [apiKey]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Access denied: Invalid or inactive API key' 
      });
    }
    
    req.apiKeyInfo = result.rows[0];
    
    console.log(`🔑 Admin access granted for key: ${result.rows[0].name}`);
    next();
    
  } catch (error) {
    console.error('Error verifying API key:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

module.exports = { verifyApiKey };
