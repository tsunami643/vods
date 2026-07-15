import { useState } from 'react';
import { Link } from 'react-router';
import { routes } from '../../routes';
import logo from '../../shared/logo.png';

function getPlayerSource(video, playlist, initialTime, autoplay) {
  const videos = playlist?.videos || [];
  const currentIndex = videos.findIndex(
    (playlistVideo) => playlistVideo.youtubeId === video.youtubeId
  );
  const startParam = initialTime ? `&start=${initialTime}` : '';
  const origin = encodeURIComponent(window.location.origin);

  if (playlist?.youtubeId && videos.length > 1) {
    return `https://www.youtube.com/embed?listType=playlist&list=${playlist.youtubeId}&index=${currentIndex + 1}&enablejsapi=1&playsinline=1&rel=0&autoplay=${autoplay ? 1 : 0}&origin=${origin}${startParam}`;
  }

  return `https://www.youtube.com/embed/${video.youtubeId}?enablejsapi=1&playsinline=1&rel=0&autoplay=${autoplay ? 1 : 0}&origin=${origin}${startParam}`;
}

function YouTubeIframe({ iframeId, iframeRef, source, title }) {
  const [initialSource] = useState(source);

  return (
    <iframe
      ref={iframeRef}
      id={`yt-player-${iframeId}`}
      title={title}
      src={initialSource}
      allowFullScreen
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    />
  );
}

export default function VideoPlayer({
  autoplay = true,
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
        <YouTubeIframe
          key={iframeId}
          iframeId={iframeId}
          iframeRef={iframeRef}
          source={getPlayerSource(video, playlist, initialTime, autoplay)}
          title={video.name}
        />
      </div>
    </>
  );
}
