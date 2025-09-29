const vodsService = require('../services/vods');

/**
 * @swagger
 * /getvods:
 *   get:
 *     summary: Get all VODs
 *     tags: [VODs]
 *     responses:
 *       200:
 *         description: List of VODs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   gameName:
 *                     type: string
 *                     description: Name of the game
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Game tags/genres
 *                   playlistId:
 *                     type: string
 *                     description: YouTube playlist ID
 *                   streams:
 *                     type: integer
 *                     description: Number of streams for this game
 *                   dateCompleted:
 *                     type: string
 *                     format: date-time
 *                     description: When the game was completed
 *                   firstVideo:
 *                     type: string
 *                     description: YouTube video ID of the first video
 *                   gameCover:
 *                     type: string
 *                     description: URL to game cover image
 *       500:
 *         description: Internal server error
 */
module.exports = (app) => {
  app.get('/getvods', async (req, res) => {
    try {
      const allPlaylists = await vodsService.getVods();
      
      res.json(allPlaylists);
    } catch (error) {
      console.error('Error in /getvods:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}; 