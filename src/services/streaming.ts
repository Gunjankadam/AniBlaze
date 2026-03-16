/**
 * Streaming service — connects to the local Node.js scraper server
 * which extracts video hosts from HiAnime, GogoAnime, and other providers.
 *
 * Server must be running at localhost:3001
 * To start: cd server && npm start
 */

export const SCRAPER_BASE_URL = "/scraper";

export interface StreamingServer {
  name: string;
  url: string;
  type: "iframe" | "m3u8" | "mp4" | "hls";
  provider?: string;
  subtitles?: Array<{ lang: string; url: string }>;
}

export interface EpisodeInfo {
  number: number;
  id: string | null;
  title: string;
  airDate?: string | null;
  image?: string | null;
  overview?: string | null;
}

export interface AiringInfo {
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

export interface EpisodesResponse {
  title: string;
  total: number;
  provider: string;
  episodes: (EpisodeInfo & { absoluteNumber?: number })[];
  nextAiring?: AiringInfo;
  lastAbsolute?: number | null;
}

export interface ServersResponse {
  servers: StreamingServer[];
  episode: number;
  anilistId: number;
  message?: string;
}

/** Check if the local scraper server is reachable */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${SCRAPER_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get episode list from the scraper server.
 * Falls back to AniList episode count if the server isn't running.
 */
export async function getEpisodeList(
  anilistId: number,
  fallbackCount?: number
): Promise<{ episodes: EpisodeInfo[]; nextAiring?: AiringInfo; lastAbsolute?: number | null }> {
  try {
    const res = await fetch(`${SCRAPER_BASE_URL}/api/episodes/${anilistId}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Server responded ${res.status}`);

    const data: EpisodesResponse = await res.json();
    return {
      episodes: data.episodes,
      nextAiring: data.nextAiring,
      lastAbsolute: data.lastAbsolute
    };
  } catch {
    // Fallback: generate from AniList episode count
    const count = fallbackCount || 24;
    return {
      episodes: Array.from({ length: count }, (_, i) => ({
        number: i + 1,
        id: null,
        title: `Episode ${i + 1}`,
      }))
    };
  }
}

/**
 * Get streaming servers for a specific episode.
 * Returns real embeds from HiAnime/GogoAnime when the scraper server is running.
 */
export async function getStreamingServers(
  anilistId: number,
  episode: number
): Promise<StreamingServer[]> {
  try {
    const res = await fetch(
      `${SCRAPER_BASE_URL}/api/servers/${anilistId}/${episode}`,
      { signal: AbortSignal.timeout(20000) }
    );

    if (!res.ok) throw new Error(`Server responded ${res.status}`);

    const data: ServersResponse = await res.json();
    return data.servers || [];
  } catch {
    // Graceful fallback — return empty so the UI shows the "start scraper" message
    return [];
  }
}
/**
 * Returns the VTT subtitle URL for a given episode.
 * The server fetches from OpenSubtitles and serves VTT directly.
 */
export function getSubtitleUrl(anilistId: number, episode: number): string {
  return `${SCRAPER_BASE_URL}/api/subtitles/${anilistId}/${episode}`;
}
