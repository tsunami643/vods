const { parseOrPassthrough, isAlreadyParsed, parseRawChatLog } = require('./chat_parser');

function convertChatData(chatData) {
  return parseOrPassthrough(chatData);
}

function validateChatData(chatData) {
  if (!chatData || typeof chatData !== 'object') return false;
  
  if (isAlreadyParsed(chatData)) {
    return Array.isArray(chatData.chatList);
  }
  
  if (Array.isArray(chatData)) {
    if (chatData.length === 0) return true;
    const first = chatData[0];
    return first && (
      typeof first.message === 'string' ||
      typeof first.time_in_seconds === 'number'
    );
  }
  
  return false;
}

module.exports = {
  convertChatData,
  validateChatData,
  parseRawChatLog,
  parseOrPassthrough,
  isAlreadyParsed
};
