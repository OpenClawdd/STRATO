export const keys = {
  favorites: 'strato-favorites',
  recent: 'strato-recent',
  playCounts: 'strato-playCounts',
  lastPlayed: 'strato-lastPlayed',
  preferences: 'strato-preferences',
  failures: 'strato-recentFailures',
};

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeKeys(list) {
  list.forEach((key) => localStorage.removeItem(key));
}

export function preferences() {
  return readJson(keys.preferences, {});
}
