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

export default function VideoInfo({
  descriptionRef,
  hideVideoInfo,
  onInfoTouchEnd,
  onInfoTouchStart,
  onPartClick,
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
              <label id="part-selector-label">Part</label>
              <button
                className="part-selector-button"
                aria-haspopup="listbox"
                aria-expanded={showPartDropdown}
                aria-labelledby="part-selector-label"
                onClick={onTogglePartDropdown}
              >
                {partNumber} ▾
              </button>
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
                      onClick={(event) => onPartClick(
                        event,
                        playlistVideo.youtubeId,
                        index
                      )}
                    >
                      <div className="part-dropdown-thumb-container">
                        <img
                          src={`https://i.ytimg.com/vi/${playlistVideo.youtubeId}/mqdefault.jpg`}
                          alt=""
                          className="part-dropdown-thumb"
                        />
                        {playlistVideo.duration && (
                          <div className="part-duration-badge">
                            {formatDuration(playlistVideo.duration)}
                          </div>
                        )}
                      </div>
                      <div className="part-dropdown-text">
                        <div className="part-video-title">{playlistVideo.name}</div>
                        <div className="part-video-date">
                          {formatDate(playlistVideo.publishedAt)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasDescription && (
            <div className="description-expander-container" onClick={onToggleDescription}>
              <label className="description-button-label">
                {showDescription ? 'Hide' : 'Show'} {descriptionLabel}
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
