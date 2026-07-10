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

const isPhysicalProduct = (catLabel) => {
  const cat = String(catLabel || '').trim().toLowerCase();
  if (['restaurant', 'bars', 'food', 'beverages', 'bakery', 'cafe', 'meal', 'dinner', 'lunch', 'breakfast'].includes(cat)) {
    return false;
  }
  if (['home services', 'salon', 'beauty', 'health', 'fitness', 'education', 'classes', 'cleaning', 'repair', 'local services', 'services'].includes(cat)) {
    return false;
  }
  return true;
};

async function runDatabaseBackfill() {
  try {
    // eslint-disable-next-line no-console
    console.log("Running automatic database backfill for physical products barcodes & sourcePlatform...");
    const products = await VendorProduct.find({ isDeleted: { $ne: true } });
    
    let parentUpdatedCount = 0;
    let variantUpdatedCount = 0;
    let sourcePlatformUpdatedCount = 0;

    for (const product of products) {
      let isModified = false;

      // 1. Backfill parent barcode if missing (physical products only)
      if (isPhysicalProduct(product.categoryLabel)) {
        if (!product.barcode || !product.barcode.trim()) {
          const tempBarcode = `TEMP-UPC-${product._id.toString().toUpperCase()}`;
          product.barcode = tempBarcode;
          isModified = true;
          parentUpdatedCount++;
        }

        // 2. Backfill variant barcodes if missing
        if (Array.isArray(product.variantData) && product.variantData.length > 0) {
          product.variantData.forEach((variant, index) => {
            if (!variant.barcode || !variant.barcode.trim()) {
              variant.barcode = `TEMP-VAR-${product._id.toString().toUpperCase()}-${index}`;
              isModified = true;
              variantUpdatedCount++;
            }
          });
          if (isModified) {
            product.markModified('variantData');
          }
        }
      }

      // 3. Update sourcePlatform from winkget_vendor to winkget_business for all items
      if (!product.sourcePlatform || product.sourcePlatform === "winkget_vendor") {
        product.sourcePlatform = "winkget_business";
        isModified = true;
        sourcePlatformUpdatedCount++;
      }

      if (isModified) {
        await product.save();
      }
    }

    if (parentUpdatedCount > 0 || variantUpdatedCount > 0 || sourcePlatformUpdatedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`Backfill finished: updated ${parentUpdatedCount} parent barcodes, ${variantUpdatedCount} variant barcodes, and ${sourcePlatformUpdatedCount} sourcePlatform values.`);
    } else {
      // eslint-disable-next-line no-console
      console.log("Database is already up to date. No backfill needed.");
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Database backfill script failed:", error.message);
  }
}

async function startServer() {
  try {
    await connectDatabase();
    await runDatabaseBackfill();

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
