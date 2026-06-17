export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function readSessionFlag(key: string): boolean {
  return sessionStorage.getItem(key) === '1';
}

export function setSessionFlag(key: string): void {
  sessionStorage.setItem(key, '1');
}
