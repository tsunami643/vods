import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faYoutube } from "@fortawesome/free-brands-svg-icons";
import gameBoxStyles from "../styles/useGameBoxStyles";
import { routes } from "../utils/routes";

const StreamInfo = ({ dateCompleted, playlistId, firstVideo, streams }) => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("mobileCard"));

  const cleanDate = new Date(dateCompleted).toDateString().slice(4);

  const getLastPlayedVideo = () => {
    if (!playlistId) return firstVideo;
    const lastPlaylist = localStorage.getItem('lastPlayedPlaylist');
    if (lastPlaylist === playlistId) {
      const lastVideo = localStorage.getItem('lastPlayedVideo');
      if (lastVideo) return lastVideo;
    }
    return firstVideo;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          flexBasis: "33.3333%",
        }}
      >
        <Typography
          sx={{
            fontSize: mobile ? 9 : 11,
            fontWeight: 500,
            color: theme.palette.text.primary,
          }}
        >
          COMPLETED
        </Typography>
        <Typography
          sx={{
            fontSize: mobile ? 12 : 17,
            fontWeight: 700,
            color: theme.palette.text.primary,
          }}
        >
          {cleanDate}
        </Typography>
      </Box>
      <RouterLink
        to={routes.video(getLastPlayedVideo())}
        onClick={(e) => e.stopPropagation()}
        style={{ textDecoration: 'none' }}
      >
        <Box sx={gameBoxStyles.youtube}>
          <FontAwesomeIcon icon={faYoutube} />
        </Box>
      </RouterLink>
      <RouterLink
        to={routes.playlist(playlistId)}
        onClick={(e) => e.stopPropagation()}
        style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', flexBasis: '33.3333%' }}
      >
        <Box
          sx={{
            ...gameBoxStyles.streamsHover,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
          style={{cursor:'pointer'}}
        >
          <Typography
            sx={{
              fontSize: mobile ? 11 : 13,
              fontWeight: 500,
              color: theme.palette.text.primary,
            }}
          >
            STREAMS
          </Typography>
          <Typography
            sx={{
              fontSize: mobile ? 14 : 19,
              fontWeight: 700,
              color: theme.palette.text.primary,
            }}
          >
            {streams}
          </Typography>
        </Box>
      </RouterLink>
    </Box>
  );
};

export default StreamInfo;
