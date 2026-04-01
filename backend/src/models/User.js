const { Schema, model, models } = require("mongoose");

const userSchema = new Schema(
  {
    name: { type: String, trim: true },
    businessName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    phone: { type: String, trim: true, unique: true, sparse: true },
    alternatePhone: { type: String, trim: true },
    businessCategory: { type: Schema.Types.ObjectId, ref: "Category" },
    businessSubcategory: { type: Schema.Types.ObjectId, ref: "Subcategory" },
    businessEmail: { type: String, trim: true, lowercase: true },
    businessPhone: { type: String, trim: true },
    businessAlternatePhone: { type: String, trim: true },
    businessAddress: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    gstDocument: { type: String },
    website: { type: String, trim: true },
    establishmentYear: { type: Number, min: 1800, max: 3000 },
    yearsInBusiness: { type: Number, min: 0 },
    serviceTags: [{ type: String, trim: true }],
    businessDescription: { type: String, trim: true },
    idProofType: {
      type: String,
      enum: ["aadhaar", "pan", "driving_license", "passport", "voter_id", "other"],
    },
    idProofNumber: { type: String, trim: true },
    idProofDocument: { type: String },
    marketingOptIn: { type: Boolean, default: false },
    vendorStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    vendorReviewNote: { type: String, trim: true },
    passwordHash: { type: String },
    image: { type: String },
    provider: { type: String, default: "credentials" },
    role: {
      type: String,
      enum: ["admin", "vendor", "customer"],
      default: "customer",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = models.User || model("User", userSchema);
