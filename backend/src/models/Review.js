const { Schema, model, models } = require("mongoose");

const reviewSchema = new Schema(
  {
    businessKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
      maxlength: 120,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

reviewSchema.index({ businessKey: 1, reviewer: 1 }, { unique: true });

module.exports = models.Review || model("Review", reviewSchema);
