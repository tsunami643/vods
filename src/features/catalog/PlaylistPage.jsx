import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { routes } from '../../routes';
import { getErrorStatus, isRequestCanceled, vodsApi } from '../../shared/vodsApi';
import '../../styles/PlaylistPage.css';

const PLAYLIST_SKELETON_VIDEO_COUNT = 4;

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTotalDuration(videos = []) {
  const totalSeconds = videos.reduce(
    (total, video) => total + (Number(video.duration) || 0),
    0
  );
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const hourLabel = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const minuteLabel = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;

  return `${hourLabel}, ${minuteLabel}`;
}

function PlaylistPageSkeleton() {
  return (
    <div
      className="playlist-page playlist-page-skeleton"
      role="status"
      aria-label="Loading playlist"
    >
      <div className="playlist-header">
        <span className="playlist-skeleton-block playlist-skeleton-cover" />
        <div className="playlist-info playlist-skeleton-info">
          <span className="playlist-skeleton-block playlist-skeleton-title" />
          <div className="playlist-stats">
            <span className="playlist-skeleton-block playlist-skeleton-duration" />
            <span className="playlist-skeleton-block playlist-skeleton-count" />
          </div>
        </div>
      </div>

      <div className="playlist-videos" aria-hidden="true">
        {Array.from({ length: PLAYLIST_SKELETON_VIDEO_COUNT }, (_, index) => (
          <div className="playlist-video-skeleton" key={index}>
            <span className="playlist-skeleton-block playlist-skeleton-index" />
            <span className="playlist-skeleton-block playlist-skeleton-thumbnail" />
            <div className="playlist-skeleton-video-details">
              <div className="playlist-skeleton-video-heading">
                <span className="playlist-skeleton-block playlist-skeleton-video-title" />
                <span className="playlist-skeleton-block playlist-skeleton-video-date" />
              </div>
              <span className="playlist-skeleton-block playlist-skeleton-video-subtitle" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlaylistPage({ playlistId }) {
  const id = playlistId;
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);
    vodsApi.getPlaylist(id, { signal: controller.signal })
      .then(data => {
        if (active) setPlaylist(data);
      })
      .catch(requestError => {
        if (isRequestCanceled(requestError) || !active) return;
        setPlaylist(null);
        setError(getErrorStatus(requestError) === 404 ? "Playlist not found" : "Unable to load playlist");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  if (loading) {
    return <PlaylistPageSkeleton />;
  }

  if (error || !playlist) {
    return (
      <div className="playlist-page">
        <div className="playlist-error">{error || "Playlist not found"}</div>
      </div>
    );
  }

  const firstVideo = playlist.videos?.[0];
  const youtubePlaylistUrl = firstVideo?.youtubeId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(firstVideo.youtubeId)}${
      playlist.youtubeId ? `&list=${encodeURIComponent(playlist.youtubeId)}` : ''
    }`
    : null;

  return (
    <div className="playlist-page">
      <div className="playlist-header">
        {playlist.gameCover && (
          <img src={playlist.gameCover} alt="" className="playlist-cover" />
        )}
        <div className="playlist-info">
          <h1 className="playlist-title">{playlist.name}</h1>
          <div className="playlist-stats">
            <p className="playlist-meta playlist-duration">
              {formatTotalDuration(playlist.videos)}
            </p>
            <p className="playlist-meta playlist-video-count">
              {playlist.videos?.length || 0} videos
            </p>
          </div>
          {youtubePlaylistUrl && (
            <a
              className="playlist-youtube-link"
              href={youtubePlaylistUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="playlist-youtube-logo" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="1" y="4.5" width="22" height="15" rx="4" />
                <path d="M10 8.5v7l6-3.5z" />
              </svg>
              <span>Watch on YouTube</span>
            </a>
          )}
        </div>
      </div>
      
      <div className="playlist-videos">
        {playlist.videos?.map((video, index) => (
          <Link
            key={video.youtubeId}
            to={routes.video(video.youtubeId)}
            className="video-item"
          >
            <span className="video-index">{index + 1}</span>
            <div className="video-thumbnail-container">
              <img
                src={`https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`}
                alt=""
                className="video-thumbnail"
              />
              {video.duration && (
                <span className="video-duration">{formatDuration(video.duration)}</span>
              )}
            </div>
            <div className="video-details">
              <div className="video-heading">
                <h3 className="video-title">{video.name}</h3>
                {video.publishedAt && (
                  <p className="video-date">{formatDate(video.publishedAt)}</p>
                )}
              </div>
              {video.subTitle && (
                <p className="video-subtitle">{video.subTitle}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
