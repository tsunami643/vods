import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { routes } from '../../routes';
import {
  getVideoDocumentTitle,
  SITE_TITLE,
} from './videoUtils';
import VideoInfo from './VideoInfo';
import VideoPlayer from './VideoPlayer';
import VideoPageSkeleton from './VideoPageSkeleton';
import useVideoData from './useVideoData';
import useVideoPageGestures from './useVideoPageGestures';
import useVideoPlayback from './useVideoPlayback';
import useYouTubePlayer from './useYouTubePlayer';
import ChatContainer from './chat/ChatContainer';
import '../../styles/VideoPage.css';

export default function VideoPage({
  initialTimeOverride = null,
  playbackGate = null,
  videoId,
}) {
  const id = videoId;
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [hideVideoInfo, setHideVideoInfo] = useState(false);
  const [isWideChat, setIsWideChat] = useState(false);
  const [settingsSpinTrigger, setSettingsSpinTrigger] = useState(0);
  const [pageTheme, setPageTheme] = useState(() => {
    return localStorage.getItem('chatTheme') || 'twitch';
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
    initialTimeOverride,
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
    playVideo,
    playVideoAt,
    seekTo,
  } = useYouTubePlayer({
    currentVideoId: video?.youtubeId,
    enabled: !loading && Boolean(video),
    iframeRef,
    iframeId: playlist?.youtubeId || video?.youtubeId,
    onFirstPlaying: playbackGate?.onFirstPlaying,
    onPlayingChange: setIsPlaying,
    onPlaylistVideoChange: handlePlaylistVideoChange,
    onSignificantBuffer: closePartDropdown,
    onTimeChange: setCurrentTime,
    playlistVideosRef,
    shouldPlay: !playbackGate || playbackGate.released,
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

    if (!isPlaying) playVideo();
    seekTo(time);

    currentTimeRef.current = time;
    setCurrentTime(time);
    if (updateUrl) updateUrlTime(time);
    savePlaybackState(time);
  }, [isPlaying, playVideo, seekTo, updateUrlTime, savePlaybackState]);

  const handlePartSelect = useCallback((targetVideo, index) => {
    if (!targetVideo) return;

    setShowPartDropdown(false);
    
    if (playlist?.videos?.length > 1 && playVideoAt(index)) {
      const newVideo = playlist.videos[index];
      if (newVideo) {
        activatePlaylistVideo(newVideo);
        setCurrentTime(0);
        resetInitialTime();
        setShowDescription(false);
        navigate(routes.video(targetVideo.youtubeId), { replace: true });
      }
    } else {
      navigate(routes.video(targetVideo.youtubeId), { replace: true });
    }
  }, [activatePlaylistVideo, navigate, playlist, playVideoAt, resetInitialTime]);

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
          const scrollTarget = activeItem.nextElementSibling || activeItem;
          scrollTarget.scrollIntoView({ block: 'nearest' });
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

  const toggleVideoInfoFromGesture = useCallback(() => {
    setHideVideoInfo((hidden) => !hidden);
    setSettingsSpinTrigger((trigger) => trigger + 1);
  }, []);
  const {
    handleChatTouchEnd,
    handleChatTouchStart,
    handleHeaderTouchEnd,
    handleHeaderTouchStart,
    handleInfoTouchEnd,
    handleInfoTouchStart,
  } = useVideoPageGestures({
    isWideChat,
    onToggleVideoInfo: toggleVideoInfoFromGesture,
    onWideChatChange: setIsWideChat,
  });

  const handleThemeChange = useCallback((theme) => {
    setPageTheme(theme);
    localStorage.setItem('chatTheme', theme);
  }, []);

  if (loading) return <VideoPageSkeleton theme={pageTheme} />;
  if (!video) return <div className="video-page" data-theme={pageTheme} style={{ color: '#fff', padding: 20 }}>{loadError || 'Video not found'}</div>;

  return (
    <div className="video-page" data-theme={pageTheme}>
      <div className="video-content">
        <div className={`video-wrapper ${isWideChat ? 'wide-chat' : ''}`}>
          <VideoPlayer
            autoplay={!playbackGate}
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
            onPartSelect={handlePartSelect}
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
          videoId={video.id}
          youtubeVideoId={video.youtubeId}
          currentTime={currentTime}
          isWideChat={isWideChat}
          onSeek={handleSeek}
          delayTime={3}
          onThemeChange={handleThemeChange}
          onHideVideoInfoChange={handleToggleHideInfo}
          hideVideoInfo={hideVideoInfo}
          onChatTouchEnd={handleChatTouchEnd}
          onChatTouchStart={handleChatTouchStart}
          onHeaderTouchEnd={handleHeaderTouchEnd}
          onHeaderTouchStart={handleHeaderTouchStart}
          settingsSpinTrigger={settingsSpinTrigger}
          theme={pageTheme}
        />
      </div>
    </div>
  );
}
