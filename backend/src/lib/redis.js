const { Redis } = require("@upstash/redis");
const crypto = require("crypto");

// Instantiate Upstash serverless Redis client (Disabled completely to prevent socket/connection leaks under load)
let redis = null;

const REDIS_TIMEOUT_MS = 1500;

const promiseTimeout = (promise, ms) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Redis operation timed out after ${ms}ms`));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

/**
 * Route Caching Helpers
 */
const getCachedRouteEntry = async (url) => {
  if (!redis) return null;
  const key = `cache:catalog:route:${url}`;
  try {
    const data = await promiseTimeout(redis.get(key), REDIS_TIMEOUT_MS);
    if (!data) return null;
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch (error) {
    console.error("Redis getCachedRouteEntry error:", error.message);
    return null;
  }
};

const setCachedRouteEntry = async (url, statusCode, payload, ttlSeconds) => {
  if (!redis || ttlSeconds <= 0) return;
  const key = `cache:catalog:route:${url}`;
  try {
    const data = JSON.stringify({ statusCode, payload });
    await promiseTimeout(redis.set(key, data, { ex: ttlSeconds }), REDIS_TIMEOUT_MS);
  } catch (error) {
    console.error("Redis setCachedRouteEntry error:", error.message);
  }
};

const clearCatalogCache = async () => {
  if (!redis) return;
  try {
    const keys = await promiseTimeout(redis.keys("cache:catalog:route:*"), REDIS_TIMEOUT_MS);
    if (keys && keys.length > 0) {
      await promiseTimeout(redis.del(...keys), REDIS_TIMEOUT_MS);
      console.log(`Successfully cleared ${keys.length} catalog cache entries from Redis.`);
    }
  } catch (error) {
    console.error("Error clearing catalog cache from Redis:", error.message);
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
    await promiseTimeout(redis.set(key, "revoked", { ex: Math.ceil(expiresInSeconds) }), REDIS_TIMEOUT_MS);
  } catch (error) {
    console.error("Error blacklisting token in Redis:", error.message);
  }
};

const isTokenBlacklisted = async (token) => {
  if (!redis || !token) return false;
  const key = getRevocationKey(token);
  try {
    const status = await promiseTimeout(redis.get(key), REDIS_TIMEOUT_MS);
    return status === "revoked";
  } catch (error) {
    console.error("Error checking token blacklist in Redis:", error.message);
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
