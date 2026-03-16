const ANILIST_URL = "/scraper/api/anilist";

export interface RelatedEntry {
  id: number;
  relationType: string; // "PREQUEL" | "SEQUEL" | "SIDE_STORY" | "PARENT" | "SPIN_OFF" | "ALTERNATIVE" | "SUMMARY" | "OTHER"
  title: { romaji: string; english: string | null };
  format: string | null; // "TV" | "MOVIE" | "OVA" | "ONA" | "SPECIAL"
  status: string | null;
  coverImage: { large: string };
  seasonYear: number | null;
  episodes: number | null;
  relations?: {
    edges: Array<{
      relationType: string;
      node: RelatedEntry;
    }>;
  };
}

export interface AnimeMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
  };
  coverImage: {
    large: string;
    extraLarge: string;
  };
  bannerImage: string | null;
  description: string | null;
  averageScore: number | null;
  genres: string[];
  episodes: number | null;
  status: string;
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  nextAiringEpisode?: { airingAt: number; timeUntilAiring: number; episode: number } | null;
  relations?: {
    edges: Array<{
      relationType: string;
      node: RelatedEntry;
    }>;
  };
}

const MEDIA_FRAGMENT = `
  id
  title { romaji english }
  coverImage { large extraLarge }
  bannerImage
  description(asHtml: false)
  averageScore
  genres
  episodes
  status
  season
  seasonYear
  format
`;

async function queryAniList(query: string, variables: Record<string, unknown> = {}) {
  try {
    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error("AniList Fetch Error:", err);
    throw err;
  }
}

// ─────────────────────────────────────────
// Fallback providers (Jikan / Kitsu)
// ─────────────────────────────────────────

async function getFromJikan(id: number): Promise<AnimeMedia | null> {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const a = json?.data;
    if (!a) return null;

    const genres = Array.isArray(a.genres) ? a.genres.map((g: any) => g.name) : [];
    const images = a.images?.jpg || {};
    const titleEnglish = a.title_english || null;
    const titleRomaji = a.title_japanese || a.title || (titleEnglish ?? "Unknown");

    const score = typeof a.score === "number" ? Math.round(a.score * 10) : null; // Jikan 0–10 → AniList 0–100 style

    const media: AnimeMedia = {
      id,
      title: {
        romaji: titleRomaji,
        english: titleEnglish,
      },
      coverImage: {
        large: images.image_url || images.large_image_url || "",
        extraLarge: images.large_image_url || images.image_url || "",
      },
      bannerImage: images.large_image_url || null,
      description: a.synopsis || null,
      averageScore: score,
      genres,
      episodes: a.episodes ?? null,
      status: a.status || "UNKNOWN",
      season: null,
      seasonYear: a.year ?? null,
      format: a.type || null,
      nextAiringEpisode: null,
      relations: { edges: [] },
    };

    console.warn("[Fallback] Using Jikan metadata for id", id);
    return media;
  } catch (err) {
    console.error("Jikan Fetch Error:", err);
    return null;
  }
}

async function getFromKitsu(id: number): Promise<AnimeMedia | null> {
  try {
    const res = await fetch(`https://kitsu.io/api/edge/anime/${id}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const a = json?.data?.attributes;
    if (!a) return null;

    const titles = a.titles || {};
    const titleEnglish = titles.en || titles.en_us || null;
    const titleRomaji = titles.en_jp || a.slug || titleEnglish || a.canonicalTitle || "Unknown";

    const poster = a.posterImage || {};
    const score =
      typeof a.averageRating === "string"
        ? Math.round(parseFloat(a.averageRating))
        : null;

    const media: AnimeMedia = {
      id,
      title: {
        romaji: titleRomaji,
        english: titleEnglish,
      },
      coverImage: {
        large: poster.large || poster.medium || poster.original || "",
        extraLarge: poster.original || poster.large || poster.medium || "",
      },
      bannerImage: (a.coverImage && (a.coverImage.large || a.coverImage.original)) || null,
      description: a.synopsis || null,
      averageScore: score,
      genres: Array.isArray(a.abbreviatedTitles) ? a.abbreviatedTitles : [],
      episodes: a.episodeCount ?? null,
      status: a.status || "UNKNOWN",
      season: null,
      seasonYear: a.startDate ? Number(String(a.startDate).slice(0, 4)) || null : null,
      format: a.subtype || null,
      nextAiringEpisode: null,
      relations: { edges: [] },
    };

    console.warn("[Fallback] Using Kitsu metadata for id", id);
    return media;
  } catch (err) {
    console.error("Kitsu Fetch Error:", err);
    return null;
  }
}

export async function getTrendingAnime(page = 1, perPage = 20): Promise<AnimeMedia[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC) { ${MEDIA_FRAGMENT} }
      }
    }
  `;
  const data = await queryAniList(query, { page, perPage });
  return data.Page.media;
}

export async function getPopularAnime(page = 1, perPage = 20): Promise<AnimeMedia[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC) { ${MEDIA_FRAGMENT} }
      }
    }
  `;
  const data = await queryAniList(query, { page, perPage });
  return data.Page.media;
}

export async function getUpcomingAnime(page = 1, perPage = 20): Promise<AnimeMedia[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) { ${MEDIA_FRAGMENT} }
      }
    }
  `;
  const data = await queryAniList(query, { page, perPage });
  return data.Page.media;
}

export async function searchAnime(search: string, page = 1, perPage = 20): Promise<AnimeMedia[]> {
  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, search: $search, sort: SEARCH_MATCH) { ${MEDIA_FRAGMENT} }
      }
    }
  `;
  const data = await queryAniList(query, { search, page, perPage });
  return data.Page.media;
}

export async function getAnimeById(id: number): Promise<AnimeMedia> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FRAGMENT}
        nextAiringEpisode { airingAt timeUntilAiring episode }
        relations {
          edges {
            relationType
            node {
              id
              title { romaji english }
              format
              status
              coverImage { large }
              seasonYear
              episodes
              relations {
                edges {
                  relationType
                  node {
                    id
                    title { romaji english }
                    format
                    status
                    coverImage { large }
                    seasonYear
                    episodes
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await queryAniList(query, { id });
    if (data?.Media) {
      return data.Media;
    }
  } catch (err) {
    console.error("[AniBlaze] AniList getAnimeById failed, falling back", err);
  }

  // Fallback chain: Jikan → Kitsu
  const jikan = await getFromJikan(id);
  if (jikan) return jikan;

  const kitsu = await getFromKitsu(id);
  if (kitsu) return kitsu;

  throw new Error("Anime not found in AniList, Jikan, or Kitsu");
}
