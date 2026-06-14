const crypto = require("crypto");

// Standalone in-memory cache to replace remote Redis and prevent socket descriptor leaks
const memoryCache = new Map();

// Periodic expired cache cleaner (runs every 60s)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}, 60000).unref();

/**
 * Route Caching Helpers
 */
const getCachedRouteEntry = async (url) => {
  const key = `cache:catalog:route:${url}`;
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCachedRouteEntry = async (url, statusCode, payload, ttlSeconds) => {
  if (ttlSeconds <= 0) return;
  const key = `cache:catalog:route:${url}`;
  memoryCache.set(key, {
    value: { statusCode, payload },
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const clearCatalogCache = async () => {
  let count = 0;
  for (const key of memoryCache.keys()) {
    if (key.startsWith("cache:catalog:route:")) {
      memoryCache.delete(key);
      count++;
    }
  }
  console.log(`Successfully cleared ${count} catalog cache entries from memory.`);
};

/**
 * JWT Blacklist Helpers
 */
const getRevocationKey = (token) => {
  const hash = crypto.createHash("sha256").update(String(token || "")).digest("hex");
  return `auth:blacklist:${hash}`;
};

const blacklistToken = async (token, expiresInSeconds) => {
  if (!token || expiresInSeconds <= 0) return;
  const key = getRevocationKey(token);
  memoryCache.set(key, {
    value: "revoked",
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
};

const isTokenBlacklisted = async (token) => {
  if (!token) return false;
  const key = getRevocationKey(token);
  const entry = memoryCache.get(key);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return false;
  }
  return entry.value === "revoked";
};

module.exports = {
  redis: null,
  getCachedRouteEntry,
  setCachedRouteEntry,
  clearCatalogCache,
  blacklistToken,
  isTokenBlacklisted,
};
