const vodsService = require('../../../services/vods');
const { verifyApiKey } = require('../../../middleware/auth');
const pool = require('../../../db/connection');

/**
 * @swagger
 * /admin/game/get:
 *   get:
 *     summary: Get all game stream records (same as /getvods but for admin use)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of games
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GameResponse'
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/game/get/{id}:
 *   get:
 *     summary: Get a specific game stream record by ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *     responses:
 *       200:
 *         description: Game details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameResponse'
 *       404:
 *         description: Game not found
 *       500:
 *         description: Internal server error
 */

module.exports = (app) => {
  // Get all games with enhanced information
  app.get('/admin/game/get', verifyApiKey, async (req, res) => {
    try {
      const enhancedGames = await vodsService.getVodsEnhanced();
      res.json(enhancedGames);
    } catch (error) {
      console.error('Error getting games:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get specific game by ID with enhanced information
  app.get('/admin/game/get/:id', verifyApiKey, async (req, res) => {
    try {
      const streamId = parseInt(req.params.id);
      
      if (isNaN(streamId)) {
        return res.status(400).json({ error: 'Invalid stream ID' });
      }
      
      const client = await pool.connect();
      
      try {
        // Query to get single game with full playlist and video information
        const query = `
          SELECT 
            s.id as stream_id,
            s.game_name,
            s.tags as stream_tags,
            s.stream_count,
            s.date_completed,
            s.game_cover,
            
            -- Playlist information
            p.id as playlist_internal_id,
            p.youtube_id as playlist_youtube_id,
            p.name as playlist_name,
            p.tags as playlist_tags,
            
            -- First video information
            fv.id as first_video_internal_id,
            fv.yt_id as first_video_youtube_id,
            fv.twitch_id as first_video_twitch_id,
            fv.name as first_video_name,
            fv.tags as first_video_tags
            
          FROM streams s
          LEFT JOIN playlists p ON s.playlist_id = p.id
          LEFT JOIN videos fv ON s.first_video_id = fv.id
          WHERE s.id = $1
        `;
        
        const result = await client.query(query, [streamId]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Game not found' });
        }
        
        const row = result.rows[0];
        
        // Get videos for the playlist if it exists
        let playlistVideos = [];
        if (row.playlist_internal_id) {
          const videosQuery = `
            SELECT DISTINCT v.id, v.yt_id, v.twitch_id, v.name, v.tags, v.created_at
            FROM videos v
            INNER JOIN streams s2 ON s2.first_video_id = v.id OR s2.playlist_id IN (
              SELECT p2.id FROM playlists p2 WHERE p2.youtube_id = (
                SELECT p3.youtube_id FROM playlists p3 WHERE p3.id = s2.playlist_id
              )
            )
            WHERE s2.playlist_id = $1
            ORDER BY v.created_at
          `;
          
          const videosResult = await client.query(videosQuery, [row.playlist_internal_id]);
          playlistVideos = videosResult.rows.map(v => ({
            internalId: v.id,
            youtubeId: v.yt_id,
            twitchId: v.twitch_id,
            name: v.name,
            tags: v.tags,
            createdAt: v.created_at
          }));
        }
        
        const game = {
          streamId: row.stream_id,
          gameName: row.game_name,
          tags: row.stream_tags,
          streams: row.streams,
          dateCompleted: row.date_completed,
          gameCover: row.game_cover,
          
          // Enhanced playlist information
          playlist: row.playlist_internal_id ? {
            internalId: row.playlist_internal_id,
            youtubeId: row.playlist_youtube_id,
            name: row.playlist_name,
            tags: row.playlist_tags,
            videos: playlistVideos
          } : null,
          
          // Enhanced first video information
          firstVideo: {
            internalId: row.first_video_internal_id,
            youtubeId: row.first_video_youtube_id,
            twitchId: row.first_video_twitch_id,
            name: row.first_video_name,
            tags: row.first_video_tags
          }
        };
        
        res.json(game);
        
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting game:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
