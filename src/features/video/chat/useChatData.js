import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorStatus, isRequestCanceled, vodsApi } from '../../../shared/vodsApi';
import { mergeSortedMessages } from './chatMessages';

function findMissingRanges(loadedRanges, start, end) {
  if (loadedRanges.length === 0) return [{ start, end }];

  const missing = [];
  let currentStart = start;

  for (const range of loadedRanges) {
    if (range.end <= currentStart) continue;
    if (range.start >= end) break;

    if (range.start > currentStart) {
      missing.push({ start: currentStart, end: Math.min(range.start, end) });
    }

    currentStart = Math.max(currentStart, range.end);
    if (currentStart >= end) break;
  }

  if (currentStart < end) missing.push({ start: currentStart, end });
  return missing;
}

function mergeRanges(ranges) {
  const sorted = [...ranges].sort((first, second) => first.start - second.start);
  const merged = [];

  for (const range of sorted) {
    if (merged.length === 0 || merged[merged.length - 1].end < range.start) {
      merged.push({ ...range });
    } else {
      merged[merged.length - 1].end = Math.max(
        merged[merged.length - 1].end,
        range.end
      );
    }
  }

  return merged;
}

function rangesOverlap(first, second) {
  return first.start < second.end && second.start < first.end;
}

export default function useChatData(videoId) {
  const [metadata, setMetadata] = useState(null);
  const [badgeList, setBadgeList] = useState([]);
  const [emoteList, setEmoteList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const messageMapRef = useRef(new Map());
  const badgeMapRef = useRef(new Map());
  const emoteMapRef = useRef(new Map());
  const userMapRef = useRef(new Map());
  const loadedRangesRef = useRef([]);
  const inFlightRangesRef = useRef([]);
  const mountedVideoIdRef = useRef(videoId);
  const rangeAbortControllerRef = useRef(new AbortController());

  useEffect(() => {
    const requestedVideoId = videoId;
    mountedVideoIdRef.current = requestedVideoId;

    setMetadata(null);
    setBadgeList([]);
    setEmoteList([]);
    setUserList([]);
    setAllMessages([]);
    setLoading(true);
    setError(null);

    messageMapRef.current = new Map();
    badgeMapRef.current = new Map();
    emoteMapRef.current = new Map();
    userMapRef.current = new Map();
    loadedRangesRef.current = [];
    inFlightRangesRef.current = [];

    const metadataController = new AbortController();
    rangeAbortControllerRef.current.abort();
    rangeAbortControllerRef.current = new AbortController();

    vodsApi.getChatMetadata(requestedVideoId, {
      signal: metadataController.signal,
    })
      .then((data) => {
        if (mountedVideoIdRef.current !== requestedVideoId) return;
        setMetadata(data);
        setLoading(false);
      })
      .catch((requestError) => {
        if (isRequestCanceled(requestError)) return;
        if (mountedVideoIdRef.current !== requestedVideoId) return;
        setError(
          getErrorStatus(requestError) === 404
            ? 'No chat archived for this VoD'
            : 'Failed to load chat'
        );
        setLoading(false);
      });

    return () => {
      metadataController.abort();
      rangeAbortControllerRef.current.abort();
    };
  }, [videoId]);

  const mergeChunkData = useCallback((data, targetVideoId) => {
    if (mountedVideoIdRef.current !== targetVideoId) return [];

    const {
      badgeList: newBadges,
      emoteList: newEmotes,
      userList: newUsers,
      chatList: newMessages,
    } = data;

    const badgesToAdd = [];
    const badgeIndexMap = {};
    newBadges.forEach((badge, index) => {
      const key = badge.setVersion || `${badge.title}-${badge.url}`;
      if (!badgeMapRef.current.has(key)) {
        badgeMapRef.current.set(key, badgeMapRef.current.size);
        badgesToAdd.push(badge);
      }
      badgeIndexMap[index] = badgeMapRef.current.get(key);
    });
    if (badgesToAdd.length > 0) {
      setBadgeList((current) => [...current, ...badgesToAdd]);
    }

    const emotesToAdd = [];
    const emoteIndexMap = {};
    newEmotes.forEach((emote, index) => {
      const key = emote.id || `${emote.text}-${emote.source}`;
      if (!emoteMapRef.current.has(key)) {
        emoteMapRef.current.set(key, emoteMapRef.current.size);
        emotesToAdd.push(emote);
      }
      emoteIndexMap[index] = emoteMapRef.current.get(key);
    });
    if (emotesToAdd.length > 0) {
      setEmoteList((current) => [...current, ...emotesToAdd]);
    }

    const usersToAdd = [];
    const userIndexMap = {};
    newUsers.forEach((user, index) => {
      const key = user.id || `${user.name}-${user.color}`;
      if (!userMapRef.current.has(key)) {
        userMapRef.current.set(key, userMapRef.current.size);
        usersToAdd.push(user);
      }
      userIndexMap[index] = userMapRef.current.get(key);
    });
    if (usersToAdd.length > 0) {
      setUserList((current) => [...current, ...usersToAdd]);
    }

    const processedMessages = [];
    newMessages.forEach((message) => {
      const messageId = message.id != null
        ? String(message.id)
        : `${targetVideoId}-${message.time}-${userIndexMap[message.user]}-${message.message.substring(0, 20)}`;

      if (messageMapRef.current.has(messageId)) return;

      const processed = {
        ...message,
        _id: messageId,
        _videoId: targetVideoId,
        user: userIndexMap[message.user],
        badges: message.badges?.map((badge) => badgeIndexMap[badge]),
        emotes: message.emotes?.map(([index, start, end]) => [
          emoteIndexMap[index],
          start,
          end,
        ]),
      };
      messageMapRef.current.set(messageId, processed);
      processedMessages.push(processed);
    });

    if (processedMessages.length > 0) {
      setAllMessages((current) => {
        if (mountedVideoIdRef.current !== targetVideoId) return current;
        return mergeSortedMessages(current, processedMessages);
      });
    }

    return processedMessages;
  }, []);

  const isRangeLoaded = useCallback((start, end) => {
    return loadedRangesRef.current.some(
      (range) => range.start <= start && range.end >= end
    );
  }, []);

  const loadSingleRange = useCallback(async (start, end, targetVideoId) => {
    if (mountedVideoIdRef.current !== targetVideoId) return [];

    try {
      const data = await vodsApi.getChatRange(targetVideoId, start, end, {
        signal: rangeAbortControllerRef.current.signal,
      });
      if (mountedVideoIdRef.current !== targetVideoId) return [];
      loadedRangesRef.current = mergeRanges([
        ...loadedRangesRef.current,
        { start, end },
      ]);
      return mergeChunkData(data, targetVideoId);
    } catch (requestError) {
      if (isRequestCanceled(requestError)) return [];
      return [];
    }
  }, [mergeChunkData]);

  const loadTimeRange = useCallback(async (start, end, targetVideoId) => {
    if (mountedVideoIdRef.current !== targetVideoId) return [];

    const requestedRange = { start, end };
    const existingRequests = inFlightRangesRef.current.filter(
      (request) => request.videoId === targetVideoId
        && rangesOverlap(request, requestedRange)
    );
    const coveredRanges = mergeRanges([
      ...loadedRangesRef.current,
      ...existingRequests,
    ]);
    const missingRanges = findMissingRanges(coveredRanges, start, end);

    const newRequests = missingRanges.map((range) => {
      const request = {
        ...range,
        promise: null,
        videoId: targetVideoId,
      };

      request.promise = loadSingleRange(
        range.start,
        range.end,
        targetVideoId,
      ).finally(() => {
        inFlightRangesRef.current = inFlightRangesRef.current.filter(
          (activeRequest) => activeRequest !== request
        );
      });
      inFlightRangesRef.current.push(request);
      return request;
    });

    const requestsToWaitFor = [...existingRequests, ...newRequests];
    if (requestsToWaitFor.length === 0) return [];

    const requestResults = await Promise.all(
      requestsToWaitFor.map((request) => request.promise)
    );
    if (mountedVideoIdRef.current !== targetVideoId) return [];

    const messagesById = new Map();
    for (const messages of requestResults) {
      for (const message of messages) messagesById.set(message._id, message);
    }
    return Array.from(messagesById.values());
  }, [loadSingleRange]);

  return {
    allMessages,
    badgeList,
    emoteList,
    error,
    isRangeLoaded,
    loadTimeRange,
    loading,
    messageMapRef,
    metadata,
    mountedVideoIdRef,
    userList,
  };
}
