const { Schema, model, models } = require("mongoose");

const ORDER_STATUS_VALUES = ["Pending", "Disputed", "Completed"];
const PAYMENT_METHOD_VALUES = ["cod", "razorpay", "upi", "card", "netbanking", "wallet"];
const PAYMENT_STATUS_VALUES = ["pending", "paid", "cod_pending"];
const ORDER_FLOW_STATUS_VALUES = ["placed", "confirmed", "cancelled"];
const ORDER_MODE_VALUES = ["cart", "buy-now"];

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "VendorProduct" },
    productId: { type: String, trim: true },
    vendor: { type: Schema.Types.ObjectId, ref: "User", index: true },
    vendorId: { type: String, trim: true },
    name: { type: String, trim: true, required: true },
    image: { type: String, trim: true },
    quantity: { type: Number, min: 1, required: true },
    price: { type: Number, min: 0, required: true },
    oldPrice: { type: Number, min: 0, default: 0 },
    categoryLabel: { type: String, trim: true },
    sellerName: { type: String, trim: true },
    href: { type: String, trim: true },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const totalsSchema = new Schema(
  {
    mrp: { type: Number, min: 0, required: true },
    subtotal: { type: Number, min: 0, required: true },
    savings: { type: Number, min: 0, required: true },
    shippingFee: { type: Number, min: 0, required: true },
    platformFee: { type: Number, min: 0, required: true },
    total: { type: Number, min: 0, required: true },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const addressSchema = new Schema(
  {
    id: { type: String, trim: true },
    fullName: { type: String, trim: true, required: true },
    phone: { type: String, trim: true, required: true },
    line1: { type: String, trim: true, required: true },
    line2: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    postalCode: { type: String, trim: true, required: true },
    tag: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
    createdAt: { type: String, trim: true },
    updatedAt: { type: String, trim: true },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const customerSnapshotSchema = new Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
  },
  {
    _id: false,
    versionKey: false,
  }
);

const orderSchema = new Schema(
  {
    orderNo: { type: String, trim: true, required: true, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customerSnapshot: { type: customerSnapshotSchema, default: {} },
    mode: { type: String, enum: ORDER_MODE_VALUES, default: "cart", index: true },
    items: { type: [orderItemSchema], default: [] },
    vendors: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    totals: { type: totalsSchema, required: true },
    address: { type: addressSchema, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHOD_VALUES, default: "cod", required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUS_VALUES, default: "pending", required: true },
    orderStatus: { type: String, enum: ORDER_FLOW_STATUS_VALUES, default: "placed", required: true },
    status: { type: String, enum: ORDER_STATUS_VALUES, default: "Pending", required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ vendors: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

module.exports = models.Order || model("Order", orderSchema);
