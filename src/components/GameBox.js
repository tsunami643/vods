import {
  Box,
  Chip,
  Card,
  CardContent,
  CardMedia,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import useGameBoxStyles from "../styles/useGameBoxStyles";
import { API_URL } from "../utils/constants";
import StreamInfo from "./StreamInfo";

import SearchBar from "./navbar/SearchBar";

const GameBox = ({ data, addTag }) => {
  const [loading, setLoading] = useState(Boolean);
  //const [loadCover, setloadCover] = useState(Boolean);
  //const [cover, setCover] = useState();

  const classes = useGameBoxStyles();

  const handleClick = tag => () => {
    /*addTag(tag);*/
  }

  return (
    <Card className={classes.card}>
      <CardMedia
        component="img"
        image={`${data.gameCover}`}
        alt={`${data.gameName} Cover`}
        className={classes.cardMedia}
      />
      <CardContent className={classes.cardContent}>
        {/* Title */}
        <Typography className={classes.title}>{data.gameName}</Typography>
        {/* Stream Info */}
        <Box className={classes.streamInfo}>
          <StreamInfo
            dateCompleted={data.dateCompleted}
            playlistId={data.playlistId}
            firstVideo={data.firstVideo}
            streams={data.streams}
          />
        </Box>
        {/* Tags */}
        <Box className={classes.tagBox}>
          <Typography color={"white"}
            fontSize={12}
            fontWeight={700}>Tags:</Typography>
          <Stack className={classes.tags} direction="row" spacing={1} justifyContent="flex-start" marginLeft={"8px"}>
            {data.tags.map((tag, key) => {
              return (<Chip label={tag} onClick={handleClick(tag)} size="small" key={key}/>);
            })}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default GameBox;
