import { memo } from 'react';
import ChatMessage from './ChatMessage';

function getResumeText(unseenMessages) {
  if (unseenMessages === 0) return 'Chat paused due to scroll';
  if (unseenMessages === 1) return '1 new message';
  if (unseenMessages <= 20) return `${unseenMessages} new messages`;
  return '20+ new messages';
}

function ChatMessageList({
  badgeList,
  chatDelay,
  displayedMessages,
  emoteList,
  isUserAtBottom,
  loadingMore,
  messagesRef,
  onAssetSettled,
  onResumeScroll,
  onScroll,
  onSeek,
  onUserScrollIntent,
  preferences,
  seekLoading,
  unseenMessages,
  userList,
  videoId,
}) {
  const { showBadges, showBorders, showTimestamps } = preferences;

  return (
    <>
      <div
        className="messages-container"
        ref={messagesRef}
        onScroll={onScroll}
        onWheel={onUserScrollIntent}
        onPointerDown={onUserScrollIntent}
        onTouchStart={onUserScrollIntent}
        onLoadCapture={onAssetSettled}
        onErrorCapture={onAssetSettled}
      >
        {loadingMore && (
          <div className="loading-more">
            <div className="loading-spinner" />
            <span>Loading earlier messages...</span>
          </div>
        )}
        {displayedMessages.map((message) => (
          <ChatMessage
            key={message._id}
            message={message}
            user={userList[message.user]}
            emoteList={emoteList}
            badgeList={badgeList}
            showTimestamps={showTimestamps}
            showBadges={showBadges}
            showBorder={showBorders}
            onSeek={onSeek}
            videoId={videoId}
            chatDelay={chatDelay}
          />
        ))}
      </div>

      {seekLoading && (
        <div
          className={`seek-loading${!isUserAtBottom ? ' seek-loading-above-resume' : ''}`}
          role="status"
        >
          <div className="seek-spinner" />
          <span>Loading chat...</span>
        </div>
      )}

      {!isUserAtBottom && (
        <button
          className="resume-scroll-button"
          onClick={onResumeScroll}
          aria-label="Resume automatic chat scrolling"
        >
          <span className="resume-scroll-container">
            <span className="resume-icon-container" aria-hidden="true">
              <svg className="resume-icon resume-pause-icon" viewBox="0 0 20 20">
                <path d="M8 3H4v14h4V3zm8 0h-4v14h4V3z" />
              </svg>
              <svg className="resume-icon resume-arrow-icon" viewBox="0 0 20 20">
                <path d="M9 3h2v9.17l3.59-3.58L16 10l-6 6-6-6 1.41-1.41L9 12.17V3z" />
              </svg>
            </span>
            <span className="resume-text-container">
              <span className="resume-text resume-default-text">
                {getResumeText(unseenMessages)}
              </span>
              <span className="resume-text resume-hover-text">Resume auto scroll</span>
            </span>
          </span>
        </button>
      )}
    </>
  );
}

export default memo(ChatMessageList);
