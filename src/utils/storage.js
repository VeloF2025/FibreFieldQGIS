// IndexedDB wrapper for offline storage
const DB_NAME = 'PolePlantingDB';
const DB_VERSION = 1;
const STORE_NAME = 'poleCaptures';

let db = null;

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('poleNumber', 'data.poleNumber', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('projectId', 'projectId', { unique: false });
      }
    };
  });
};

// Save pole data to IndexedDB
export const saveToIndexedDB = async (poleData) => {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(poleData);
    
    request.onsuccess = () => {
      // Also update localStorage for quick access
      updateLocalStorage(poleData);
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
};

// Get pole data from IndexedDB
export const getFromIndexedDB = async (id) => {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Search poles by pole number
export const searchPoles = async (searchTerm) => {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const results = request.result.filter(pole => 
        pole.data.poleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

// Get all incomplete poles
export const getIncompletePoles = async () => {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll('incomplete');
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Update localStorage for quick access
const updateLocalStorage = (poleData) => {
  if (poleData.status === 'incomplete') {
    const incomplete = JSON.parse(localStorage.getItem('incompletePoles') || '[]');
    const index = incomplete.findIndex(p => p.id === poleData.id);
    
    if (index >= 0) {
      incomplete[index] = poleData;
    } else {
      incomplete.push(poleData);
    }
    
    localStorage.setItem('incompletePoles', JSON.stringify(incomplete));
  }
};

// Delete pole data
export const deletePoleData = async (id) => {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      // Remove from localStorage too
      const incomplete = JSON.parse(localStorage.getItem('incompletePoles') || '[]');
      const filtered = incomplete.filter(p => p.id !== id);
      localStorage.setItem('incompletePoles', JSON.stringify(filtered));
      
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};