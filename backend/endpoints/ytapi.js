const ytapiService = require('../services/ytapi');
const config = require('../config');

// TODO: rework this method and update docs

/**
 * @swagger
 * /ytapi:
 *   get:
 *     summary: Get YouTube playlists
 *     tags: [YouTube]
 *     responses:
 *       200:
 *         description: clone of ytapi worker
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
module.exports = (app) => {
  app.get('/ytapi', async (req, res) => {
    try {
      const origin = req.headers.origin;
      const allowedOrigin = ytapiService.checkOrigin(origin);
      
      const allPlaylists = await ytapiService.getYouTubePlaylists(
        config.YOUTUBE_API_KEY,
        config.YOUTUBE_CHANNEL_ID
      );
      
      res.set(ytapiService.corsHeaders(allowedOrigin));
      res.json(allPlaylists);
    } catch (error) {
      console.error('Error in /ytapi:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}; 