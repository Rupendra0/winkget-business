const { Schema, model, models } = require("mongoose");

const cityLocalitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  {
    _id: true,
    versionKey: false,
  }
);

const citySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    state: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    image: { type: String, trim: true },
    localities: { type: [cityLocalitySchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

citySchema.index({ isActive: 1, sortOrder: 1, name: 1 });
citySchema.index({ "localities.slug": 1 });

module.exports = models.City || model("City", citySchema);
