function getSavedChatWidth() {
  const savedWidth = parseInt(localStorage.getItem('chatWidth'), 10);
  if (!Number.isFinite(savedWidth)) return 350;
  return Math.max(350, Math.min(600, savedWidth));
}

export default function VideoPageSkeleton({ theme }) {
  const chatWidth = getSavedChatWidth();

  return (
    <div
      className="video-page video-page-skeleton"
      data-theme={theme}
      aria-busy="true"
      aria-label="Loading video"
      style={{ '--video-skeleton-chat-width': `${chatWidth}px` }}
    >
      <div className="video-content">
        <div className="video-wrapper">
          <div className="compact-header video-skeleton-header">
            <span className="video-skeleton-block video-skeleton-logo" />
            <span className="video-skeleton-block video-skeleton-site-name" />
          </div>

          <div className="youtube-player-container" />

          <div className="info-container video-skeleton-info">
            <div className="info-topbar">
              <div className="video-metadata-container">
                <span className="video-skeleton-block video-skeleton-cover" />
                <div className="video-skeleton-copy">
                  <span className="video-skeleton-block video-skeleton-title" />
                  <span className="video-skeleton-block video-skeleton-date" />
                  <span className="video-skeleton-block video-skeleton-subtitle" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="chat-container video-skeleton-chat" data-theme={theme}>
          <div className="video-skeleton-chat-header">
            <span className="video-skeleton-block video-skeleton-header-button" />
            <span className="video-skeleton-block video-skeleton-chat-title" />
            <span className="video-skeleton-block video-skeleton-header-button" />
          </div>
        </div>
      </div>
    </div>
  );
}
