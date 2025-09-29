const pool = require('../../../db/connection');
const { verifyApiKey } = require('../../../middleware/auth');

/**
 * @swagger
 * /admin/playlist/get:
 *   get:
 *     summary: Get all playlists
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of playlists
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   youtube_id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /admin/playlist/get/{id}:
 *   get:
 *     summary: Get a specific playlist by ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playlist ID
 *     responses:
 *       200:
 *         description: Playlist details
 *       404:
 *         description: Playlist not found
 *       500:
 *         description: Internal server error
 */

module.exports = (app) => {
  // Get all playlists
  app.get('/admin/playlist/get', verifyApiKey, async (req, res) => {
    try {
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          'SELECT id, youtube_id, name, tags, created_at, updated_at FROM playlists ORDER BY created_at DESC'
        );
        
        res.json(result.rows);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting playlists:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get specific playlist by ID
  app.get('/admin/playlist/get/:id', verifyApiKey, async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      
      if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
      }

      const client = await pool.connect();
      
      try {
        const result = await client.query(
          'SELECT id, youtube_id, name, tags, created_at, updated_at FROM playlists WHERE id = $1',
          [playlistId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Playlist not found' });
        }

        res.json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting playlist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
