import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CatalogPage from "./features/catalog/CatalogPage";
import CatalogShell from "./features/catalog/CatalogShell";
import PlaylistPage from "./features/catalog/PlaylistPage";
import useCatalog from "./features/catalog/useCatalog";
import VideoPage from "./features/video/VideoPage";
import useAppRoute, { APP_PAGE, routes } from "./routes";
import { vodsApi } from "./shared/vodsApi";

const RANDOM_TIME_PADDING_SECONDS = 30 * 60;
const SHORT_VOD_START_SECONDS = 10 * 60;
const MAX_RANDOM_GAME_ATTEMPTS = 5;
const MINIMUM_RANDOM_LOADING_MILLISECONDS = 1000;

function takeRandomItem(items) {
  const index = Math.floor(Math.random() * items.length);
  return items.splice(index, 1)[0];
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function getRandomStartTime(duration) {
  const durationSeconds = Number(duration);
  const startBoundary = durationSeconds > RANDOM_TIME_PADDING_SECONDS * 2
    ? RANDOM_TIME_PADDING_SECONDS
    : SHORT_VOD_START_SECONDS;
  const endBoundary = durationSeconds > RANDOM_TIME_PADDING_SECONDS * 2
    ? durationSeconds - RANDOM_TIME_PADDING_SECONDS
    : durationSeconds;
  const randomRange = endBoundary - startBoundary;

  if (randomRange <= 0) return null;
  return startBoundary + Math.floor(Math.random() * randomRange);
}

const App = () => {
  const navigate = useNavigate();
  const { page, playlistId, videoId } = useAppRoute();
  const [randomVodStatus, setRandomVodStatus] = useState("idle");
  const {
    addTag,
    clearSearch,
    error: catalogError,
    filteredGames: searchResults,
    games: catalogGames,
    handleSearch,
    loading: initialGamesLoad,
    removeTag,
    searchKey,
    tags: tagArray,
  } = useCatalog({ isHomePage: page === APP_PAGE.catalog });

  useEffect(() => {
    if (page !== APP_PAGE.catalog) setRandomVodStatus("idle");
  }, [page]);

  const handleRandomVod = useCallback(async () => {
    if (randomVodStatus === "loading" || searchResults.length === 0) return;

    setRandomVodStatus("loading");
    const minimumLoadingTime = new Promise((resolve) => {
      setTimeout(resolve, MINIMUM_RANDOM_LOADING_MILLISECONDS);
    });
    await waitForNextPaint();

    const remainingGames = [...searchResults];
    const attemptCount = Math.min(MAX_RANDOM_GAME_ATTEMPTS, remainingGames.length);

    try {
      for (let attempt = 0; attempt < attemptCount; attempt += 1) {
        const game = takeRandomItem(remainingGames);
        const videoCollection = game.playlistId
          ? await vodsApi.getPlaylist(game.playlistId)
          : { videos: [await vodsApi.getVideo(game.firstVideo)] };
        const eligibleVideos = (videoCollection.videos || []).filter((video) => (
          video.youtubeId && Number(video.duration) > SHORT_VOD_START_SECONDS
        ));

        if (eligibleVideos.length === 0) continue;

        const video = eligibleVideos[Math.floor(Math.random() * eligibleVideos.length)];
        const startTime = getRandomStartTime(video.duration);

        await minimumLoadingTime;
        navigate(routes.video(video.youtubeId, `${startTime}s`));
        return;
      }

      await minimumLoadingTime;
      setRandomVodStatus("error");
    } catch {
      await minimumLoadingTime;
      setRandomVodStatus("error");
    }
  }, [navigate, randomVodStatus, searchResults]);

  if (page === APP_PAGE.video) {
    return <VideoPage videoId={videoId} />;
  }

  return (
    <CatalogShell
      handleSearch={handleSearch}
      onRandomVod={page === APP_PAGE.catalog ? handleRandomVod : undefined}
      onRemoveTag={removeTag}
      randomVodDisabled={initialGamesLoad || searchResults.length === 0}
      randomVodStatus={randomVodStatus}
      searchKey={searchKey}
      tags={tagArray}
    >
      {page === APP_PAGE.playlist ? (
        <PlaylistPage playlistId={playlistId} />
      ) : (
        <CatalogPage
          addTag={addTag}
          clearSearch={clearSearch}
          error={catalogError}
          games={catalogGames}
          loading={initialGamesLoad}
          visibleGames={searchResults}
        />
      )}
    </CatalogShell>
  );
};

export default App;
