import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorStatus, isRequestCanceled, vodsApi } from '../../shared/vodsApi';

export default function useVideoData(videoId, onLoadStart) {
  const [video, setVideo] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const playlistVideosRef = useRef([]);
  const skipNextLoadRef = useRef(false);

  const activatePlaylistVideo = useCallback((nextVideo) => {
    skipNextLoadRef.current = true;
    setVideo(nextVideo);
  }, []);

  useEffect(() => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }

    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setLoadError(null);
    setVideo(null);
    setPlaylist(null);
    onLoadStart();

    vodsApi.getVideo(videoId, { signal: controller.signal })
      .then((videoData) => {
        if (!active) return null;
        setVideo(videoData);
        if (videoData.playlistYoutubeId) {
          return vodsApi.getPlaylist(videoData.playlistYoutubeId, {
            signal: controller.signal,
          });
        }
        return null;
      })
      .then((playlistData) => {
        if (active && playlistData) {
          setPlaylist(playlistData);
          playlistVideosRef.current = playlistData.videos || [];
        }
      })
      .catch((error) => {
        if (!isRequestCanceled(error) && active) {
          setVideo(null);
          setPlaylist(null);
          setLoadError(
            getErrorStatus(error) === 404
              ? 'Video not found'
              : 'Unable to load video'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [videoId, onLoadStart]);

  return {
    activatePlaylistVideo,
    loadError,
    loading,
    playlist,
    playlistVideosRef,
    video,
  };
}
