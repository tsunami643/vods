const pool = require('../../../db/connection');
const { verifyApiKey } = require('../../../middleware/auth');

/**
 * @swagger
 * /admin/video/get:
 *   get:
 *     summary: Get all videos
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of videos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   yt_id:
 *                     type: string
 *                   twitch_id:
 *                     type: integer
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
 * /admin/video/get/{id}:
 *   get:
 *     summary: Get a specific video by ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video details
 *       404:
 *         description: Video not found
 *       500:
 *         description: Internal server error
 */

module.exports = (app) => {
  // Get all videos
  app.get('/admin/video/get', verifyApiKey, async (req, res) => {
    try {
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          'SELECT id, yt_id, twitch_id, name, tags, created_at, updated_at FROM videos ORDER BY created_at DESC'
        );
        
        res.json(result.rows);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting videos:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get specific video by ID
  app.get('/admin/video/get/:id', verifyApiKey, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      
      if (isNaN(videoId)) {
        return res.status(400).json({ error: 'Invalid video ID' });
      }

      const client = await pool.connect();
      
      try {
        const result = await client.query(
          'SELECT id, yt_id, twitch_id, name, tags, created_at, updated_at FROM videos WHERE id = $1',
          [videoId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Video not found' });
        }

        res.json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error getting video:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
