import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  set,
  remove,
  get
} from 'firebase/database';

// ─── Firebase Config ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCQk69XobQEG_iLSuhRytpFjCSL59nT3JA",
  authDomain: "sales-crm-ls-et.firebaseapp.com",
  databaseURL: "https://sales-crm-ls-et-default-rtdb.firebaseio.com",
  projectId: "sales-crm-ls-et",
  storageBucket: "sales-crm-ls-et.firebasestorage.app",
  messagingSenderId: "1080098360752",
  appId: "1:1080098360752:web:8777b89e62302ee10d9a75",
  measurementId: "G-2Y6GKDGGJ7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const rtdb = getDatabase(app);

// ─── Helper: Convert Firebase snapshot to sorted array ───────────
function snapshotToArray(snapshot) {
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data)
    .map(key => ({ id: key, ...data[key] }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

// ─── Deduplication (kept for backward compat with App.jsx import) ─
export function deduplicateBookings(list) {
  const map = new Map();
  (list || []).forEach(item => {
    if (!item || !item.id) return;
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values())
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

// ─── Get bookings (one-time read from cloud) ─────────────────────
export const getLocalBookings = async () => {
  try {
    const snapshot = await get(ref(rtdb, 'bookings'));
    return snapshotToArray(snapshot);
  } catch (e) {
    console.error('Failed to read bookings from cloud:', e);
    return [];
  }
};

// ─── Subscribe: Real-time listener (THE core sync mechanism) ─────
export const subscribeBookings = (callback) => {
  const bookingsRef = ref(rtdb, 'bookings');

  const unsubscribe = onValue(bookingsRef, (snapshot) => {
    const bookings = snapshotToArray(snapshot);
    console.log(`[Firebase Sync] Received ${bookings.length} bookings from cloud`);
    callback(bookings);
  }, (error) => {
    console.error('[Firebase Sync] Listener error:', error);
  });

  return unsubscribe;
};

// ─── Save Booking ────────────────────────────────────────────────
export const saveBooking = async (bookingData) => {
  const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const payload = {
    id: bookingId,
    ...bookingData,
    createdAt: new Date().toISOString(),
  };

  try {
    await set(ref(rtdb, `bookings/${bookingId}`), payload);
    console.log(`[Firebase] Saved booking ${bookingId}`);
  } catch (e) {
    console.error('[Firebase] Save failed:', e);
    throw e; // Let the UI know it failed
  }

  return payload;
};

// ─── Update Booking ──────────────────────────────────────────────
export const updateBooking = async (bookingId, bookingData) => {
  try {
    // Read current data first to merge
    const snapshot = await get(ref(rtdb, `bookings/${bookingId}`));
    const existing = snapshot.exists() ? snapshot.val() : {};

    const updated = {
      ...existing,
      ...bookingData,
      id: bookingId,
      updatedAt: new Date().toISOString(),
    };

    await set(ref(rtdb, `bookings/${bookingId}`), updated);
    console.log(`[Firebase] Updated booking ${bookingId}`);
  } catch (e) {
    console.error('[Firebase] Update failed:', e);
    throw e;
  }
};

// ─── Delete Booking ──────────────────────────────────────────────
export const deleteBooking = async (bookingId) => {
  try {
    await remove(ref(rtdb, `bookings/${bookingId}`));
    console.log(`[Firebase] Deleted booking ${bookingId}`);
  } catch (e) {
    console.error('[Firebase] Delete failed:', e);
    throw e;
  }
};

// ─── Reset All Bookings ──────────────────────────────────────────
export const resetAllBookings = async () => {
  try {
    await remove(ref(rtdb, 'bookings'));
    await remove(ref(rtdb, 'deleted_ids'));
    console.log('[Firebase] All bookings reset');
  } catch (e) {
    console.error('[Firebase] Reset failed:', e);
    throw e;
  }
};

export { rtdb };
