import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import ChatMessage from './ChatMessage';
import { API_URL } from '../../utils/constants';
import '../../styles/ChatContainer.css';

const PRELOAD_AHEAD_SECONDS = 600;
const SCREEN_LIMIT = 500;

/**
 * Binary search to find the index of the first message with time > targetTime
 * Returns the index where all messages before have time <= targetTime
 * @param {Array} messages - Sorted array of messages by time
 * @param {number} targetTime - Target time in seconds
 * @returns {number} Index of first message after targetTime (or messages.length if none)
 */
function binarySearchByTime(messages, targetTime) {
  let low = 0;
  let high = messages.length;
  
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (messages[mid].time <= targetTime) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

/**
 * Merge new messages into a sorted array efficiently
 * @param {Array} existing - Existing sorted messages
 * @param {Array} newMessages - New messages to add (may not be sorted)
 * @returns {Array} Merged sorted array with no duplicates
 */
function mergeSortedMessages(existing, newMessages) {
  if (newMessages.length === 0) return existing;
  if (existing.length === 0) {
    const sorted = [...newMessages];
    sorted.sort((a, b) => a.time - b.time);
    return sorted;
  }
  
  // Create a Set of existing IDs for O(1) lookup
  const existingIds = new Set(existing.map(m => m._id));
  
  // Filter out duplicates and sort new messages
  const uniqueNew = newMessages.filter(m => !existingIds.has(m._id));
  if (uniqueNew.length === 0) return existing;
  
  uniqueNew.sort((a, b) => a.time - b.time);
  
  // Merge two sorted arrays
  const result = [];
  let i = 0, j = 0;
  
  while (i < existing.length && j < uniqueNew.length) {
    if (existing[i].time <= uniqueNew[j].time) {
      result.push(existing[i++]);
    } else {
      result.push(uniqueNew[j++]);
    }
  }
  
  while (i < existing.length) result.push(existing[i++]);
  while (j < uniqueNew.length) result.push(uniqueNew[j++]);
  
  return result;
}

export default function ChatContainer({ 
  videoId, 
  currentTime, 
  isPlaying,
  onSeek,
  delayTime = 3,
  onThemeChange,
  onHideVideoInfoChange,
  hideVideoInfo = false,
  theme = 'blue',
  onWideChatChange
}) {
  const [metadata, setMetadata] = useState(null);
  const [badgeList, setBadgeList] = useState([]);
  const [emoteList, setEmoteList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTimestamps, setShowTimestamps] = useState(() => {
    const saved = localStorage.getItem('chatShowTimestamps');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showBadges, setShowBadges] = useState(() => {
    const saved = localStorage.getItem('chatShowBadges');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showBorders, setShowBorders] = useState(() => {
    const saved = localStorage.getItem('chatShowBorders');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('chatFontSize');
    return saved ? parseInt(saved, 10) : 14;
  });
  const [chatWidth, setChatWidth] = useState(() => {
    const saved = localStorage.getItem('chatWidth');
    return saved ? parseInt(saved, 10) : 350;
  });
  const [chatTheme, setChatTheme] = useState(theme);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [unseenMessages, setUnseenMessages] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [seekLoading, setSeekLoading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isWideChat, setIsWideChat] = useState(false);

  // Memoize messages for current video to avoid filtering on every render
  // allMessages is already sorted by time from mergeSortedMessages
  const videoMessages = useMemo(() => {
    return allMessages.filter(m => m._videoId === videoId);
  }, [allMessages, videoId]);

  const messagesRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const containerRef = useRef(null);
  const lastSyncTimeRef = useRef(-1);
  const lastLoadCheckTimeRef = useRef(-1);
  const messageMapRef = useRef(new Map());
  const badgeMapRef = useRef(new Map());
  const emoteMapRef = useRef(new Map());
  const userMapRef = useRef(new Map());
  const loadedRangesRef = useRef([]);
  const mountedVideoIdRef = useRef(videoId);
  const pendingScrollRef = useRef(false);
  const pendingLoadRef = useRef(null);
  const lastRealTimeUpdateRef = useRef(0);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  useEffect(() => {
    const vid = videoId;
    mountedVideoIdRef.current = vid;
    
    setMetadata(null);
    setBadgeList([]);
    setEmoteList([]);
    setUserList([]);
    setAllMessages([]);
    setDisplayedMessages([]);
    setLoading(true);
    setError(null);
    setSeekLoading(false);
    setIsUserAtBottom(true);
    setUnseenMessages(0);
    
    lastSyncTimeRef.current = -1;
    lastLoadCheckTimeRef.current = -1;
    messageMapRef.current = new Map();
    badgeMapRef.current = new Map();
    emoteMapRef.current = new Map();
    userMapRef.current = new Map();
    loadedRangesRef.current = [];
    if (pendingLoadRef.current) {
      clearTimeout(pendingLoadRef.current);
      pendingLoadRef.current = null;
    }
    lastRealTimeUpdateRef.current = 0;

    const controller = new AbortController();
    
    axios.get(`${API_URL}/chat/${vid}/metadata`, { signal: controller.signal })
      .then(res => {
        if (mountedVideoIdRef.current !== vid) return;
        setMetadata(res.data);
        setLoading(false);
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        if (mountedVideoIdRef.current !== vid) return;
        if (err.response?.status === 404) {
          setError('No chat archived for this VoD');
        } else {
          setError('Failed to load chat');
        }
        setLoading(false);
      });
      
    return () => controller.abort();
  }, [videoId]);

  // Preload emote and badge images for upcoming messages
  const preloadImages = useCallback((messages) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const emoteSize = dpr >= 2 ? '2x' : '1x';
    
    messages.forEach(msg => {
      // Preload emotes
      if (msg.emotes) {
        msg.emotes.forEach(([emoteIdx]) => {
          const emote = emoteList[emoteIdx];
          if (!emote) return;
          
          let url;
          switch (emote.source) {
            case 'BetterTTV Global':
            case 'BetterTTV Channel':
              url = `https://cdn.betterttv.net/emote/${emote.id}/${emoteSize}`;
              break;
            case 'FrankerFaceZ Global':
            case 'FrankerFaceZ Channel':
              url = `https://cdn.frankerfacez.com/emote/${emote.id}/${emoteSize === '1x' ? '1' : '2'}`;
              break;
            case '7TV Global':
            case '7TV Channel':
              url = `https://cdn.7tv.app/emote/${emote.id}/${emoteSize}`;
              break;
            case 'Twitch':
            default:
              url = `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/${emoteSize === '1x' ? '1.0' : '2.0'}`;
          }
          
          const img = new Image();
          img.src = url;
        });
      }
      
      // Preload badges
      if (msg.badges) {
        msg.badges.forEach(badgeIdx => {
          const badge = badgeList[badgeIdx];
          if (!badge) return;
          
          const img = new Image();
          img.src = `https://static-cdn.jtvnw.net/badges/v1/${badge.url}/1`;
        });
      }
    });
  }, [emoteList, badgeList]);

  const mergeChunkData = useCallback((data, targetVid) => {
    if (mountedVideoIdRef.current !== targetVid) return [];
    
    const { badgeList: newBadges, emoteList: newEmotes, userList: newUsers, chatList: newMessages } = data;
    
    const badgeIndexMap = {};
    newBadges.forEach((badge, idx) => {
      const key = badge.setVersion || `${badge.title}-${badge.url}`;
      if (!badgeMapRef.current.has(key)) {
        const newIdx = badgeMapRef.current.size;
        badgeMapRef.current.set(key, newIdx);
        setBadgeList(prev => [...prev, badge]);
      }
      badgeIndexMap[idx] = badgeMapRef.current.get(key);
    });

    const emoteIndexMap = {};
    newEmotes.forEach((emote, idx) => {
      const key = emote.id || `${emote.text}-${emote.source}`;
      if (!emoteMapRef.current.has(key)) {
        const newIdx = emoteMapRef.current.size;
        emoteMapRef.current.set(key, newIdx);
        setEmoteList(prev => [...prev, emote]);
      }
      emoteIndexMap[idx] = emoteMapRef.current.get(key);
    });

    const userIndexMap = {};
    newUsers.forEach((user, idx) => {
      const key = user.id || `${user.name}-${user.color}`;
      if (!userMapRef.current.has(key)) {
        const newIdx = userMapRef.current.size;
        userMapRef.current.set(key, newIdx);
        setUserList(prev => [...prev, user]);
      }
      userIndexMap[idx] = userMapRef.current.get(key);
    });

    const processedMessages = [];
    newMessages.forEach(msg => {
      const msgId = msg.id != null ? String(msg.id) : `${targetVid}-${msg.time}-${userIndexMap[msg.user]}-${msg.message.substring(0, 20)}`;
      if (!messageMapRef.current.has(msgId)) {
        const processed = {
          ...msg,
          _id: msgId,
          _videoId: targetVid,
          user: userIndexMap[msg.user],
          badges: msg.badges?.map(b => badgeIndexMap[b]),
          emotes: msg.emotes?.map(([idx, s, e]) => [emoteIndexMap[idx], s, e])
        };
        messageMapRef.current.set(msgId, processed);
        processedMessages.push(processed);
      }
    });

    if (processedMessages.length > 0) {
      setAllMessages(prev => {
        if (mountedVideoIdRef.current !== targetVid) return prev;
        return mergeSortedMessages(prev, processedMessages);
      });
      
      // Preload images for the newly loaded messages
      preloadImages(processedMessages.slice(0, 50));
    }
    
    return processedMessages;
  }, []);

  const isRangeLoaded = useCallback((start, end) => {
    for (const range of loadedRangesRef.current) {
      if (range.start <= start && range.end >= end) return true;
    }
    return false;
  }, []);

  // Find missing ranges within a given start-end interval
  const findMissingRanges = useCallback((start, end) => {
    const loaded = loadedRangesRef.current;
    if (loaded.length === 0) return [{ start, end }];
    
    const missing = [];
    let currentStart = start;
    
    for (const range of loaded) {
      if (range.end <= currentStart) continue;
      if (range.start >= end) break;
      
      if (range.start > currentStart) {
        missing.push({ start: currentStart, end: Math.min(range.start, end) });
      }
      
      currentStart = Math.max(currentStart, range.end);
      
      if (currentStart >= end) break;
    }
    
    if (currentStart < end) {
      missing.push({ start: currentStart, end });
    }
    
    return missing;
  }, []);

  const addLoadedRange = useCallback((start, end) => {
    loadedRangesRef.current.push({ start, end });
    loadedRangesRef.current.sort((a, b) => a.start - b.start);
    const merged = [];
    for (const range of loadedRangesRef.current) {
      if (merged.length === 0 || merged[merged.length - 1].end < range.start) {
        merged.push({ ...range });
      } else {
        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, range.end);
      }
    }
    loadedRangesRef.current = merged;
  }, []);

  const loadSingleRange = useCallback(async (startSec, endSec, targetVid) => {
    if (mountedVideoIdRef.current !== targetVid) return [];
    
    try {
      const res = await axios.get(`${API_URL}/chat/${targetVid}?start=${startSec}&end=${endSec}`);
      if (mountedVideoIdRef.current !== targetVid) return [];
      addLoadedRange(startSec, endSec);
      return mergeChunkData(res.data, targetVid);
    } catch {
      return [];
    }
  }, [mergeChunkData, addLoadedRange]);

  const loadTimeRange = useCallback(async (startSec, endSec, targetVid) => {
    if (mountedVideoIdRef.current !== targetVid) return [];
    
    const missingRanges = findMissingRanges(startSec, endSec);
    if (missingRanges.length === 0) return [];
    
    const allMessages = [];
    for (const range of missingRanges) {
      const messages = await loadSingleRange(range.start, range.end, targetVid);
      allMessages.push(...messages);
    }
    
    return allMessages;
  }, [findMissingRanges, loadSingleRange]);

  useEffect(() => {
    if (!metadata || loading || error) return;
    
    const vid = videoId;
    const adjustedTime = Math.max(0, currentTime - delayTime);
    const timeDiff = adjustedTime - lastSyncTimeRef.current;
    const isSeek = lastSyncTimeRef.current >= 0 && Math.abs(timeDiff) > 10;
    
    const now = Date.now();
    if (!isSeek && lastRealTimeUpdateRef.current > 0 && now - lastRealTimeUpdateRef.current < 200) {
      return;
    }
    lastRealTimeUpdateRef.current = now;
    
    if (isSeek) {
      setSeekLoading(true);
      setDisplayedMessages([]);
      pendingScrollRef.current = true;
      lastLoadCheckTimeRef.current = adjustedTime;
      
      if (pendingLoadRef.current) {
        clearTimeout(pendingLoadRef.current);
        pendingLoadRef.current = null;
      }
      
      const loadEnd = adjustedTime + PRELOAD_AHEAD_SECONDS;
      loadTimeRange(0, loadEnd, vid).then(() => {
        if (mountedVideoIdRef.current !== vid) return;
        
        // Get all messages for this video (already sorted by time in allMessages)
        const validMessages = Array.from(messageMapRef.current.values())
          .filter(m => m._videoId === vid);
        validMessages.sort((a, b) => a.time - b.time);
        
        const cutoffIndex = binarySearchByTime(validMessages, adjustedTime);
        const startIndex = Math.max(0, cutoffIndex - SCREEN_LIMIT);
        const toShow = validMessages.slice(startIndex, cutoffIndex);
        
        setDisplayedMessages(toShow);
        setIsUserAtBottom(true);
        setUnseenMessages(0);
        lastSyncTimeRef.current = adjustedTime;
      });
      return;
    }
    
    lastSyncTimeRef.current = adjustedTime;
    
    const loadEnd = adjustedTime + PRELOAD_AHEAD_SECONDS;
    const timeSinceLastLoadCheck = adjustedTime - lastLoadCheckTimeRef.current;
    if (timeSinceLastLoadCheck >= 30 || lastLoadCheckTimeRef.current < 0) {
      if (!isRangeLoaded(Math.max(0, adjustedTime - 60), loadEnd)) {
        lastLoadCheckTimeRef.current = adjustedTime;
        loadTimeRange(Math.max(0, adjustedTime - 60), loadEnd, vid);
      }
    }
    
    const cutoffIndex = binarySearchByTime(videoMessages, adjustedTime);
    const startIndex = Math.max(0, cutoffIndex - SCREEN_LIMIT);
    const toShow = videoMessages.slice(startIndex, cutoffIndex);
    
    setDisplayedMessages(prev => {
      const prevValid = prev.filter(m => m._videoId === vid);
      if (toShow.length === 0 && prevValid.length === 0) return toShow;
      
      const prevIds = new Set(prevValid.map(m => m._id));
      const newMessages = toShow.filter(m => !prevIds.has(m._id));
      
      if (newMessages.length > 0) {
        if (!isUserAtBottom) {
          setUnseenMessages(c => c + newMessages.length);
        } else {
          pendingScrollRef.current = true;
        }
        const combined = mergeSortedMessages(prevValid, newMessages);
        return combined.slice(-SCREEN_LIMIT);
      }
      
      return prev;
    });
  }, [currentTime, videoMessages, metadata, loading, error, delayTime, isUserAtBottom, videoId, loadTimeRange, isRangeLoaded]);

  useEffect(() => {
    if (!pendingScrollRef.current || !messagesRef.current) return;
    
    pendingScrollRef.current = false;
    const el = messagesRef.current;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
        setSeekLoading(false);
      });
    });
  }, [displayedMessages]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight <= 20;
    const atTop = scrollTop <= 30;
    
    setIsUserAtBottom(atBottom);
    if (atBottom) setUnseenMessages(0);
    
    if (atTop && !loadingMore && displayedMessages.length > 0) {
      const vid = mountedVideoIdRef.current;
      const firstMsg = displayedMessages[0];
      const firstTime = firstMsg?.time || 0;
      
      if (firstTime > 0) {
        const cutoffIndex = binarySearchByTime(videoMessages, firstTime - 0.001);
        
        if (cutoffIndex > 0) {
          const startIndex = Math.max(0, cutoffIndex - 100);
          const toAdd = videoMessages.slice(startIndex, cutoffIndex);
          const prevScrollHeight = messagesRef.current.scrollHeight;
          setDisplayedMessages(prev => mergeSortedMessages(toAdd, prev).slice(-SCREEN_LIMIT - 100));
          requestAnimationFrame(() => {
            if (messagesRef.current) {
              messagesRef.current.scrollTop = messagesRef.current.scrollHeight - prevScrollHeight;
            }
          });
        } else if (firstTime > 60) {
          setLoadingMore(true);
          const loadStart = Math.max(0, firstTime - 300);
          loadTimeRange(loadStart, firstTime, vid).then(() => {
            if (mountedVideoIdRef.current !== vid) return;
            setLoadingMore(false);
          });
        }
      }
    }
  }, [displayedMessages, videoMessages, loadingMore, loadTimeRange]);

  const handleResumeScroll = () => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    setIsUserAtBottom(true);
    setUnseenMessages(0);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  const handleTouchStart = useCallback((e) => {
    const touch = e.changedTouches[0];
    touchStartRef.current = { x: touch.screenX, y: touch.screenY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const touch = e.changedTouches[0];
    const endX = touch.screenX;
    const endY = touch.screenY;
    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    const TAP_MOVE_THRESHOLD = 10;
    const DOUBLE_TAP_DELAY = 300;
    const DOUBLE_TAP_DISTANCE = 30;
    
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    
    if (isPortrait || hasFinePointer) {
      return;
    }
    
    if (absX < TAP_MOVE_THRESHOLD && absY < TAP_MOVE_THRESHOLD) {
      const now = Date.now();
      const lastTap = lastTapRef.current;
      
      const timeDiff = now - lastTap.time;
      const distX = Math.abs(endX - lastTap.x);
      const distY = Math.abs(endY - lastTap.y);
      
      if (
        timeDiff < DOUBLE_TAP_DELAY &&
        distX < DOUBLE_TAP_DISTANCE &&
        distY < DOUBLE_TAP_DISTANCE
      ) {
        // Double tap - toggle wide chat
        setIsWideChat(prev => {
          const newValue = !prev;
          onWideChatChange?.(newValue);
          return newValue;
        });
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        return;
      }
      
      lastTapRef.current = { time: now, x: endX, y: endY };
      return;
    }
    
    if (absX > absY) {
      if (deltaX > 0) {
        // Right swipe - collapse chat
        if (isWideChat) {
          setIsWideChat(false);
          onWideChatChange?.(false);
        }
      } else {
        // Left swipe - expand chat 
        if (!isWideChat) {
          setIsWideChat(true);
          onWideChatChange?.(true);
        }
      }
    }
  }, [onWideChatChange, isWideChat]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('chatShowTimestamps', JSON.stringify(showTimestamps));
  }, [showTimestamps]);

  useEffect(() => {
    localStorage.setItem('chatShowBadges', JSON.stringify(showBadges));
  }, [showBadges]);

  useEffect(() => {
    localStorage.setItem('chatShowBorders', JSON.stringify(showBorders));
  }, [showBorders]);

  useEffect(() => {
    localStorage.setItem('chatFontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('chatWidth', chatWidth.toString());
  }, [chatWidth]);

  useEffect(() => {
    localStorage.setItem('chatTheme', chatTheme);
    if (onThemeChange) onThemeChange(chatTheme);
  }, [chatTheme, onThemeChange]);

  // Resize handler
  const handleResizeStart = useCallback((e) => {
    // Only on desktop
    if (window.innerWidth <= 1100 || window.matchMedia('(orientation: portrait)').matches) return;
    
    e.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = chatWidth;
  }, [chatWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const delta = resizeStartXRef.current - e.clientX;
      const newWidth = Math.max(350, Math.min(600, resizeStartWidthRef.current + delta));
      setChatWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const isDesktop = window.innerWidth > 1100 && !window.matchMedia('(orientation: portrait)').matches;
  const containerStyle = {
    width: isDesktop ? `${chatWidth}px` : undefined,
    minWidth: isDesktop ? `${chatWidth}px` : undefined,
  };

  const renderSettingsPanel = () => (
    settingsOpen && (
      <div className="settings-panel">
        <div className="settings-row">
          <label>Theme</label>
          <select 
            className="theme-select"
            value={chatTheme} 
            onChange={e => setChatTheme(e.target.value)}
          >
            <option value="blue">Blue</option>
            <option value="twitch">Twitch</option>
            <option value="oled">OLED</option>
          </select>
        </div>
        <div className="settings-divider" />
        <div className="settings-row">
          <label>Hide Video Info</label>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={hideVideoInfo} 
              onChange={e => onHideVideoInfoChange?.(e.target.checked)} 
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>
    )
  );

  const renderHeader = (showAllButtons = true) => (
    <div className="chat-header">
      {showAllButtons && (
        <div className="header-buttons">
          <button className="header-button" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
            <svg width="16" height="16" viewBox="5 5 14 14" fill="currentColor">
              {isFullscreen ? (
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              ) : (
                <path d="M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z"/>
              )}
            </svg>
          </button>
        </div>
      )}
      <span className="header-title">Archived Chat</span>
      <div className="header-buttons">
        <button className="header-button" title="Settings" onClick={() => setSettingsOpen(!settingsOpen)}>
          <svg width="16" height="16" viewBox="2.66 2.4 18.68 19.2" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6"/>
          </svg>
        </button>
      </div>
      {renderSettingsPanel()}
    </div>
  );

  if (loading) {
    return (
      <div className="chat-container" data-theme={chatTheme} style={containerStyle}>
        {renderHeader(false)}
        <div className="chat-loading">Loading chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-container" data-theme={chatTheme} style={containerStyle}>
        {renderHeader(false)}
        <div className="chat-error">
          <svg className="sad-face" viewBox="2 2 20 20">
            <circle cx="15.5" cy="9.5" r="1.5"/>
            <circle cx="8.5" cy="9.5" r="1.5"/>
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m0-6c-2.33 0-4.32 1.45-5.12 3.5h1.67c.69-1.19 1.97-2 3.45-2s2.75.81 3.45 2h1.67c-.8-2.05-2.79-3.5-5.12-3.5"/>
          </svg>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`chat-container ${isWideChat ? 'wide-chat' : ''}`}
      data-theme={chatTheme} 
      style={containerStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className={`chat-resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleResizeStart}
      />
      <div className="chat-header">
        <div className="header-buttons">
          <button className="header-button" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
            <svg width="16" height="16" viewBox="5 5 14 14" fill="currentColor">
              {isFullscreen ? (
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              ) : (
                <path d="M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z"/>
              )}
            </svg>
          </button>
        </div>
        <span className="header-title">Archived Chat</span>
        <div className="header-buttons">
          <button className="header-button" title="Settings" onClick={() => setSettingsOpen(!settingsOpen)}>
            <svg width="16" height="16" viewBox="2.66 2.4 18.68 19.2" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6"/>
            </svg>
          </button>
        </div>
        {settingsOpen && (
          <div className="settings-panel">
            <div className="settings-row">
              <label>Timestamps</label>
              <label className="toggle-switch">
                <input type="checkbox" checked={showTimestamps} onChange={e => setShowTimestamps(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="settings-row">
              <label>Badges</label>
              <label className="toggle-switch">
                <input type="checkbox" checked={showBadges} onChange={e => setShowBadges(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="settings-row">
              <label>Message Borders</label>
              <label className="toggle-switch">
                <input type="checkbox" checked={showBorders} onChange={e => setShowBorders(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="settings-divider" />
            <div className="settings-row">
              <label>Font Size</label>
              <div className="font-size-control">
                <button 
                  type="button" 
                  className="font-size-btn"
                  onClick={() => setFontSize(prev => Math.max(10, prev - 1))}
                >−</button>
                <span className="font-size-value">{fontSize}</span>
                <button 
                  type="button" 
                  className="font-size-btn"
                  onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                >+</button>
              </div>
            </div>
            <div className="settings-row">
              <label>Theme</label>
              <select 
                className="theme-select"
                value={chatTheme} 
                onChange={e => setChatTheme(e.target.value)}
              >
                <option value="blue">Blue</option>
                <option value="twitch">Twitch</option>
                <option value="oled">OLED</option>
              </select>
            </div>
            <div className="settings-divider" />
            <div className="settings-row">
              <label>Hide Video Info</label>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={hideVideoInfo} 
                  onChange={e => onHideVideoInfoChange?.(e.target.checked)} 
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        )}
      </div>
      
      <div 
        className="messages-container" 
        ref={messagesRef}
        onScroll={handleScroll}
        style={{ fontSize: `${fontSize}px` }}
      >
        {loadingMore && (
          <div className="loading-more">
            <div className="loading-spinner" />
            <span>Loading earlier messages...</span>
          </div>
        )}
        {displayedMessages.map((msg) => (
          <ChatMessage
            key={msg._id}
            message={msg}
            user={userList[msg.user]}
            emoteList={emoteList}
            badgeList={badgeList}
            showTimestamps={showTimestamps}
            showBadges={showBadges}
            showBorder={showBorders}
            onSeek={onSeek}
          />
        ))}
        {seekLoading && (
          <div className="seek-loading">
            <div className="seek-spinner" />
            <span>Loading chat...</span>
          </div>
        )}
      </div>
      
      {!isUserAtBottom && (
        <button className="resume-scroll-button" onClick={handleResumeScroll}>
          <svg className="resume-icon" viewBox="0 0 20 20">
            <path d="M8 3H4v14h4V3zm8 0h-4v14h4V3z"/>
          </svg>
          <span>
            {unseenMessages > 0 
              ? `${unseenMessages > 20 ? '20+' : unseenMessages} new message${unseenMessages === 1 ? '' : 's'}`
              : 'Chat paused due to scroll'
            }
          </span>
        </button>
      )}
    </div>
  );
}
