import { useCallback, useRef } from 'react';

const DOUBLE_TAP_DELAY = 300;
const DOUBLE_TAP_DISTANCE = 30;
const TAP_MOVE_THRESHOLD = 10;
const INFO_GESTURE_CONTROL_SELECTOR = [
  '.description-expander-container',
  '.part-selector-container',
  'a',
  'button',
  'input',
  'select',
  'textarea',
].join(', ');

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
  onToggleVideoInfo,
  onWideChatChange,
}) {
  const chatTouchStartRef = useRef({ x: 0, y: 0 });
  const chatLastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const headerTouchStartRef = useRef({ x: 0, y: 0 });
  const headerLastTapRef = useRef({ time: 0, x: 0, y: 0 });
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

  const handleHeaderTouchStart = useCallback((event) => {
    if (event.target.closest?.('.header-button, .settings-panel')) {
      headerTouchStartRef.current = null;
      headerLastTapRef.current = { time: 0, x: 0, y: 0 };
      event.stopPropagation();
      return;
    }

    headerTouchStartRef.current = getTouchPosition(event);
  }, []);

  const handleHeaderTouchEnd = useCallback((event) => {
    if (event.target.closest?.('.header-button, .settings-panel')) {
      headerLastTapRef.current = { time: 0, x: 0, y: 0 };
      event.stopPropagation();
      return;
    }

    const end = getTouchPosition(event);
    const start = headerTouchStartRef.current;
    if (!start) return;

    const absoluteX = Math.abs(end.x - start.x);
    const absoluteY = Math.abs(end.y - start.y);

    if (absoluteX >= TAP_MOVE_THRESHOLD || absoluteY >= TAP_MOVE_THRESHOLD) return;

    const now = Date.now();
    const lastTap = headerLastTapRef.current;
    if (now - lastTap.time < DOUBLE_TAP_DELAY && isNearTap(end, lastTap)) {
      event.stopPropagation();
      onToggleVideoInfo();
      headerLastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }

    headerLastTapRef.current = { time: now, ...end };
  }, [onToggleVideoInfo]);

  const handleInfoTouchStart = useCallback((event) => {
    if (event.target.closest?.(INFO_GESTURE_CONTROL_SELECTOR)) {
      infoTouchStartRef.current = null;
      infoLastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }

    infoTouchStartRef.current = getTouchPosition(event);
  }, []);

  const handleInfoTouchEnd = useCallback((event) => {
    if (event.target.closest?.(INFO_GESTURE_CONTROL_SELECTOR)) {
      infoTouchStartRef.current = null;
      infoLastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }

    const end = getTouchPosition(event);
    const start = infoTouchStartRef.current;
    if (!start) return;

    const absoluteX = Math.abs(end.x - start.x);
    const absoluteY = Math.abs(end.y - start.y);

    if (absoluteX >= TAP_MOVE_THRESHOLD || absoluteY >= TAP_MOVE_THRESHOLD) return;

    const now = Date.now();
    const lastTap = infoLastTapRef.current;
    if (now - lastTap.time < DOUBLE_TAP_DELAY && isNearTap(end, lastTap)) {
      onToggleVideoInfo();
      infoLastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }

    infoLastTapRef.current = { time: now, ...end };
  }, [onToggleVideoInfo]);

  return {
    handleChatTouchEnd,
    handleChatTouchStart,
    handleHeaderTouchEnd,
    handleHeaderTouchStart,
    handleInfoTouchEnd,
    handleInfoTouchStart,
  };
}
