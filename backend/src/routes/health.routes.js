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
    const measureCollectionSizes = async (colName, modelObj, selectFields = "") => {
      try {
        const startVal = Date.now();
        // Limit query selection to avoid downloading huge payloads if we don't need to
        const docs = await modelObj.find({}).select(selectFields).lean();
        const queryTime = Date.now() - startVal;
        
        let maxSize = 0;
        let totalSize = 0;
        let maxDocId = null;
        const individualSizes = [];
        
        docs.forEach(doc => {
          const size = JSON.stringify(doc).length;
          totalSize += size;
          if (size > maxSize) {
            maxSize = size;
            maxDocId = doc._id;
          }
          individualSizes.push({
            id: doc._id,
            name: doc.businessName || doc.name || doc.key || undefined,
            sizeChars: size
          });
        });
        
        docSizes[colName] = {
          count: docs.length,
          queryTimeMs: queryTime,
          avgSizeChars: docs.length > 0 ? Math.round(totalSize / docs.length) : 0,
          maxSizeChars: maxSize,
          maxDocId: maxDocId,
          details: individualSizes.slice(0, 15) // top 15 individual sizes
        };
      } catch (err) {
        docSizes[colName] = { error: err.message };
      }
    };

    const HomePlacement = require("../models/HomePlacement");
    const Category = require("../models/Category");
    
    // For users, let's select only metadata first, then do a separate trace on the image fields
    await measureCollectionSizes("users_metadata", User, "_id name businessName role vendorStatus");
    await measureCollectionSizes("homeplacements", HomePlacement);
    await measureCollectionSizes("categories", Category);
    
    // Detailed image size trace for vendors
    try {
      const startVendors = Date.now();
      const vendors = await User.find({ role: "vendor" })
        .select("_id name businessName image shopBannerImage myStoreImage myStoreBannerImage shopGallery")
        .lean();
      
      const vendorImageSizes = vendors.map(v => ({
        id: v._id,
        name: v.businessName || v.name,
        imageLen: v.image ? v.image.length : 0,
        shopBannerLen: v.shopBannerImage ? v.shopBannerImage.length : 0,
        myStoreImageLen: v.myStoreImage ? v.myStoreImage.length : 0,
        myStoreBannerLen: v.myStoreBannerImage ? v.myStoreBannerImage.length : 0,
        galleryLen: v.shopGallery ? JSON.stringify(v.shopGallery).length : 0
      }));
      
      docSizes["vendors_images"] = {
        queryTimeMs: Date.now() - startVendors,
        sizes: vendorImageSizes
      };
    } catch (vendorErr) {
      docSizes["vendors_images"] = { error: vendorErr.message };
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

router.get("/health/db-ops", async (_req, res) => {
  let client = null;
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return res.status(500).json({ ok: false, error: "MONGODB_URI env var is missing" });
    }

    const MongoClient = mongoose.mongo.MongoClient;
    client = new MongoClient(mongoUri, {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "winkget_business");
    const adminDb = client.db().admin();

    const diagnostics = {};

    // 1. Ping
    try {
      const pingStart = Date.now();
      await db.command({ ping: 1 });
      diagnostics.pingMs = Date.now() - pingStart;
    } catch (e) {
      diagnostics.pingError = e.message;
    }

    // 2. DbStats
    try {
      diagnostics.dbStats = await db.command({ dbStats: 1 });
    } catch (e) {
      diagnostics.dbStatsError = e.message;
    }

    // 3. CurrentOp (Admin)
    try {
      diagnostics.currentOpAdmin = await adminDb.command({ currentOp: 1, $all: true });
    } catch (e) {
      diagnostics.currentOpAdminError = e.message;
    }

    // 4. CurrentOp (Local DB)
    try {
      diagnostics.currentOpDb = await db.command({ currentOp: 1, $ownOps: true });
    } catch (e) {
      diagnostics.currentOpDbError = e.message;
    }

    // 5. ServerStatus
    try {
      diagnostics.serverStatus = await db.command({ serverStatus: 1 });
    } catch (e) {
      diagnostics.serverStatusError = e.message;
    }

    return res.status(200).json({
      ok: true,
      diagnostics,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message,
      stack: err.stack,
    });
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeErr) {
        // ignore
      }
    }
  }
});

module.exports = router;

