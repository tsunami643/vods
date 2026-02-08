const vodsService = require('../services/vods');

module.exports = (app) => {
  app.get('/playlist/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const data = await vodsService.getPlaylistById(id);
      if (!data) return res.status(404).json({ error: 'Not found' });
      res.json(data);
    } catch (err) {
      console.error('Error in /playlist/:id:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
