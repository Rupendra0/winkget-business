const mongoose = require("mongoose");
const Review = require("../models/Review");
const ProductReview = require("../models/ProductReview");
const VendorProduct = require("../models/VendorProduct");

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

async function runAutoMigration() {
  try {
    // Find all product reviews in the old Review collection
    const oldProductReviews = await Review.find({
      businessKey: /^product:/,
    });

    if (oldProductReviews.length === 0) {
      return;
    }

    console.log(`[migration] Found ${oldProductReviews.length} old product reviews to migrate to ProductReview collection.`);

    let migratedCount = 0;
    const migratedProductIds = new Set();

    for (const oldReview of oldProductReviews) {
      const rawProductId = oldReview.businessKey.replace(/^product:/, "");
      if (!OBJECT_ID_REGEX.test(rawProductId)) {
        continue;
      }

      const productId = new mongoose.Types.ObjectId(rawProductId);

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
      }

      await Review.deleteOne({ _id: oldReview._id });
      migratedProductIds.add(rawProductId);
    }

    console.log(`[migration] Migrated ${migratedCount} reviews successfully.`);

    // Update cached ratings and reviews count on VendorProduct models
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
    }
  } catch (error) {
    console.error("[migration] Product review migration failed:", error.message);
  }
}

module.exports = {
  runAutoMigration,
};
