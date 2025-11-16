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
    
    // Attach API key info to request
    req.apiKeyInfo = result.rows[0];
    
    // Log admin request in structured JSON format
    const logEntry = {
      time: new Date().toISOString(),
      path: req.path,
      method: req.method,
      accessKeyName: result.rows[0].name,
      params: req.params,
      body: req.body
    };
    console.log(JSON.stringify(logEntry));
    
    next();
    
  } catch (error) {
    console.error('Error verifying API key:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

module.exports = { verifyApiKey };
