import {
  Box,
  Chip,
  Card,
  CardContent,
  CardMedia,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { faYoutube } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link as RouterLink } from "react-router-dom";
import { memo } from "react";
import { routes } from "../../routes";
import "../../styles/GameBox.css";

export const GameBoxSkeleton = () => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <>
      <Box sx={{ m: 2 }}>
        <Skeleton
          variant="rectangular"
          width={mobile ? 300 : 580}
          height={mobile ? 150 : 175}
        />
      </Box>
      <Box sx={{ m: 2 }}>
        <Skeleton
          variant="rectangular"
          width={mobile ? 300 : 580}
          height={mobile ? 150 : 175}
        />
      </Box>
    </>
  );
};

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
        <Box className="game-box-youtube">
          <FontAwesomeIcon icon={faYoutube} />
        </Box>
      </RouterLink>
      <RouterLink
        to={routes.playlist(playlistId)}
        onClick={(e) => e.stopPropagation()}
        style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', flexBasis: '33.3333%' }}
      >
        <Box
          className="game-box-streams"
          sx={{
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

const GameBox = ({ data, addTag, clearSearch }) => {
  const handleTagClick = (tag) => (e) => {
    e.stopPropagation();
    if (clearSearch) clearSearch();
    addTag(tag);
  };

  return (
    <Card className="game-box">
      <CardMedia
        component="img"
        image={data.gameCover}
        alt={`${data.gameName} Cover`}
        loading="lazy"
        decoding="async"
        className="game-box-media"
      />
      <CardContent className="game-box-content">
        <Typography className="game-box-title">{data.gameName}</Typography>
        <Box className="game-box-stream-info">
          <StreamInfo
            dateCompleted={data.dateCompleted}
            playlistId={data.playlistId}
            firstVideo={data.firstVideo}
            streams={data.streams}
          />
        </Box>
        <Box className="game-box-tag-box">
          <Typography sx={{ color: "white", fontSize: 12, fontWeight: 700 }}>
            Tags:
          </Typography>
          <Stack
            className="game-box-tags"
            direction="row"
            spacing={1}
          >
            {data.tags.map((tag, key) => {
              return (
                <Chip label={tag} onClick={handleTagClick(tag)} size="small" key={key} />
              );
            })}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default memo(GameBox);
