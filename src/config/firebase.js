import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
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
const auth = getAuth(app);
const rtdb = getDatabase(app);

// Automatically sign in anonymously to satisfy security rules (auth != null)
signInAnonymously(auth).catch((err) => {
  console.warn('[Firebase Auth] Anonymous sign-in error:', err.message);
});

// Helper to get active ID token for REST fallback requests
async function getIdToken() {
  try {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
  } catch (e) {}
  return null;
}

// ─── REST API helpers (bulletproof fallback) ─────────────────────
async function restPut(path, data) {
  const token = await getIdToken();
  const url = `${DATABASE_URL}/${path}.json${token ? `?auth=${token}` : ''}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`REST PUT failed: ${res.status}`);
  return res.json();
}

async function restDelete(path) {
  const token = await getIdToken();
  const url = `${DATABASE_URL}/${path}.json${token ? `?auth=${token}` : ''}`;
  const res = await fetch(url, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`REST DELETE failed: ${res.status}`);
}

async function restGet(path) {
  const token = await getIdToken();
  const url = `${DATABASE_URL}/${path}.json${token ? `?auth=${token}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`REST GET failed: ${res.status}`);
  return res.json();
}

async function restPatch(path, data) {
  const token = await getIdToken();
  const url = `${DATABASE_URL}/${path}.json${token ? `?auth=${token}` : ''}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`REST PATCH failed: ${res.status}`);
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

// ─── Subscribe: Real-time listener + instant cache hydration ─────
export const subscribeBookings = (callback) => {
  let sdkListenerActive = false;

  // 1. Immediately emit cached bookings for 0ms instant display!
  try {
    const cached = localStorage.getItem('crm_cached_bookings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        callback(parsed);
      }
    }
  } catch (e) {}

  const emitData = (bookings) => {
    try {
      localStorage.setItem('crm_cached_bookings', JSON.stringify(bookings));
    } catch (e) {}
    callback(bookings);
  };

  // 2. Real-time Firebase SDK listener (persistent WebSocket - instant)
  try {
    const bookingsRef = ref(rtdb, 'bookings');
    onValue(bookingsRef, (snapshot) => {
      sdkListenerActive = true;
      const bookings = snapshot.exists() ? dataToArray(snapshot.val()) : [];
      emitData(bookings);
    }, (error) => {
      console.warn('[Firebase SDK] Listener error, REST polling active:', error.message);
      sdkListenerActive = false;
    });
  } catch (e) {
    console.warn('[Firebase SDK] Setup failed, using REST only:', e.message);
  }

  // 3. Fallback: only poll if SDK listener has not connected
  const poll = async () => {
    if (sdkListenerActive) return; // Do not waste network resources when real-time WebSocket is active!
    try {
      const data = await restGet('bookings');
      const bookings = dataToArray(data);
      if (!sdkListenerActive) {
        emitData(bookings);
      }
    } catch (e) {
      console.warn('[Firebase REST] Poll failed:', e.message);
    }
  };

  const pollTimer = setTimeout(poll, 1500);
  const pollInterval = setInterval(() => {
    if (!sdkListenerActive) poll();
  }, 10000);

  return () => {
    clearTimeout(pollTimer);
    clearInterval(pollInterval);
  };
};

// ─── Save Booking ────────────────────────────────────────────────
export const saveBooking = async (bookingData) => {
  const bookingId = bookingData.id || `booking-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const payload = {
    id: bookingId,
    ...bookingData,
    createdAt: bookingData.createdAt || new Date().toISOString(),
  };

  // Immediate local cache update for instant reactivity
  try {
    const cached = localStorage.getItem('crm_cached_bookings');
    const list = cached ? JSON.parse(cached) : [];
    localStorage.setItem('crm_cached_bookings', JSON.stringify([payload, ...list.filter(b => b.id !== bookingId)]));
  } catch (e) {}

  // SDK / REST save
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

// ─── Update Booking (Optimized: Direct atomic update without pre-read latency) ───
export const updateBooking = async (bookingId, bookingData) => {
  const payload = {
    ...bookingData,
    id: bookingId,
    updatedAt: new Date().toISOString(),
  };

  // Immediate local cache update
  try {
    const cached = localStorage.getItem('crm_cached_bookings');
    if (cached) {
      const list = JSON.parse(cached);
      localStorage.setItem('crm_cached_bookings', JSON.stringify(list.map(b => b.id === bookingId ? { ...b, ...payload } : b)));
    }
  } catch (e) {}

  // Try SDK atomic update first (instant, 0 pre-read roundtrips)
  try {
    await update(ref(rtdb, `bookings/${bookingId}`), payload);
    console.log(`[Firebase SDK] Fast Updated ${bookingId}`);
  } catch (sdkErr) {
    console.warn(`[Firebase SDK] Update failed, trying REST PATCH:`, sdkErr.message);
    await restPatch(`bookings/${bookingId}`, payload);
    console.log(`[Firebase REST] Fast Updated ${bookingId}`);
  }

  return payload;
};

// ─── Delete Booking ──────────────────────────────────────────────
export const deleteBooking = async (bookingId) => {
  try {
    const cached = localStorage.getItem('crm_cached_bookings');
    if (cached) {
      const list = JSON.parse(cached);
      localStorage.setItem('crm_cached_bookings', JSON.stringify(list.filter(b => b.id !== bookingId)));
    }
  } catch (e) {}

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

// ─── Price Overrides Realtime Sync ──────────────────────────────
export const subscribePriceOverrides = (callback) => {
  try {
    const overridesRef = ref(rtdb, 'priceOverrides');
    return onValue(overridesRef, (snapshot) => {
      try {
        const data = snapshot.val() || {};
        const oldRaw = localStorage.getItem('crm_price_overrides') || '{}';
        const newRaw = JSON.stringify(data);
        
        localStorage.setItem('crm_price_overrides', newRaw);
        if (callback) callback(data);
        window.dispatchEvent(new CustomEvent('crm_price_override_updated', { detail: data }));

        // Auto-refresh page across all connected clients if price overrides change remotely
        if (oldRaw !== '{}' && oldRaw !== newRaw) {
          console.log('[Firebase] Price override changed remotely, reloading page...');
          window.location.reload();
        }
      } catch (err) {
        console.warn('[Firebase] Price override snapshot processing error:', err);
      }
    });
  } catch (e) {
    console.warn('[Firebase] Price override subscribe failed:', e);
    return () => {};
  }
};

import { normalizeDateString } from './venueData';

export const savePriceOverrideFirebase = async (dateString, mode) => {
  if (!dateString) return;
  const formattedDate = normalizeDateString(dateString);
  try {
    await set(ref(rtdb, `priceOverrides/${formattedDate}`), mode);
    console.log(`[Firebase SDK] Saved price override ${formattedDate}: ${mode}`);
  } catch (sdkErr) {
    console.warn(`[Firebase SDK] Save price override failed, using REST:`, sdkErr.message);
    try {
      await restPut(`priceOverrides/${formattedDate}`, mode);
    } catch (restErr) {
      console.error(`[Firebase REST] Save price override failed:`, restErr);
    }
  }
  window.dispatchEvent(new CustomEvent('crm_price_override_updated', { detail: { date: formattedDate, mode } }));
};

export { rtdb };
