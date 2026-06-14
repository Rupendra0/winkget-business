const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");

const router = express.Router();

router.get("/health", async (_req, res) => {
  const connection = mongoose.connection;
  res.set("Cache-Control", `public, max-age=${Math.max(Number(process.env.PUBLIC_GET_MAX_AGE_SECONDS || 300), 1)}`);

  return res.status(200).json({
    ok: true,
    message: "Backend is running",
    db: {
      host: connection.host || null,
      name: connection.name || null,
      readyState: connection.readyState,
    },
  });
});

router.get("/health/diagnose", async (_req, res) => {
  try {
    const connection = mongoose.connection;
    if (connection.readyState !== 1) {
      return res.status(500).json({
        ok: false,
        message: "Database is not connected",
        readyState: connection.readyState,
      });
    }

    const db = connection.db;
    const collections = await db.listCollections().toArray();
    const collectionStats = [];
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      collectionStats.push({ name: col.name, count });
    }

    // Check users collection details
    const usersCollection = db.collection("users");
    const totalUsers = await usersCollection.countDocuments({});
    const totalVendors = await usersCollection.countDocuments({ role: "vendor" });
    const approvedVendors = await usersCollection.countDocuments({ role: "vendor", vendorStatus: "approved" });

    // Check indexes on users collection
    const userIndexes = await usersCollection.indexes();

    // Check Redis connectivity
    const { redis } = require("../lib/redis");
    let redisPing = null;
    let redisPingTimeMs = null;
    if (redis) {
      try {
        const startRedis = Date.now();
        redisPing = await redis.ping();
        redisPingTimeMs = Date.now() - startRedis;
      } catch (redisError) {
        redisPing = { error: redisError.message };
      }
    } else {
      redisPing = "Disabled/Not configured";
    }

    // Query explanation
    let queryExplain = null;
    try {
      queryExplain = await User.find({ role: "vendor", vendorStatus: "approved" })
        .sort({ updatedAt: -1, businessName: 1, name: 1 })
        .explain();
    } catch (explainError) {
      queryExplain = { error: explainError.message };
    }

    return res.status(200).json({
      ok: true,
      readyState: connection.readyState,
      databaseName: connection.name,
      collections: collectionStats,
      redis: {
        ping: redisPing,
        pingTimeMs: redisPingTimeMs,
        configured: Boolean(redis),
      },
      users: {
        total: totalUsers,
        vendors: totalVendors,
        approvedVendors,
        indexes: userIndexes,
      },
      explain: queryExplain,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Diagnostics failed",
      error: error.message,
      stack: error.stack,
    });
  }
});

module.exports = router;

