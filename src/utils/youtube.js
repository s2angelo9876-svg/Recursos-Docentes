const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
  /(?:youtu\.be\/)([^?\s]+)/,
  /(?:youtube\.com\/embed\/)([^?\s]+)/,
  /(?:youtube\.com\/shorts\/)([^?\s]+)/,
];

export function getYouTubeId(url) {
  if (!url) return null;
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isValidYouTubeUrl(url) {
  return getYouTubeId(url) !== null;
}

export function getYouTubeThumbnail(id, quality = "mqdefault") {
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}
