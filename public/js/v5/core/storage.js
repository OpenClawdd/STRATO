export const keys = {
  favorites: "strato-favorites",
  recent: "strato-recent",
  playCounts: "strato-playCounts",
  lastPlayed: "strato-lastPlayed",
  preferences: "strato-preferences",
  failures: "strato-recentFailures",
  dismissedHints: "strato-dismissedHints",
};

export const capsuleKeys = [
  keys.favorites,
  keys.recent,
  keys.playCounts,
  keys.lastPlayed,
  keys.preferences,
  keys.failures,
];

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
  try {
    safeStorage()?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKeys(list) {
  list.forEach((key) => {
    try {
      safeStorage()?.removeItem(key);
    } catch {}
  });
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

function stringList(value) {
  if (!Array.isArray(value)) return null;
  return value.filter((item) => typeof item === "string").slice(0, 120);
}

function plainObject(value) {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  return Object.fromEntries(Object.entries(value).slice(0, 500));
}

function numericMap(value) {
  const object = plainObject(value);
  if (!object) return null;
  return Object.fromEntries(
    Object.entries(object)
      .filter(([, item]) => Number.isFinite(Number(item)))
      .map(([key, item]) => [key, Number(item)]),
  );
}

function failureMap(value) {
  const object = plainObject(value);
  if (!object) return null;
  return Object.fromEntries(
    Object.entries(object).filter(([, item]) => {
      if (!item || typeof item !== "object" || Array.isArray(item))
        return false;
      return Number.isFinite(Number(item.timestamp));
    }),
  );
}

export function exportCapsule() {
  return {
    schema: "strato-save-capsule/v1",
    exportedAt: new Date().toISOString(),
    data: Object.fromEntries(
      capsuleKeys.map((key) => [key, readJson(key, null)]),
    ),
  };
}

export function validateCapsule(input) {
  const source =
    input?.schema === "strato-save-capsule/v1" && input?.data
      ? input.data
      : input;
  if (!source || Array.isArray(source) || typeof source !== "object") {
    return { ok: false, reason: "Capsule must be a JSON object." };
  }

  const normalized = {};
  const validators = {
    [keys.favorites]: stringList,
    [keys.recent]: stringList,
    [keys.playCounts]: numericMap,
    [keys.lastPlayed]: numericMap,
    [keys.preferences]: plainObject,
    [keys.failures]: failureMap,
  };

  for (const [key, validator] of Object.entries(validators)) {
    if (!(key in source)) continue;
    const value = validator(source[key]);
    if (value === null) {
      return { ok: false, reason: `Invalid ${key} value.` };
    }
    normalized[key] = value;
  }

  if (!Object.keys(normalized).length) {
    return { ok: false, reason: "No STRATO capsule keys found." };
  }

  return { ok: true, data: normalized };
}

export function importCapsule(input) {
  const result = validateCapsule(input);
  if (!result.ok) return result;
  for (const [key, value] of Object.entries(result.data)) {
    writeJson(key, value);
  }
  return result;
}
