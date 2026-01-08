import React from 'react';
import { calculateColor } from '../../utils/colorReplace';
import Tooltip from './Tooltip';

function getEmoteUrl(emote, size = '1x') {
  switch (emote.source) {
    case 'BetterTTV Global':
    case 'BetterTTV Channel':
      return `https://cdn.betterttv.net/emote/${emote.id}/${size}`;
    case 'FrankerFaceZ Global':
    case 'FrankerFaceZ Channel':
      return `https://cdn.frankerfacez.com/emote/${emote.id}/${size === '1x' ? '1' : size === '2x' ? '2' : '4'}`;
    case '7TV Global':
    case '7TV Channel':
      return `https://cdn.7tv.app/emote/${emote.id}/${size}`;
    case 'Twitch':
    default:
      return `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/${size === '1x' ? '1.0' : size === '2x' ? '2.0' : '3.0'}`;
  }
}

function parseMessageContent(message, emotes, emoteList) {
  if (!emotes || emotes.length === 0) {
    return [{ type: 'text', content: message }];
  }

  const sortedEmotes = [...emotes].sort((a, b) => b[1] - a[1]);
  const chars = Array.from(message);
  const parts = [];
  let lastIdx = chars.length;

  for (const [emoteIdx, start, end] of sortedEmotes) {
    const emote = emoteList[emoteIdx];
    if (!emote) continue;

    if (end + 1 < lastIdx) {
      const textAfter = chars.slice(end + 1, lastIdx).join('');
      if (textAfter) parts.unshift({ type: 'text', content: textAfter });
    }

    parts.unshift({ type: 'emote', emote, start, end });
    lastIdx = start;
  }

  if (lastIdx > 0) {
    const textBefore = chars.slice(0, lastIdx).join('');
    if (textBefore) parts.unshift({ type: 'text', content: textBefore });
  }

  return parts;
}

function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTimestampClass(seconds) {
  const formatted = formatTimestamp(seconds);
  if (formatted.length <= 4) return 'short-time';
  if (formatted.length === 5) return 'medium-time';
  if (formatted.length === 7) return 'long-time';
  return 'xlong-time';
}

export default function ChatMessage({ 
  message, 
  user, 
  emoteList, 
  badgeList,
  showTimestamps,
  showBadges,
  showBorder,
  onSeek 
}) {
  const parts = parseMessageContent(message.message, message.emotes, emoteList);
  const displayBadges = message.badges ? message.badges.map(idx => badgeList[idx]).filter(Boolean) : [];

  const handleTimestampClick = () => {
    if (onSeek) onSeek(message.time);
  };

  const messageStyle = showBorder ? { borderBottom: '1px solid rgba(255,255,255,0.1)' } : {};

  return (
    <div className="chat-message" style={messageStyle}>
      {showTimestamps && (
        <span className={`chat-timestamp ${getTimestampClass(message.time)}`}>
          <button type="button" onClick={handleTimestampClick} title="Jump to timestamp" className="timestamp-link">
            {formatTimestamp(message.time)}
          </button>
        </span>
      )}
      <span className="chat-data">
        {showBadges && displayBadges.length > 0 && (
          <span className="chat-badges">
            {displayBadges.map((badge, i) => (
              <Tooltip 
                key={i} 
                text={badge.title} 
                imageUrl={`https://static-cdn.jtvnw.net/badges/v1/${badge.url}/3`}
                className="badge"
              >
                <img
                  className="badge-img"
                  src={`https://static-cdn.jtvnw.net/badges/v1/${badge.url}/1`}
                  srcSet={`https://static-cdn.jtvnw.net/badges/v1/${badge.url}/2 2x, https://static-cdn.jtvnw.net/badges/v1/${badge.url}/3 3x`}
                  alt={badge.title}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </Tooltip>
            ))}
          </span>
        )}
        <span className="chat-username" style={{ color: calculateColor(user.color.toUpperCase()) }}>
          {user.name}
        </span>
        <span className="chat-colon">:</span>
        <span className="chat-text">
          {parts.map((part, i) => {
            if (part.type === 'text') return <span key={i}>{part.content}</span>;
            const emote = part.emote;
            const url = getEmoteUrl(emote, '1x');
            const srcset = `${getEmoteUrl(emote, '2x')} 2x, ${getEmoteUrl(emote, '3x')} 3x`;
            const highResUrl = getEmoteUrl(emote, '3x');
            return (
              <Tooltip 
                key={i} 
                text={emote.text} 
                imageUrl={highResUrl}
                className="chat-emote-container"
              >
                <span className="emote">
                  <img
                    className="emote-img"
                    src={url}
                    srcSet={srcset}
                    alt={emote.text}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.insertAdjacentText('afterend', emote.text);
                    }}
                  />
                </span>
              </Tooltip>
            );
          })}
        </span>
      </span>
    </div>
  );
}
