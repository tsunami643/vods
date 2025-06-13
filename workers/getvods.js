// Import the shared service logic
const { getVods, corsHeaders, checkOrigin } = require('../backend/services/vods');

addEventListener('fetch', event => {
  event.respondWith(party(event))
})

const party = async event => {
  try {
    // Get VODs using shared service
    const allPlaylists = await getVods(MONGO_DATA_API_KEY);
    
    // Check that the request's origin is a valid origin, allowed to access this API
    const allowedOrigin = checkOrigin(event.request.headers.get("Origin"));

    return new Response(JSON.stringify(allPlaylists),
      { headers: { 'Content-type': 'application/json', ...corsHeaders(allowedOrigin) } })
  } catch (error) {
    console.error('Error in getvods worker:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-type': 'application/json' }
    });
  }
}