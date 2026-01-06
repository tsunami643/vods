const vodsService = require('../services/vods');

module.exports = (app) => {
  // GET /playlist/:id - return playlist details with ordered videos
  app.get('/playlist/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: 'Invalid playlist id' });
      const data = await vodsService.getPlaylistById(id);
      if (!data) return res.status(404).json({ error: 'Not found' });
      res.json(data);
    } catch (err) {
      console.error('Error in /playlist/:id:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};




