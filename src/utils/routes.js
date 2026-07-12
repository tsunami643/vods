const appBase = import.meta.env.BASE_URL.replace(/\/+$/, "");
const pathSegment = (value) => encodeURIComponent(String(value));

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
