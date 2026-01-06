import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../utils/constants';
import { 
  Box, 
  Button, 
  Typography, 
  Collapse, 
  IconButton, 
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { ExpandMore, ExpandLess, ChevronLeft, ChevronRight } from '@mui/icons-material';

export default function VideoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(!mobile); // Open by default on desktop
  // Player state
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/video/${id}`)
      .then(res => setVideo(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  // Load YouTube Iframe API and attach to player
  useEffect(() => {
    if (!video) return;
    // Ensure API script is loaded
    function loadScript() {
      return new Promise((resolve) => {
        if (window.YT && window.YT.Player) {
          resolve();
          return;
        }
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        window.onYouTubeIframeAPIReady = () => resolve();
        document.body.appendChild(tag);
      });
    }

    let cancelled = false;

    loadScript().then(() => {
      if (cancelled) return;
      if (playerRef.current) {
        try { playerRef.current.destroy && playerRef.current.destroy(); } catch {}
      }
      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: video.youtubeId,
        events: {
          onReady: (e) => {
            setPlayerReady(true);
            setDuration(e.target.getDuration?.() || 0);
            // Start polling current time
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
              try {
                const t = e.target.getCurrentTime?.() || 0;
                setCurrentTime(t);
                setDuration(e.target.getDuration?.() || 0);
                const state = e.target.getPlayerState?.();
                setIsPlaying(state === window.YT.PlayerState.PLAYING);
              } catch {}
            }, 500);
          },
          onStateChange: (ev) => {
            try {
              const state = ev.data;
              setIsPlaying(state === window.YT.PlayerState.PLAYING);
            } catch {}
          }
        }
      });
    });

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (playerRef.current) {
        try { playerRef.current.destroy && playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [video]);

  if (loading) return <Typography>Loading...</Typography>;
  if (!video) return <Typography>Not found</Typography>;

  const goPrev = () => navigate(`/video/${video.prevId}`);
  const goNext = () => navigate(`/video/${video.nextId}`);

  function formatTime(totalSeconds) {
    if (!totalSeconds || isNaN(totalSeconds)) return '0:00';
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds / 60) % 60).toString();
    const hours = Math.floor(totalSeconds / 3600);
    if (hours > 0) {
      return `${hours}:${minutes.padStart(2, '0')}:${seconds}`;
    }
    return `${minutes}:${seconds}`;
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Title */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography variant="h5" gutterBottom>
          {video.name || `Video #${video.id}`}
        </Typography>
      </Box>

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video container */}
        <Paper
          elevation={2}
          sx={{
            flex: 1,
            m: 1,
            mr: chatOpen ? 0.5 : 1,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'flex 0.3s ease'
          }}
        >
          {/* Video player */}
          <Box sx={{ 
            flex: 1, 
            position: 'relative',
            minHeight: mobile ? '200px' : '300px'
          }}>
            <iframe
              id="youtube-player"
              title="youtube"
              src={`https://www.youtube.com/embed/${video.youtubeId}?enablejsapi=1`}
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0
              }}
            />
          </Box>
        </Paper>

        {/* Chat sidebar */}
        <Paper
          elevation={2}
          sx={{
            height: '100%',
            m: 1,
            ml: 0.5,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            width: chatOpen ? (mobile ? '100%' : '350px') : '60px',
            transition: 'width 0.3s ease',
            flexShrink: 0,
            overflow: 'hidden'
          }}
        >
          {/* Chat header */}
          <Box sx={{ 
            p: 0.5, 
            borderBottom: chatOpen ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: chatOpen ? 'space-between' : 'center',
            minHeight: '40px',
            lineHeight: 1
          }}>
            {chatOpen && (
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1 }}>
                Chat Log
              </Typography>
            )}
            <IconButton 
              size="small" 
              onClick={() => setChatOpen(!chatOpen)}
              sx={{ minWidth: 'auto', p: 0.5 }}
            >
              {chatOpen ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Box>

          {/* Chat content */}
          {chatOpen && (
            <Box sx={{ 
              flex: 1, 
              p: 2, 
              overflow: 'auto',
              backgroundColor: 'rgba(0, 0, 0, 0.2)'
            }}>
              <Typography variant="body2" color="text.secondary">
                Chat log will be displayed here when available.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Controls area below video+chat */}
      <Box sx={{ p: 2, pt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" disabled={!video.prevId} onClick={goPrev}>
            Previous
          </Button>
          <Button variant="contained" disabled={!video.nextId} onClick={goNext}>
            Next
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {typeof video.playlistCount === 'number' && (
            <Typography variant="body2" color="text.secondary">
              Videos in playlist: {video.playlistCount}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {isPlaying ? 'Playing' : 'Paused'} · {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
        </Box>
      </Box>

    </Box>
  );
}


