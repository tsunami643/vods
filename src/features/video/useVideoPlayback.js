import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { formatTimeForUrl, parseTimeToSeconds } from './videoUtils';

export default function useVideoPlayback({
  currentTime,
  initialTimeOverride = null,
  playerTimeGetterRef,
  playlist,
  video,
  videoId,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialTime, setInitialTime] = useState(null);
  const currentTimeRef = useRef(0);
  const hasInitializedRef = useRef(false);
  const lastInitializedIdRef = useRef(null);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (lastInitializedIdRef.current !== videoId) {
      hasInitializedRef.current = false;
      lastInitializedIdRef.current = videoId;
    }

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    setInitialTime(null);

    if (Number.isFinite(initialTimeOverride) && initialTimeOverride >= 0) {
      setInitialTime(initialTimeOverride);
      return;
    }

    const timeParam = searchParams.get('time');
    if (timeParam) {
      const seconds = parseTimeToSeconds(timeParam);
      if (seconds !== null && seconds >= 0) {
        setInitialTime(seconds);
        return;
      }
    }

    try {
      const saved = localStorage.getItem('videoPlaybackState');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.videoId === videoId) {
          setInitialTime(Math.max(0, state.time - 5));
        }
      }
    } catch {}
  }, [initialTimeOverride, searchParams, videoId]);

  const resetInitialTime = useCallback(() => {
    setInitialTime(null);
    hasInitializedRef.current = false;
  }, []);

  const updateUrlTime = useCallback((time) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('video', videoId);
      nextParams.delete('playlist');
      if (time > 0) {
        nextParams.set('time', formatTimeForUrl(time));
      } else {
        nextParams.delete('time');
      }
      return nextParams;
    }, { replace: true });
  }, [setSearchParams, videoId]);

  const savePlaybackState = useCallback((timeOverride = null) => {
    if (!video) return;

    const time = Number.isFinite(timeOverride)
      ? timeOverride
      : playerTimeGetterRef.current?.() || currentTimeRef.current;

    localStorage.setItem('videoPlaybackState', JSON.stringify({
      videoId,
      time: Math.floor(time),
      updatedAt: Date.now(),
    }));
  }, [playerTimeGetterRef, video, videoId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') savePlaybackState();
    };

    const handleBeforeUnload = () => savePlaybackState();
    const intervalId = setInterval(savePlaybackState, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      savePlaybackState();
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [savePlaybackState]);

  useEffect(() => {
    if (!video?.youtubeId || !playlist?.youtubeId) return;
    localStorage.setItem('lastPlayedVideo', video.youtubeId);
    localStorage.setItem('lastPlayedPlaylist', playlist.youtubeId);
  }, [playlist?.youtubeId, video?.youtubeId]);

  return {
    currentTimeRef,
    initialTime,
    resetInitialTime,
    savePlaybackState,
    updateUrlTime,
  };
}
