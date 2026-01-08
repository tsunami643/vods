import {
  Box,
  Chip,
  Card,
  CardContent,
  CardMedia,
  Stack,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import useGameBoxStyles from "../styles/useGameBoxStyles";
import StreamInfo from "./StreamInfo";

const GameBox = ({ data, addTag }) => {
  const classes = useGameBoxStyles();

  const handleTagClick = (tag) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    addTag(tag);
  };

  return (
    <Link 
      to={`/video/${data.firstVideo}`} 
      style={{ textDecoration: 'none' }}
    >
      <Card className={classes.card} style={{ cursor: "pointer" }}>
        <CardMedia
          component="img"
          image={`${data.gameCover}`}
          alt={`${data.gameName} Cover`}
          className={classes.cardMedia}
        />
        <CardContent className={classes.cardContent}>
          <Typography className={classes.title}>{data.gameName}</Typography>
          <Box className={classes.streamInfo}>
            <StreamInfo
              dateCompleted={data.dateCompleted}
              playlistId={data.playlistId}
              firstVideo={data.firstVideo}
              streams={data.streams}
            />
          </Box>
          <Box className={classes.tagBox}>
            <Typography color={"white"} fontSize={12} fontWeight={700}>
              Tags:
            </Typography>
            <Stack
              className={classes.tags}
              direction="row"
              spacing={1}
              justifyContent="flex-start"
              marginLeft={"8px"}
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
    </Link>
  );
};

export default GameBox;
