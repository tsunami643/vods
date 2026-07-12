import { Box, Skeleton, useMediaQuery, useTheme } from "@mui/material";

const GameBoxSkeleton = () => {
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

export default GameBoxSkeleton;
