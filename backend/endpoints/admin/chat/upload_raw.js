const { verifyApiKey } = require('../../../middleware/auth');
const { parseRawChatLog } = require('../../../services/chat_parser');
const { saveChatData, getVideoIdByYoutubeId, getVideoIdByTwitchId } = require('../../../services/chat_db');

module.exports = (app) => {
  app.post('/admin/chat/upload-raw', verifyApiKey, async (req, res) => {
    try {
      const { video_id, youtube_id, twitch_id, raw_chat } = req.body;
      
      if (!raw_chat || !Array.isArray(raw_chat)) {
        return res.status(400).json({ error: 'raw_chat array is required' });
      }
      
      let internalVideoId = video_id ? parseInt(video_id) : null;
      let twitchVideoId = twitch_id || null;
      
      if (!internalVideoId && youtube_id) {
        internalVideoId = await getVideoIdByYoutubeId(youtube_id);
      }
      
      if (!internalVideoId && twitch_id) {
        internalVideoId = await getVideoIdByTwitchId(twitch_id);
        twitchVideoId = twitch_id;
      }
      
      if (!internalVideoId) {
        return res.status(400).json({ 
          error: 'Could not find video. Provide valid video_id, youtube_id, or twitch_id' 
        });
      }
      
      const parsedData = parseRawChatLog(raw_chat);
      
      if (parsedData.chatList.length === 0) {
        return res.status(400).json({ error: 'No valid chat messages found in data' });
      }
      
      const result = await saveChatData(internalVideoId, parsedData, twitchVideoId);
      
      res.json({
        success: true,
        videoId: internalVideoId,
        messageCount: result.messageCount,
        metadataId: result.metadataId,
        stats: {
          badges: parsedData.badgeList.length,
          emotes: parsedData.emoteList.length,
          users: parsedData.userList.length
        }
      });
      
    } catch (error) {
      console.error('Error in POST /admin/chat/upload-raw:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
