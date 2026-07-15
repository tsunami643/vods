import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import CatalogPage from "./features/catalog/CatalogPage";
import CatalogShell from "./features/catalog/CatalogShell";
import PlaylistPage from "./features/catalog/PlaylistPage";
import RandomVodFacade, {
  RandomVodRerollButton,
} from "./features/catalog/RandomVod";
import useCatalog from "./features/catalog/useCatalog";
import VideoPage from "./features/video/VideoPage";
import useAppRoute, { APP_PAGE, routes } from "./routes";
import { isRequestCanceled, vodsApi } from "./shared/vodsApi";

const RANDOM_TIME_PADDING_SECONDS = 30 * 60;
const SHORT_VOD_START_SECONDS = 10 * 60;
const MAX_RANDOM_GAME_ATTEMPTS = 5;
const RANDOM_PLAYBACK_REVEAL_TIMEOUT_MILLISECONDS = 10000;

function takeRandomItem(items) {
  const index = Math.floor(Math.random() * items.length);
  return items.splice(index, 1)[0];
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
  const [randomTransition, setRandomTransition] = useState(null);
  const randomRequestRef = useRef(null);
  const randomRevealTimeoutRef = useRef(null);
  const randomSessionIdRef = useRef(0);
  const randomTransitionRef = useRef(randomTransition);
  randomTransitionRef.current = randomTransition;
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

  useEffect(() => () => {
    randomRequestRef.current?.abort();
    clearTimeout(randomRevealTimeoutRef.current);
  }, []);

  const transitionTargetVideoId = randomTransition?.targetVideoId;
  const transitionRouteReached = randomTransition?.routeReached;

  useEffect(() => {
    if (!transitionTargetVideoId) return;

    if (page === APP_PAGE.video && videoId === transitionTargetVideoId) {
      if (!transitionRouteReached) {
        setRandomTransition((currentTransition) => (
          currentTransition?.targetVideoId === transitionTargetVideoId
            ? { ...currentTransition, routeReached: true }
            : currentTransition
        ));
      }
      return;
    }

    if (!transitionRouteReached) return;

    randomSessionIdRef.current += 1;
    randomRequestRef.current?.abort();
    clearTimeout(randomRevealTimeoutRef.current);
    setRandomTransition(null);
  }, [page, transitionRouteReached, transitionTargetVideoId, videoId]);

  const handleRandomVod = useCallback(async (candidateOverride = null) => {
    const availableGames = Array.isArray(candidateOverride)
      ? candidateOverride
      : searchResults;
    if (randomVodStatus === "loading" || availableGames.length === 0) return;

    randomRequestRef.current?.abort();
    clearTimeout(randomRevealTimeoutRef.current);

    const sessionId = randomSessionIdRef.current + 1;
    randomSessionIdRef.current = sessionId;
    const controller = new AbortController();
    randomRequestRef.current = controller;
    const selectionPool = [...availableGames];
    setRandomVodStatus("loading");
    setRandomTransition({
      candidates: selectionPool,
      failed: false,
      id: sessionId,
      playbackReleased: false,
      playbackStarted: false,
      revealTimedOut: false,
      routeReached: false,
      selectionPool,
      selectedGame: null,
      startedFromVideo: page === APP_PAGE.video,
      targetVideoId: null,
      visible: true,
    });

    const remainingGames = [...selectionPool];
    const attemptCount = Math.min(MAX_RANDOM_GAME_ATTEMPTS, remainingGames.length);

    try {
      for (let attempt = 0; attempt < attemptCount; attempt += 1) {
        const game = takeRandomItem(remainingGames);
        const videoCollection = game.playlistId
          ? await vodsApi.getPlaylist(game.playlistId, { signal: controller.signal })
          : {
              videos: [await vodsApi.getVideo(game.firstVideo, {
                signal: controller.signal,
              })],
            };
        if (randomSessionIdRef.current !== sessionId) return;

        const eligibleVideos = (videoCollection.videos || []).filter((video) => (
          video.youtubeId && Number(video.duration) > SHORT_VOD_START_SECONDS
        ));

        if (eligibleVideos.length === 0) continue;

        const video = eligibleVideos[Math.floor(Math.random() * eligibleVideos.length)];
        const startTime = getRandomStartTime(video.duration);

        randomRequestRef.current = null;
        setRandomTransition((currentTransition) => (
          currentTransition?.id === sessionId
            ? {
                ...currentTransition,
                selectedGame: game,
                targetStartTime: startTime,
                targetVideoId: video.youtubeId,
              }
            : currentTransition
        ));
        return;
      }

      if (randomSessionIdRef.current !== sessionId) return;
      randomRequestRef.current = null;
      setRandomVodStatus("error");
      setRandomTransition((currentTransition) => (
        currentTransition?.id === sessionId
          ? { ...currentTransition, failed: true }
          : currentTransition
      ));
    } catch (error) {
      if (isRequestCanceled(error) || randomSessionIdRef.current !== sessionId) return;
      randomRequestRef.current = null;
      setRandomVodStatus("error");
      setRandomTransition((currentTransition) => (
        currentTransition?.id === sessionId
          ? { ...currentTransition, failed: true }
          : currentTransition
      ));
    }
  }, [page, randomVodStatus, searchResults]);

  const handleRandomFacadeSettled = useCallback((sessionId) => {
    clearTimeout(randomRevealTimeoutRef.current);
    setRandomTransition((currentTransition) => (
      currentTransition?.id === sessionId
        ? { ...currentTransition, playbackReleased: true }
        : currentTransition
    ));

    randomRevealTimeoutRef.current = setTimeout(() => {
      setRandomTransition((currentTransition) => (
        currentTransition?.id === sessionId
          ? { ...currentTransition, revealTimedOut: true }
          : currentTransition
      ));
    }, RANDOM_PLAYBACK_REVEAL_TIMEOUT_MILLISECONDS);
  }, []);

  const handleRandomPlaybackStarted = useCallback((sessionId) => {
    clearTimeout(randomRevealTimeoutRef.current);
    setRandomTransition((currentTransition) => (
      currentTransition?.id === sessionId
        ? { ...currentTransition, playbackStarted: true }
        : currentTransition
    ));
  }, []);

  const handleRandomFacadeFinished = useCallback((sessionId) => {
    clearTimeout(randomRevealTimeoutRef.current);
    const completedTransition = randomTransitionRef.current;

    if (completedTransition?.id !== sessionId) return;
    if (completedTransition.failed) {
      setRandomTransition(null);
      return;
    }

    setRandomTransition((currentTransition) => {
      if (currentTransition?.id !== sessionId) return currentTransition;
      return {
        ...currentTransition,
        candidates: [],
        selectedGame: null,
        visible: false,
      };
    });
    setRandomVodStatus("idle");
    navigate(routes.video(
      completedTransition.targetVideoId,
      `${completedTransition.targetStartTime}s`
    ));
  }, [navigate]);

  const handleRandomReroll = useCallback(() => {
    const selectionPool = randomTransitionRef.current?.selectionPool;
    if (selectionPool?.length) handleRandomVod(selectionPool);
  }, [handleRandomVod]);

  const playlistRandomPool = page === APP_PAGE.playlist
    ? catalogGames.filter((game) => game.playlistId === playlistId)
    : [];
  const handleHeaderSearch = useCallback((value) => {
    handleSearch(value);
    if (page === APP_PAGE.playlist) navigate(routes.home);
  }, [handleSearch, navigate, page]);
  const handleHeaderRandomVod = page === APP_PAGE.catalog
    ? handleRandomVod
    : page === APP_PAGE.playlist
      ? () => handleRandomVod(playlistRandomPool)
      : undefined;
  const headerRandomVodDisabled = initialGamesLoad || (
    page === APP_PAGE.playlist
      ? playlistRandomPool.length === 0
      : searchResults.length === 0
  );

  const selectingRandomFromVideo = Boolean(
    randomTransition?.startedFromVideo &&
    randomTransition.visible &&
    !randomTransition.targetVideoId
  );
  const preparingRandomVideo = Boolean(
    randomTransition?.targetVideoId &&
    !randomTransition.routeReached
  );
  const renderedVideoId = preparingRandomVideo
    ? randomTransition.targetVideoId
    : videoId;
  const randomPlaybackGate = randomTransition?.targetVideoId === renderedVideoId
    ? {
        onFirstPlaying: () => handleRandomPlaybackStarted(randomTransition.id),
        released: randomTransition.playbackReleased,
      }
    : null;

  const pageContent = selectingRandomFromVideo ? null : (
    page === APP_PAGE.video || preparingRandomVideo ? (
      <VideoPage
        initialTimeOverride={
          randomPlaybackGate ? randomTransition.targetStartTime : null
        }
        videoId={renderedVideoId}
        playbackGate={randomPlaybackGate}
      />
    ) : (
      <CatalogShell
        handleSearch={handleHeaderSearch}
        onRandomVod={handleHeaderRandomVod}
        onRemoveTag={removeTag}
        randomVodDisabled={headerRandomVodDisabled}
        randomVodStatus={randomVodStatus}
        searchKey={searchKey}
        tags={tagArray}
        viewportConstrained={page === APP_PAGE.playlist}
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
    )
  );

  const showRandomReroll = Boolean(
    page === APP_PAGE.video &&
    randomTransition?.routeReached &&
    !randomTransition.visible &&
    randomTransition.targetVideoId === videoId &&
    randomTransition.selectionPool?.length
  );

  return (
    <>
      {pageContent}
      {randomTransition?.visible && (
        <RandomVodFacade
          key={randomTransition.id}
          candidates={randomTransition.candidates}
          failed={randomTransition.failed}
          onFinished={handleRandomFacadeFinished}
          onSettled={handleRandomFacadeSettled}
          readyToReveal={
            randomTransition.playbackStarted || randomTransition.revealTimedOut
          }
          selectedGame={randomTransition.selectedGame}
          sessionId={randomTransition.id}
        />
      )}
      {showRandomReroll && (
        <RandomVodRerollButton
          key={randomTransition.id}
          onReroll={handleRandomReroll}
        />
      )}
    </>
  );
};

export default App;
