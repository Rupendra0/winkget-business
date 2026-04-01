const { Schema, model, models } = require("mongoose");

const subcategorySchema = new Schema(
  {
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    parentSubcategory: { type: Schema.Types.ObjectId, ref: "Subcategory", default: null },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

subcategorySchema.index({ category: 1, parentSubcategory: 1, slug: 1 }, { unique: true });
subcategorySchema.index({ parentSubcategory: 1, sortOrder: 1, name: 1 });

module.exports = models.Subcategory || model("Subcategory", subcategorySchema);
