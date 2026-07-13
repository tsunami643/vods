import { useCallback, useRef } from 'react';

const DOUBLE_TAP_DELAY = 300;
const DOUBLE_TAP_DISTANCE = 30;
const TAP_MOVE_THRESHOLD = 10;

function getTouchPosition(event) {
  const touch = event.changedTouches[0];
  return { x: touch.screenX, y: touch.screenY };
}

function isNearTap(first, second) {
  return Math.abs(first.x - second.x) < DOUBLE_TAP_DISTANCE
    && Math.abs(first.y - second.y) < DOUBLE_TAP_DISTANCE;
}

export default function useVideoPageGestures({
  isWideChat,
  onHideVideoInfo,
  onWideChatChange,
}) {
  const chatTouchStartRef = useRef({ x: 0, y: 0 });
  const chatLastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const infoTouchStartRef = useRef({ x: 0, y: 0 });
  const infoLastTapRef = useRef({ time: 0, x: 0, y: 0 });

  const handleChatTouchStart = useCallback((event) => {
    chatTouchStartRef.current = getTouchPosition(event);
  }, []);

  const handleChatTouchEnd = useCallback((event) => {
    const end = getTouchPosition(event);
    const start = chatTouchStartRef.current;
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const absoluteX = Math.abs(deltaX);
    const absoluteY = Math.abs(deltaY);

    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (isPortrait || hasFinePointer) return;

    if (absoluteX < TAP_MOVE_THRESHOLD && absoluteY < TAP_MOVE_THRESHOLD) {
      const now = Date.now();
      const lastTap = chatLastTapRef.current;

      if (now - lastTap.time < DOUBLE_TAP_DELAY && isNearTap(end, lastTap)) {
        onWideChatChange(!isWideChat);
        chatLastTapRef.current = { time: 0, x: 0, y: 0 };
        return;
      }

      chatLastTapRef.current = { time: now, ...end };
      return;
    }

    if (absoluteX > absoluteY) {
      if (deltaX > 0 && isWideChat) onWideChatChange(false);
      if (deltaX < 0 && !isWideChat) onWideChatChange(true);
    }
  }, [isWideChat, onWideChatChange]);

  const handleInfoTouchStart = useCallback((event) => {
    infoTouchStartRef.current = getTouchPosition(event);
  }, []);

  const handleInfoTouchEnd = useCallback((event) => {
    const end = getTouchPosition(event);
    const start = infoTouchStartRef.current;
    const absoluteX = Math.abs(end.x - start.x);
    const absoluteY = Math.abs(end.y - start.y);

    if (absoluteX >= TAP_MOVE_THRESHOLD || absoluteY >= TAP_MOVE_THRESHOLD) return;

    const now = Date.now();
    const lastTap = infoLastTapRef.current;
    if (now - lastTap.time < DOUBLE_TAP_DELAY && isNearTap(end, lastTap)) {
      onHideVideoInfo();
      infoLastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }

    infoLastTapRef.current = { time: now, ...end };
  }, [onHideVideoInfo]);

  return {
    handleChatTouchEnd,
    handleChatTouchStart,
    handleInfoTouchEnd,
    handleInfoTouchStart,
  };
}
