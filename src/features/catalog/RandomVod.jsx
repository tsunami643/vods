import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, LinearProgress } from "@mui/material";
import { faShuffle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import GameBox from "./GameBox";
import "../../styles/RandomVod.css";

const MAX_SHUFFLE_CARDS = 10;
const MINIMUM_SHUFFLE_MILLISECONDS = 2750;
const RAPID_SHUFFLE_MILLISECONDS = 140;
const DECELERATION_DELAYS = [180, 240, 360, 500];
const EXIT_ANIMATION_MILLISECONDS = 320;
const REROLL_PROMPT_MILLISECONDS = 5000;
const REROLL_EXIT_MILLISECONDS = 250;

const RANDOM_VOD_LOADING_LINES = [
  "Leveling vigor...",
  "Activating fever time...",
  "Needling NPCs...",
  "17% chance you get a good one...",
];

function createShuffleDeck(candidates) {
  const deck = [...candidates];

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[randomIndex]] = [deck[randomIndex], deck[index]];
  }

  return deck.slice(0, MAX_SHUFFLE_CARDS);
}

export default function RandomVodFacade({
  candidates,
  failed,
  onFinished,
  onSettled,
  readyToReveal,
  selectedGame,
  sessionId,
}) {
  const deck = useMemo(() => createShuffleDeck(candidates), [candidates]);
  const singleCandidate = deck.length === 1;
  const startedAtRef = useRef(performance.now());
  const preloadedImagesRef = useRef([]);
  const reportedSettledRef = useRef(false);
  const [frame, setFrame] = useState({
    game: deck[0],
    index: 0,
    token: 0,
  });
  const [loadingLine] = useState(() => {
    const randomIndex = Math.floor(
      Math.random() * RANDOM_VOD_LOADING_LINES.length
    );
    return RANDOM_VOD_LOADING_LINES[randomIndex];
  });
  const [phase, setPhase] = useState(
    singleCandidate ? "single" : "shuffling"
  );
  const [exiting, setExiting] = useState(false);

  useLayoutEffect(() => {
    document.documentElement.classList.add("random-vod-facade-active");
    return () => {
      document.documentElement.classList.remove("random-vod-facade-active");
    };
  }, []);

  useEffect(() => {
    const urls = new Set(deck.map((game) => game?.gameCover).filter(Boolean));
    if (selectedGame?.gameCover) urls.add(selectedGame.gameCover);

    urls.forEach((url) => {
      if (preloadedImagesRef.current.some((image) => image.src === url)) return;
      const image = new Image();
      image.src = url;
      preloadedImagesRef.current.push(image);
    });
  }, [deck, selectedGame]);

  useEffect(() => () => {
    preloadedImagesRef.current = [];
  }, []);

  useEffect(() => {
    if (phase !== "shuffling" || deck.length === 0) return undefined;

    const intervalId = setInterval(() => {
      setFrame((currentFrame) => {
        const nextIndex = (currentFrame.index + 1) % deck.length;
        return {
          game: deck[nextIndex],
          index: nextIndex,
          token: currentFrame.token + 1,
        };
      });
    }, RAPID_SHUFFLE_MILLISECONDS);

    return () => clearInterval(intervalId);
  }, [deck, phase]);

  useEffect(() => {
    if (!selectedGame) return undefined;

    if (phase === "single") {
      setPhase("settled");
      return undefined;
    }

    if (phase !== "shuffling") return undefined;

    const decelerationDuration = DECELERATION_DELAYS.reduce(
      (total, delay) => total + delay,
      0
    );
    const elapsed = performance.now() - startedAtRef.current;
    const delay = Math.max(
      0,
      MINIMUM_SHUFFLE_MILLISECONDS - elapsed - decelerationDuration
    );
    const timeoutId = setTimeout(() => setPhase("decelerating"), delay);

    return () => clearTimeout(timeoutId);
  }, [phase, selectedGame]);

  useEffect(() => {
    if (phase !== "decelerating") return undefined;

    const timeoutIds = [];
    let elapsed = 0;

    DECELERATION_DELAYS.forEach((delay, stepIndex) => {
      elapsed += delay;
      timeoutIds.push(setTimeout(() => {
        const finalStep = stepIndex === DECELERATION_DELAYS.length - 1;

        if (finalStep) {
          setFrame((currentFrame) => ({
            game: selectedGame,
            index: currentFrame.index,
            token: currentFrame.token + 1,
          }));
          setPhase("settled");
          return;
        }

        setFrame((currentFrame) => {
          const nextIndex = deck.length > 0
            ? (currentFrame.index + 1) % deck.length
            : currentFrame.index;
          return {
            game: deck[nextIndex] || selectedGame,
            index: nextIndex,
            token: currentFrame.token + 1,
          };
        });
      }, elapsed));
    });

    return () => timeoutIds.forEach(clearTimeout);
  }, [deck, phase, selectedGame]);

  useEffect(() => {
    if (phase !== "settled" || reportedSettledRef.current) return;
    reportedSettledRef.current = true;
    onSettled(sessionId);
  }, [onSettled, phase, sessionId]);

  useEffect(() => {
    if (!failed && !(phase === "settled" && readyToReveal)) return;
    setExiting(true);
  }, [failed, phase, readyToReveal]);

  useEffect(() => {
    if (!exiting) return undefined;
    const timeoutId = setTimeout(
      () => onFinished(sessionId),
      EXIT_ANIMATION_MILLISECONDS
    );
    return () => clearTimeout(timeoutId);
  }, [exiting, onFinished, sessionId]);

  if (!frame.game) return null;

  const statusText = phase === "settled" || phase === "single"
    ? "Loading VoD..."
    : loadingLine;

  return (
    <div
      className={`random-vod-facade${exiting ? " exiting" : ""}`}
      aria-busy="true"
      style={{
        "--random-vod-exit-duration": `${EXIT_ANIMATION_MILLISECONDS}ms`,
      }}
    >
      <div className="random-vod-facade-content">
        <div
          className="random-vod-facade-status"
          role="status"
          aria-live="polite"
        >
          {statusText}
        </div>
        <div
          key={frame.token}
          className={`random-vod-card-frame ${phase === "settled" || phase === "single" ? "settled" : ""}`}
          aria-hidden="true"
        >
          <GameBox data={frame.game} interactive={false} />
        </div>
        <LinearProgress
          className="random-vod-loading-bar"
          aria-label="Loading random VoD"
        />
      </div>
    </div>
  );
}

export function RandomVodRerollButton({ onReroll }) {
  const [exiting, setExiting] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [theme] = useState(() => localStorage.getItem("chatTheme") || "blue");

  useEffect(() => {
    if (hovered) return undefined;

    const exitTimeout = setTimeout(
      () => setExiting(true),
      REROLL_PROMPT_MILLISECONDS - REROLL_EXIT_MILLISECONDS
    );
    const hideTimeout = setTimeout(
      () => setHidden(true),
      REROLL_PROMPT_MILLISECONDS
    );

    return () => {
      clearTimeout(exitTimeout);
      clearTimeout(hideTimeout);
    };
  }, [hovered]);

  if (hidden) return null;

  const handleClick = () => {
    setHidden(true);
    onReroll();
  };

  return (
    <Button
      className={`random-vod-reroll${exiting ? " exiting" : ""}`}
      data-theme={theme}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      startIcon={<FontAwesomeIcon icon={faShuffle} />}
      variant="contained"
    >
      Reroll another VoD?
    </Button>
  );
}
