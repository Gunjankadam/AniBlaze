import { useState, useEffect, useCallback } from "react";

export interface WatchEntry {
  animeId: number;
  episode: number;
  timestamp: number;
}

const STORAGE_KEY = "animestream_watch_history";

export const useWatchHistory = () => {
  const [history, setHistory] = useState<WatchEntry[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  const addToHistory = useCallback((animeId: number, episode: number) => {
    setHistory((prev) => {
      const filtered = prev.filter(
        (e) => !(e.animeId === animeId && e.episode === episode)
      );
      const next = [{ animeId, episode, timestamp: Date.now() }, ...filtered].slice(0, 100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getLastWatched = useCallback(
    (animeId: number) => history.find((e) => e.animeId === animeId),
    [history]
  );

  return { history, addToHistory, clearHistory, getLastWatched };
};
