import Fade from '@mui/material/Fade';
import Tooltip from '@mui/material/Tooltip';
import { Link } from 'react-router-dom';
import { routes, videoHref } from '../../routes';
import {
  formatDate,
  formatDuration,
  formatTimeForUrl,
  parseTimecode,
  tokenizeDescription,
} from './videoUtils';

function renderDescription(description, videoId, onSeek) {
  return tokenizeDescription(description).map((token) => {
    if (token.type === 'text') return token.value;

    if (token.type === 'link') {
      const { start, value } = token;
      return (
        <a
          key={`link-${start}`}
          className="description-link"
          target="_blank"
          rel="noopener noreferrer"
          href={value}
        >
          {value}
        </a>
      );
    }

    const { start, value } = token;
    const seconds = parseTimecode(value);
    return (
      <a
        key={`time-${start}`}
        href={videoHref(videoId, formatTimeForUrl(seconds))}
        className="description-link timecode"
        onClick={(event) => {
          event.preventDefault();
          onSeek(seconds);
        }}
      >
        {value}
      </a>
    );
  });
}

function ChevronIcon({ direction }) {
  const paths = {
    previous: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
    next: 'M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z',
    down: 'M7 10l5 5 5-5z',
  };
  const className = direction === 'down'
    ? 'part-selector-chevron'
    : 'part-navigation-icon';

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[direction]} />
    </svg>
  );
}

function PartItemContent({ video }) {
  return (
    <>
      <div className="part-dropdown-thumb-container">
        <img
          src={`https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`}
          alt=""
          className="part-dropdown-thumb"
        />
        {video.duration && (
          <div className="part-duration-badge">
            {formatDuration(video.duration)}
          </div>
        )}
      </div>
      <div className="part-dropdown-text">
        <div className="part-video-header">
          <div className="part-video-title">{video.name}</div>
          <div className="part-video-date">
            {formatDate(video.publishedAt)}
          </div>
        </div>
        {video.subTitle && (
          <div className="part-video-subtitle">{video.subTitle}</div>
        )}
      </div>
    </>
  );
}

export default function VideoInfo({
  descriptionRef,
  hideVideoInfo,
  onInfoTouchEnd,
  onInfoTouchStart,
  onPartSelect,
  onSeek,
  onToggleDescription,
  onTogglePartDropdown,
  partDropdownRef,
  partSelectorRef,
  playlist,
  showDescription,
  showPartDropdown,
  video,
  videoId,
}) {
  const hasDescription = video.description
    && !video.description.startsWith('Originally broadcasted on')
    && !video.description.startsWith('Broadcasted live on Twitch');
  const hasTimestamps = hasDescription
    && tokenizeDescription(video.description).some((token) => token.type === 'timecode');
  const descriptionLabel = hasTimestamps ? 'Timestamps' : 'Description';
  const videos = playlist?.videos || [];
  const currentIndex = videos.findIndex(
    (playlistVideo) => playlistVideo.youtubeId === video.youtubeId
  );
  const partMatch = video.name?.match(/\(Part\s+(\d+(?:\.\d+)?)/);
  const partNumber = partMatch ? partMatch[1] : currentIndex + 1;
  const previousPart = currentIndex > 0 ? videos[currentIndex - 1] : null;
  const nextPart = currentIndex >= 0 && currentIndex < videos.length - 1
    ? videos[currentIndex + 1]
    : null;

  return (
    <div
      className={`info-container ${showDescription ? 'expanded' : ''} ${hideVideoInfo ? 'hidden' : ''}`}
      onTouchStart={onInfoTouchStart}
      onTouchEnd={onInfoTouchEnd}
    >
      <div className="info-topbar">
        <div className="video-metadata-container">
          {playlist?.gameCover && (
            <Tooltip
              title="Go to Playlist"
              placement="top"
              arrow
              disableInteractive
              classes={{
                tooltip: 'game-cover-tooltip',
                arrow: 'game-cover-tooltip-arrow',
              }}
              slots={{ transition: Fade }}
              slotProps={{ transition: { timeout: 150 } }}
            >
              <Link
                to={routes.playlist(playlist.youtubeId)}
                className="game-cover"
              >
                <img src={playlist.gameCover} alt="Game Cover" className="game-cover-img" />
                <div className="game-cover-overlay">
                  <svg className="back-arrow" viewBox="4 4 16 16">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" />
                  </svg>
                </div>
              </Link>
            </Tooltip>
          )}
          <div className="video-text-container">
            <div className="video-header">
              <div className="video-title">{video.name}</div>
              <div className="video-date">
                {formatDate(video.publishedAt || video.createdAt)}
              </div>
            </div>
            {video.subTitle && (
              <div className="video-subtitle" title="Twitch Stream Title">
                {video.subTitle}
              </div>
            )}
          </div>
        </div>

        <div className="video-controls">
          {videos.length > 1 && (
            <div className="part-selector-container" ref={partSelectorRef}>
              <label id="part-selector-label" className="part-selector-label">Part</label>
              <div className="part-selector-controls">
                <div className="part-navigation-control">
                  <button
                    type="button"
                    className="part-navigation-button"
                    aria-label={previousPart ? `Previous part: ${previousPart.name}` : 'Previous part'}
                    disabled={!previousPart}
                    onClick={() => onPartSelect(previousPart, currentIndex - 1)}
                  >
                    <ChevronIcon direction="previous" />
                  </button>
                  {previousPart && !showPartDropdown && (
                    <div className="part-navigation-preview" aria-hidden="true">
                      <PartItemContent video={previousPart} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="part-selector-button"
                  aria-haspopup="listbox"
                  aria-expanded={showPartDropdown}
                  aria-labelledby="part-selector-label"
                  onClick={onTogglePartDropdown}
                >
                  <span className="part-selector-value">{partNumber}</span>
                  <ChevronIcon direction="down" />
                </button>
                <div className="part-navigation-control">
                  <button
                    type="button"
                    className="part-navigation-button"
                    aria-label={nextPart ? `Next part: ${nextPart.name}` : 'Next part'}
                    disabled={!nextPart}
                    onClick={() => onPartSelect(nextPart, currentIndex + 1)}
                  >
                    <ChevronIcon direction="next" />
                  </button>
                  {nextPart && !showPartDropdown && (
                    <div className="part-navigation-preview" aria-hidden="true">
                      <PartItemContent video={nextPart} />
                    </div>
                  )}
                </div>
              </div>
              {showPartDropdown && (
                <div
                  className="part-dropdown"
                  role="listbox"
                  aria-label="Select video part"
                  tabIndex={0}
                  ref={partDropdownRef}
                >
                  {videos.map((playlistVideo, index) => (
                    <Link
                      key={playlistVideo.youtubeId}
                      to={routes.video(playlistVideo.youtubeId)}
                      className={`part-dropdown-item ${playlistVideo.youtubeId === video.youtubeId ? 'active' : ''}`}
                      role="option"
                      aria-selected={playlistVideo.youtubeId === video.youtubeId}
                      tabIndex={playlistVideo.youtubeId === video.youtubeId ? 0 : -1}
                      onClick={(event) => {
                        event.preventDefault();
                        onPartSelect(playlistVideo, index);
                      }}
                    >
                      <PartItemContent video={playlistVideo} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasDescription && (
            <div className="description-expander-container" onClick={onToggleDescription}>
              <label className="description-button-label">
                {showDescription ? 'Hide' : 'View'} {descriptionLabel}
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

      {hasDescription && (
        <div className={`video-description-container ${showDescription ? 'show' : ''}`}>
          <div ref={descriptionRef} className="video-description">
            {renderDescription(video.description, videoId, onSeek)}
          </div>
        </div>
      )}
    </div>
  );
}
