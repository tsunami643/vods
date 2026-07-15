import { memo } from 'react';
import { calculateColor } from './colorReplace';
import {
  createCheermoteRegex,
  getBadgeUrl,
  getCheermoteTier,
  getCheermoteUrl,
  getEmoteUrl,
} from './chatAssets';
import Tooltip from './Tooltip';
import { videoHref } from '../../../routes';

const CHEERMOTE_REGEX = createCheermoteRegex();
const CHAT_TOKEN_REGEX = /@\S+|\b((?:https?:\/\/|www\.)[^\s<]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s<]*)/gi;

function findMentionRanges(message) {
  const characters = Array.from(message);
  const ranges = [];

  for (let index = 0; index < characters.length; index += 1) {
    if (characters[index] !== '@' || !characters[index + 1]
      || /\s/u.test(characters[index + 1])) {
      continue;
    }

    let end = index + 1;
    while (end + 1 < characters.length && !/\s/u.test(characters[end + 1])) {
      end += 1;
    }
    ranges.push({ start: index, end });
    index = end;
  }

  return ranges;
}

function EmoteTooltipContent({ name, source = 'Twitch' }) {
  return (
    <>
      <span className="emote-tooltip-name">{name}</span>
      <span className="emote-tooltip-source">{source}</span>
    </>
  );
}

function Cheermote({ name, amount }) {
  const { tier, color } = getCheermoteTier(amount);
  const urls = ['1x', '2x', '3x'].map(size => getCheermoteUrl(name, tier, size));
  const srcset = urls.slice(1).map((u, i) => `${u} ${i + 2}x`).join(', ');
  
  return (
    <Tooltip
      content={<EmoteTooltipContent name={`${name}${amount}`} />}
      className="chat-emote-container"
    >
      <span className="emote cheermote" style={{ color }}>
        <img
          className="cheermote-img"
          src={urls[0]}
          srcSet={srcset}
          alt={`${name}${amount}`}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.insertAdjacentText('afterend', `${name}${amount}`);
          }}
        />
        <span className="cheermote-amount">{amount}</span>
      </span>
    </Tooltip>
  );
}

function parseMessageContent(message, emotes, emoteList) {
  if (!emotes || emotes.length === 0) {
    return parseTextContent(message);
  }

  const sortedEmotes = [...emotes].sort((a, b) => b[1] - a[1]);
  const mentionRanges = findMentionRanges(message);
  const chars = Array.from(message);
  const parts = [];
  let lastIdx = chars.length;

  for (const [emoteIdx, start, end] of sortedEmotes) {
    const overlapsMention = mentionRanges.some(
      (mention) => start <= mention.end && end >= mention.start
    );
    if (overlapsMention) continue;

    const emote = emoteList[emoteIdx];
    if (!emote) continue;

    if (end + 1 < lastIdx) {
      const textAfter = chars.slice(end + 1, lastIdx).join('');
      if (textAfter) {
        parts.unshift(...parseTextContent(textAfter));
      }
    }

    parts.unshift({ type: 'emote', emote, start, end });
    lastIdx = start;
  }

  if (lastIdx > 0) {
    const textBefore = chars.slice(0, lastIdx).join('');
    if (textBefore) {
      parts.unshift(...parseTextContent(textBefore));
    }
  }

  return parts;
}

function parseTextContent(text) {
  const parts = [];
  let lastIndex = 0;
  let match;

  CHAT_TOKEN_REGEX.lastIndex = 0;

  while ((match = CHAT_TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...parseCheermotes(text.slice(lastIndex, match.index)));
    }

    const label = match[0];
    if (label.startsWith('@')) {
      parts.push({ type: 'mention', content: label });
    } else {
      const href = /^https?:\/\//i.test(label) ? label : `https://${label}`;
      parts.push({ type: 'link', content: label, href });
    }
    lastIndex = match.index + label.length;
  }

  if (lastIndex < text.length) {
    parts.push(...parseCheermotes(text.slice(lastIndex)));
  }

  return parts.length > 0 ? parts : parseCheermotes(text);
}

function parseCheermotes(text) {
  const parts = [];
  let lastIndex = 0;
  let match;
  
  CHEERMOTE_REGEX.lastIndex = 0; // Reset regex state
  
  while ((match = CHEERMOTE_REGEX.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    
    // Add cheermote
    parts.push({ 
      type: 'cheermote', 
      name: match[1], 
      amount: parseInt(match[2], 10) 
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  
  // If no matches, return original text
  if (parts.length === 0) {
    return [{ type: 'text', content: text }];
  }
  
  return parts;
}

function formatTimestamp(seconds, chatDelay = 0) {
  const adjusted = Math.floor(seconds + chatDelay);
  const h = Math.floor(adjusted / 3600);
  const m = Math.floor((adjusted % 3600) / 60);
  const s = adjusted % 60;

  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTimestampClass(seconds, chatDelay = 0) {
  const formatted = formatTimestamp(seconds, chatDelay);
  if (formatted.length <= 4) return 'short-time';
  if (formatted.length === 5) return 'medium-time';
  if (formatted.length === 7) return 'long-time';
  return 'xlong-time';
}

function formatTimeForUrl(seconds, chatDelay = 0) {
  if (seconds === null || seconds === undefined || seconds < 0) return null;
  const adjusted = Math.floor(seconds + chatDelay);
  const h = Math.floor(adjusted / 3600);
  const m = Math.floor((adjusted % 3600) / 60);
  const s = Math.floor(adjusted % 60);
  let parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join('');
}

function ChatMessage({
  message, 
  user, 
  emoteList, 
  badgeList,
  showTimestamps,
  showBadges,
  onSeek,
  videoId,
  chatDelay = 0
}) {
  const parts = parseMessageContent(message.message, message.emotes, emoteList);
  const displayBadges = message.badges ? message.badges.map(idx => badgeList[idx]).filter(Boolean) : [];

  const handleTimestampClick = (e) => {
    e.preventDefault();
    // Seek to timestamp + 1 so the clicked message stays visible in chat
    if (onSeek) onSeek(Math.floor(message.time + chatDelay) + 1);
  };

  const timestampUrl = videoId ? videoHref(videoId, formatTimeForUrl(message.time, chatDelay)) : '#';

  return (
    <div className="chat-message">
      {showTimestamps && (
        <span className={`chat-timestamp ${getTimestampClass(message.time, chatDelay)}`}>
          <Tooltip
            text="Jump to Timestamp"
            showOnClick={false}
          >
            <a
              href={timestampUrl}
              onClick={handleTimestampClick}
              className="timestamp-link"
            >
              {formatTimestamp(message.time, chatDelay)}
            </a>
          </Tooltip>
        </span>
      )}
      <span className="chat-data">
        {showBadges && displayBadges.length > 0 && (
          <span className="chat-badges">
            {displayBadges.map((badge, i) => (
              <Tooltip 
                key={i} 
                text={badge.title}
                className="badge"
              >
                <img
                  className="badge-img"
                  src={getBadgeUrl(badge, '1x')}
                  srcSet={`${getBadgeUrl(badge, '2x')} 2x, ${getBadgeUrl(badge, '3x')} 3x`}
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
            if (part.type === 'mention') {
              return <span key={i} className="chat-mention">{part.content}</span>;
            }
            if (part.type === 'link') {
              return (
                <a
                  key={i}
                  className="chat-link"
                  href={part.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {part.content}
                </a>
              );
            }
            if (part.type === 'cheermote') {
              return <Cheermote key={i} name={part.name} amount={part.amount} />;
            }
            const emote = part.emote;
            const url = getEmoteUrl(emote, '1x');
            const srcset = `${getEmoteUrl(emote, '2x')} 2x, ${getEmoteUrl(emote, '3x')} 3x`;
            const highResUrl = getEmoteUrl(emote, '3x');
            return (
              <Tooltip 
                key={i} 
                content={(
                  <EmoteTooltipContent
                    name={emote.text}
                    source={emote.source || 'Twitch'}
                  />
                )}
                imageUrl={highResUrl}
                imageAlt={emote.text}
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

export default memo(ChatMessage);
