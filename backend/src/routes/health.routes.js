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

    // Step-by-step performance tracing for `/api/vendors` query
    const trace = {};
    let vendors = [];
    const query = { role: "vendor", vendorStatus: "approved" };

    try {
      const t0 = Date.now();
      const rawQuery = User.find(query)
        .sort({ updatedAt: -1, businessName: 1, name: 1 })
        .select(
          "_id name businessName businessType city sublocality state businessAddress businessCategory businessSubcategory businessPhone businessEmail businessAlternatePhone website gstNumber serviceTags businessDescription image shopBannerImage myStoreImage myStoreBannerImage shopGallery marketingOptIn vendorStatus establishmentYear yearsInBusiness shopOpeningTime shopClosingTime storeStatusMode manualStoreStatus manualStoreStatusUpdatedAt"
        )
        .lean();
      vendors = await rawQuery;
      trace.rawQueryMs = Date.now() - t0;

      const t1 = Date.now();
      await User.populate(vendors, { path: "businessCategory", select: "_id name slug" });
      trace.populateCategoryMs = Date.now() - t1;

      const t2 = Date.now();
      await User.populate(vendors, { path: "businessSubcategory", select: "_id name slug" });
      trace.populateSubcategoryMs = Date.now() - t2;

      const t3 = Date.now();
      const reviewRows = await Review.aggregate([
        {
          $match: {
            vendor: { $in: vendors.map((v) => v._id) },
            isVisible: true,
          },
        },
        {
          $group: {
            _id: "$vendor",
            reviews: { $sum: 1 },
            rating: { $avg: "$rating" },
          },
        },
      ]);
      trace.aggregateReviewsMs = Date.now() - t3;
      trace.reviewsCount = reviewRows.length;
    } catch (traceError) {
      trace.error = traceError.message;
      trace.stack = traceError.stack;
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

    // Compute document sizes to detect huge base64 strings
    const docSizes = {};
    const measureCollectionSizes = async (colName, modelObj) => {
      try {
        const docs = await modelObj.find({}).lean();
        let maxSize = 0;
        let totalSize = 0;
        let maxDocId = null;
        
        docs.forEach(doc => {
          const size = JSON.stringify(doc).length;
          totalSize += size;
          if (size > maxSize) {
            maxSize = size;
            maxDocId = doc._id;
          }
        });
        
        docSizes[colName] = {
          count: docs.length,
          avgSizeChars: docs.length > 0 ? Math.round(totalSize / docs.length) : 0,
          maxSizeChars: maxSize,
          maxDocId: maxDocId
        };
      } catch (err) {
        docSizes[colName] = { error: err.message };
      }
    };

    const HomePlacement = require("../models/HomePlacement");
    const Category = require("../models/Category");
    await measureCollectionSizes("users", User);
    await measureCollectionSizes("homeplacements", HomePlacement);
    await measureCollectionSizes("categories", Category);

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
      trace,
      docSizes,
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

