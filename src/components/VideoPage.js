import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../utils/constants';
import { ChatContainer } from './chat';
import '../styles/VideoPage.css';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}


function parseTimecode(ts) {
  const parts = ts.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export default function VideoPage() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const playerRef = useRef(null);
  const descriptionRef = useRef(null);
  const videoWrapperRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setVideo(null);
    setPlaylist(null);
    setCurrentTime(0);
    
    axios.get(`${API_URL}/video/${id}`)
      .then(res => {
        setVideo(res.data);
        if (res.data.playlistYoutubeId) {
          return axios.get(`${API_URL}/playlist/${res.data.playlistYoutubeId}`);
        }
        return null;
      })
      .then(playlistRes => {
        if (playlistRes) setPlaylist(playlistRes.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!video) return;
    
    let cancelled = false;
    let intervalId = null;
    let player = null;
    
    function loadYT() {
      return new Promise(resolve => {
        if (window.YT?.Player) { resolve(); return; }
        if (window.onYouTubeIframeAPIReadyCallbacks) {
          window.onYouTubeIframeAPIReadyCallbacks.push(resolve);
          return;
        }
        window.onYouTubeIframeAPIReadyCallbacks = [resolve];
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        window.onYouTubeIframeAPIReady = () => {
          window.onYouTubeIframeAPIReadyCallbacks.forEach(cb => cb());
          window.onYouTubeIframeAPIReadyCallbacks = null;
        };
        document.body.appendChild(tag);
      });
    }

    const initPlayer = async () => {
      await loadYT();
      if (cancelled) return;
      
      const iframe = document.getElementById(`yt-player-${video.youtubeId}`);
      if (!iframe || cancelled) return;
      
      player = new window.YT.Player(iframe, {
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current = player;
            intervalId = setInterval(() => {
              if (cancelled || !playerRef.current) return;
              try {
                setCurrentTime(playerRef.current.getCurrentTime?.() || 0);
                setIsPlaying(playerRef.current.getPlayerState?.() === window.YT.PlayerState.PLAYING);
              } catch {}
            }, 200);
          },
          onStateChange: (ev) => {
            if (!cancelled) setIsPlaying(ev.data === window.YT.PlayerState.PLAYING);
          }
        }
      });
    };
    
    const timeoutId = setTimeout(initPlayer, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      playerRef.current = null;
    };
  }, [video]);

  const handleSeek = useCallback((time) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  }, []);

  useEffect(() => {
    if (!descriptionRef.current) return;
    
    const handleClick = (e) => {
      const target = e.target.closest('.timecode');
      if (target && target.dataset.seek) {
        e.preventDefault();
        e.stopPropagation();
        const seconds = parseInt(target.dataset.seek, 10);
        handleSeek(seconds);
      }
    };
    
    const el = descriptionRef.current;
    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [handleSeek, showDescription]);

  const handlePartClick = () => {
    setShowPartDropdown(false);
  };

  const handleToggleDescription = () => {
    const newShowDescription = !showDescription;
    setShowDescription(newShowDescription);
    
    if (newShowDescription && videoWrapperRef.current && window.innerWidth > 1100) {
      setTimeout(() => {
        if (videoWrapperRef.current) {
          videoWrapperRef.current.scrollTop = videoWrapperRef.current.scrollHeight;
        }
      }, 50);
    }
  };

  const isStaleVideo = video && video.youtubeId !== id;
  if (loading || isStaleVideo) return <div className="video-page" style={{ color: '#fff', padding: 20 }}>Loading...</div>;
  if (!video) return <div className="video-page" style={{ color: '#fff', padding: 20 }}>Video not found</div>;

  const hasDescription = video.description && !video.description.startsWith('Broadcasted live on Twitch');
  const videos = playlist?.videos || [];
  const currentIndex = videos.findIndex(v => v.youtubeId === video.youtubeId);
  const partMatch = video.name?.match(/\(Part\s+(\d+(?:\.\d+)?)/);
  const partNumber = partMatch ? partMatch[1] : (currentIndex + 1);

  const formattedDescription = video.description
    ?.replace(/https?:\/\/\S+/g, url => `<a class="description-link" target="_blank" rel="noopener noreferrer" href="${url}">${url}</a>`)
    .replace(/\b(\d{1,2}:)?(\d{1,2}):(\d{2})\b/g, (match) => {
      const seconds = parseTimecode(match);
      return `<button type="button" class="description-link timecode" data-seek="${seconds}">${match}</button>`;
    });

  return (
    <div className="video-page">
      <div className="video-content">
        <div ref={videoWrapperRef} className={`video-wrapper ${showDescription ? 'description-shown' : ''}`}>
          <div className="compact-header">
            <Link to="/" className="header-logo-link">
              <img src={require('../images/logo.png')} alt="logo" className="header-logo" />
              <span className="header-site-name">tsunami's twitch vods</span>
            </Link>
          </div>
          
          <div className="youtube-player-container">
            <iframe
              key={video.youtubeId}
              id={`yt-player-${video.youtubeId}`}
              title={video.name}
              src={`https://www.youtube.com/embed/${video.youtubeId}?enablejsapi=1&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          
          <div className="info-container" style={{ height: showDescription ? 'auto' : undefined }}>
            <div className="info-topbar">
              <div className="video-metadata-container">
                {playlist?.gameCover && (
                  <Link 
                    to={`/playlist/${video.playlistYoutubeId}`}
                    className="game-cover" 
                    title="Go to Playlist"
                  >
                    <img src={playlist.gameCover} alt="Game Cover" className="game-cover-img" />
                    <div className="game-cover-overlay">
                      <svg className="back-arrow" viewBox="4 4 16 16">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" />
                      </svg>
                    </div>
                  </Link>
                )}
                <div className="video-text-container">
                  <div className="video-header">
                    <div className="video-title">{video.name}</div>
                    {video.subTitle && <div className="video-subtitle" title="Twitch Stream Title">{video.subTitle}</div>}
                    <div className="video-date">{formatDate(video.publishedAt || video.createdAt)}</div>
                  </div>
                </div>
              </div>
              
              <div className="video-controls">
                {videos.length > 1 && (
                  <div className="part-selector-container">
                    <label>Part</label>
                    <button 
                      className="part-selector-button"
                      onClick={() => setShowPartDropdown(!showPartDropdown)}
                    >
                      {partNumber} ▾
                    </button>
                    {showPartDropdown && (
                      <div className="part-dropdown">
                        {videos.map((v) => (
                          <Link 
                            key={v.youtubeId}
                            to={`/video/${v.youtubeId}`}
                            className={`part-dropdown-item ${v.youtubeId === video.youtubeId ? 'active' : ''}`}
                            onClick={handlePartClick}
                          >
                            <div className="part-dropdown-thumb-container">
                              <img 
                                src={`https://i.ytimg.com/vi/${v.youtubeId}/mqdefault.jpg`}
                                alt=""
                                className="part-dropdown-thumb"
                              />
                              {v.duration && (
                                <div className="part-duration-badge">{formatDuration(v.duration)}</div>
                              )}
                            </div>
                            <div className="part-dropdown-text">
                              <div className="part-video-title">{v.name}</div>
                              <div className="part-video-date">{formatDate(v.publishedAt)}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {hasDescription && (
                  <div className="description-expander-container" onClick={handleToggleDescription}>
                    <label className="description-button-label">
                      {showDescription ? 'Hide' : 'Show'} Description
                    </label>
                    <div className="description-button-container">
                      <button className="svg-button">
                        <svg className="description-icon" viewBox="4 4 16 16">
                          <path d="M14 17H4v2h10zm6-8H4v2h16zM4 15h16v-2H4zM4 5v2h16V5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {showDescription && hasDescription && (
              <div className="video-description-container">
                <div 
                  ref={descriptionRef}
                  className="video-description"
                  dangerouslySetInnerHTML={{ __html: formattedDescription }}
                />
              </div>
            )}
          </div>
        </div>
        
        <ChatContainer
          key={id}
          videoId={video.id}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onSeek={handleSeek}
          delayTime={3}
        />
      </div>
    </div>
  );
}
