import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  binarySearchByTime,
  getMessageWindow,
  mergeSortedMessages,
} from './chatMessages';

const PRELOAD_AHEAD_SECONDS = 600;
const PRELOAD_CHECK_INTERVAL_SECONDS = 30;
const SCREEN_LIMIT = 100;
const SEEK_THRESHOLD_SECONDS = 10;
const SYNC_THROTTLE_MILLISECONDS = 100;

export default function useChatSynchronization({
  closeSettings,
  currentTime,
  delayTime,
  error,
  isRangeLoaded,
  loadTimeRange,
  loading,
  messageMapRef,
  metadata,
  mountedVideoIdRef,
  videoId,
  videoMessages,
}) {
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [seekLoading, setSeekLoading] = useState(false);
  const [unseenMessages, setUnseenMessages] = useState(0);

  const messagesRef = useRef(null);
  const isUserAtBottomRef = useRef(true);
  const lastLoadCheckTimeRef = useRef(-1);
  const lastRealTimeUpdateRef = useRef(0);
  const lastSyncTimeRef = useRef(-1);
  const pendingScrollRef = useRef(false);
  const scrollPreserveRef = useRef(null);
  const seekingRef = useRef(false);
  const unseenMessageIdsRef = useRef(new Set());

  const adjustedPlaybackTime = Math.max(0, currentTime - delayTime);

  useEffect(() => {
    setDisplayedMessages([]);
    setSeekLoading(false);
    setIsUserAtBottom(true);
    isUserAtBottomRef.current = true;
    setUnseenMessages(0);
    unseenMessageIdsRef.current.clear();

    lastSyncTimeRef.current = -1;
    lastLoadCheckTimeRef.current = -1;
    pendingScrollRef.current = false;
    lastRealTimeUpdateRef.current = 0;
  }, [videoId]);

  useEffect(() => {
    if (!metadata || loading || error) return;

    const targetVideoId = videoId;
    const timeDifference = adjustedPlaybackTime - lastSyncTimeRef.current;
    const isSeek = lastSyncTimeRef.current >= 0
      && Math.abs(timeDifference) > SEEK_THRESHOLD_SECONDS;

    const now = Date.now();
    if (
      !isSeek
      && lastRealTimeUpdateRef.current > 0
      && now - lastRealTimeUpdateRef.current < SYNC_THROTTLE_MILLISECONDS
    ) {
      return;
    }
    lastRealTimeUpdateRef.current = now;

    if (isSeek) {
      if (seekingRef.current) return;
      seekingRef.current = true;

      closeSettings?.();
      setSeekLoading(true);
      pendingScrollRef.current = true;
      lastLoadCheckTimeRef.current = adjustedPlaybackTime;
      lastSyncTimeRef.current = adjustedPlaybackTime;

      const loadEnd = adjustedPlaybackTime + PRELOAD_AHEAD_SECONDS;
      loadTimeRange(0, loadEnd, targetVideoId).then(() => {
        seekingRef.current = false;
        if (mountedVideoIdRef.current !== targetVideoId) return;

        const validMessages = Array.from(messageMapRef.current.values())
          .filter((message) => message._videoId === targetVideoId);
        validMessages.sort((first, second) => first.time - second.time);

        setDisplayedMessages(
          getMessageWindow(validMessages, adjustedPlaybackTime, SCREEN_LIMIT),
        );
        setIsUserAtBottom(true);
        isUserAtBottomRef.current = true;
        setUnseenMessages(0);
        unseenMessageIdsRef.current.clear();
      }).catch(() => {
        seekingRef.current = false;
      });
      return;
    }

    lastSyncTimeRef.current = adjustedPlaybackTime;

    const loadEnd = adjustedPlaybackTime + PRELOAD_AHEAD_SECONDS;
    const timeSinceLastLoadCheck = adjustedPlaybackTime - lastLoadCheckTimeRef.current;
    if (
      timeSinceLastLoadCheck >= PRELOAD_CHECK_INTERVAL_SECONDS
      || lastLoadCheckTimeRef.current < 0
    ) {
      if (!isRangeLoaded(0, loadEnd)) {
        lastLoadCheckTimeRef.current = adjustedPlaybackTime;
        loadTimeRange(0, loadEnd, targetVideoId);
      }
    }

    if (scrollPreserveRef.current) return;

    const messagesToShow = getMessageWindow(
      videoMessages,
      adjustedPlaybackTime,
      SCREEN_LIMIT,
    );
    const previousMessages = displayedMessages.filter(
      (message) => message._videoId === targetVideoId,
    );
    if (messagesToShow.length === 0 && previousMessages.length === 0) return;

    const previousLastTime = previousMessages.length > 0
      ? previousMessages[previousMessages.length - 1].time
      : -1;
    const nextLastTime = messagesToShow.length > 0
      ? messagesToShow[messagesToShow.length - 1].time
      : -1;

    if (nextLastTime < previousLastTime) {
      if (isUserAtBottom) setDisplayedMessages(messagesToShow);
      return;
    }

    const previousIds = new Set(previousMessages.map((message) => message._id));
    const newMessages = messagesToShow.filter(
      (message) => !previousIds.has(message._id),
    );
    if (newMessages.length === 0) return;

    if (!isUserAtBottom) {
      const previousUnseenCount = unseenMessageIdsRef.current.size;
      for (const message of newMessages) {
        unseenMessageIdsRef.current.add(message._id);
      }
      if (unseenMessageIdsRef.current.size !== previousUnseenCount) {
        setUnseenMessages(unseenMessageIdsRef.current.size);
      }
      return;
    }

    pendingScrollRef.current = true;
    setDisplayedMessages(messagesToShow);
  }, [
    adjustedPlaybackTime,
    closeSettings,
    displayedMessages,
    error,
    isRangeLoaded,
    isUserAtBottom,
    loadTimeRange,
    loading,
    messageMapRef,
    metadata,
    mountedVideoIdRef,
    videoId,
    videoMessages,
  ]);

  useEffect(() => {
    if (!pendingScrollRef.current || !messagesRef.current) return;

    const messagesElement = messagesRef.current;
    requestAnimationFrame(() => {
      if (!pendingScrollRef.current) {
        setSeekLoading(false);
        return;
      }

      requestAnimationFrame(() => {
        if (pendingScrollRef.current && messagesElement) {
          messagesElement.scrollTop = messagesElement.scrollHeight;
        }
        pendingScrollRef.current = false;
        setSeekLoading(false);
      });
    });
  }, [displayedMessages]);

  const handleUserScrollIntent = useCallback(() => {
    pendingScrollRef.current = false;
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesRef.current || scrollPreserveRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight <= 20;
    const atTop = scrollTop <= 30;

    if (pendingScrollRef.current && !atBottom) return;

    isUserAtBottomRef.current = atBottom;
    setIsUserAtBottom(atBottom);
    if (atBottom) {
      unseenMessageIdsRef.current.clear();
      setUnseenMessages(0);
    }

    if (atTop && !loadingMore && displayedMessages.length > 0) {
      const targetVideoId = mountedVideoIdRef.current;
      const firstTime = displayedMessages[0]?.time || 0;

      if (firstTime > 0) {
        const endIndex = binarySearchByTime(videoMessages, firstTime - 0.001);

        if (endIndex > 0) {
          const startIndex = Math.max(0, endIndex - SCREEN_LIMIT);
          const messagesToAdd = videoMessages.slice(startIndex, endIndex);
          const messagesElement = messagesRef.current;

          scrollPreserveRef.current = {
            prevScrollHeight: messagesElement.scrollHeight,
          };
          setDisplayedMessages((previous) => mergeSortedMessages(messagesToAdd, previous));
        } else if (firstTime > 60) {
          setLoadingMore(true);
          loadTimeRange(0, firstTime, targetVideoId).then(() => {
            if (mountedVideoIdRef.current !== targetVideoId) return;
            setLoadingMore(false);
          });
        }
      }
    }
  }, [displayedMessages, loadTimeRange, loadingMore, mountedVideoIdRef, videoMessages]);

  useLayoutEffect(() => {
    if (!scrollPreserveRef.current || !messagesRef.current) return;

    const { prevScrollHeight } = scrollPreserveRef.current;
    const messagesElement = messagesRef.current;
    messagesElement.scrollTop = messagesElement.scrollHeight - prevScrollHeight;
    scrollPreserveRef.current = null;
  }, [displayedMessages]);

  const handleResumeScroll = useCallback(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
    isUserAtBottomRef.current = true;
    setIsUserAtBottom(true);
    unseenMessageIdsRef.current.clear();
    setUnseenMessages(0);
  }, []);

  return {
    adjustedPlaybackTime,
    displayedMessages,
    handleResumeScroll,
    handleScroll,
    handleUserScrollIntent,
    isUserAtBottom,
    isUserAtBottomRef,
    loadingMore,
    messagesRef,
    seekLoading,
    unseenMessages,
  };
}
