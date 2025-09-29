 const vodsService = require('../../../services/vods');
const { generatePlaylistMetadata, generateVideoMetadata } = require('../../../utils/admin_utils');
const { verifyApiKey } = require('../../../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     GameRequest:
 *       type: object
 *       required:
 *         - gameName
 *         - playlistId
 *         - firstVideo
 *       properties:
 *         gameName:
 *           type: string
 *           description: Name of the game
 *         playlistId:
 *           type: string
 *           description: YouTube playlist ID
 *         firstVideo:
 *           type: string
 *           description: YouTube video ID of the first video
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Game tags/genres (optional)
 *         streams:
 *           type: integer
 *           description: Number of streams (default 1)
 *         dateCompleted:
 *           type: string
 *           format: date-time
 *           description: When the game was completed
 *         gameCover:
 *           type: string
 *           description: URL to game cover image
 *     GameResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Stream ID
 *         gameName:
 *           type: string
 *         playlistId:
 *           type: string
 *         firstVideo:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         streams:
 *           type: integer
 *         dateCompleted:
 *           type: string
 *           format: date-time
 *         gameCover:
 *           type: string
 */

/**
 * @swagger
 * /admin/game/create:
 *   post:
 *     summary: Create a new game stream record
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameRequest'
 *     responses:
 *       201:
 *         description: Game created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GameResponse'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

module.exports = (app) => {
  // Create a new game stream record
  app.post('/admin/game/create', verifyApiKey, async (req, res) => {
    try {
      const { gameName, playlistId, firstVideo, tags, streams, dateCompleted, gameCover } = req.body;
      
      // Validate required fields
      if (!gameName || !playlistId || !firstVideo) {
        return res.status(400).json({ 
          error: 'Missing required fields: gameName, playlistId, firstVideo' 
        });
      }
      
      // Generate metadata for playlist and video
      const { playlistName, playlistTags } = await generatePlaylistMetadata(gameName);
      const { videoName, videoTags } = await generateVideoMetadata(gameName, playlistId);
      
      const streamData = {
        gameName,
        playlistId,
        playlistName,
        playlistTags,
        firstVideo,
        videoName,
        videoTags,
        tags: tags || [gameName],
        streams: streams || 1,
        dateCompleted,
        gameCover
      };
      
      const result = await vodsService.createStream(streamData);
      
      res.status(201).json({
        id: result.id,
        message: 'Game created successfully',
        data: streamData
      });
      
    } catch (error) {
      console.error('Error creating game:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
