import { useState, useCallback } from 'react';
import type { Exercise } from '../types';
import { readJSON, writeJSON } from '../lib/storage';

const HISTORY_KEY = 'dmx_search_history';
const RECENTS_KEY = 'dmx_recent_exercises';
const MAX_HISTORY = 8;
const MAX_RECENTS = 6;

export interface RecentExercise {
  firestoreId: string;
  name: string;
  id: string | number;
  ts: number;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => readJSON(HISTORY_KEY, []));
  const [recents, setRecents] = useState<RecentExercise[]>(() => readJSON(RECENTS_KEY, []));

  const addSearch = useCallback((term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    setHistory((prev) => {
      const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_HISTORY);
      writeJSON(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const addRecent = useCallback((ex: Exercise) => {
    setRecents((prev) => {
      const item: RecentExercise = {
        firestoreId: ex.firestoreId,
        name: ex.name,
        id: ex.id,
        ts: Date.now(),
      };
      const next = [item, ...prev.filter((r) => r.firestoreId !== ex.firestoreId)].slice(0, MAX_RECENTS);
      writeJSON(RECENTS_KEY, next);
      return next;
    });
  }, []);

  const removeHistoryItem = useCallback((term: string) => {
    setHistory((prev) => {
      const next = prev.filter((x) => x !== term);
      writeJSON(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    writeJSON(HISTORY_KEY, []);
  }, []);

  return { history, recents, addSearch, addRecent, removeHistoryItem, clearHistory };
}
