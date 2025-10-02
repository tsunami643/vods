const pool = require('../../../db/connection');
const { verifyApiKey } = require('../../../middleware/auth');

/**
 * @swagger
 * /admin/video/delete/{id}:
 *   delete:
 *     summary: Delete a video
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
 *         description: Video deleted successfully
 *       404:
 *         description: Video not found
 *       409:
 *         description: Cannot delete video - it's referenced by streams or chat logs
 *       500:
 *         description: Internal server error
 */

module.exports = (app) => {
  app.delete('/admin/video/delete/:id', verifyApiKey, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      
      if (isNaN(videoId)) {
        return res.status(400).json({ error: 'Invalid video ID' });
      }
      
      const client = await pool.connect();
      
      try {
        // Check if video is referenced by any streams
        const streamCheck = await client.query(
          'SELECT COUNT(*) FROM streams WHERE first_video_id = $1',
          [videoId]
        );
        
        // Check if video is referenced by any chat logs
        const chatCheck = await client.query(
          'SELECT COUNT(*) FROM chat_logs WHERE video_id = $1',
          [videoId]
        );
        
        const streamCount = parseInt(streamCheck.rows[0].count);
        const chatCount = parseInt(chatCheck.rows[0].count);
        
        if (streamCount > 0 || chatCount > 0) {
          return res.status(409).json({ 
            error: 'Cannot delete video - it is referenced by existing records',
            referenced_streams: streamCount,
            referenced_chat_logs: chatCount
          });
        }
        
        const result = await client.query(
          'DELETE FROM videos WHERE id = $1 RETURNING *',
          [videoId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Video not found' });
        }
        
        res.json({
          message: 'Video deleted successfully',
          deleted_video: result.rows[0]
        });
        
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
