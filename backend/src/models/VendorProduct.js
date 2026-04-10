const { Schema, model, models } = require("mongoose");

const STATUS_VALUES = ["draft", "pending", "live", "rejected", "archived"];
const STORE_PLACEMENT_VALUES = ["featured", "trending"];

const labelValueSchema = new Schema(
  {
    label: { type: String, trim: true },
    value: { type: String, trim: true },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const variantSchema = new Schema(
  {
    size: { type: String, trim: true },
    color: { type: String, trim: true },
    mrp: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    image: { type: String, trim: true },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const vendorProductSchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    slug: { type: String, required: true, trim: true, lowercase: true },

    categorySlug: { type: String, required: true, trim: true, lowercase: true },
    categoryLabel: { type: String, trim: true },
    subcategorySlug: { type: String, required: true, trim: true, lowercase: true },
    subcategoryName: { type: String, trim: true },

    productName: { type: String, required: true, trim: true },
    shortDescription: { type: String, trim: true },
    description: { type: String, trim: true },

    image: { type: String, trim: true },
    heroImage: { type: String, trim: true },
    subcategoryImage: { type: String, trim: true },
    gallery: [{ type: String, trim: true }],

    price: { type: Number, default: 0 },
    oldPrice: { type: Number, default: 0 },
    inventory: { type: Number, default: 0 },
    moq: { type: Number, default: 0 },

    badge: { type: String, trim: true },
    brand: { type: String, trim: true },
    sellerName: { type: String, trim: true },
    vendorSource: { type: String, trim: true },

    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },

    deliveryByText: { type: String, trim: true },
    shippingLabel: { type: String, trim: true },
    shippingTimeline: { type: String, trim: true },
    isCancellable: { type: Boolean, default: false },
    isReturnable: { type: Boolean, default: false },

    highlights: [{ type: String, trim: true }],
    keyAttributes: { type: [labelValueSchema], default: [] },
    specifications: { type: [labelValueSchema], default: [] },
    tags: [{ type: String, trim: true }],
    variantData: { type: [variantSchema], default: [] },

    status: { type: String, enum: STATUS_VALUES, default: "draft" },
    storePlacement: { type: String, enum: STORE_PLACEMENT_VALUES },
    isDeleted: { type: Boolean, default: false },
    publishedAt: { type: Date },

    sourcePlatform: { type: String, trim: true, default: "vendor-panel" },
    sourceRecordId: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

vendorProductSchema.index({ vendor: 1, slug: 1 }, { unique: true });
vendorProductSchema.index({ vendor: 1, status: 1, updatedAt: -1 });
vendorProductSchema.index({ categorySlug: 1, subcategorySlug: 1, status: 1, updatedAt: -1 });

module.exports = models.VendorProduct || model("VendorProduct", vendorProductSchema);
