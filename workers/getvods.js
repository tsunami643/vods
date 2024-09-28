addEventListener('fetch', event => {
  event.respondWith(party(event))
})

const allowedOrigins = [
  'https://getvods.tsunami.workers.dev',
  'http://localhost:3000',
  'https://howdoiplay.com'
]

// A function that returns a set of CORS headers
const corsHeaders = origin => ({
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Origin': origin
})

const checkOrigin = request => {
  const origin = request.headers.get("Origin")
  const foundOrigin = allowedOrigins.find(allowedOrigin => allowedOrigin.includes(origin))
  return foundOrigin ? foundOrigin : allowedOrigins[0]
}

// The URL for the remote third party API you want to fetch from
// but does not implement CORS
const API_URL = 'https://data.mongodb-api.com/app/data-xcogu/endpoint/data/v1/action/find';

const party = async event => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      'api-key': MONGO_DATA_API_KEY,
      "Content-Type": "application/json;charset=UTF-8",
      ...corsHeaders
    },
    body: JSON.stringify({
      "collection": "streams",
      "database": "vods",
      "dataSource": "vods",
      "projection": {
          "_id": 0
      }
    })
  })
  let data = await response.json()
  let allPlaylists = data.documents;
  allPlaylists.sort(function(a,b){
  return new Date(b.dateCompleted) - new Date(a.dateCompleted)
  })
  console.log(allPlaylists)
  // Check that the request's origin is a valid origin, allowed to access this API
  const allowedOrigin = checkOrigin(event.request)

  return new Response(JSON.stringify(allPlaylists),
    { headers: { 'Content-type': 'application/json', ...corsHeaders(allowedOrigin) } })
}