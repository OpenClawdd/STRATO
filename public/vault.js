// vault.js — StratoVault IndexedDB Manager
// Provides window.vaultManager with CRUD operations for smuggled game blobs.

const DB_NAME = "stratovault";
const DB_VERSION = 1;
const STORE_NAME = "games";

function openDB() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = (e) => {
			const db = e.target.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "id" });
			}
		};
		req.onsuccess = (e) => resolve(e.target.result);
		req.onerror = () => reject(req.error);
	});
}

window.vaultManager = {
	async getAllGames() {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const store = tx.objectStore(STORE_NAME);
			const req = store.getAll();
			req.onsuccess = () => {
				db.close();
				resolve(req.result.map((g) => ({ id: g.id, name: g.name })));
			};
			req.onerror = () => {
				db.close();
				reject(req.error);
			};
		});
	},

	async saveGame(id, name, blob) {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			store.put({ id, name, blob });
			tx.oncomplete = () => {
				db.close();
				resolve();
			};
			tx.onerror = () => {
				db.close();
				reject(tx.error);
			};
		});
	},

	async getGameBlob(id) {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readonly");
			const store = tx.objectStore(STORE_NAME);
			const req = store.get(id);
			req.onsuccess = () => {
				db.close();
				resolve(req.result ? req.result.blob : null);
			};
			req.onerror = () => {
				db.close();
				reject(req.error);
			};
		});
	},

	async deleteGame(id) {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			store.delete(id);
			tx.oncomplete = () => {
				db.close();
				resolve();
			};
			tx.onerror = () => {
				db.close();
				reject(tx.error);
			};
		});
	},
};
