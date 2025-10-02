const vodsService = require('../../../services/vods');
const { verifyApiKey } = require('../../../middleware/auth');

/**
 * @swagger
 * /admin/game/delete/{id}:
 *   delete:
 *     summary: Delete a game stream record
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
 *         description: Game deleted successfully
 *       404:
 *         description: Game not found
 *       500:
 *         description: Internal server error
 */

module.exports = (app) => {
  // Delete a game stream record
  app.delete('/admin/game/delete/:id', verifyApiKey, async (req, res) => {
    try {
      const streamId = parseInt(req.params.id);
      
      if (isNaN(streamId)) {
        return res.status(400).json({ error: 'Invalid stream ID' });
      }
      
      const result = await vodsService.deleteStream(streamId);
      
      if (!result) {
        return res.status(404).json({ error: 'Game not found' });
      }
      
      res.json({
        id: result.id,
        message: 'Game deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting game:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
