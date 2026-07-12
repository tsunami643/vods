export const SITE_TITLE = "tsunami's twitch vods";

export const getVideoDocumentTitle = (videoName) =>
  videoName ? `${videoName} - ${SITE_TITLE}` : SITE_TITLE;
