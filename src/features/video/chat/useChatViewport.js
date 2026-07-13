import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_CHAT_WIDTH = 600;
const MIN_CHAT_WIDTH = 350;
const MOBILE_BREAKPOINT = 1100;

function readChatWidth() {
  const saved = localStorage.getItem('chatWidth');
  if (saved === null) return MIN_CHAT_WIDTH;

  const parsed = parseInt(saved, 10);
  return Number.isFinite(parsed) ? parsed : MIN_CHAT_WIDTH;
}

function isDesktopLayout() {
  return window.innerWidth > MOBILE_BREAKPOINT
    && !window.matchMedia('(orientation: portrait)').matches;
}

function resetFullscreenBodyStyles() {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.height = '';
}

export default function useChatViewport({
  onResizeEnd,
}) {
  const [chatWidth, setChatWidth] = useState(readChatWidth);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const resizedWidthRef = useRef(chatWidth);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreen);

      if (fullscreen) {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
      } else {
        resetFullscreenBodyStyles();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      resetFullscreenBodyStyles();
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  }, []);

  const handleResizeStart = useCallback((event) => {
    if (!isDesktopLayout()) return;

    event.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = event.clientX;
    resizeStartWidthRef.current = chatWidth;
    resizedWidthRef.current = chatWidth;
  }, [chatWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event) => {
      const delta = resizeStartXRef.current - event.clientX;
      const nextWidth = Math.max(
        MIN_CHAT_WIDTH,
        Math.min(MAX_CHAT_WIDTH, resizeStartWidthRef.current + delta),
      );
      resizedWidthRef.current = nextWidth;
      setChatWidth(nextWidth);
    };
    const handleMouseUp = () => {
      localStorage.setItem('chatWidth', resizedWidthRef.current.toString());
      setIsResizing(false);
      onResizeEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onResizeEnd]);

  const desktopWidthStyle = isDesktopLayout()
    ? { width: `${chatWidth}px`, minWidth: `${chatWidth}px` }
    : {};

  return {
    desktopWidthStyle,
    handleResizeStart,
    isFullscreen,
    isResizing,
    toggleFullscreen,
  };
}
