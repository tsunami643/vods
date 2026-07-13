import { Link } from 'react-router-dom';
import { routes } from '../../routes';
import logo from '../../shared/logo.png';

function getPlayerSource(video, playlist, initialTime) {
  const videos = playlist?.videos || [];
  const currentIndex = videos.findIndex(
    (playlistVideo) => playlistVideo.youtubeId === video.youtubeId
  );
  const startParam = initialTime ? `&start=${initialTime}` : '';
  const origin = encodeURIComponent(window.location.origin);

  if (playlist?.youtubeId && videos.length > 1) {
    return `https://www.youtube.com/embed?listType=playlist&list=${playlist.youtubeId}&index=${currentIndex + 1}&enablejsapi=1&playsinline=1&rel=0&autoplay=1&origin=${origin}${startParam}`;
  }

  return `https://www.youtube.com/embed/${video.youtubeId}?enablejsapi=1&playsinline=1&rel=0&autoplay=1&origin=${origin}${startParam}`;
}

export default function VideoPlayer({
  hideVideoInfo,
  iframeRef,
  initialTime,
  playlist,
  video,
}) {
  const iframeId = playlist?.youtubeId || video.youtubeId;

  return (
    <>
      {!hideVideoInfo && (
        <div className="compact-header">
          <Link to={routes.home} className="header-logo-link">
            <img src={logo} alt="logo" className="header-logo" />
            <span className="header-site-name">tsunami's twitch vods</span>
          </Link>
        </div>
      )}

      <div className="youtube-player-container">
        <iframe
          ref={iframeRef}
          key={iframeId}
          id={`yt-player-${iframeId}`}
          title={video.name}
          src={getPlayerSource(video, playlist, initialTime)}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </>
  );
}
