const pool = require('../../../db/connection');
const { verifyApiKey } = require('../../../middleware/auth');

/**
 * @swagger
 * /admin/video/create:
 *   post:
 *     summary: Create a new video
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - yt_id
 *             properties:
 *               yt_id:
 *                 type: string
 *                 description: YouTube video ID
 *               twitch_id:
 *                 type: integer
 *                 description: Twitch VOD ID (optional)
 *               name:
 *                 type: string
 *                 description: Video name
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Video tags
 *     responses:
 *       201:
 *         description: Video created successfully
 *       400:
 *         description: Bad request or video already exists
 *       500:
 *         description: Internal server error
 */

module.exports = (app) => {
  app.post('/admin/video/create', verifyApiKey, async (req, res) => {
    try {
      const { yt_id, twitch_id, name, tags } = req.body;
      
      // Validate required fields
      if (!yt_id) {
        return res.status(400).json({ 
          error: 'Missing required field: yt_id' 
        });
      }
      
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          'INSERT INTO videos (yt_id, twitch_id, name, tags) VALUES ($1, $2, $3, $4) RETURNING *',
          [yt_id, twitch_id || null, name || null, JSON.stringify(tags || [])]
        );
        
        res.status(201).json({
          message: 'Video created successfully',
          video: result.rows[0]
        });
        
      } catch (dbError) {
        if (dbError.code === '23505') { // Unique violation
          return res.status(400).json({ 
            error: 'Video with this YouTube ID already exists' 
          });
        }
        throw dbError;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating video:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
