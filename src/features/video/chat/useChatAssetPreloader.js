import { useCallback, useEffect, useRef } from 'react';
import {
  findCheermotes,
  getAssetSizeForDpr,
  getBadgeUrl,
  getCheermoteTier,
  getCheermoteUrl,
  getEmoteUrl,
} from './chatAssets';
import { binarySearchByTime } from './chatMessages';

const LOOKAHEAD_SECONDS = 30;
const SWEEP_BUCKET_SECONDS = 10;
const MAX_REQUESTS_PER_SWEEP = 15;

export default function useChatAssetPreloader({
  adjustedPlaybackTime,
  badgeList,
  emoteList,
  enabled,
  isUserAtBottomRef,
  messages,
  messagesRef,
  videoId,
}) {
  const scrollFrameRef = useRef(null);
  const requestedUrlsRef = useRef(new Set());
  const inFlightImagesRef = useRef(new Map());
  const sweepRef = useRef({ bucket: -1, requestCount: 0, videoId });
  const playbackTimeRef = useRef(adjustedPlaybackTime);
  const sweepBucket = Math.floor(adjustedPlaybackTime / SWEEP_BUCKET_SECONDS);
  playbackTimeRef.current = adjustedPlaybackTime;

  const clearInFlightImages = useCallback(() => {
    for (const image of inFlightImagesRef.current.values()) {
      image.onload = null;
      image.onerror = null;
    }
    inFlightImagesRef.current.clear();
  }, []);

  useEffect(() => {
    requestedUrlsRef.current = new Set();
    clearInFlightImages();
    sweepRef.current = { bucket: -1, requestCount: 0, videoId };

    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    }
  }, [clearInFlightImages, videoId]);

  const queuePreload = useCallback((url) => {
    if (!url || requestedUrlsRef.current.has(url)) return false;

    requestedUrlsRef.current.add(url);
    const image = new Image();
    image.decoding = 'async';
    inFlightImagesRef.current.set(url, image);

    image.onload = () => {
      if (inFlightImagesRef.current.get(url) === image) {
        inFlightImagesRef.current.delete(url);
      }
    };

    image.onerror = () => {
      if (inFlightImagesRef.current.get(url) === image) {
        inFlightImagesRef.current.delete(url);
        requestedUrlsRef.current.delete(url);
      }
    };

    image.src = url;
    return true;
  }, []);

  useEffect(() => {
    if (!enabled || messages.length === 0) return;

    const startTime = playbackTimeRef.current;
    const endTime = startTime + LOOKAHEAD_SECONDS;
    const assetSize = getAssetSizeForDpr(window.devicePixelRatio || 1);
    const startIndex = binarySearchByTime(messages, startTime);
    const sweep = sweepRef.current;

    if (sweep.videoId !== videoId || sweep.bucket !== sweepBucket) {
      sweepRef.current = { bucket: sweepBucket, requestCount: 0, videoId };
    }

    const activeSweep = sweepRef.current;
    const preload = (url) => {
      if (activeSweep.requestCount >= MAX_REQUESTS_PER_SWEEP) return;
      if (queuePreload(url)) activeSweep.requestCount += 1;
    };

    for (let index = startIndex; index < messages.length; index += 1) {
      const message = messages[index];
      if (message.time > endTime || activeSweep.requestCount >= MAX_REQUESTS_PER_SWEEP) {
        break;
      }

      for (const [emoteIndex] of message.emotes || []) {
        if (activeSweep.requestCount >= MAX_REQUESTS_PER_SWEEP) break;
        const emote = emoteList[emoteIndex];
        if (emote) preload(getEmoteUrl(emote, assetSize));
      }

      for (const cheer of findCheermotes(message.message || '')) {
        if (activeSweep.requestCount >= MAX_REQUESTS_PER_SWEEP) break;
        const { tier } = getCheermoteTier(cheer.amount);
        preload(getCheermoteUrl(cheer.name, tier, assetSize));
      }

      for (const badgeIndex of message.badges || []) {
        if (activeSweep.requestCount >= MAX_REQUESTS_PER_SWEEP) break;
        const badge = badgeList[badgeIndex];
        if (badge) preload(getBadgeUrl(badge, assetSize));
      }
    }
  }, [
    badgeList,
    emoteList,
    enabled,
    messages,
    queuePreload,
    sweepBucket,
    videoId,
  ]);

  const handleAssetSettled = useCallback(() => {
    if (!isUserAtBottomRef.current || !messagesRef.current) return;
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      if (!isUserAtBottomRef.current || !messagesRef.current) return;
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    });
  }, [isUserAtBottomRef, messagesRef]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }
    clearInFlightImages();
  }, [clearInFlightImages]);

  return handleAssetSettled;
}
