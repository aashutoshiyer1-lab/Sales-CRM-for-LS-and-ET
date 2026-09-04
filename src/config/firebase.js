import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import {
  getDatabase,
  ref,
  onValue,
  set,
  remove
} from 'firebase/database';

const DATABASE_SECRET = import.meta.env?.VITE_FIREBASE_DATABASE_SECRET || "E2SrlM2bYz92vUJFYNGlqA2UH02On4Nckcj5pY2j";
const DATABASE_URL = import.meta.env?.VITE_FIREBASE_DATABASE_URL || "https://sales-crm-ls-et-default-rtdb.firebaseio.com";

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyCQk69XobQEG_iLSuhRytpFjCSL59nT3JA",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "sales-crm-ls-et.firebaseapp.com",
  databaseURL: DATABASE_URL,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "sales-crm-ls-et",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "sales-crm-ls-et.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "1080098360752",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:1080098360752:web:8777b89e62302ee10d9a75",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-2Y6GKDGGJ7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const rtdb = getDatabase(app);

const LOCAL_STORAGE_KEY = 'sales_crm_bookings_v7';
const DELETED_IDS_KEY = 'sales_crm_deleted_ids_v2';

export const getDeletedIds = () => {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
};

export const saveDeletedIdLocally = (id) => {
  try {
    const deleted = getDeletedIds();
    deleted.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(deleted)));
  } catch (e) {}
};

export const mergeDeletedIds = (idsFromCloud = []) => {
  try {
    const deleted = getDeletedIds();
    (idsFromCloud || []).forEach(id => deleted.add(id));
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(deleted)));
    return deleted;
  } catch (e) {
    return getDeletedIds();
  }
};

/**
 * Deduplicate bookings list by ID or unique booking content fingerprint
 */
export function deduplicateBookings(list) {
  const deletedSet = getDeletedIds();
  const map = new Map();
  (list || []).forEach(item => {
    if (!item || !item.id) return;
    
    // Exclude permanently deleted items
    if (deletedSet.has(item.id)) return;

    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  
  return Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export const getLocalBookings = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return deduplicateBookings(JSON.parse(raw));
  } catch (e) {
    return [];
  }
};

export const saveLocalBookings = (list) => {
  try {
    const cleanList = deduplicateBookings(list);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanList));
    return cleanList;
  } catch (e) {
    console.error('LocalStorage write error', e);
    return list;
  }
};

/**
 * Fetch latest bookings using Firebase REST API with Database Secret fallback
 */
async function fetchBookingsViaREST() {
  try {
    let res = await fetch(`${DATABASE_URL}/bookings.json`);
    if (!res.ok) {
      res = await fetch(`${DATABASE_URL}/bookings.json?auth=${DATABASE_SECRET}`);
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.error) return null;
    if (!data) return [];
    
    const list = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));

    return deduplicateBookings(list);
  } catch (err) {
    return null;
  }
}

/**
 * Auto-sync local storage bookings to Firebase Cloud if Cloud is missing any items
 */
export async function syncLocalBookingsToCloud(cloudList = []) {
  const localList = getLocalBookings();
  if (!localList || localList.length === 0) return;

  const deletedSet = getDeletedIds();
  const cloudIdSet = new Set((cloudList || []).map(b => b.id));
  const missingInCloud = localList.filter(b => b && b.id && !cloudIdSet.has(b.id) && !deletedSet.has(b.id));

  if (missingInCloud.length > 0) {
    for (const item of missingInCloud) {
      try {
        const itemPayload = { ...item, id: item.id };
        const bookingsRtdbRef = ref(rtdb, `bookings/${item.id}`);
        await set(bookingsRtdbRef, itemPayload);
        await fetch(`${DATABASE_URL}/bookings/${item.id}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemPayload)
        });
      } catch (e) {
        console.error('Error syncing local item to cloud:', e);
      }
    }
  }
}

/**
 * Subscribe to Realtime Data
 */
export const subscribeBookings = (callback) => {
  const emitMerged = (cloudList) => {
    const local = getLocalBookings();
    const merged = deduplicateBookings([...(cloudList || []), ...local]);
    saveLocalBookings(merged);
    callback(merged);
  };

  // 1. Initial emit from LocalStorage for instant load
  callback(getLocalBookings());

  const runFetchSync = () => {
    fetchBookingsViaREST().then((cloudList) => {
      if (cloudList !== null) {
        syncLocalBookingsToCloud(cloudList);
        emitMerged(cloudList);
      }
    });
  };

  // 2. Immediate REST fetch
  runFetchSync();

  // 3. 3-Second Periodic HTTPS Polling Fallback (Guarantees sync across all systems even if WebSockets are blocked by adblockers/firewalls)
  const pollInterval = setInterval(runFetchSync, 3000);

  // 4. WebSocket Realtime DB Listener
  try {
    const bookingsRtdbRef = ref(rtdb, 'bookings');
    onValue(bookingsRtdbRef, (snapshot) => {
      let cloudList = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        cloudList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
      }
      syncLocalBookingsToCloud(cloudList);
      emitMerged(cloudList);
    });
  } catch (e) {}

  // 5. Listen to deleted_ids in Firebase
  try {
    const deletedRtdbRef = ref(rtdb, 'deleted_ids');
    onValue(deletedRtdbRef, (snapshot) => {
      if (snapshot.exists()) {
        const cloudDeletedIds = Object.keys(snapshot.val());
        mergeDeletedIds(cloudDeletedIds);
        saveLocalBookings(getLocalBookings());
        callback(getLocalBookings());
      }
    });
  } catch (e) {}

  const handleStorage = () => {
    callback(getLocalBookings());
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    clearInterval(pollInterval);
    window.removeEventListener('storage', handleStorage);
  };
};

/**
 * Save Booking - Single ID everywhere, zero duplication!
 */
export const saveBooking = (bookingData) => {
  const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const payload = {
    id: bookingId,
    ...bookingData,
    createdAt: new Date().toISOString(),
  };

  const newBooking = payload;

  // 1. Save to Local Storage with deduplication
  const localList = getLocalBookings();
  const updatedList = deduplicateBookings([newBooking, ...localList]);
  saveLocalBookings(updatedList);
  window.dispatchEvent(new Event('storage'));

  // 2. Immediate Web SDK write to Realtime DB
  (async () => {
    try {
      const bookingsRtdbRef = ref(rtdb, `bookings/${bookingId}`);
      await set(bookingsRtdbRef, payload);
    } catch (e) {
      console.error('RTDB SDK Write Error:', e);
    }
  })();

  // 3. Cloud REST API PUT with single bookingId
  (async () => {
    try {
      await fetch(`${DATABASE_URL}/bookings/${bookingId}.json?auth=${DATABASE_SECRET}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error('REST PUT Error:', e);
    }
  })();

  // 4. Firestore sync using EXACT SAME doc ID
  (async () => {
    try {
      const docRef = doc(db, 'bookings', bookingId);
      await setDoc(docRef, payload);
    } catch (e) {}
  })();

  return newBooking;
};

/**
 * Update Booking
 */
export const updateBooking = (bookingId, bookingData) => {
  const localList = getLocalBookings().map((b) =>
    b.id === bookingId ? { ...b, ...bookingData, updatedAt: new Date().toISOString() } : b
  );
  const cleanList = deduplicateBookings(localList);
  saveLocalBookings(cleanList);
  window.dispatchEvent(new Event('storage'));

  (async () => {
    try {
      await fetch(`${DATABASE_URL}/bookings/${bookingId}.json?auth=${DATABASE_SECRET}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookingData, updatedAt: new Date().toISOString() })
      });
    } catch (e) {}
  })();

  (async () => {
    try {
      const bookingRtdbRef = ref(rtdb, `bookings/${bookingId}`);
      await set(bookingRtdbRef, {
        ...bookingData,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {}
  })();

  (async () => {
    try {
      const docRef = doc(db, 'bookings', bookingId);
      await setDoc(docRef, {
        ...bookingData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {}
  })();
};

/**
 * Delete Booking
 */
export const deleteBooking = (bookingId) => {
  saveDeletedIdLocally(bookingId);
  const localList = getLocalBookings().filter((b) => b.id !== bookingId);
  saveLocalBookings(localList);
  window.dispatchEvent(new Event('storage'));

  (async () => {
    try {
      await fetch(`${DATABASE_URL}/bookings/${bookingId}.json?auth=${DATABASE_SECRET}`, {
        method: 'DELETE'
      });
      await fetch(`${DATABASE_URL}/deleted_ids/${bookingId}.json?auth=${DATABASE_SECRET}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(true)
      });
    } catch (e) {}
  })();

  (async () => {
    try {
      const bookingRtdbRef = ref(rtdb, `bookings/${bookingId}`);
      await remove(bookingRtdbRef);
      const deletedRef = ref(rtdb, `deleted_ids/${bookingId}`);
      await set(deletedRef, true);
    } catch (e) {}
  })();

  (async () => {
    try {
      const docRef = doc(db, 'bookings', bookingId);
      await deleteDoc(docRef);
    } catch (e) {}
  })();
};

/**
 * Reset All Bookings
 */
export const resetAllBookings = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  localStorage.removeItem(DELETED_IDS_KEY);
  window.dispatchEvent(new Event('storage'));

  (async () => {
    try {
      await fetch(`${DATABASE_URL}/bookings.json?auth=${DATABASE_SECRET}`, {
        method: 'DELETE'
      });
      await fetch(`${DATABASE_URL}/deleted_ids.json?auth=${DATABASE_SECRET}`, {
        method: 'DELETE'
      });
    } catch (e) {}
  })();

  (async () => {
    try {
      const bookingsRtdbRef = ref(rtdb, 'bookings');
      await remove(bookingsRtdbRef);
      const deletedRtdbRef = ref(rtdb, 'deleted_ids');
      await remove(deletedRtdbRef);
    } catch (e) {}
  })();

  (async () => {
    try {
      const bookingsRef = collection(db, 'bookings');
      const snapshot = await getDocs(bookingsRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {}
  })();
};

export { db, rtdb };
