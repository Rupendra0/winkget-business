const { Schema, model, models } = require("mongoose");

const productReviewSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "VendorProduct",
      required: true,
      index: true,
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    editCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

productReviewSchema.index({ productId: 1, reviewer: 1 }, { unique: true });
productReviewSchema.index({ productId: 1, isVisible: 1, createdAt: -1 });

module.exports = models.ProductReview || model("ProductReview", productReviewSchema);
