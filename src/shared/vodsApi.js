import axios from "axios";

const baseURL = (import.meta.env.VITE_VODS_API_URL || "http://localhost:3001").replace(/\/+$/, "");

const apiClient = axios.create({ baseURL });

const pathSegment = (value) => encodeURIComponent(String(value));

export const isRequestCanceled = axios.isCancel;
export const getErrorStatus = (error) => error?.response?.status ?? null;

export const vodsApi = {
  getCatalog: ({ signal } = {}) =>
    apiClient.get("/getvods", { signal }).then((response) => response.data),

  getPlaylist: (playlistId, { signal } = {}) =>
    apiClient
      .get(`/playlist/${pathSegment(playlistId)}`, { signal })
      .then((response) => response.data),

  getVideo: (videoId, { signal } = {}) =>
    apiClient
      .get(`/video/${pathSegment(videoId)}`, { signal })
      .then((response) => response.data),

  getChatMetadata: (videoId, { signal } = {}) =>
    apiClient
      .get(`/chat/${pathSegment(videoId)}/metadata`, { signal })
      .then((response) => response.data),

  getChatRange: (videoId, start, end, { signal } = {}) =>
    apiClient
      .get(`/chat/${pathSegment(videoId)}`, {
        params: { start, end },
        signal,
      })
      .then((response) => response.data),
};
