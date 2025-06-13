// This module works both in Node.js (backend) and Cloudflare Workers
// Use fetch from node-fetch in Node.js, native fetch in Workers
let fetch;
if (typeof window === 'undefined' && typeof globalThis.fetch === 'undefined') {
  // Node.js environment
  fetch = require('node-fetch');
} else {
  // Browser or Workers environment with native fetch
  fetch = globalThis.fetch;
}

// CORS headers configuration
const allowedOrigins = [
  'https://getvods.tsunami.workers.dev',
  'http://localhost:3000',
  'https://howdoiplay.com'
];

const corsHeaders = origin => ({
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Origin': origin
});

const checkOrigin = (originHeader) => {
  const foundOrigin = allowedOrigins.find(allowedOrigin => allowedOrigin.includes(originHeader));
  return foundOrigin ? foundOrigin : allowedOrigins[0];
};

async function getVods(mongoApiKey) {
  const API_URL = 'https://data.mongodb-api.com/app/data-xcogu/endpoint/data/v1/action/find';
  
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      'api-key': mongoApiKey,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({
      "collection": "streams",
      "database": "vods",
      "dataSource": "vods",
      "projection": {
          "_id": 0
      }
    })
  });
  
  const data = await response.json();
  let allPlaylists = data.documents;
  allPlaylists.sort(function(a,b){
    return new Date(b.dateCompleted) - new Date(a.dateCompleted);
  });
  
  return allPlaylists;
}

module.exports = {
  getVods,
  corsHeaders,
  checkOrigin,
  allowedOrigins
}; 