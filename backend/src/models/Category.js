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

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
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

module.exports = models.Category || model("Category", categorySchema);
