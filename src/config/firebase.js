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

/**
 * Deduplicate bookings list by ID or unique booking content fingerprint
 */
export function deduplicateBookings(list) {
  const map = new Map();
  (list || []).forEach(item => {
    if (!item) return;
    // Primary key: id. Fallback key: content fingerprint
    const key = item.id || `${item.customerName}_${item.phone}_${item.date}_${item.timeSlot}_${item.venue}`;
    
    // Also check if an identical booking content exists with a different ID
    const contentFingerprint = `${(item.customerName || '').toLowerCase().trim()}_${(item.phone || '').trim()}_${item.date}_${item.timeSlot}_${item.venue}`;
    
    let isDuplicateContent = false;
    for (let existing of map.values()) {
      const existingFingerprint = `${(existing.customerName || '').toLowerCase().trim()}_${(existing.phone || '').trim()}_${existing.date}_${existing.timeSlot}_${existing.venue}`;
      if (existingFingerprint === contentFingerprint) {
        isDuplicateContent = true;
        break;
      }
    }

    if (!map.has(key) && !isDuplicateContent) {
      map.set(key, item);
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
 * Fetch latest bookings using Firebase REST API with Database Secret
 */
async function fetchBookingsViaREST() {
  try {
    const res = await fetch(`${DATABASE_URL}/bookings.json?auth=${DATABASE_SECRET}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    
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
 * Subscribe to Realtime Data
 */
export const subscribeBookings = (callback) => {
  const emitMerged = (cloudList) => {
    const local = getLocalBookings();
    const merged = deduplicateBookings([...(cloudList || []), ...local]);
    saveLocalBookings(merged);
    callback(merged);
  };

  // Always emit initial local deduplicated bookings immediately for instant load
  callback(getLocalBookings());

  // Fetch from Firebase REST API
  fetchBookingsViaREST().then((cloudList) => {
    if (cloudList !== null) {
      emitMerged(cloudList);
    }
  });

  // Listen to Firebase Realtime DB for instant real-time sync across multiple devices
  try {
    const bookingsRtdbRef = ref(rtdb, 'bookings');
    onValue(bookingsRtdbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const cloudList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        emitMerged(cloudList);
      }
    });
  } catch (e) {}

  const handleStorage = () => {
    callback(getLocalBookings());
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('storage', handleStorage);
  };
};

/**
 * Save Booking - Single ID everywhere, zero duplication!
 */
export const saveBooking = (bookingData) => {
  const payload = {
    ...bookingData,
    createdAt: new Date().toISOString(),
  };

  const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const newBooking = {
    id: bookingId,
    ...payload,
  };

  // 1. Save to Local Storage with deduplication
  const localList = getLocalBookings();
  const updatedList = deduplicateBookings([newBooking, ...localList]);
  saveLocalBookings(updatedList);
  window.dispatchEvent(new Event('storage'));

  // 2. Cloud REST API PUT with single bookingId
  (async () => {
    try {
      await fetch(`${DATABASE_URL}/bookings/${bookingId}.json?auth=${DATABASE_SECRET}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  })();

  // 3. Web SDK sync with single bookingId
  (async () => {
    try {
      const bookingsRtdbRef = ref(rtdb, `bookings/${bookingId}`);
      await set(bookingsRtdbRef, payload);
    } catch (e) {}
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
  const localList = getLocalBookings().filter((b) => b.id !== bookingId);
  saveLocalBookings(localList);
  window.dispatchEvent(new Event('storage'));

  (async () => {
    try {
      await fetch(`${DATABASE_URL}/bookings/${bookingId}.json?auth=${DATABASE_SECRET}`, {
        method: 'DELETE'
      });
    } catch (e) {}
  })();

  (async () => {
    try {
      const bookingRtdbRef = ref(rtdb, `bookings/${bookingId}`);
      await remove(bookingRtdbRef);
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
  saveLocalBookings([]);
  window.dispatchEvent(new Event('storage'));

  (async () => {
    try {
      await fetch(`${DATABASE_URL}/bookings.json?auth=${DATABASE_SECRET}`, {
        method: 'DELETE'
      });
    } catch (e) {}
  })();

  (async () => {
    try {
      const bookingsRtdbRef = ref(rtdb, 'bookings');
      await remove(bookingsRtdbRef);
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
