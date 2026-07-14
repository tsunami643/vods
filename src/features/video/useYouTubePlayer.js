import { useCallback, useEffect, useRef } from 'react';

const YOUTUBE_IFRAME_API_SCRIPT_ID = 'youtube-iframe-api';
let youtubeIframeApiPromise = null;

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const existingReadyHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        existingReadyHandler?.();
      } finally {
        resolve();
      }
    };

    let script = document.getElementById(YOUTUBE_IFRAME_API_SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = YOUTUBE_IFRAME_API_SCRIPT_ID;
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }

    script.addEventListener('error', () => {
      youtubeIframeApiPromise = null;
      script.remove();
      reject(new Error('Unable to load the YouTube iframe API'));
    }, { once: true });
  });

  return youtubeIframeApiPromise;
}

export default function useYouTubePlayer({
  currentVideoId,
  enabled,
  iframeRef,
  iframeId,
  onFirstPlaying,
  onPlayingChange,
  onPlaylistVideoChange,
  onSignificantBuffer,
  onTimeChange,
  playlistVideosRef,
  shouldPlay = true,
}) {
  const playerRef = useRef(null);
  const pendingSeekRef = useRef(null);
  const lastProcessedTimeRef = useRef(0);
  const currentVideoIdRef = useRef(currentVideoId);
  const iframeIdRef = useRef(iframeId);
  const shouldPlayRef = useRef(shouldPlay);
  const callbacksRef = useRef({
    onFirstPlaying,
    onPlayingChange,
    onPlaylistVideoChange,
    onSignificantBuffer,
    onTimeChange,
  });

  useEffect(() => {
    currentVideoIdRef.current = currentVideoId;
  }, [currentVideoId]);

  useEffect(() => {
    iframeIdRef.current = iframeId;
  }, [iframeId]);

  useEffect(() => {
    shouldPlayRef.current = shouldPlay;
    if (!shouldPlay) return;

    try {
      playerRef.current?.playVideo?.();
    } catch {}
  }, [shouldPlay]);

  useEffect(() => {
    callbacksRef.current = {
      onFirstPlaying,
      onPlayingChange,
      onPlaylistVideoChange,
      onSignificantBuffer,
      onTimeChange,
    };
  }, [onFirstPlaying, onPlayingChange, onPlaylistVideoChange, onSignificantBuffer, onTimeChange]);

  useEffect(() => {
    if (!enabled || !iframeId || !iframeRef.current) return;

    let cancelled = false;
    let intervalId = null;
    let player = null;
    let hasReportedPlaying = false;
    const iframe = iframeRef.current;

    const reportPlayingState = (playing) => {
      callbacksRef.current.onPlayingChange(playing);
      if (playing && !hasReportedPlaying) {
        hasReportedPlaying = true;
        callbacksRef.current.onFirstPlaying?.();
      }
    };

    const handleYouTubeMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      if (event.source !== iframe.contentWindow) return;

      let data;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (data?.event !== 'infoDelivery' || !Number.isInteger(data?.info?.playlistIndex)) {
        return;
      }

      const newIndex = data.info.playlistIndex;
      const videos = playlistVideosRef.current;
      if (newIndex < 0 || newIndex >= videos.length) return;

      const newVideo = videos[newIndex];
      if (newVideo?.youtubeId && newVideo.youtubeId !== currentVideoIdRef.current) {
        currentVideoIdRef.current = newVideo.youtubeId;
        callbacksRef.current.onPlaylistVideoChange(newVideo, newIndex);
      }
    };

    window.addEventListener('message', handleYouTubeMessage);

    const initializePlayer = async () => {
      try {
        await loadYouTubeIframeApi();
      } catch {
        return;
      }
      if (cancelled) return;

      if (!iframe.isConnected || playerRef.current || cancelled) return;

      player = new window.YT.Player(iframe, {
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current = player;
            try {
              if (pendingSeekRef.current !== null) {
                if (pendingSeekRef.current.iframeId === iframeId) {
                  player.seekTo?.(pendingSeekRef.current.time, true);
                }
                pendingSeekRef.current = null;
              }
              if (shouldPlayRef.current) player.playVideo?.();
            } catch {}

            intervalId = setInterval(() => {
              if (cancelled || !playerRef.current) return;
              try {
                callbacksRef.current.onTimeChange(
                  playerRef.current.getCurrentTime?.() || 0
                );
                reportPlayingState(
                  playerRef.current.getPlayerState?.() === window.YT.PlayerState.PLAYING
                );
              } catch {}
            }, 200);
          },
          onStateChange: (event) => {
            if (cancelled) return;

            const state = event.data;
            reportPlayingState(state === window.YT.PlayerState.PLAYING);

            if (state === window.YT.PlayerState.BUFFERING) {
              try {
                const currentTime = playerRef.current?.getCurrentTime?.() || 0;
                if (Math.abs(currentTime - lastProcessedTimeRef.current) >= 2) {
                  callbacksRef.current.onSignificantBuffer();
                }
                lastProcessedTimeRef.current = currentTime;
              } catch {}
            }
          },
        },
      });
    };

    initializePlayer();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('message', handleYouTubeMessage);
      playerRef.current = null;
    };
  }, [enabled, iframeId, iframeRef, playlistVideosRef]);

  const getCurrentTime = useCallback(
    () => playerRef.current?.getCurrentTime?.(),
    []
  );

  const seekTo = useCallback((time) => {
    try {
      if (playerRef.current?.seekTo) {
        playerRef.current.seekTo(time, true);
        return;
      }
    } catch {}

    pendingSeekRef.current = { iframeId: iframeIdRef.current, time };
  }, []);

  const playVideoAt = useCallback((index) => {
    try {
      if (!playerRef.current?.playVideoAt) return false;
      playerRef.current.playVideoAt(index);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { getCurrentTime, playVideoAt, seekTo };
}
