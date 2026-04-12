// Save State Manager for NoRedInk Dashboard

async function exportSave() {
    try {
        const data = {
            localStorage: { ...localStorage },
            indexedDB: {}
        };

        const dbs = await indexedDB.databases();
        for (const dbInfo of dbs) {
            const dbName = dbInfo.name;
            const dbData = await exportDatabase(dbName);
            data.indexedDB[dbName] = dbData;
        }

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `noredink-save-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Export failed:", e);
        alert("Failed to export save data. See console for details.");
    }
}

function importSave(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Clear current storage
            localStorage.clear();
            const dbs = await indexedDB.databases();
            for (const dbInfo of dbs) {
                await new Promise((resolve) => {
                    const req = indexedDB.deleteDatabase(dbInfo.name);
                    req.onsuccess = resolve;
                    req.onerror = resolve;
                });
            }

            // Restore localStorage
            if (data.localStorage) {
                for (const [key, value] of Object.entries(data.localStorage)) {
                    localStorage.setItem(key, value);
                }
            }

            // Restore IndexedDB
            if (data.indexedDB) {
                for (const [dbName, dbContent] of Object.entries(data.indexedDB)) {
                    await importDatabase(dbName, dbContent);
                }
            }

            alert("Save imported successfully! The page will now reload.");
            window.location.reload();
        } catch (err) {
            console.error("Import failed:", err);
            alert("Failed to import save data. Make sure the file is valid.");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

// --- IndexedDB Helpers ---

async function exportDatabase(dbName) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = async (e) => {
            const db = e.target.result;
            const storesData = {
                __version: db.version,
                stores: {}
            };

            const storeNames = Array.from(db.objectStoreNames);
            if (storeNames.length === 0) {
                db.close();
                resolve(storesData);
                return;
            }

            const tx = db.transaction(storeNames, "readonly");
            const promises = [];

            for (const storeName of storeNames) {
                promises.push(new Promise((res, rej) => {
                    const store = tx.objectStore(storeName);
                    const allReq = store.getAll();
                    const keysReq = store.getAllKeys();

                    allReq.onsuccess = async () => {
                        keysReq.onsuccess = async () => {
                            const records = [];
                            for (let i = 0; i < allReq.result.length; i++) {
                                records.push({
                                    key: await serializeValue(keysReq.result[i]),
                                    value: await serializeValue(allReq.result[i])
                                });
                            }
                            storesData.stores[storeName] = {
                                keyPath: store.keyPath,
                                autoIncrement: store.autoIncrement,
                                records: records
                            };
                            res();
                        };
                    };
                }));
            }

            await Promise.all(promises);
            db.close();
            resolve(storesData);
        };
        req.onerror = () => reject(req.error);
    });
}

async function importDatabase(dbName, dbContent) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, dbContent.__version);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            for (const [storeName, storeInfo] of Object.entries(dbContent.stores)) {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, {
                        keyPath: storeInfo.keyPath,
                        autoIncrement: storeInfo.autoIncrement
                    });
                }
            }
        };

        req.onsuccess = async (e) => {
            const db = e.target.result;
            const storeNames = Object.keys(dbContent.stores);
            if (storeNames.length === 0) {
                db.close();
                resolve();
                return;
            }

            const tx = db.transaction(storeNames, "readwrite");
            for (const storeName of storeNames) {
                const store = tx.objectStore(storeName);
                const records = dbContent.stores[storeName].records;
                for (const record of records) {
                    const key = deserializeValue(record.key);
                    const value = deserializeValue(record.value);
                    if (dbContent.stores[storeName].keyPath) {
                        store.put(value);
                    } else {
                        store.put(value, key);
                    }
                }
            }

            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
    });
}

// --- Serialization ---

async function serializeValue(val) {
    if (val === null || typeof val !== 'object') return val;

    if (val instanceof Blob) {
        return {
            __type: "Blob",
            mime: val.type,
            data: await blobToBase64(val)
        };
    }

    if (val instanceof ArrayBuffer) {
        return {
            __type: "ArrayBuffer",
            data: arrayBufferToBase64(val)
        };
    }

    if (Array.isArray(val)) {
        const arr = [];
        for (const item of val) {
            arr.push(await serializeValue(item));
        }
        return arr;
    }

    // Handle plain objects
    const obj = {};
    for (const [k, v] of Object.entries(val)) {
        obj[k] = await serializeValue(v);
    }
    return obj;
}

function deserializeValue(val) {
    if (val === null || typeof val !== 'object') return val;

    if (val.__type === "Blob") {
        return base64ToBlob(val.data, val.mime);
    }

    if (val.__type === "ArrayBuffer") {
        return base64ToArrayBuffer(val.data);
    }

    if (Array.isArray(val)) {
        return val.map(deserializeValue);
    }

    const obj = {};
    for (const [k, v] of Object.entries(val)) {
        obj[k] = deserializeValue(v);
    }
    return obj;
}

// --- Base64 Utilities ---

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // result is like "data:image/png;base64,iVBORw0KGgo..."
            const b64 = reader.result.split(',')[1] || "";
            resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function base64ToBlob(b64, mime) {
    const byteString = atob(b64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(b64) {
    const binary_string = atob(b64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
