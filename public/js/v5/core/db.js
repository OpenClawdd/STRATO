import { openDB } from "idb";

const DB_NAME = "strato-v2";
const DB_VERSION = 1;
let dbPromise;

export function open() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("games")) {
          db.createObjectStore("games", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("surfaces")) {
          db.createObjectStore("surfaces", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getAll(store) {
  return (await open()).getAll(store);
}

export async function putAll(store, items) {
  const db = await open();
  const tx = db.transaction(store, "readwrite");
  await Promise.all(items.map((item) => tx.store.put(item)));
  await tx.done;
}

export async function getMeta(key) {
  return (await open()).get("meta", key);
}

export async function setMeta(key, value) {
  return (await open()).put("meta", { key, value, updatedAt: Date.now() });
}
