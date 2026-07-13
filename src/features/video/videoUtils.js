export const SITE_TITLE = "tsunami's twitch vods";

export const getVideoDocumentTitle = (videoName) =>
  videoName ? `${videoName} - ${SITE_TITLE}` : SITE_TITLE;

export function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDuration(seconds) {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function parseTimeToSeconds(input) {
  if (input === null || input === undefined || input === '') return null;
  const inputString = String(input);

  if (/[hms]/i.test(inputString)) {
    const hours = inputString.match(/(\d+)h/i);
    const minutes = inputString.match(/(\d+)m/i);
    const seconds = inputString.match(/(\d+)s/i);

    return (hours ? parseInt(hours[1]) : 0) * 3600
      + (minutes ? parseInt(minutes[1]) : 0) * 60
      + (seconds ? parseInt(seconds[1]) : 0);
  }

  const parsed = parseInt(inputString);
  return (!isNaN(parsed) && parsed >= 0) ? parsed : null;
}

export function formatTimeForUrl(seconds) {
  if (seconds === null || seconds === undefined || seconds < 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const parts = [];

  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

  return parts.join('');
}

export function parseTimecode(timecode) {
  const parts = timecode.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

const descriptionTokenPattern = /https?:\/\/\S+|\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/g;

export function tokenizeDescription(description) {
  const tokens = [];
  let previousEnd = 0;

  for (const match of description.matchAll(descriptionTokenPattern)) {
    const value = match[0];
    const start = match.index;

    if (start > previousEnd) {
      tokens.push({ type: 'text', value: description.slice(previousEnd, start), start: previousEnd });
    }

    tokens.push({
      type: value.startsWith('http://') || value.startsWith('https://') ? 'link' : 'timecode',
      value,
      start,
    });
    previousEnd = start + value.length;
  }

  if (previousEnd < description.length) {
    tokens.push({ type: 'text', value: description.slice(previousEnd), start: previousEnd });
  }

  return tokens;
}
