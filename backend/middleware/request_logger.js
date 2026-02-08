/**
 * Middleware to log all requests in structured JSON format
 * Logs after response is sent so apiKeyInfo is available (set by auth middleware)
 */
function logRequest(req, res, next) {
  // Store request time
  const requestTime = new Date().toISOString();
  
  // Log after response is finished
  res.on('finish', () => {
    const logEntry = {
      time: requestTime,
      path: req.path,
      method: req.method,
      accessKeyName: req.apiKeyInfo ? req.apiKeyInfo.name : null,
      params: req.params,
      body: req.body
    };
    
    console.log(JSON.stringify(logEntry));
  });
  
  next();
}

module.exports = { logRequest };

