import {
  Box,
  Chip,
  Card,
  CardContent,
  CardMedia,
  Stack,
  Typography,
} from "@mui/material";
import gameBoxStyles from "../styles/useGameBoxStyles";
import StreamInfo from "./StreamInfo";

const GameBox = ({ data, addTag, clearSearch }) => {
  const handleTagClick = (tag) => (e) => {
    e.stopPropagation();
    if (clearSearch) clearSearch();
    addTag(tag);
  };

  return (
    <Card sx={gameBoxStyles.card}>
      <CardMedia
        component="img"
        image={data.gameCover}
        alt={`${data.gameName} Cover`}
        sx={gameBoxStyles.cardMedia}
      />
      <CardContent sx={gameBoxStyles.cardContent}>
        <Typography sx={gameBoxStyles.title}>{data.gameName}</Typography>
        <Box sx={gameBoxStyles.streamInfo}>
          <StreamInfo
            dateCompleted={data.dateCompleted}
            playlistId={data.playlistId}
            firstVideo={data.firstVideo}
            streams={data.streams}
          />
        </Box>
        <Box sx={gameBoxStyles.tagBox}>
          <Typography sx={{ color: "white", fontSize: 12, fontWeight: 700 }}>
            Tags:
          </Typography>
          <Stack
            sx={gameBoxStyles.tags}
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

export default GameBox;
