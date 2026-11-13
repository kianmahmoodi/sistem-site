import { useSyncExternalStore } from 'react';

const KEY = 'bh-favorites';

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

let cache: number[] = read();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore storage errors */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleFavorite(id: number) {
  cache = cache.includes(id) ? cache.filter((value) => value !== id) : [...cache, id];
  emit();
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, () => cache, () => cache);
  return {
    ids,
    isFavorite: (id: number) => ids.includes(id),
    toggle: toggleFavorite,
  };
}
