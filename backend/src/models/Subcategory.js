const { Schema, model, models } = require("mongoose");

const customFormFieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["text", "textarea", "number", "date", "select", "multi-select", "email", "phone", "url"],
      default: "text",
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String, trim: true },
    helpText: { type: String, trim: true },
    options: [{ type: String, trim: true }],
    span: { type: Number, enum: [6, 12], default: 12 },
    sortOrder: { type: Number, default: 0 },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const subcategorySchema = new Schema(
  {
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    parentSubcategory: { type: Schema.Types.ObjectId, ref: "Subcategory", default: null },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    customFormEnabled: { type: Boolean, default: false },
    customFormTitle: { type: String, trim: true },
    customFormFields: { type: [customFormFieldSchema], default: [] },
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
