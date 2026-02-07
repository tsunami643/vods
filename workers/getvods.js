// Cloudflare Worker for VODs API
// Uses the exact same functions as the /getvods endpoint
// Establishes and closes a new PostgreSQL connection for each request

const createDatabaseConnection = async (env) => {
  const connectionString = env.DATABASE_URL || 
    `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;
  
  if (!connectionString || connectionString === 'postgresql://:::undefined/undefined') {
    throw new Error('Database environment variables not configured');
  }

  const postgres = (await import('postgres')).default;
  return postgres(connectionString);
};

const allowedOrigins = [
  'https://getvods.tsunami.workers.dev',
  'http://localhost:3000',
  'https://howdoiplay.com'
];

const corsHeaders = origin => ({
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Origin': origin
});

const checkOrigin = (originHeader) => {
  const foundOrigin = allowedOrigins.find(allowedOrigin => allowedOrigin.includes(originHeader));
  return foundOrigin ? foundOrigin : allowedOrigins[0];
};

/**
 * @param {string} dbValue - Value from database
 * @returns {string|null} - URL
 */
function convertGameCoverFromDb(dbValue) {
  if (!dbValue) return null;
  
  if (dbValue.startsWith('http')) {
    return dbValue;
  }
  
  try {
    const parsed = JSON.parse(dbValue);
    if (Array.isArray(parsed) && parsed.length === 2) {
      const [source, id] = parsed;
      if (source === 'igdb') {
        return `https://images.igdb.com/igdb/image/upload/t_cover_small_2x/${id}.png`;
      } else if (source === 'hltb') {
        return `https://howlongtobeat.com/games/${id}?width=160`;
      }
    }
  } catch (e) {
    // If parsing fails, treat as URL
  }
  
  return dbValue;
}

async function getVods(sql) {
  try {
    const result = await sql`
      SELECT 
        s.game_name as "gameName",
        s.tags,
        p.youtube_id as "playlistId",
        s.streams as "streams",
        s.date_completed as "dateCompleted",
        v.yt_id as "firstVideo",
        s.game_cover as "gameCover"
      FROM streams s
      LEFT JOIN playlists p ON s.playlist_id = p.id
      LEFT JOIN videos v ON s.first_video = v.id
      ORDER BY s.date_completed DESC NULLS LAST
    `;
    
    // Same exact data transformation as services/vods.js
    const allPlaylists = result.map(row => ({
      gameName: row.gameName,
      tags: Array.isArray(row.tags) ? row.tags : [],
      playlistId: row.playlistId,
      streams: row.streams || 1,
      dateCompleted: row.dateCompleted ? row.dateCompleted.toISOString() : null,
      firstVideo: row.firstVideo,
      gameCover: convertGameCoverFromDb(row.gameCover)
    }));
    
    return allPlaylists;
    
  } catch (error) {
    console.error('Error getting VODs:', error);
    throw error;
  }
}

export default {
  async fetch(request, env) {
    try {
      const origin = request.headers.get('origin');
      const allowedOrigin = checkOrigin(origin);
      
      const sql = await createDatabaseConnection(env);
      
      const allPlaylists = await getVods(sql);
      
      await sql.end();
      
      return new Response(JSON.stringify(allPlaylists), {
        headers: { 'Content-type': 'application/json', ...corsHeaders(allowedOrigin) }
      });
      
    } catch (error) {
      console.error('Error in getvods worker:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-type': 'application/json' }
      });
    }
  }
};