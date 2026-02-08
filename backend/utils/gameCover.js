/**
 * Convert gameCover to URL
 * @param {string|Array} gameCover - Either a URL string or ["igdb", "id"] or ["hltb", "filename"]
 * @returns {string|null} - The full URL to the game cover image
 */
function getGameCoverUrl(gameCover) {
  if (!gameCover) return null;
  
  if (typeof gameCover === 'string') {
    return gameCover;
  }
  
  if (Array.isArray(gameCover) && gameCover.length === 2) {
    const [source, id] = gameCover;
    if (source === 'igdb') {
      return `https://images.igdb.com/igdb/image/upload/t_cover_small_2x/${id}.png`;
    } else if (source === 'hltb') {
      return `https://howlongtobeat.com/games/${id}?width=160`;
    }
  }
  
  return null;
}

/**
 * @param {string} dbValue - Value from database
 * @returns {string|null} - URL
 */
function convertGameCoverFromDb(dbValue) {
  if (!dbValue) return null;
  
  if (dbValue.startsWith('http')) {
    return dbValue;
  }
  
  try {
    const parsed = JSON.parse(dbValue);
    return getGameCoverUrl(parsed);
  } catch (e) {
    return dbValue;
  }
}

module.exports = { getGameCoverUrl, convertGameCoverFromDb };
