const vodsService = require('../services/vods');

module.exports = (app) => {
  app.get('/video/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const isNumeric = /^\d+$/.test(id);
      
      let data;
      if (isNumeric) {
        data = await vodsService.getVideoById(parseInt(id));
      } else {
        data = await vodsService.getVideoByYoutubeId(id);
      }
      
      if (!data) return res.status(404).json({ error: 'Not found' });
      res.json(data);
    } catch (err) {
      console.error('Error in /video/:id:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
