import { Box, Link, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faYoutube } from "@fortawesome/free-brands-svg-icons";
import useGameBoxStyles from "../styles/useGameBoxStyles";

const StreamInfo = ({ dateCompleted, playlistId, firstVideo, streams }) => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("mobileCard"));

  const classes = useGameBoxStyles();

  const cleanDate = new Date(dateCompleted).toDateString().slice(4);

  function ytLink(){
    if (streams === 1){
      return `https://www.youtube.com/watch?v=${firstVideo}`
    }
    else {
      return `https://www.youtube.com/watch?v=${firstVideo}&list=${playlistId}`
    }
  }

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
      <Link
        href={ytLink()}
        target="_blank"
        rel="noopener"
        underline="none"
        textAlign="center"
        onClick={(e) => e.stopPropagation()}
      >
        <Box className={classes.youtube}>
          <FontAwesomeIcon icon={faYoutube} />
        </Box>
      </Link>
      <RouterLink
        to={`/playlist/${playlistId}`}
        onClick={(e) => e.stopPropagation()}
        style={{ textDecoration: 'none' }}
      >
        <Box
          display={"flex"}
          flexDirection={"column"}
          justifyContent={"center"}
          alignItems={"center"}
          flexBasis={"33.3333%"}
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
