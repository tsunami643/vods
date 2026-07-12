import {
  AppBar,
  Box,
  Divider,
  Pagination,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Footer from "./components/Footer";
import GameBox from "./components/GameBox";
import VideoPage from "./components/VideoPage";
import PlaylistPage from "./components/PlaylistPage";
import GameBoxSkeleton from "./components/GameBoxSkeleton";
import Logo from "./components/navbar/Logo";
import SearchBar from "./components/navbar/SearchBar";
import { isRequestCanceled, vodsApi } from "./api/vodsApi";
import { SITE_TITLE } from "./utils/site";

const App = () => {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const videoId = searchParams.get("video");
  const playlistId = searchParams.get("playlist");
  const isVideoPage = Boolean(videoId);
  const isHomePage = !videoId && !playlistId;
  const [searchResults, setSearchResults] = useState([]);
  const [pageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [initialGamesLoad, setinitialGamesLoad] = useState(Boolean);
  const [initialGames, setinitialGames] = useState([]);
  const [catalogError, setCatalogError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [tagArray, setTagArray] = useState([]);
  const [searchKey, setSearchKey] = useState(0);

  useEffect(() => {
    if (!isHomePage) {
      setSearchInput("");
      setTagArray([]);
      setSearchKey((k) => k + 1);
    }
  }, [isHomePage]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    document.title = SITE_TITLE;
    setinitialGamesLoad(true);
    setinitialGames([]);
    setCatalogError(null);
    
    vodsApi.getCatalog({ signal: controller.signal })
      .then((gameDatabase) => {
        if (!active) return;
        setinitialGames(gameDatabase);
        setSearchResults(gameDatabase);
        setinitialGamesLoad(false);
      })
      .catch((error) => {
        if (isRequestCanceled(error) || !active) return;
        setCatalogError("Unable to load the VOD catalog");
        setinitialGamesLoad(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const filterGames = useCallback(() => {
    let results = initialGames;

    if (searchInput) {
      results = results.filter((item) =>
        item.gameName.toString().toLowerCase().includes(searchInput.toLowerCase())
      );
    }

    if (tagArray.length > 0) {
      results = results.filter((item) =>
        tagArray.every((tag) => item.tags?.includes(tag))
      );
    }

    setSearchResults(results);
  }, [initialGames, searchInput, tagArray]);

  useEffect(() => {
    if (!initialGamesLoad) {
      filterGames();
    }
  }, [filterGames, initialGamesLoad]);

  const handleSearch = useCallback((value) => {
    setSearchInput(value);
  }, []);

  const addTag = useCallback((tag) => {
    setTagArray((prev) => {
      if (prev.includes(tag)) return prev;
      return [...prev, tag];
    });
  }, []);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchKey((k) => k + 1);
  }, []);

  const removeTag = useCallback((tag) => {
    setTagArray((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleChange = (event, value) => {
    setPage(value);
  };

  if (isVideoPage) {
    return <VideoPage videoId={videoId} />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar
        position="sticky"
        sx={{
          bgcolor: "#242A43",
          backgroundImage: "none",
          boxShadow: "0px 2px 40px 0px rgb(0 0 0 / 40%)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Logo />
          <SearchBar key={searchKey} handleSearch={handleSearch} tags={tagArray} onRemoveTag={removeTag} />
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {playlistId ? (
          <PlaylistPage playlistId={playlistId} />
        ) : (
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
                {initialGamesLoad ? (
                  <GameBoxSkeleton />
                ) : catalogError ? (
                  <Typography variant="h5" sx={{ p: 3 }}>
                    {catalogError}
                  </Typography>
                ) : searchResults.length ? (
                  searchResults.map((gameData, index) => (
                    <GameBox data={gameData} addTag={addTag} clearSearch={clearSearch} key={index} />
                  ))
                ) : (
                  <Typography variant="h5" sx={{ p: 3 }}>
                    No Results
                  </Typography>
                )}
              </Box>

              <Pagination
                count={pageCount}
                size={mobile ? "small" : "medium"}
                page={page}
                onChange={handleChange}
                sx={{ mb: 2, alignSelf: "center" }}
              />

              <Divider flexItem />
          </>
        )}
      </Box>

      <Footer />
    </Box>
  );
};

export default App;
