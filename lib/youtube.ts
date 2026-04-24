/**
 * Extract a YouTube video id from common watch / short / embed URLs.
 */
export function getYoutubeVideoId(raw: string): string | null {
  const url = raw?.trim();
  if (!url) return null;

  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') {
        return u.searchParams.get('v');
      }
      const embed = u.pathname.match(/^\/embed\/([^/?]+)/);
      if (embed?.[1]) return embed[1];
      const shorts = u.pathname.match(/^\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return shorts[1];
    }
  } catch {
    return null;
  }

  return null;
}

export function getYoutubeEmbedSrc(raw: string): string | null {
  const id = getYoutubeVideoId(raw);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
