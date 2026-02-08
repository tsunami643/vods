const fs = require('fs');
const path = require('path');

/**
 * Recursively loads all JavaScript files from the endpoints directory
 * and registers them with the Express app
 */
function loadEndpoints(app, endpointsDir) {
  const loadedEndpoints = [];
  
  function loadFromDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recursively load from subdirectories
        loadFromDirectory(fullPath);
      } else if (stat.isFile() && item.endsWith('.js')) {
        try {
          // Load the endpoint module
          const endpointModule = require(fullPath);
          
          // Check if it exports a function
          if (typeof endpointModule === 'function') {
            // Register the endpoint with the app
            endpointModule(app);
            
            // Track loaded endpoint for logging
            const relativePath = path.relative(endpointsDir, fullPath);
            loadedEndpoints.push(relativePath);
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`📍 Loaded endpoint: ${relativePath}`);
            }
          } else {
            console.warn(`⚠️  Skipping ${item}: does not export a function`);
          }
        } catch (error) {
          console.error(`❌ Error loading endpoint ${item}:`, error.message);
        }
      }
    }
  }
  
  if (fs.existsSync(endpointsDir)) {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      console.log('🔄 Loading endpoints...');
    }
    
    loadFromDirectory(endpointsDir);
    
    if (isDev) {
      console.log(`✅ Successfully loaded ${loadedEndpoints.length} endpoints`);
    } else {
      console.log(`Loaded ${loadedEndpoints.length} endpoints`);
    }
  } else {
    console.warn(`⚠️  Endpoints directory not found: ${endpointsDir}`);
  }
  
  return loadedEndpoints;
}

module.exports = loadEndpoints; 