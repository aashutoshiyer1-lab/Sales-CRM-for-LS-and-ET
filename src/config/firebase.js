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
const DATABASE_URL = "https://sales-crm-ls-et-default-rtdb.firebaseio.com";

const firebaseConfig = {
  apiKey: "AIzaSyCQk69XobQEG_iLSuhRytpFjCSL59nT3JA",
  authDomain: "sales-crm-ls-et.firebaseapp.com",
  databaseURL: DATABASE_URL,
  projectId: "sales-crm-ls-et",
  storageBucket: "sales-crm-ls-et.firebasestorage.app",
  messagingSenderId: "1080098360752",
  appId: "1:1080098360752:web:8777b89e62302ee10d9a75",
  measurementId: "G-2Y6GKDGGJ7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const rtdb = getDatabase(app);

// ─── REST API helpers (bulletproof fallback) ─────────────────────
async function restPut(path, data) {
  const res = await fetch(`${DATABASE_URL}/${path}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`REST PUT failed: ${res.status}`);
  return res.json();
}

async function restDelete(path) {
  const res = await fetch(`${DATABASE_URL}/${path}.json`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`REST DELETE failed: ${res.status}`);
}

async function restGet(path) {
  const res = await fetch(`${DATABASE_URL}/${path}.json`);
  if (!res.ok) throw new Error(`REST GET failed: ${res.status}`);
  return res.json();
}

// ─── Helper: Convert data object to sorted array ─────────────────
function dataToArray(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.keys(data)
    .map(key => ({ id: key, ...data[key] }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

// ─── Deduplication (kept for backward compat) ────────────────────
export function deduplicateBookings(list) {
  const map = new Map();
  (list || []).forEach(item => {
    if (!item || !item.id) return;
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values())
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

// ─── Subscribe: Real-time listener + REST polling fallback ───────
export const subscribeBookings = (callback) => {
  let lastData = [];

  const emitData = (bookings) => {
    lastData = bookings;
    callback(bookings);
  };

  // 1. Try Firebase SDK real-time listener
  let sdkListenerActive = false;
  try {
    const bookingsRef = ref(rtdb, 'bookings');
    onValue(bookingsRef, (snapshot) => {
      sdkListenerActive = true;
      const bookings = snapshot.exists() ? dataToArray(snapshot.val()) : [];
      console.log(`[Firebase SDK] Real-time: ${bookings.length} bookings`);
      emitData(bookings);
    }, (error) => {
      console.warn('[Firebase SDK] Listener error, REST polling active:', error.message);
      sdkListenerActive = false;
    });
  } catch (e) {
    console.warn('[Firebase SDK] Setup failed, using REST only:', e.message);
  }

  // 2. REST polling fallback (runs every 3s, ensures data even if SDK fails)
  const poll = async () => {
    try {
      const data = await restGet('bookings');
      const bookings = dataToArray(data);
      // Only emit if SDK listener is NOT active (avoid double updates)
      if (!sdkListenerActive) {
        console.log(`[Firebase REST] Polled: ${bookings.length} bookings`);
        emitData(bookings);
      }
    } catch (e) {
      console.warn('[Firebase REST] Poll failed:', e.message);
    }
  };

  // Initial REST fetch (immediate data while SDK connects)
  poll();
  const pollInterval = setInterval(poll, 3000);

  return () => {
    clearInterval(pollInterval);
  };
};

// ─── Save Booking ────────────────────────────────────────────────
export const saveBooking = async (bookingData) => {
  const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const payload = {
    id: bookingId,
    ...bookingData,
    createdAt: new Date().toISOString(),
  };

  // Try SDK first, fall back to REST
  try {
    await set(ref(rtdb, `bookings/${bookingId}`), payload);
    console.log(`[Firebase SDK] Saved ${bookingId}`);
  } catch (sdkErr) {
    console.warn(`[Firebase SDK] Save failed, trying REST:`, sdkErr.message);
    await restPut(`bookings/${bookingId}`, payload);
    console.log(`[Firebase REST] Saved ${bookingId}`);
  }

  return payload;
};

// ─── Update Booking ──────────────────────────────────────────────
export const updateBooking = async (bookingId, bookingData) => {
  // Read existing data first
  let existing = {};
  try {
    const snapshot = await get(ref(rtdb, `bookings/${bookingId}`));
    existing = snapshot.exists() ? snapshot.val() : {};
  } catch (e) {
    try {
      existing = (await restGet(`bookings/${bookingId}`)) || {};
    } catch (e2) {}
  }

  const updated = {
    ...existing,
    ...bookingData,
    id: bookingId,
    updatedAt: new Date().toISOString(),
  };

  // Try SDK first, fall back to REST
  try {
    await set(ref(rtdb, `bookings/${bookingId}`), updated);
    console.log(`[Firebase SDK] Updated ${bookingId}`);
  } catch (sdkErr) {
    console.warn(`[Firebase SDK] Update failed, trying REST:`, sdkErr.message);
    await restPut(`bookings/${bookingId}`, updated);
    console.log(`[Firebase REST] Updated ${bookingId}`);
  }
};

// ─── Delete Booking ──────────────────────────────────────────────
export const deleteBooking = async (bookingId) => {
  // Try SDK first, fall back to REST
  try {
    await remove(ref(rtdb, `bookings/${bookingId}`));
    console.log(`[Firebase SDK] Deleted ${bookingId}`);
  } catch (sdkErr) {
    console.warn(`[Firebase SDK] Delete failed, trying REST:`, sdkErr.message);
    await restDelete(`bookings/${bookingId}`);
    console.log(`[Firebase REST] Deleted ${bookingId}`);
  }
};

// ─── Reset All Bookings ──────────────────────────────────────────
export const resetAllBookings = async () => {
  try {
    await remove(ref(rtdb, 'bookings'));
    await remove(ref(rtdb, 'deleted_ids'));
    console.log('[Firebase SDK] All bookings reset');
  } catch (sdkErr) {
    console.warn('[Firebase SDK] Reset failed, trying REST:', sdkErr.message);
    await restDelete('bookings');
    await restDelete('deleted_ids');
    console.log('[Firebase REST] All bookings reset');
  }
};

export { rtdb };
