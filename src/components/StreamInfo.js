import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faYoutube } from "@fortawesome/free-brands-svg-icons";
import useGameBoxStyles from "../styles/useGameBoxStyles";

const StreamInfo = ({ dateCompleted, playlistId, firstVideo, streams }) => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("mobileCard"));

  const classes = useGameBoxStyles();

  const cleanDate = new Date(dateCompleted).toDateString().slice(4);

  const getLastPlayedVideo = () => {
    if (!playlistId) return firstVideo;
    const lastPlayed = localStorage.getItem(`lastPlayedVideo_${playlistId}`);
    return lastPlayed || firstVideo;
  };

  return (
    <Box
      display={"flex"}
      flexDirection={"row"}
      justifyContent={"space-between"}
      width={"100%"}
    >
      <Box
        display={"flex"}
        flexDirection={"column"}
        justifyContent={"center"}
        alignItems={"center"}
        flexBasis={"33.3333%"}
      >
        <Typography
          fontSize={mobile ? 9 : 11}
          fontWeight={500}
          color={theme.palette.text.primary}
        >
          COMPLETED
        </Typography>
        <Typography
          fontSize={mobile ? 12 : 17}
          fontWeight={700}
          color={theme.palette.text.primary}
        >
          {cleanDate}
        </Typography>
      </Box>
      <RouterLink
        to={`/video/${getLastPlayedVideo()}`}
        onClick={(e) => e.stopPropagation()}
        style={{ textDecoration: 'none' }}
      >
        <Box className={classes.youtube}>
          <FontAwesomeIcon icon={faYoutube} />
        </Box>
      </RouterLink>
      <RouterLink
        to={`/playlist/${playlistId}`}
        onClick={(e) => e.stopPropagation()}
        style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', flexBasis: '33.3333%' }}
      >
        <Box
          display={"flex"}
          flexDirection={"column"}
          justifyContent={"center"}
          alignItems={"center"}
          className={classes.streamsHover}
          style={{cursor:'pointer'}}
        >
          <Typography
            fontSize={mobile ? 11 : 13}
            fontWeight={500}
            color={theme.palette.text.primary}
          >
            STREAMS
          </Typography>
          <Typography
            fontSize={mobile ? 14 : 19}
            fontWeight={700}
            color={theme.palette.text.primary}
          >
            {streams}
          </Typography>
        </Box>
      </RouterLink>
    </Box>
  );
};

export default StreamInfo;
