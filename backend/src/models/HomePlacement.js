const mongoose = require("mongoose");

const { Schema } = mongoose;

const homePromoCardSchema = new Schema(
  {
    cardId: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    image: { type: String, trim: true },
    link: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    _id: false,
  }
);

const homePlacementSchema = new Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true, unique: true },
    slots: {
      leftImage: { type: String, trim: true },
      middleImage: { type: String, trim: true },
      rightImage: { type: String, trim: true },
    },
    promoHeading: { type: String, trim: true },
    promoCards: [homePromoCardSchema],
    exploreHeading: { type: String, trim: true },
    exploreCards: [homePromoCardSchema],
    wellnessHeading: { type: String, trim: true },
    wellnessCards: [homePromoCardSchema],
    sponsorHeading: { type: String, trim: true },
    sponsorCards: [homePromoCardSchema],
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.HomePlacement || mongoose.model("HomePlacement", homePlacementSchema);
