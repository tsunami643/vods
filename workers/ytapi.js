//Worker template from https://github.com/codewithkristian/workers-unsplash-api
//Tutorial https://egghead.io/lessons/cloudflare-add-cors-headers-to-a-third-party-api-response-in-a-workers-api

// Import the shared service logic
const { getYouTubePlaylists, corsHeaders, checkOrigin } = require('../backend/services/ytapi');

// Handle incoming fetch events with handleRequest function
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

const getPlaylists = async event => {
  try {
    // Get YouTube playlists using shared service
    const allPlaylists = await getYouTubePlaylists(YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID);
    
    // Check that the request's origin is a valid origin, allowed to access this API
    const allowedOrigin = checkOrigin(event.request.headers.get("Origin"));

    return new Response(
      JSON.stringify(allPlaylists),
      { headers: { 'Content-type': 'application/json', ...corsHeaders(allowedOrigin) } }
    )
  } catch (error) {
    console.error('Error in ytapi worker:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-type': 'application/json' }
    });
  }
}

async function handleRequest(event) {
  if (event.request.method === "GET") return getPlaylists(event)
}