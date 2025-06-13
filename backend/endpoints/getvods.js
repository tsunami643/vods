const vodsService = require('../services/vods');
const config = require('../config');

// TODO: rework this method and update docs

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
 */
module.exports = (app) => {
  app.get('/getvods', async (req, res) => {
    try {
      const origin = req.headers.origin;
      const allowedOrigin = vodsService.checkOrigin(origin);
      
      const allPlaylists = await vodsService.getVods(config.MONGO_DATA_API_KEY);
      
      res.set(vodsService.corsHeaders(allowedOrigin));
      res.json(allPlaylists);
    } catch (error) {
      console.error('Error in /getvods:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}; 