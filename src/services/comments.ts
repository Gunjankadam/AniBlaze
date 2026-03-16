import { SCRAPER_BASE_URL } from "./streaming";

export interface EpisodeComment {
  id: string;
  userId: string;
  email: string;
  text: string;
  createdAt: string;
}

export async function fetchComments(
  anilistId: number,
  episode: number
): Promise<EpisodeComment[]> {
  const res = await fetch(
    `${SCRAPER_BASE_URL}/api/comments/${anilistId}/${episode}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) {
    return [];
  }
  const data = await res.json().catch(() => ({}));
  return (data.comments || []) as EpisodeComment[];
}

export async function postComment(
  anilistId: number,
  episode: number,
  payload: { userId: string; email: string; text: string }
): Promise<EpisodeComment | null> {
  const res = await fetch(
    `${SCRAPER_BASE_URL}/api/comments/${anilistId}/${episode}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Failed to post comment");
  }
  return (data.comment || null) as EpisodeComment | null;
}

