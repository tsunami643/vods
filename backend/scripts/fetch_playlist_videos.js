#!/usr/bin/env node
/**
 * Fetch and print all YouTube videos for a given internal playlist ID.
 *
 * Usage:
 *   node backend/scripts/fetch_playlist_videos.js <internalPlaylistId>
 *
 * Output: JSON array of ordered videos with key metadata.
 */

const fetch = require('node-fetch');
const pool = require('../db/connection');
const config = require('../config');

async function getYouTubePlaylistIdByInternalId(internalId) {
  const result = await pool.query(
    'SELECT youtube_id FROM playlists WHERE id = $1',
    [internalId]
  );
  if (!result.rows.length) {
    throw new Error(`Playlist with id=${internalId} not found`);
  }
  return result.rows[0].youtube_id;
}

async function fetchAllPlaylistItems(youtubePlaylistId, apiKey) {
  let pageToken = '';
  const items = [];
  do {
    const url = new URL('https://youtube.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('playlistId', youtubePlaylistId);
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube API error (playlistItems): ${res.status} ${text}`);
    }
    const data = await res.json();
    const mapped = (data.items || []).map((it, idx) => ({
      position: it.snippet?.position ?? (items.length + idx),
      videoId: it.contentDetails?.videoId,
      title: it.snippet?.title,
      publishedAt: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt,
      playlistItemId: it.id
    }));
    items.push(...mapped);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  // Ensure order by position
  items.sort((a, b) => a.position - b.position);
  return items;
}

async function fetchVideoDetails(videoIds, apiKey) {
  // YouTube videos.list allows up to 50 IDs per call
  const chunks = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }
  const detailsMap = new Map();
  for (const chunk of chunks) {
    const url = new URL('https://youtube.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,contentDetails,statistics');
    url.searchParams.set('id', chunk.join(','));
    url.searchParams.set('key', apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube API error (videos): ${res.status} ${text}`);
    }
    const data = await res.json();
    for (const v of data.items || []) {
      detailsMap.set(v.id, {
        id: v.id,
        title: v.snippet?.title,
        description: v.snippet?.description,
        channelTitle: v.snippet?.channelTitle,
        publishedAt: v.snippet?.publishedAt,
        duration: v.contentDetails?.duration,
        definition: v.contentDetails?.definition,
        caption: v.contentDetails?.caption,
        viewCount: v.statistics?.viewCount,
        likeCount: v.statistics?.likeCount,
        commentCount: v.statistics?.commentCount,
        thumbnails: v.snippet?.thumbnails || {}
      });
    }
  }
  return detailsMap;
}

async function main() {
  try {
    const [, , internalIdArg] = process.argv;
    if (!internalIdArg) {
      console.error('Usage: node backend/scripts/fetch_playlist_videos.js <internalPlaylistId>');
      process.exit(1);
    }
    const internalId = parseInt(internalIdArg, 10);
    if (Number.isNaN(internalId)) {
      throw new Error('Internal playlist id must be a number');
    }

    const apiKey = config.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY is not configured');
    }

    const youtubePlaylistId = await getYouTubePlaylistIdByInternalId(internalId);
    const playlistItems = await fetchAllPlaylistItems(youtubePlaylistId, apiKey);
    const videoIds = playlistItems.map(i => i.videoId).filter(Boolean);
    const detailsMap = await fetchVideoDetails(videoIds, apiKey);

    const output = playlistItems.map((pi, idx) => {
      const d = detailsMap.get(pi.videoId) || {};
      return {
        index: idx,
        position: pi.position,
        videoId: pi.videoId,
        title: d.title || pi.title,
        publishedAt: d.publishedAt || pi.publishedAt,
        duration: d.duration,
        definition: d.definition,
        viewCount: d.viewCount,
        likeCount: d.likeCount,
        commentCount: d.commentCount,
        thumbnails: d.thumbnails,
      };
    });

    // Print pretty JSON
    // console.log(JSON.stringify({
    //   internalPlaylistId: internalId,
    //   youtubePlaylistId,
    //   total: output.length,
    //   videos: output
    // }, null, 2));
    for (const video of output) {
      console.log(`▶️ - ${video.position + 1}:\t[${video.duration}]\t${video.title} (${video.videoId})`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    try { await pool.end(); } catch {}
  }
}

main();




