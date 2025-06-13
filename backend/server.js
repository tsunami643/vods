const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const config = require('./config');
const pool = require('./db/connection');
const loadEndpoints = require('./utils/loadEndpoints');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tsunami VODs API',
      version: '1.0.0',
      description: 'API for managing Tsunami\'s Twitch VODs and YouTube content',
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: [
    './backend/server.js',
    './backend/endpoints/**/*.js'
  ], // Include all endpoint files for Swagger documentation
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Automatically load all endpoints from the endpoints directory
const endpointsDir = path.join(__dirname, 'endpoints');
loadEndpoints(app, endpointsDir);

// Test database connection and start server
async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');
    
    app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`);
      console.log(`Swagger documentation available at http://localhost:${config.PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 