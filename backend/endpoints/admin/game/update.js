const vodsService = require('../../../services/vods');
const { generatePlaylistMetadata, generateVideoMetadata } = require('../../../utils/admin_utils');
const { verifyApiKey } = require('../../../middleware/auth');

/**
 * @swagger
 * /admin/game/update/{id}:
 *   put:
 *     summary: Update an existing game stream record
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Stream ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameRequest'
 *     responses:
 *       200:
 *         description: Game updated successfully
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
  // Update an existing game stream record
  app.put('/admin/game/update/:id', verifyApiKey, async (req, res) => {
    try {
      const streamId = parseInt(req.params.id);
      const { gameName, playlistId, firstVideo, tags, streams, dateCompleted, gameCover } = req.body;
      
      if (isNaN(streamId)) {
        return res.status(400).json({ error: 'Invalid stream ID' });
      }
      
      const streamData = {};
      
      // Add fields that are provided
      if (gameName) streamData.gameName = gameName;
      if (tags) streamData.tags = tags;
      if (streams) streamData.streams = streams;
      if (dateCompleted) streamData.dateCompleted = dateCompleted;
      if (gameCover) streamData.gameCover = gameCover;
      
      // Handle playlist update
      if (playlistId) {
        streamData.playlistId = playlistId;
        if (gameName) {
          const { playlistName, playlistTags } = await generatePlaylistMetadata(gameName);
          streamData.playlistName = playlistName;
          streamData.playlistTags = playlistTags;
        }
      }
      
      // Handle video update
      if (firstVideo) {
        streamData.firstVideo = firstVideo;
        if (gameName) {
          const { videoName, videoTags } = await generateVideoMetadata(gameName, playlistId || 'UNKNOWN');
          streamData.videoName = videoName;
          streamData.videoTags = videoTags;
        }
      }
      
      const result = await vodsService.updateStream(streamId, streamData);
      
      if (!result) {
        return res.status(404).json({ error: 'Game not found' });
      }
      
      res.json({
        id: result.id,
        message: 'Game updated successfully',
        data: streamData
      });
      
    } catch (error) {
      console.error('Error updating game:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
