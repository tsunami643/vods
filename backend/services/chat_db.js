const pool = require('../db/connection');

async function getOrCreateBadge(client, badge) {
  const result = await client.query(
    `INSERT INTO chat_badges (set_version, title, url) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (set_version) DO UPDATE SET title = EXCLUDED.title
     RETURNING id`,
    [badge.setVersion, badge.title, badge.url]
  );
  return result.rows[0].id;
}

async function getOrCreateEmote(client, emote) {
  const result = await client.query(
    `INSERT INTO chat_emotes (text, emote_id, source) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (text, emote_id, source) DO NOTHING
     RETURNING id`,
    [emote.text, emote.id, emote.source]
  );
  
  if (result.rows.length === 0) {
    const existing = await client.query(
      `SELECT id FROM chat_emotes WHERE text = $1 AND emote_id = $2 AND source = $3`,
      [emote.text, emote.id, emote.source]
    );
    return existing.rows[0].id;
  }
  return result.rows[0].id;
}

async function getOrCreateUser(client, user) {
  const result = await client.query(
    `INSERT INTO chat_users (name, color) 
     VALUES ($1, $2) 
     ON CONFLICT (name, color) DO NOTHING
     RETURNING id`,
    [user.name, user.color]
  );
  
  if (result.rows.length === 0) {
    const existing = await client.query(
      `SELECT id FROM chat_users WHERE name = $1 AND color = $2`,
      [user.name, user.color]
    );
    return existing.rows[0].id;
  }
  return result.rows[0].id;
}

async function saveChatData(videoId, parsedData, twitchVideoId = null) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const existing = await client.query(
      `SELECT id FROM chat_metadata WHERE video_id = $1`,
      [videoId]
    );
    
    if (existing.rows.length > 0) {
      await client.query(`DELETE FROM chat_messages WHERE metadata_id = $1`, [existing.rows[0].id]);
      await client.query(`DELETE FROM chat_metadata WHERE id = $1`, [existing.rows[0].id]);
    }
    
    const badgeIdMap = new Map();
    for (let i = 0; i < parsedData.badgeList.length; i++) {
      const dbId = await getOrCreateBadge(client, parsedData.badgeList[i]);
      badgeIdMap.set(i, dbId);
    }
    
    const emoteIdMap = new Map();
    for (let i = 0; i < parsedData.emoteList.length; i++) {
      const dbId = await getOrCreateEmote(client, parsedData.emoteList[i]);
      emoteIdMap.set(i, dbId);
    }
    
    const userIdMap = new Map();
    for (let i = 0; i < parsedData.userList.length; i++) {
      const dbId = await getOrCreateUser(client, parsedData.userList[i]);
      userIdMap.set(i, dbId);
    }
    
    const maxTime = parsedData.chatList.length > 0 
      ? Math.max(...parsedData.chatList.map(m => m.time))
      : 0;
    
    const metaResult = await client.query(
      `INSERT INTO chat_metadata (video_id, twitch_video_id, total_messages, duration)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [videoId, twitchVideoId, parsedData.chatList.length, maxTime]
    );
    
    const metadataId = metaResult.rows[0].id;
    
    const batchSize = 500;
    for (let i = 0; i < parsedData.chatList.length; i += batchSize) {
      const batch = parsedData.chatList.slice(i, i + batchSize);
      const values = [];
      const placeholders = [];
      let paramIdx = 1;
      
      for (const msg of batch) {
        const userId = userIdMap.get(msg.user);
        const badges = (msg.badges || []).map(idx => badgeIdMap.get(idx)).filter(Boolean);
        const emotes = (msg.emotes || []).map(([idx, start, end]) => ({
          id: emoteIdMap.get(idx),
          start,
          end
        }));
        
        placeholders.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
        values.push(metadataId, msg.time, userId, msg.message, `{${badges.join(',')}}`, JSON.stringify(emotes));
      }
      
      await client.query(
        `INSERT INTO chat_messages (metadata_id, time_seconds, user_id, message, badges, emotes)
         VALUES ${placeholders.join(', ')}`,
        values
      );
    }
    
    await client.query('COMMIT');
    
    return {
      metadataId,
      messageCount: parsedData.chatList.length
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getChatMetadata(videoId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT cm.*, v.yt_id as youtube_id, v.twitch_id
       FROM chat_metadata cm
       JOIN videos v ON v.id = cm.video_id
       WHERE cm.video_id = $1`,
      [videoId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function getChatByVideoId(videoId, startTime = 0, endTime = null) {
  const client = await pool.connect();
  try {
    const meta = await client.query(
      `SELECT id FROM chat_metadata WHERE video_id = $1`,
      [videoId]
    );
    
    if (meta.rows.length === 0) {
      return null;
    }
    
    const metadataId = meta.rows[0].id;
    
    let messagesQuery = `
      SELECT 
        cm.time_seconds as time,
        cm.message,
        cm.badges,
        cm.emotes,
        cu.name as user_name,
        cu.color as user_color
      FROM chat_messages cm
      JOIN chat_users cu ON cu.id = cm.user_id
      WHERE cm.metadata_id = $1 AND cm.time_seconds >= $2
    `;
    const params = [metadataId, startTime];
    
    if (endTime !== null) {
      messagesQuery += ` AND cm.time_seconds < $3`;
      params.push(endTime);
    }
    
    messagesQuery += ` ORDER BY cm.time_seconds, cm.id`;
    
    const messages = await client.query(messagesQuery, params);
    
    const badgeIds = new Set();
    const emoteIds = new Set();
    
    for (const msg of messages.rows) {
      for (const bid of (msg.badges || [])) {
        badgeIds.add(bid);
      }
      for (const e of (msg.emotes || [])) {
        if (e.id) emoteIds.add(e.id);
      }
    }
    
    const badgeList = [];
    const badgeIdToIdx = new Map();
    
    if (badgeIds.size > 0) {
      const badges = await client.query(
        `SELECT id, set_version, title, url FROM chat_badges WHERE id = ANY($1)`,
        [Array.from(badgeIds)]
      );
      for (const b of badges.rows) {
        badgeIdToIdx.set(b.id, badgeList.length);
        badgeList.push({
          setVersion: b.set_version,
          title: b.title,
          url: b.url
        });
      }
    }
    
    const emoteList = [];
    const emoteIdToIdx = new Map();
    
    if (emoteIds.size > 0) {
      const emotes = await client.query(
        `SELECT id, text, emote_id, source FROM chat_emotes WHERE id = ANY($1)`,
        [Array.from(emoteIds)]
      );
      for (const e of emotes.rows) {
        emoteIdToIdx.set(e.id, emoteList.length);
        emoteList.push({
          text: e.text,
          id: e.emote_id,
          source: e.source
        });
      }
    }
    
    const userMap = new Map();
    const userList = [];
    const chatList = [];
    
    for (const msg of messages.rows) {
      const userKey = `${msg.user_name}:${msg.user_color}`;
      if (!userMap.has(userKey)) {
        userMap.set(userKey, userList.length);
        userList.push({
          name: msg.user_name,
          color: msg.user_color
        });
      }
      
      const chat = {
        time: msg.time,
        user: userMap.get(userKey),
        message: msg.message
      };
      
      if (msg.badges && msg.badges.length > 0) {
        chat.badges = msg.badges.map(id => badgeIdToIdx.get(id)).filter(idx => idx !== undefined);
      }
      
      if (msg.emotes && msg.emotes.length > 0) {
        chat.emotes = msg.emotes
          .map(e => [emoteIdToIdx.get(e.id), e.start, e.end])
          .filter(arr => arr[0] !== undefined);
      }
      
      chatList.push(chat);
    }
    
    return {
      badgeList,
      emoteList,
      userList,
      chatList
    };
    
  } finally {
    client.release();
  }
}

async function getVideoIdByYoutubeId(youtubeId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id FROM videos WHERE yt_id = $1`,
      [youtubeId]
    );
    return result.rows[0]?.id || null;
  } finally {
    client.release();
  }
}

async function getVideoIdByTwitchId(twitchId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id FROM videos WHERE twitch_id = $1`,
      [twitchId]
    );
    return result.rows[0]?.id || null;
  } finally {
    client.release();
  }
}

async function hasChatData(videoId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 1 FROM chat_metadata WHERE video_id = $1 LIMIT 1`,
      [videoId]
    );
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

module.exports = {
  saveChatData,
  getChatMetadata,
  getChatByVideoId,
  getVideoIdByYoutubeId,
  getVideoIdByTwitchId,
  hasChatData
};
