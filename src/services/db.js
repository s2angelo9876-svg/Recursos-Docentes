const DB_NAME = "InnovaFilesDB";
const STORE_NAME = "files";
const DB_VERSION = 1;

let dbInstance = null;

const getDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
};

/**
 * Saves a file (Blob or File object) to IndexedDB with a unique ID.
 * @param {string} id - The unique identifier for the file record.
 * @param {File|Blob} file - The file data to store.
 */
export const saveFile = async (id, file) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const record = {
      id: id,
      name: file.name,
      type: file.type,
      size: file.size,
      data: file, // Blobs are directly serializable and supported by IndexedDB in modern browsers
      uploadedAt: new Date().toISOString()
    };

    const request = store.put(record);
    request.onsuccess = () => resolve(id);
    request.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Retrieves a file record from IndexedDB by its ID.
 * @param {string} id - The identifier of the file to retrieve.
 * @returns {Promise<{id: string, name: string, type: string, size: number, data: Blob}>}
 */
export const getFile = async (id) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Deletes a file record from IndexedDB.
 * @param {string} id - The ID of the file to delete.
 */
export const deleteFile = async (id) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
};
