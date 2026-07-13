import { useSearchParams } from "react-router-dom";

const appBase = import.meta.env.BASE_URL.replace(/\/+$/, "");
const pathSegment = (value) => encodeURIComponent(String(value));

export const APP_PAGE = {
  catalog: "catalog",
  playlist: "playlist",
  video: "video",
};

export const routes = {
  home: "/",
  playlist: (playlistId) => `/?playlist=${pathSegment(playlistId)}`,
  video: (videoId, time) => {
    const params = new URLSearchParams({ video: String(videoId) });
    if (time) params.set("time", time);
    return `/?${params.toString()}`;
  },
};

export const appHref = (route) => `${appBase}${route}` || "/";

export const videoHref = (videoId, time) => {
  return appHref(routes.video(videoId, time));
};

export default function useAppRoute() {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get("video");
  const playlistId = searchParams.get("playlist");

  if (videoId) {
    return { page: APP_PAGE.video, playlistId, videoId };
  }

  if (playlistId) {
    return { page: APP_PAGE.playlist, playlistId, videoId };
  }

  return { page: APP_PAGE.catalog, playlistId, videoId };
}
