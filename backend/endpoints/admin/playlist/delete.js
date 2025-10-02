const pool = require('../../../db/connection');
const { verifyApiKey } = require('../../../middleware/auth');

/**
 * @swagger
 * /admin/playlist/delete/{id}:
 *   delete:
 *     summary: Delete a playlist
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
 *         description: Playlist deleted successfully
 *       404:
 *         description: Playlist not found
 *       409:
 *         description: Cannot delete playlist - it's referenced by streams
 *       500:
 *         description: Internal server error
 */

module.exports = (app) => {
  app.delete('/admin/playlist/delete/:id', verifyApiKey, async (req, res) => {
    try {
      const playlistId = parseInt(req.params.id);
      
      if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
      }
      
      const client = await pool.connect();
      
      try {
        // Check if playlist is referenced by any streams
        const streamCheck = await client.query(
          'SELECT COUNT(*) FROM streams WHERE playlist_id = $1',
          [playlistId]
        );
        
        if (parseInt(streamCheck.rows[0].count) > 0) {
          return res.status(409).json({ 
            error: 'Cannot delete playlist - it is referenced by existing streams',
            referenced_streams: parseInt(streamCheck.rows[0].count)
          });
        }
        
        const result = await client.query(
          'DELETE FROM playlists WHERE id = $1 RETURNING *',
          [playlistId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Playlist not found' });
        }
        
        res.json({
          message: 'Playlist deleted successfully',
          deleted_playlist: result.rows[0]
        });
        
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
