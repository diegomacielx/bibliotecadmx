import { useState, useCallback, useEffect } from 'react';
import { readJSON, writeJSON } from '../lib/storage';

function favoritesKey(userId: string | undefined): string {
  return userId ? `dmx_favorites_${userId}` : 'dmx_favorites_guest';
}

export function useFavorites(userId: string | undefined) {
  const key = favoritesKey(userId);
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(readJSON<string[]>(key, []))
  );

  useEffect(() => {
    setFavorites(new Set(readJSON<string[]>(key, [])));
  }, [key]);

  const toggle = useCallback(
    (firestoreId: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(firestoreId)) next.delete(firestoreId);
        else next.add(firestoreId);
        writeJSON(key, [...next]);
        return next;
      });
    },
    [key]
  );

  const isFavorite = useCallback((firestoreId: string) => favorites.has(firestoreId), [favorites]);

  return { favorites, toggle, isFavorite, count: favorites.size };
}
