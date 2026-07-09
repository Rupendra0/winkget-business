const { Schema, model, models } = require("mongoose");

const userSchema = new Schema(
  {
    name: { type: String, trim: true },
    businessName: { type: String, trim: true },
    slug: { type: String, trim: true, sparse: true, unique: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    phone: { type: String, trim: true, unique: true, sparse: true },
    businessCategory: { type: Schema.Types.ObjectId, ref: "Category" },
    businessSubcategory: { type: Schema.Types.ObjectId, ref: "Subcategory" },
    businessEmail: { type: String, trim: true, lowercase: true },
    businessPhone: { type: String, trim: true },
    businessAddress: { type: String, trim: true },
    city: { type: String, trim: true },
    sublocality: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    gstDocument: { type: String },
    website: { type: String, trim: true },
    shopOpeningTime: { type: String, trim: true },
    shopClosingTime: { type: String, trim: true },
    storeStatusMode: { type: String, enum: ["auto", "manual"], default: "auto" },
    manualStoreStatus: { type: String, enum: ["open", "closed"] },
    manualStoreStatusUpdatedAt: { type: Date },
    establishmentYear: { type: Number, min: 1800, max: 3000 },
    serviceTags: [{ type: String, trim: true }],
    businessDescription: { type: String, trim: true },
    shopBannerImage: { type: String, trim: true },
    cardImage: { type: String, trim: true },
    myStoreImage: { type: String, trim: true },
    paymentQrCode: { type: String, trim: true },
    myStoreBannerImage: { type: String, trim: true },
    shopGallery: [{ type: String, trim: true }],
    instagramUrl: { type: String, trim: true },
    facebookUrl: { type: String, trim: true },
    youtubeUrl: { type: String, trim: true },
    idProofType: {
      type: String,
      enum: ["aadhaar", "pan", "driving_license", "passport", "voter_id", "other"],
    },
    idProofNumber: { type: String, trim: true },
    idProofDocument: { type: String },
    marketingOptIn: { type: Boolean, default: false },
    customFormData: { type: Schema.Types.Mixed },
    vendorStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    vendorReviewNote: { type: String, trim: true },
    businessType: {
      type: String,
      enum: ["restaurant", "store", "service"],
      default: "store",
    },
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

// Query acceleration for vendor lists and public catalog filters.
userSchema.index({ role: 1, vendorStatus: 1, updatedAt: -1, businessName: 1, name: 1 });
userSchema.index({ role: 1, vendorStatus: 1, businessCategory: 1, updatedAt: -1, businessName: 1, name: 1 });
userSchema.index({ role: 1, vendorStatus: 1, businessSubcategory: 1, updatedAt: -1, businessName: 1, name: 1 });
userSchema.index({ role: 1, vendorStatus: 1, city: 1, updatedAt: -1, businessName: 1, name: 1 });
userSchema.index({ role: 1, vendorStatus: 1, city: 1, sublocality: 1, updatedAt: -1, businessName: 1, name: 1 });
userSchema.index({ role: 1, vendorStatus: 1, businessCategory: 1, city: 1, updatedAt: -1, businessName: 1, name: 1 });
userSchema.index({ role: 1, vendorStatus: 1, businessCategory: 1, city: 1, sublocality: 1, updatedAt: -1, businessName: 1, name: 1 });
userSchema.index({ role: 1, vendorStatus: 1, updatedAt: -1 });
userSchema.index({ role: 1, vendorStatus: 1, createdAt: -1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ name: 1 });
userSchema.index({ role: 1, vendorStatus: 1, businessCategory: 1, businessSubcategory: 1 });
userSchema.index({ role: 1, vendorStatus: 1, city: 1, sublocality: 1 });
userSchema.index({ businessEmail: 1 }, { sparse: true });
userSchema.index({ businessPhone: 1 }, { sparse: true });

userSchema.pre("save", async function (next) {
  if (this.role === "vendor") {
    if (!this.slug || this.isModified("businessName") || this.isModified("name")) {
      const base = String(this.businessName || this.name || "vendor")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      
      let targetSlug = base;
      let counter = 1;
      
      while (true) {
        const existing = await this.constructor.findOne({
          slug: targetSlug,
          _id: { $ne: this._id }
        }).select("_id").lean();
        
        if (!existing) {
          break;
        }
        
        targetSlug = `${base}${counter}`;
        counter++;
      }
      
      this.slug = targetSlug;
    }
  }
  next();
});

module.exports = models.User || model("User", userSchema);
