const { getChatByVideoId, getChatMetadata, getVideoIdByYoutubeId } = require('../services/chat_db');

module.exports = (app) => {
  app.get('/chat/:videoId', async (req, res) => {
    try {
      const { videoId } = req.params;
      const { start, end } = req.query;
      
      let internalVideoId = parseInt(videoId);
      
      if (isNaN(internalVideoId)) {
        internalVideoId = await getVideoIdByYoutubeId(videoId);
        if (!internalVideoId) {
          return res.status(404).json({ error: 'Video not found' });
        }
      }
      
      const startTime = start ? parseInt(start) : 0;
      const endTime = end ? parseInt(end) : null;
      
      const chatData = await getChatByVideoId(internalVideoId, startTime, endTime);
      
      if (!chatData) {
        return res.status(404).json({ error: 'No chat data for this video' });
      }
      
      res.json(chatData);
      
    } catch (error) {
      console.error('Error in GET /chat/:videoId:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  app.get('/chat/:videoId/metadata', async (req, res) => {
    try {
      const { videoId } = req.params;
      
      let internalVideoId = parseInt(videoId);
      
      if (isNaN(internalVideoId)) {
        internalVideoId = await getVideoIdByYoutubeId(videoId);
        if (!internalVideoId) {
          return res.status(404).json({ error: 'Video not found' });
        }
      }
      
      const metadata = await getChatMetadata(internalVideoId);
      
      if (!metadata) {
        return res.status(404).json({ error: 'No chat data for this video' });
      }
      
      res.json({
        videoId: metadata.video_id,
        twitchVideoId: metadata.twitch_video_id,
        totalMessages: metadata.total_messages,
        duration: metadata.duration,
        createdAt: metadata.created_at
      });
      
    } catch (error) {
      console.error('Error in GET /chat/:videoId/metadata:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
