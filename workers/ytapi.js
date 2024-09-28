//Worker template from https://github.com/codewithkristian/workers-unsplash-api
//Tutorial https://egghead.io/lessons/cloudflare-add-cors-headers-to-a-third-party-api-response-in-a-workers-api

// Handle incoming fetch events with handleRequest function
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

// A list of allowed origins that can access our backend API
const allowedOrigins = [
  'https://vods.tsunami.workers.dev',
  "http://localhost:3000"
]

// A function that returns a set of CORS headers
const corsHeaders = origin => ({
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Origin': origin
})

const init = {
  headers: {
    'content-type': 'application/json;charset=UTF-8',
    ...corsHeaders
  },
};

// Check the origin for this request
// If it is included in our set of known and allowed origins, return it, otherwise
// return a known, good origin. This effectively does not allow browsers to
// continue requests if the origin they're requesting from doesn't match.
const checkOrigin = request => {
  const origin = request.headers.get("Origin")
  const foundOrigin = allowedOrigins.find(allowedOrigin => allowedOrigin.includes(origin))
  return foundOrigin ? foundOrigin : allowedOrigins[0]
}

const allPlaylistsURL = (
    'https://youtube.googleapis.com/youtube/v3/playlists?' +
    new URLSearchParams({ part: "snippet,contentDetails",
    channelId : YOUTUBE_CHANNEL_ID,
    fields: "nextPageToken,items(id,snippet(title,description),contentDetails(itemCount))",
    maxResults: 20,
    key: YOUTUBE_API_KEY}).toString()
  );

const getPlaylists = async event => {
  const response = await fetch(allPlaylistsURL, init);
  let data = await response.json();
  let streamList = data.items;
  let nextPageToken = data.nextPageToken;
  /*while(nextPageToken){
    const additionalPage = await fetch(allPlaylistsURL+`&pageToken=${nextPageToken}`)
    const additionalData = await additionalPage.json();
    additionalStreamList = additionalData.items;
    streamList = streamList.concat(additionalStreamList);
    nextPageToken = additionalData.nextPageToken;
  }*/

  //console.log(streamList);

  const allPlaylists = streamList.map(stream => (
      {
        gameName: stream.snippet.title,
        tags: stream.snippet.description.split(','),
        streams: stream.contentDetails.itemCount,
        playlistId: stream.id
      }
    )
  )

  await Promise.all(allPlaylists.map(async (stream) => {
      const detailPromise = await fetch(`https://youtube.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${stream.playlistId}&fields=items(contentDetails)&key=${YOUTUBE_API_KEY}`)
      //const coverPromise = await fetch(`https://shouldiplay-api.up.railway.app/hltb/${stream.gameName.toLowerCase()}`)
      const playlistDetail = await detailPromise.json();
      //const playlistCover = await coverPromise.json();
      //stream.gameCover = playlistCover.data[0].game_image;
      stream.firstVideo = playlistDetail.items[0].contentDetails.videoId;
      stream.dateCompleted = new Date(playlistDetail.items[playlistDetail.items.length-1].contentDetails.videoPublishedAt);
      //console.log(allPlaylists)
    })
  )

  // Check that the request's origin is a valid origin, allowed to access this API
  const allowedOrigin = checkOrigin(event.request)

  return new Response(
    JSON.stringify(allPlaylists),
    { headers: { 'Content-type': 'application/json', ...corsHeaders(allowedOrigin) } }
  )
}

async function handleRequest(event) {
  if (event.request.method === "GET") return getPlaylists(event)
}