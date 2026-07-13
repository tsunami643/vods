import React, { useCallback, useMemo } from 'react';
import ChatHeader, { useChatPreferences } from './ChatHeader';
import ChatMessageList from './ChatMessageList';
import useChatData from './useChatData';
import useChatAssetPreloader from './useChatAssetPreloader';
import useChatSynchronization from './useChatSynchronization';
import useChatViewport from './useChatViewport';
import '../../../styles/ChatContainer.css';

const CHAT_RESIZE_TRANSITION_PROPERTIES = new Set([
  'flex-basis',
  'flex-grow',
  'min-height',
  'width',
]);

export default function ChatContainer({ 
  videoId, 
  youtubeVideoId,
  currentTime, 
  isPlaying,
  isWideChat,
  onSeek,
  delayTime = 2,
  onThemeChange,
  onHideVideoInfoChange,
  onChatTouchEnd,
  onChatTouchStart,
  hideVideoInfo = false,
  theme = 'blue'
}) {
  const {
    closeSettings,
    preferences: chatPreferences,
    settingsOpen,
    toggleSettings,
  } = useChatPreferences(theme, onThemeChange);
  const {
    chatTheme,
    fontSize,
  } = chatPreferences;
  const {
    allMessages,
    badgeList,
    emoteList,
    error,
    isRangeLoaded,
    loadTimeRange,
    loading,
    messageMapRef,
    metadata,
    mountedVideoIdRef,
    userList,
  } = useChatData(videoId);

  // Memoize messages for current video to avoid filtering on every render
  // allMessages is already sorted by time from mergeSortedMessages
  const videoMessages = useMemo(() => {
    return allMessages.filter(m => m._videoId === videoId);
  }, [allMessages, videoId]);

  const {
    adjustedPlaybackTime,
    displayedMessages,
    handleResumeScroll,
    handleScroll,
    handleUserScrollIntent,
    isUserAtBottom,
    isUserAtBottomRef,
    loadingMore,
    messagesRef,
    seekLoading,
    unseenMessages,
  } = useChatSynchronization({
    closeSettings,
    currentTime,
    delayTime,
    error,
    isRangeLoaded,
    loadTimeRange,
    loading,
    messageMapRef,
    metadata,
    mountedVideoIdRef,
    videoId,
    videoMessages,
  });
  const handleChatAssetSettled = useChatAssetPreloader({
    adjustedPlaybackTime,
    badgeList,
    emoteList,
    enabled: Boolean(metadata) && !loading && !error,
    isUserAtBottomRef,
    messages: videoMessages,
    messagesRef,
    videoId,
  });
  const {
    desktopWidthStyle,
    handleResizeStart,
    isFullscreen,
    isResizing,
    toggleFullscreen,
  } = useChatViewport({
    onResizeEnd: handleResumeScroll,
  });

  const handleChatResizeTransitionEnd = useCallback((event) => {
    if (event.target !== event.currentTarget) return;
    if (CHAT_RESIZE_TRANSITION_PROPERTIES.has(event.propertyName)) {
      handleResumeScroll();
    }
  }, [handleResumeScroll]);

  const containerStyle = {
    ...desktopWidthStyle,
    '--chat-font-size': `${fontSize}px`,
    '--chat-font-scale': fontSize / 14,
  };

  const headerProps = {
    hideVideoInfo,
    isFullscreen,
    onHideVideoInfoChange,
    onSettingsToggle: toggleSettings,
    onToggleFullscreen: toggleFullscreen,
    preferences: chatPreferences,
    settingsOpen,
  };

  if (loading) {
    return (
      <div className="chat-container" data-theme={chatTheme} style={containerStyle}>
        <ChatHeader {...headerProps} showFullControls={false} />
        <div className="chat-loading">Loading chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-container" data-theme={chatTheme} style={containerStyle}>
        <ChatHeader {...headerProps} showFullControls={false} />
        <div className="chat-error">
          <svg className="sad-face" viewBox="2 2 20 20">
            <circle cx="15.5" cy="9.5" r="1.5"/>
            <circle cx="8.5" cy="9.5" r="1.5"/>
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m0-6c-2.33 0-4.32 1.45-5.12 3.5h1.67c.69-1.19 1.97-2 3.45-2s2.75.81 3.45 2h1.67c-.8-2.05-2.79-3.5-5.12-3.5"/>
          </svg>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`chat-container ${isWideChat ? 'wide-chat' : ''}`}
      data-theme={chatTheme} 
      style={containerStyle}
      onTouchStart={onChatTouchStart}
      onTouchEnd={onChatTouchEnd}
      onTransitionEnd={handleChatResizeTransitionEnd}
    >
      <div 
        className={`chat-resize-handle ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleResizeStart}
      >
        <div className={`drag-shield ${isResizing ? 'active' : ''}`} />
      </div>
      <ChatHeader {...headerProps} />

      <ChatMessageList
        badgeList={badgeList}
        chatDelay={delayTime}
        displayedMessages={displayedMessages}
        emoteList={emoteList}
        isUserAtBottom={isUserAtBottom}
        loadingMore={loadingMore}
        messagesRef={messagesRef}
        onAssetSettled={handleChatAssetSettled}
        onResumeScroll={handleResumeScroll}
        onScroll={handleScroll}
        onSeek={onSeek}
        onUserScrollIntent={handleUserScrollIntent}
        preferences={chatPreferences}
        seekLoading={seekLoading}
        unseenMessages={unseenMessages}
        userList={userList}
        videoId={youtubeVideoId}
      />
    </div>
  );
}
