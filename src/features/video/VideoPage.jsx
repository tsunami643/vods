import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes';
import {
  getVideoDocumentTitle,
  SITE_TITLE,
} from './videoUtils';
import VideoInfo from './VideoInfo';
import VideoPlayer from './VideoPlayer';
import useVideoData from './useVideoData';
import useVideoPageGestures from './useVideoPageGestures';
import useVideoPlayback from './useVideoPlayback';
import useYouTubePlayer from './useYouTubePlayer';
import ChatContainer from './chat/ChatContainer';
import '../../styles/VideoPage.css';

export default function VideoPage({ videoId }) {
  const id = videoId;
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [hideVideoInfo, setHideVideoInfo] = useState(false);
  const [isWideChat, setIsWideChat] = useState(false);
  const [pageTheme, setPageTheme] = useState(() => {
    return localStorage.getItem('chatTheme') || 'blue';
  });
  const resetCurrentTime = useCallback(() => setCurrentTime(0), []);
  const {
    activatePlaylistVideo,
    loadError,
    loading,
    playlist,
    playlistVideosRef,
    video,
  } = useVideoData(id, resetCurrentTime);
  const playerTimeGetterRef = useRef(null);
  const iframeRef = useRef(null);
  const descriptionRef = useRef(null);
  const descriptionOverflowCleanupRef = useRef(null);
  const partSelectorRef = useRef(null);
  const partDropdownRef = useRef(null);
  const dropdownScrolledRef = useRef(false);
  const {
    currentTimeRef,
    initialTime,
    resetInitialTime,
    savePlaybackState,
    updateUrlTime,
  } = useVideoPlayback({
    currentTime,
    playerTimeGetterRef,
    playlist,
    video,
    videoId: id,
  });

  const handlePlaylistVideoChange = useCallback((newVideo) => {
    activatePlaylistVideo(newVideo);
    setCurrentTime(0);
    resetInitialTime();
    setShowDescription(false);
    navigate(routes.video(newVideo.youtubeId), { replace: true });
  }, [activatePlaylistVideo, navigate, resetInitialTime]);

  const closePartDropdown = useCallback(() => setShowPartDropdown(false), []);
  const {
    getCurrentTime: getPlayerCurrentTime,
    playVideoAt,
    seekTo,
  } = useYouTubePlayer({
    currentVideoId: video?.youtubeId,
    enabled: !loading && Boolean(video),
    iframeRef,
    iframeId: playlist?.youtubeId || video?.youtubeId,
    onPlayingChange: setIsPlaying,
    onPlaylistVideoChange: handlePlaylistVideoChange,
    onSignificantBuffer: closePartDropdown,
    onTimeChange: setCurrentTime,
    playlistVideosRef,
  });
  playerTimeGetterRef.current = getPlayerCurrentTime;

  useEffect(() => {
    document.title = getVideoDocumentTitle(video?.name);
    return () => {
      document.title = SITE_TITLE;
    };
  }, [video?.name]);

  const handleSeek = useCallback((time, updateUrl = true) => {
    const timeDiff = Math.abs(time - currentTimeRef.current);
    if (timeDiff >= 2) {
      setShowPartDropdown(false);
    }

    seekTo(time);

    currentTimeRef.current = time;
    setCurrentTime(time);
    if (updateUrl) updateUrlTime(time);
    savePlaybackState(time);
  }, [seekTo, updateUrlTime, savePlaybackState]);

  const handlePartClick = (e, videoId, index) => {
    e.preventDefault();
    setShowPartDropdown(false);
    
    if (playlist?.videos?.length > 1 && playVideoAt(index)) {
      const newVideo = playlist.videos[index];
      if (newVideo) {
        navigate(routes.video(videoId), { replace: true });
        
        activatePlaylistVideo(newVideo);
        setCurrentTime(0);
        resetInitialTime();
        setShowDescription(false);
      }
    } else {
      navigate(routes.video(videoId), { replace: true });
    }
  };

  useEffect(() => {
    if (!showPartDropdown) {
      dropdownScrolledRef.current = false;
      return;
    }
    
    const handleClickOutside = (e) => {
      if (partSelectorRef.current && !partSelectorRef.current.contains(e.target)) {
        setShowPartDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showPartDropdown]);

  useEffect(() => {
    if (!showPartDropdown || dropdownScrolledRef.current) return;
    
    requestAnimationFrame(() => {
      if (partDropdownRef.current) {
        const activeItem = partDropdownRef.current.querySelector('.part-dropdown-item.active');
        if (activeItem) {
          activeItem.scrollIntoView({ block: 'nearest' });
          dropdownScrolledRef.current = true;
        }
      }
    });
  }, [showPartDropdown]);

  const handleToggleDescription = () => {
    const newShowDescription = !showDescription;
    setShowDescription(newShowDescription);

    descriptionOverflowCleanupRef.current?.();
    descriptionOverflowCleanupRef.current = null;
    
    if (descriptionRef.current) {
      const descriptionEl = descriptionRef.current;
      const containerEl = descriptionEl.parentElement;
      
      if (newShowDescription) {
        const descStyle = getComputedStyle(descriptionEl);
        const margin = parseFloat(descStyle.marginTop) + parseFloat(descStyle.marginBottom);
        const contentHeight = descriptionEl.offsetHeight + margin;
        
        const isMobile = window.innerWidth <= 1100;
        const maxHeight = isMobile ? 70 : 200;
        
        containerEl.style.overflow = contentHeight <= maxHeight ? 'hidden' : 'auto';
      } else {
        const handleTransitionEnd = (event) => {
          if (event.target !== containerEl || event.propertyName !== 'max-height') return;
          containerEl.style.overflow = 'hidden';
          descriptionOverflowCleanupRef.current?.();
          descriptionOverflowCleanupRef.current = null;
        };

        containerEl.addEventListener('transitionend', handleTransitionEnd);
        descriptionOverflowCleanupRef.current = () => {
          containerEl.removeEventListener('transitionend', handleTransitionEnd);
        };
      }
    }
  };

  useEffect(() => () => {
    descriptionOverflowCleanupRef.current?.();
  }, []);

  const handleToggleHideInfo = useCallback((hide) => {
    setHideVideoInfo(hide);
  }, []);

  const hideVideoInfoFromGesture = useCallback(() => setHideVideoInfo(true), []);
  const {
    handleChatTouchEnd,
    handleChatTouchStart,
    handleInfoTouchEnd,
    handleInfoTouchStart,
  } = useVideoPageGestures({
    isWideChat,
    onHideVideoInfo: hideVideoInfoFromGesture,
    onWideChatChange: setIsWideChat,
  });

  const handleThemeChange = useCallback((theme) => {
    setPageTheme(theme);
    localStorage.setItem('chatTheme', theme);
  }, []);

  if (loading) return <div className="video-page" style={{ color: '#fff', padding: 20 }}>Loading...</div>;
  if (!video) return <div className="video-page" style={{ color: '#fff', padding: 20 }}>{loadError || 'Video not found'}</div>;

  return (
    <div className="video-page" data-theme={pageTheme}>
      <div className="video-content">
        <div className={`video-wrapper ${isWideChat ? 'wide-chat' : ''}`}>
          <VideoPlayer
            hideVideoInfo={hideVideoInfo}
            iframeRef={iframeRef}
            initialTime={initialTime}
            playlist={playlist}
            video={video}
          />
          
          <VideoInfo
            descriptionRef={descriptionRef}
            hideVideoInfo={hideVideoInfo}
            onInfoTouchEnd={handleInfoTouchEnd}
            onInfoTouchStart={handleInfoTouchStart}
            onPartClick={handlePartClick}
            onSeek={handleSeek}
            onToggleDescription={handleToggleDescription}
            onTogglePartDropdown={() => setShowPartDropdown(!showPartDropdown)}
            partDropdownRef={partDropdownRef}
            partSelectorRef={partSelectorRef}
            playlist={playlist}
            showDescription={showDescription}
            showPartDropdown={showPartDropdown}
            video={video}
            videoId={id}
          />
        </div>
        
        <ChatContainer
          key={video.id}
          videoId={video.id}
          youtubeVideoId={video.youtubeId}
          currentTime={currentTime}
          isPlaying={isPlaying}
          isWideChat={isWideChat}
          onSeek={handleSeek}
          delayTime={3}
          onThemeChange={handleThemeChange}
          onHideVideoInfoChange={handleToggleHideInfo}
          hideVideoInfo={hideVideoInfo}
          onChatTouchEnd={handleChatTouchEnd}
          onChatTouchStart={handleChatTouchStart}
          theme={pageTheme}
        />
      </div>
    </div>
  );
}
