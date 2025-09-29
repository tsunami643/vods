const pool = require('../../../db/connection');
const { verifyApiKey } = require('../../../middleware/auth');

/**
 * @swagger
 * /admin/playlist/update/{id}:
 *   put:
 *     summary: Update an existing playlist
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *       200:
 *         description: Playlist updated successfully
 *       404:
 *         description: Playlist not found
 *       500:
 *         description: Internal server error
 */

module.exports = (app) => {
  app.put('/admin/playlist/update/:id', verifyApiKey, async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      const { youtube_id, name, tags } = req.body;
      
      if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
      }
      
      const client = await pool.connect();
      
      try {
        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        
        if (youtube_id !== undefined) {
          updateFields.push(`youtube_id = $${paramCount++}`);
          values.push(youtube_id);
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
        values.push(playlistId);
        
        const updateQuery = `
          UPDATE playlists 
          SET ${updateFields.join(', ')} 
          WHERE id = $${paramCount} 
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, values);
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Playlist not found' });
        }
        
        res.json({
          message: 'Playlist updated successfully',
          playlist: result.rows[0]
        });
        
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
