const pool = require('../../../db/connection');
const { verifyApiKey } = require('../../../middleware/auth');

/**
 * @swagger
 * /admin/playlist/create:
 *   post:
 *     summary: Create a new playlist
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - youtube_id
 *             properties:
 *               youtube_id:
 *                 type: string
 *                 description: YouTube playlist ID
 *               name:
 *                 type: string
 *                 description: Playlist name
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Playlist tags
 *     responses:
 *       201:
 *         description: Playlist created successfully
 *       400:
 *         description: Bad request or playlist already exists
 *       500:
 *         description: Internal server error
 */

module.exports = (app) => {
  app.post('/admin/playlist/create', verifyApiKey, async (req, res) => {
    try {
      const { youtube_id, name, tags } = req.body;
      
      // Validate required fields
      if (!youtube_id) {
        return res.status(400).json({ 
          error: 'Missing required field: youtube_id' 
        });
      }
      
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          'INSERT INTO playlists (youtube_id, name, tags) VALUES ($1, $2, $3) RETURNING *',
          [youtube_id, name || null, JSON.stringify(tags || [])]
        );
        
        res.status(201).json({
          message: 'Playlist created successfully',
          playlist: result.rows[0]
        });
        
      } catch (dbError) {
        if (dbError.code === '23505') { // Unique violation
          return res.status(400).json({ 
            error: 'Playlist with this YouTube ID already exists' 
          });
        }
        throw dbError;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
