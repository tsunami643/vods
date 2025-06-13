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
  'https://vods.tsunami.workers.dev',
  "http://localhost:3000"
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

async function getYouTubePlaylists(youtubeApiKey, channelId) {
  const init = {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
  };

  const allPlaylistsURL = (
    'https://youtube.googleapis.com/youtube/v3/playlists?' +
    new URLSearchParams({ 
      part: "snippet,contentDetails",
      channelId: channelId,
      fields: "nextPageToken,items(id,snippet(title,description),contentDetails(itemCount))",
      maxResults: 20,
      key: youtubeApiKey
    }).toString()
  );

  const response = await fetch(allPlaylistsURL, init);
  let data = await response.json();
  let streamList = data.items;
  let nextPageToken = data.nextPageToken;

  const allPlaylists = streamList.map(stream => ({
    gameName: stream.snippet.title,
    tags: stream.snippet.description.split(','),
    streams: stream.contentDetails.itemCount,
    playlistId: stream.id
  }));

  await Promise.all(allPlaylists.map(async (stream) => {
    const detailPromise = await fetch(`https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${stream.playlistId}&fields=items(contentDetails)&key=${youtubeApiKey}`);
    const playlistDetail = await detailPromise.json();
    stream.firstVideo = playlistDetail.items[0].contentDetails.videoId;
    stream.dateCompleted = new Date(playlistDetail.items[playlistDetail.items.length-1].contentDetails.videoPublishedAt);
  }));

  return allPlaylists;
}

module.exports = {
  getYouTubePlaylists,
  corsHeaders,
  checkOrigin,
  allowedOrigins
}; 