// Simple IndexedDB wrapper
const dbName = 'groceries-db';
const storeName = 'products';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = function (e) {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'OBJECTID' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function saveProducts(products) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.clear();
            products.forEach(product => store.put(product));
            tx.oncomplete = resolve;
            tx.onerror = reject;
        });
    });
}

export function getAllProducts() {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = reject;
        });
    });
}

// CSV parsing (simple, assumes no quoted commas)
export function parseCSV(text) {
    const [headerLine, ...lines] = text.trim().split('\n');
    const headers = headerLine.split(',').map(h => h.trim());
    return lines.map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
    });
}

