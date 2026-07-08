// lib/cache.js

// Simple in-memory cache with time-to-live (TTL) expiration
const cacheStore = new Map();

/**
 * Fetches data via the provided resolver function, caching results for ttlMs
 */
export async function getCachedData(key, fetchFn, ttlMs = 60000) {
  const now = Date.now();
  
  if (cacheStore.has(key)) {
    const entry = cacheStore.get(key);
    if (now - entry.timestamp < ttlMs) {
      // Cache hit and is still fresh
      return entry.data;
    }
  }

  // Cache miss or expired: fetch fresh data
  const freshData = await fetchFn();
  cacheStore.set(key, {
    data: freshData,
    timestamp: now
  });

  return freshData;
}
