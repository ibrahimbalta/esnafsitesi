// ==============================================================================
// KOLAYWEBCI ENTERPRISE STORAGE VAULT
// Multi-Layer Persistent Storage Engine:
// Layer 1: IndexedDB (Gigabyte-scale, non-evictable durable storage)
// Layer 2: LocalStorage Mirror & Automated Daily Snapshots
// Layer 3: Cloud Database (Supabase REST / Vercel API with direct credentials support)
// Zero Data Loss: Local data is NEVER erased by blank remote responses.
// ==============================================================================

const DB_NAME = 'KolayWebciVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'vault';
const API_URL = '/api/api';

const KNOWN_KEYS = [
  'applications',
  'customers',
  'firmsGrid',
  'kanbanColumns',
  'reviews',
  'sitePortfolio',
  'dailyPromo',
  'agenda',
  'siteSettings',
  'supabaseConfig'
];

// --- 1. IndexedDB Core Engine ---
let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not supported in this browser, falling back to LocalStorage.');
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots');
        }
      };

      request.onsuccess = (e) => {
        resolve(e.target.result);
      };

      request.onerror = (e) => {
        console.error('IndexedDB open error:', e.target.error);
        resolve(null);
      };
    } catch (err) {
      console.error('IndexedDB initialization exception:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

// Request persistent storage from browser so Chrome/Safari never evicts data
export async function requestStoragePersistence() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`[StorageVault] Browser storage persistence granted: ${isPersisted}`);
      return isPersisted;
    } catch (err) {
      console.warn('[StorageVault] Error requesting persistence:', err);
    }
  }
  return false;
}

export async function isStoragePersisted() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

// Low-level IDB Get
async function idbGet(key) {
  const db = await getDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => resolve(null);
    } catch (err) {
      console.warn(`[StorageVault] IDB get error for ${key}:`, err);
      resolve(null);
    }
  });
}

// Low-level IDB Set
async function idbSet(key, value) {
  const db = await getDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch (err) {
      console.warn(`[StorageVault] IDB set error for ${key}:`, err);
      resolve(false);
    }
  });
}

// --- 2. Direct Supabase Cloud Integration ---
function getSupabaseConfig() {
  try {
    const raw = localStorage.getItem('supabaseConfig');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

async function fetchFromDirectSupabase(key) {
  const config = getSupabaseConfig();
  if (!config || !config.url || !config.key) return null;

  try {
    let cleanUrl = config.url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/store?key=eq.${encodeURIComponent(key)}&select=value`, {
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0].value;
      }
    }
  } catch (err) {
    console.warn(`[StorageVault] Direct Supabase fetch error for "${key}":`, err);
  }
  return null;
}

async function saveToDirectSupabase(key, value) {
  const config = getSupabaseConfig();
  if (!config || !config.url || !config.key) return false;

  try {
    let cleanUrl = config.url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/store`, {
      method: 'POST',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ key, value })
    });

    return res.ok;
  } catch (err) {
    console.warn(`[StorageVault] Direct Supabase save error for "${key}":`, err);
    return false;
  }
}

// --- 3. Smart Multi-Layer Data Fetcher (Zero-Loss) ---
export async function fetchFromStore(key, defaultValue) {
  // 1. Session Cache (Fast 30-sec buffer for frontend browsing)
  const cacheKey = `cache_${key}`;
  const cacheTimeKey = `cache_time_${key}`;
  try {
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(cacheTimeKey);
    if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime) < 30 * 1000)) {
      return JSON.parse(cachedData);
    }
  } catch {}

  let remoteData = null;
  let remoteSuccess = false;

  // 2. Try Direct Supabase if configured in Admin
  try {
    const sbData = await fetchFromDirectSupabase(key);
    if (sbData !== null && sbData !== undefined) {
      remoteData = sbData;
      remoteSuccess = true;
    }
  } catch {}

  // 3. Try /api/api (Vercel Serverless Function)
  if (!remoteSuccess) {
    try {
      const res = await fetch(`${API_URL}?key=${encodeURIComponent(key)}`);
      if (res.ok) {
        const json = await res.json();
        if (json !== null && json !== undefined) {
          remoteData = json;
          remoteSuccess = true;
        }
      }
    } catch {}
  }

  // 4. Fetch Local Data from IndexedDB and LocalStorage
  let idbData = null;
  try {
    idbData = await idbGet(key);
  } catch {}

  let localData = null;
  try {
    const rawLocal = localStorage.getItem(key);
    if (rawLocal) localData = JSON.parse(rawLocal);
  } catch {}

  // CRITICAL ZERO-LOSS PROTECTION:
  // If remote returned null or empty, BUT local storage has real data, PREFER LOCAL DATA!
  // This prevents blank database / paused server from wiping out user records.
  const bestLocal = idbData !== null ? idbData : localData;

  let finalResult = defaultValue;

  if (remoteSuccess && remoteData !== null) {
    // If remote is empty array/object but local has items, don't overwrite blindly
    const remoteIsEmpty = (Array.isArray(remoteData) && remoteData.length === 0) ||
                          (typeof remoteData === 'object' && remoteData !== null && Object.keys(remoteData).length === 0);
    const localHasItems = bestLocal && (
      (Array.isArray(bestLocal) && bestLocal.length > 0) ||
      (typeof bestLocal === 'object' && Object.keys(bestLocal).length > 0)
    );

    if (remoteIsEmpty && localHasItems) {
      console.warn(`[StorageVault] Remote returned empty for "${key}" but local has data. Preserving local data.`);
      finalResult = bestLocal;
      // Re-sync local data back up to cloud in background
      saveToStore(key, bestLocal).catch(() => {});
    } else {
      finalResult = remoteData;
      // Mirror remote data to local storage & IDB
      idbSet(key, remoteData).catch(() => {});
      try { localStorage.setItem(key, JSON.stringify(remoteData)); } catch {}
    }
  } else if (bestLocal !== null && bestLocal !== undefined) {
    finalResult = bestLocal;
    // Mirror to IDB if only in localStorage
    if (idbData === null && localData !== null) {
      idbSet(key, localData).catch(() => {});
    }
  }

  // Update session cache
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(finalResult));
    sessionStorage.setItem(cacheTimeKey, Date.now().toString());
  } catch {}

  return finalResult;
}

// --- 4. Smart Multi-Layer Data Saver ---
export async function saveToStore(key, value) {
  // Invalidate session cache immediately
  try {
    sessionStorage.removeItem(`cache_${key}`);
    sessionStorage.removeItem(`cache_time_${key}`);
  } catch {}

  // 1. Save to IndexedDB (Durable, large capacity)
  await idbSet(key, value);

  // 2. Mirror to LocalStorage (Fast synchronous read fallback)
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[StorageVault] LocalStorage quota warning for "${key}":`, err);
  }

  // 3. Trigger Automatic Daily Snapshot in background
  createAutoSnapshotDebounced();

  // 4. Save to Direct Supabase if configured
  saveToDirectSupabase(key, value).catch(() => {});

  // 5. Save to /api/api (Vercel Serverless)
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': '6032.,Elif.'
      },
      body: JSON.stringify({ key, value })
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn(`[StorageVault] Cloud API POST failed for "${key}":`, err);
  }

  return true; // Returns true because locally saved in persistent IDB
}

// --- 5. Automatic Snapshot System ---
let snapshotTimeout = null;
function createAutoSnapshotDebounced() {
  if (snapshotTimeout) clearTimeout(snapshotTimeout);
  snapshotTimeout = setTimeout(() => {
    createDailySnapshot().catch(() => {});
  }, 2000);
}

export async function createDailySnapshot() {
  const db = await getDB();
  if (!db) return;

  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const snapshotId = `snapshot_${dateKey}`;

  // Gather current state of all known keys
  const snapshotData = {};
  for (const k of KNOWN_KEYS) {
    const val = await idbGet(k);
    if (val !== null) snapshotData[k] = val;
  }

  const payload = {
    date: dateKey,
    timestamp: Date.now(),
    readableDate: now.toLocaleString('tr-TR'),
    data: snapshotData
  };

  try {
    const tx = db.transaction('snapshots', 'readwrite');
    const store = tx.objectStore('snapshots');
    store.put(payload, snapshotId);
  } catch (err) {
    console.warn('[StorageVault] Failed to save IDB snapshot:', err);
  }

  // Also keep lightweight copy of last snapshot in localStorage
  try {
    localStorage.setItem('kolaywebci_latest_snapshot_date', now.toLocaleString('tr-TR'));
  } catch {}
}

export async function getSavedSnapshots() {
  const db = await getDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('snapshots', 'readonly');
      const store = tx.objectStore('snapshots');
      const req = store.openCursor();
      const snapshots = [];

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          snapshots.push({
            id: cursor.key,
            ...cursor.value
          });
          cursor.continue();
        } else {
          snapshots.sort((a, b) => b.timestamp - a.timestamp);
          resolve(snapshots.slice(0, 10)); // return last 10 snapshots
        }
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function restoreSnapshotById(snapshotId) {
  const db = await getDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('snapshots', 'readonly');
      const store = tx.objectStore('snapshots');
      const req = store.get(snapshotId);

      req.onsuccess = async () => {
        const item = req.result;
        if (item && item.data) {
          for (const [key, value] of Object.entries(item.data)) {
            await saveToStore(key, value);
          }
          resolve(true);
        } else {
          resolve(false);
        }
      };
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// --- 6. Complete JSON Export & Import (One-Click Backup) ---
export async function exportAllDataAsJSON() {
  const exportPackage = {
    appName: 'KolayWebci Enterprise',
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    exportDateReadable: new Date().toLocaleString('tr-TR'),
    tables: {}
  };

  for (const k of KNOWN_KEYS) {
    const val = await fetchFromStore(k, null);
    if (val !== null) {
      exportPackage.tables[k] = val;
    }
  }

  return exportPackage;
}

export async function downloadBackupFile() {
  const data = await exportAllDataAsJSON();
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '-');
  const filename = `kolaywebci-tam-yedek-${dateStr}_${timeStr}.json`;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

export async function restoreFromBackupJSON(jsonContent) {
  let parsed;
  if (typeof jsonContent === 'string') {
    parsed = JSON.parse(jsonContent);
  } else {
    parsed = jsonContent;
  }

  const tables = parsed.tables || parsed;
  let restoredCount = 0;

  for (const [key, value] of Object.entries(tables)) {
    if (KNOWN_KEYS.includes(key)) {
      await saveToStore(key, value);
      restoredCount++;
    }
  }

  return { success: true, count: restoredCount };
}
