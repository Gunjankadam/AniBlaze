import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "animestream_favorites";

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setFavorites(JSON.parse(stored));
  }, []);

  const save = (ids: number[]) => {
    setFavorites(ids);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  const addFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = prev.filter((fid) => fid !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: number) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback((id: number) => {
    if (favorites.includes(id)) {
      removeFavorite(id);
    } else {
      addFavorite(id);
    }
  }, [favorites, addFavorite, removeFavorite]);

  return { favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite };
};
