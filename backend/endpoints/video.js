const vodsService = require('../services/vods');

module.exports = (app) => {
  // GET /video/:id - return video details, order in playlist, total in playlist
  app.get('/video/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid video id' });
      const data = await vodsService.getVideoById(id);
      if (!data) return res.status(404).json({ error: 'Not found' });
      res.json(data);
    } catch (err) {
      console.error('Error in /video/:id:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};




