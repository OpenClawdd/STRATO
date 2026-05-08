export const keys = {
  favorites: "strato-favorites",
  recent: "strato-recent",
  playCounts: "strato-playCounts",
  lastPlayed: "strato-lastPlayed",
  preferences: "strato-preferences",
  failures: "strato-recentFailures",
  dismissedHints: "strato-dismissedHints",
};

function safeStorage() {
  return globalThis.localStorage || null;
}

export function readJson(key, fallback) {
  try {
    const storage = safeStorage();
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  safeStorage()?.setItem(key, JSON.stringify(value));
}

export function removeKeys(list) {
  list.forEach((key) => safeStorage()?.removeItem(key));
}

export function preferences() {
  return readJson(keys.preferences, {});
}

export function isHintDismissed(id) {
  return readJson(keys.dismissedHints, []).includes(id);
}

export function dismissHint(id) {
  const hints = readJson(keys.dismissedHints, []);
  if (!hints.includes(id)) writeJson(keys.dismissedHints, [...hints, id]);
}
