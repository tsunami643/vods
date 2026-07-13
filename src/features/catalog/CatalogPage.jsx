import {
  Box,
  Divider,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import GameBox, { GameBoxSkeleton } from "./GameBox";

export default function CatalogPage({
  addTag,
  clearSearch,
  error,
  games,
  loading,
}) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <>
      <Box
        sx={{
          p: mobile ? "8px 8px 16px 8px" : 2,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignContent: "flex-start",
          minHeight: {
            xs: "calc(100vh - 384px)",
            mobileCard: "calc(100vh - 387px)",
            sm: "calc(100vh - 369px)",
          },
        }}
      >
        {loading ? (
          <GameBoxSkeleton />
        ) : error ? (
          <Typography variant="h5" sx={{ p: 3 }}>
            {error}
          </Typography>
        ) : games.length ? (
          games.map((game, index) => (
            <GameBox
              key={index}
              data={game}
              addTag={addTag}
              clearSearch={clearSearch}
            />
          ))
        ) : (
          <Typography variant="h5" sx={{ p: 3 }}>
            No Results
          </Typography>
        )}
      </Box>

      <Divider flexItem />
    </>
  );
}
