const { Redis } = require("@upstash/redis");
const crypto = require("crypto");

// Instantiate Upstash serverless Redis client
let redis = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log("Redis client initialized successfully with Upstash REST endpoint.");
  } catch (error) {
    console.error("Failed to initialize Redis client:", error);
  }
} else {
  console.warn("UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing in environment. Redis operations will fallback / be disabled.");
}

/**
 * Route Caching Helpers
 */
const getCachedRouteEntry = async (url) => {
  if (!redis) return null;
  const key = `cache:catalog:route:${url}`;
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch (error) {
    console.error("Redis getCachedRouteEntry error:", error);
    return null;
  }
};

const setCachedRouteEntry = async (url, statusCode, payload, ttlSeconds) => {
  if (!redis || ttlSeconds <= 0) return;
  const key = `cache:catalog:route:${url}`;
  try {
    const data = JSON.stringify({ statusCode, payload });
    await redis.set(key, data, { ex: ttlSeconds });
  } catch (error) {
    console.error("Redis setCachedRouteEntry error:", error);
  }
};

const clearCatalogCache = async () => {
  if (!redis) return;
  try {
    const keys = await redis.keys("cache:catalog:route:*");
    if (keys && keys.length > 0) {
      await redis.del(...keys);
      console.log(`Successfully cleared ${keys.length} catalog cache entries from Redis.`);
    }
  } catch (error) {
    console.error("Error clearing catalog cache from Redis:", error);
  }
};

/**
 * JWT Blacklist Helpers
 */
const getRevocationKey = (token) => {
  const hash = crypto.createHash("sha256").update(String(token || "")).digest("hex");
  return `auth:blacklist:${hash}`;
};

const blacklistToken = async (token, expiresInSeconds) => {
  if (!redis || !token || expiresInSeconds <= 0) return;
  const key = getRevocationKey(token);
  try {
    await redis.set(key, "revoked", { ex: Math.ceil(expiresInSeconds) });
  } catch (error) {
    console.error("Error blacklisting token in Redis:", error);
  }
};

const isTokenBlacklisted = async (token) => {
  if (!redis || !token) return false;
  const key = getRevocationKey(token);
  try {
    const status = await redis.get(key);
    return status === "revoked";
  } catch (error) {
    console.error("Error checking token blacklist in Redis:", error);
    return false;
  }
};

module.exports = {
  redis,
  getCachedRouteEntry,
  setCachedRouteEntry,
  clearCatalogCache,
  blacklistToken,
  isTokenBlacklisted,
};
