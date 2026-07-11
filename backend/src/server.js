require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDatabase } = require("./config/db");
const { attachRealtimeServer } = require("./lib/realtime");
const User = require("./models/User");
const Category = require("./models/Category");
const Subcategory = require("./models/Subcategory");
const Inquiry = require("./models/Inquiry");
const Review = require("./models/Review");
const City = require("./models/City");
const FailureLog = require("./models/FailureLog");
const VendorProduct = require("./models/VendorProduct");
const Order = require("./models/Order");
const ProductReview = require("./models/ProductReview");
const { ensureSearchIndex, reindexSearchDocuments } = require("./lib/search/indexer");

const PORT = Number(process.env.PORT || 5000);

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  // eslint-disable-next-line no-console
  console.error("Uncaught exception:", error);
  process.exit(1);
});

async function startServer() {
  try {
    await connectDatabase();

    // One-time database backfill for categories platforms field
    try {
      const categoriesToBackfill = await Category.find({
        $or: [
          { platforms: { $exists: false } },
          { platforms: { $size: 0 } },
          { platforms: null }
        ]
      });
      if (categoriesToBackfill.length > 0) {
        console.log(`[Backfill] Found ${categoriesToBackfill.length} categories missing platforms. Backfilling...`);
        for (const cat of categoriesToBackfill) {
          cat.platforms = ["winkget_business"];
          await cat.save();
        }
        console.log("[Backfill] Category platforms backfill completed successfully.");
      }
    } catch (backfillErr) {
      console.error("[Backfill Error] Category platforms backfill failed:", backfillErr.message);
    }

    // Ensure DB indexes match current schema. Wrap in try-catch to prevent startup crashes from legacy duplicate data.
    const syncModelIndexes = async (modelName, modelObj) => {
      try {
        await modelObj.syncIndexes();
        // eslint-disable-next-line no-console
        console.log(`Synced indexes for ${modelName}`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to sync indexes for ${modelName}:`, error.message);
      }
    };

    if (process.env.NODE_ENV === "development" || String(process.env.SYNC_INDEXES_ON_START || "").toLowerCase() === "true") {
      console.log("Synchronizing database indexes...");
      await syncModelIndexes("User", User);
      await syncModelIndexes("Category", Category);
      await syncModelIndexes("Subcategory", Subcategory);
      await syncModelIndexes("Inquiry", Inquiry);
      await syncModelIndexes("Review", Review);
      await syncModelIndexes("City", City);
      await syncModelIndexes("FailureLog", FailureLog);
      await syncModelIndexes("VendorProduct", VendorProduct);
      await syncModelIndexes("ProductReview", ProductReview);
      await syncModelIndexes("Order", Order);
    } else {
      console.log("Database index synchronization skipped (production mode). Set SYNC_INDEXES_ON_START=true to override.");
    }

    try {
      await ensureSearchIndex();
      if (String(process.env.SEARCH_REINDEX_ON_START || "").toLowerCase() === "true") {
        await reindexSearchDocuments();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Search index init failed:", error.message);
    }

    const envOrigins = String(process.env.CORS_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const devOrigins =
      process.env.NODE_ENV === "development"
        ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"]
        : [];
    const allowedOrigins = Array.from(new Set([...envOrigins, ...devOrigins]));

    const httpServer = http.createServer(app);
    attachRealtimeServer(httpServer, { allowedOrigins });

    httpServer.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();
