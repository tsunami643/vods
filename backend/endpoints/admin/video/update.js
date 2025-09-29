const pool = require('../../../db/connection');
const { verifyApiKey } = require('../../../middleware/auth');

/**
 * @swagger
 * /admin/video/update/{id}:
 *   put:
 *     summary: Update an existing video
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               yt_id:
 *                 type: string
 *                 description: YouTube video ID
 *               twitch_id:
 *                 type: integer
 *                 description: Twitch VOD ID
 *               name:
 *                 type: string
 *                 description: Video name
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Video tags
 *     responses:
 *       200:
 *         description: Video updated successfully
 *       404:
 *         description: Video not found
 *       500:
 *         description: Internal server error
 */

module.exports = (app) => {
  app.put('/admin/video/update/:id', verifyApiKey, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const { yt_id, twitch_id, name, tags } = req.body;
      
      if (isNaN(videoId)) {
        return res.status(400).json({ error: 'Invalid video ID' });
      }
      
      const client = await pool.connect();
      
      try {
        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        
        if (yt_id !== undefined) {
          updateFields.push(`yt_id = $${paramCount++}`);
          values.push(yt_id);
        }
        
        if (twitch_id !== undefined) {
          updateFields.push(`twitch_id = $${paramCount++}`);
          values.push(twitch_id);
        }
        
        if (name !== undefined) {
          updateFields.push(`name = $${paramCount++}`);
          values.push(name);
        }
        
        if (tags !== undefined) {
          updateFields.push(`tags = $${paramCount++}`);
          values.push(JSON.stringify(tags));
        }
        
        if (updateFields.length === 0) {
          return res.status(400).json({ error: 'No fields to update' });
        }
        
        updateFields.push(`updated_at = NOW()`);
        values.push(videoId);
        
        const updateQuery = `
          UPDATE videos 
          SET ${updateFields.join(', ')} 
          WHERE id = $${paramCount} 
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, values);
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Video not found' });
        }
        
        res.json({
          message: 'Video updated successfully',
          video: result.rows[0]
        });
        
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating video:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
