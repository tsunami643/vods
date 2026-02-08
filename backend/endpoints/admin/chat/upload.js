const { verifyApiKey } = require('../../../middleware/auth');
const { parseOrPassthrough } = require('../../../services/chat_parser');
const { saveChatData, getVideoIdByYoutubeId, getVideoIdByTwitchId } = require('../../../services/chat_db');

module.exports = (app) => {
  app.post('/admin/chat/upload/:videoId?', verifyApiKey, async (req, res) => {
    try {
      const urlVideoId = req.params.videoId;
      const { video_id, youtube_id, twitch_id, chat_data } = req.body;
      
      if (!chat_data) {
        return res.status(400).json({ error: 'chat_data is required' });
      }
      
      let internalVideoId = null;
      let twitchVideoId = twitch_id || null;
      
      if (urlVideoId) {
        if (/^\d+$/.test(urlVideoId)) {
          internalVideoId = parseInt(urlVideoId);
        } else {
          internalVideoId = await getVideoIdByYoutubeId(urlVideoId);
        }
      }
      
      if (!internalVideoId && video_id) {
        internalVideoId = parseInt(video_id);
      }
      
      if (!internalVideoId && youtube_id) {
        internalVideoId = await getVideoIdByYoutubeId(youtube_id);
      }
      
      if (!internalVideoId && twitch_id) {
        internalVideoId = await getVideoIdByTwitchId(twitch_id);
        twitchVideoId = twitch_id;
      }
      
      if (!internalVideoId) {
        return res.status(400).json({ 
          error: 'Could not find video. Provide valid video_id in URL or body, youtube_id, or twitch_id' 
        });
      }
      
      const parsedData = parseOrPassthrough(chat_data);
      
      if (!parsedData.chatList || parsedData.chatList.length === 0) {
        return res.status(400).json({ error: 'No chat messages found in data' });
      }
      
      const result = await saveChatData(internalVideoId, parsedData, twitchVideoId);
      
      res.json({
        success: true,
        videoId: internalVideoId,
        messageCount: result.messageCount,
        metadataId: result.metadataId
      });
      
    } catch (error) {
      console.error('Error in POST /admin/chat/upload:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
