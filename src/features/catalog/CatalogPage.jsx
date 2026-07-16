import {
  Box,
  Divider,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { memo, useMemo } from "react";

import GameBox, { GameBoxSkeleton } from "./GameBox";

function CatalogPage({
  addTag,
  clearSearch,
  error,
  games,
  loading,
  visibleGames,
}) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const visibleGameSet = useMemo(() => new Set(visibleGames), [visibleGames]);

  return (
    <>
      <Box
        sx={{
          p: mobile ? "8px 8px 16px 8px" : 2,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignContent: "flex-start",
          flex: 1,
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
        ) : (
          <>
            {games.map((game) => (
              <div
                key={game.streamId || game.playlistId || game.gameName}
                style={{ display: visibleGameSet.has(game) ? "contents" : "none" }}
              >
                <GameBox
                  data={game}
                  addTag={addTag}
                  clearSearch={clearSearch}
                />
              </div>
            ))}
            {visibleGames.length === 0 && (
              <Typography variant="h5" sx={{ p: 3 }}>
                No Results
              </Typography>
            )}
          </>
        )}
      </Box>

      <Divider flexItem />
    </>
  );
}

export default memo(CatalogPage);
