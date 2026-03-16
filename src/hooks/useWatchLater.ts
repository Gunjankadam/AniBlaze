import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "animestream_watch_later";

export const useWatchLater = () => {
  const [list, setList] = useState<number[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setList(JSON.parse(stored));
  }, []);

  const persist = (ids: number[]) => {
    setList(ids);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  const add = useCallback((id: number) => {
    setList(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const remove = useCallback((id: number) => {
    setList(prev => {
      const next = prev.filter(aid => aid !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isInWatchLater = useCallback(
    (id: number) => list.includes(id),
    [list]
  );

  const toggle = useCallback(
    (id: number) => {
      if (list.includes(id)) remove(id);
      else add(id);
    },
    [list, add, remove]
  );

  return { list, add, remove, toggle, isInWatchLater, setList: persist };
};

