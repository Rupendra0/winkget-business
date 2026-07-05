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

    // Trigger one-time base64 image migration to uploads folder
    try {
      const { runMigration } = require("./lib/startupMigration");
      runMigration().catch((err) => console.error("Startup migration failed:", err));
    } catch (err) {
      console.error("Failed to run startup migration:", err.message);
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
