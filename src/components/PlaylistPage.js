import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../utils/constants';
import '../styles/PlaylistPage.css';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/playlist/${id}`)
      .then(res => setPlaylist(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="playlist-page">
        <div className="playlist-loading">Loading...</div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="playlist-page">
        <div className="playlist-error">Playlist not found</div>
      </div>
    );
  }

  return (
    <div className="playlist-page">
      <div className="playlist-header">
        {playlist.gameCover && (
          <img src={playlist.gameCover} alt="" className="playlist-cover" />
        )}
        <div className="playlist-info">
          <h1 className="playlist-title">{playlist.name}</h1>
          <p className="playlist-meta">{playlist.videos?.length || 0} videos</p>
        </div>
      </div>
      
      <div className="playlist-videos">
        {playlist.videos?.map((video, index) => (
          <Link
            key={video.youtubeId}
            to={`/video/${video.youtubeId}`}
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
              <h3 className="video-title">{video.name}</h3>
              {video.subTitle && (
                <p className="video-subtitle">{video.subTitle}</p>
              )}
              {video.publishedAt && (
                <p className="video-date">{formatDate(video.publishedAt)}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
