require("dotenv").config();
const mongoose = require("mongoose");
const Review = require("./src/models/Review");
const ProductReview = require("./src/models/ProductReview");
const VendorProduct = require("./src/models/VendorProduct");

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = process.env.MONGODB_DB || "winkget_business";

  console.log("Connecting to database for migration...");
  await mongoose.connect(mongoUri, { dbName });
  console.log("Connected successfully.");

  // Find all product reviews in the old Review collection
  const oldProductReviews = await Review.find({
    businessKey: /^product:/,
  });

  console.log(`Found ${oldProductReviews.length} old product reviews to migrate.`);

  let migratedCount = 0;
  const migratedProductIds = new Set();

  for (const oldReview of oldProductReviews) {
    const rawProductId = oldReview.businessKey.replace(/^product:/, "");
    if (!OBJECT_ID_REGEX.test(rawProductId)) {
      console.warn(`Skipping review ${oldReview._id}: invalid product ID format "${rawProductId}"`);
      continue;
    }

    const productId = new mongoose.Types.ObjectId(rawProductId);

    // Check if a ProductReview with this ID or combination already exists
    const exists = await ProductReview.exists({
      $or: [
        { _id: oldReview._id },
        { productId, reviewer: oldReview.reviewer }
      ]
    });

    if (!exists) {
      await ProductReview.create({
        _id: oldReview._id,
        productId,
        reviewer: oldReview.reviewer,
        authorName: oldReview.authorName,
        rating: oldReview.rating,
        comment: oldReview.comment,
        editCount: oldReview.editCount,
        editedAt: oldReview.editedAt,
        isVisible: oldReview.isVisible,
        createdAt: oldReview.createdAt,
        updatedAt: oldReview.updatedAt,
      });
      migratedCount++;
    } else {
      console.log(`ProductReview for product ${productId} and reviewer ${oldReview.reviewer} already exists. Skipping insertion.`);
    }

    // Delete the migrated review from the old collection
    await Review.deleteOne({ _id: oldReview._id });
    migratedProductIds.add(rawProductId);
  }

  console.log(`Migrated ${migratedCount} reviews successfully.`);

  // Update cached ratings and reviews count on VendorProduct models
  console.log("Updating VendorProduct rating/reviews caches...");
  for (const rawProductId of migratedProductIds) {
    const productId = new mongoose.Types.ObjectId(rawProductId);
    const rows = await ProductReview.aggregate([
      {
        $match: {
          productId,
          isVisible: true,
        },
      },
      {
        $group: {
          _id: "$productId",
          reviews: { $sum: 1 },
          rating: { $avg: "$rating" },
        },
      },
    ]);

    const summary = rows[0]
      ? {
          rating: Number(Number(rows[0].rating || 0).toFixed(2)),
          reviews: Number(rows[0].reviews || 0),
        }
      : { rating: 0, reviews: 0 };

    await VendorProduct.updateOne(
      { _id: productId },
      { rating: summary.rating, reviews: summary.reviews }
    );
    console.log(`Updated cache for product ${rawProductId}: rating=${summary.rating}, reviews=${summary.reviews}`);
  }

  console.log("Migration complete!");
  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
