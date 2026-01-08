function extractBadgeUrl(badge) {
  if (!badge?.icons?.length) return null;
  const icon = badge.icons.find(i => i.id === '18x18') || badge.icons[0];
  const url = icon?.url || '';
  const match = url.match(/badges\/v1\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}

function detectEmoteSource(emote) {
  if (!emote?.images?.length) return 'Twitch';
  const url = emote.images[0]?.url || '';
  if (url.includes('betterttv')) return 'BetterTTV Channel';
  if (url.includes('frankerfacez')) return 'FrankerFaceZ Channel';
  if (url.includes('7tv')) return '7TV Channel';
  return 'Twitch';
}

function parseRawChatLog(rawData) {
  const messages = Array.isArray(rawData) ? rawData : [];
  
  const badgeMap = new Map();
  const emoteMap = new Map();
  const userMap = new Map();
  
  const badgeList = [];
  const emoteList = [];
  const userList = [];
  const chatList = [];

  for (const msg of messages) {
    if (msg.message_type !== 'text_message') continue;
    
    const author = msg.author || {};
    const userKey = `${author.display_name || author.name}:${author.colour || '#FFFFFF'}`;
    
    if (!userMap.has(userKey)) {
      userMap.set(userKey, userList.length);
      userList.push({
        name: author.display_name || author.name || 'Unknown',
        color: author.colour || '#FFFFFF'
      });
    }
    
    const userIdx = userMap.get(userKey);
    const badgeIndices = [];
    
    if (author.badges) {
      for (const badge of author.badges) {
        const setVersion = `${badge.name}:${badge.version}`;
        if (!badgeMap.has(setVersion)) {
          const url = extractBadgeUrl(badge);
          if (url) {
            badgeMap.set(setVersion, badgeList.length);
            badgeList.push({
              setVersion,
              title: badge.title || badge.name,
              url
            });
          }
        }
        if (badgeMap.has(setVersion)) {
          badgeIndices.push(badgeMap.get(setVersion));
        }
      }
    }
    
    const emoteIndices = [];
    
    if (msg.emotes) {
      for (const emote of msg.emotes) {
        const source = detectEmoteSource(emote);
        const emoteKey = `${emote.name}:${emote.id}:${source}`;
        
        if (!emoteMap.has(emoteKey)) {
          emoteMap.set(emoteKey, emoteList.length);
          emoteList.push({
            text: emote.name,
            id: emote.id,
            source
          });
        }
        
        const emoteIdx = emoteMap.get(emoteKey);
        const locations = emote.locations || '';
        const [start, end] = locations.split('-').map(Number);
        
        if (!isNaN(start) && !isNaN(end)) {
          emoteIndices.push([emoteIdx, start, end]);
        }
      }
    }
    
    const chatMessage = {
      time: Math.floor(msg.time_in_seconds || 0),
      user: userIdx,
      message: msg.message || ''
    };
    
    if (badgeIndices.length > 0) {
      chatMessage.badges = badgeIndices;
    }
    
    if (emoteIndices.length > 0) {
      chatMessage.emotes = emoteIndices;
    }
    
    chatList.push(chatMessage);
  }
  
  chatList.sort((a, b) => a.time - b.time);
  
  return {
    badgeList,
    emoteList,
    userList,
    chatList
  };
}

function isAlreadyParsed(data) {
  if (!data || typeof data !== 'object') return false;
  return Array.isArray(data.badgeList) && 
         Array.isArray(data.emoteList) && 
         Array.isArray(data.userList) && 
         Array.isArray(data.chatList);
}

function parseOrPassthrough(data) {
  if (isAlreadyParsed(data)) {
    return data;
  }
  return parseRawChatLog(data);
}

function splitChatByTime(parsedData, chunkSeconds = 60) {
  const chunks = {};
  const { chatList } = parsedData;
  
  for (let i = 0; i < chatList.length; i++) {
    const msg = chatList[i];
    const chunkIndex = Math.floor(msg.time / chunkSeconds);
    
    if (!chunks[chunkIndex]) {
      chunks[chunkIndex] = [];
    }
    chunks[chunkIndex].push(msg);
  }
  
  return chunks;
}

module.exports = {
  parseRawChatLog,
  isAlreadyParsed,
  parseOrPassthrough,
  splitChatByTime
};
