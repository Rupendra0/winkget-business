const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");
const VendorProduct = require("../models/VendorProduct");
const { resolveTokenFromRequest } = require("../lib/authCookies");

const router = express.Router();

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const ORDER_MODE_VALUES = new Set(["cart", "buy-now"]);
const PAYMENT_METHOD_VALUES = new Set(["cod", "razorpay", "upi", "card", "netbanking", "wallet"]);
const ADMIN_STATUS_VALUES = new Set(["Pending", "Disputed", "Completed"]);

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.verify(token, secret);
};

const normalizeString = (value) => String(value || "").trim();

const normalizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 10);

const toNonNegativeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return Math.max(0, Number(fallback) || 0);
  }

  return parsed;
};

const toPositiveInteger = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Math.max(1, Math.round(Number(fallback) || 1));
  }

  return Math.max(1, Math.round(parsed));
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const formatPriceText = (value) => `₹${Math.max(0, Math.round(Number(value) || 0)).toLocaleString("en-IN")}`;

const isObjectId = (value) => OBJECT_ID_REGEX.test(normalizeString(value));

const computeTotals = (items) => {
  const normalizedItems = Array.isArray(items) ? items : [];

  const subtotal = normalizedItems.reduce(
    (sum, item) => sum + toNonNegativeNumber(item.price) * toPositiveInteger(item.quantity),
    0
  );

  const mrp = normalizedItems.reduce((sum, item) => {
    const effectiveMrp = toNonNegativeNumber(item.oldPrice) > 0 ? toNonNegativeNumber(item.oldPrice) : toNonNegativeNumber(item.price);
    return sum + effectiveMrp * toPositiveInteger(item.quantity);
  }, 0);

  const savings = Math.max(0, mrp - subtotal);
  const shippingFee = subtotal > 0 && subtotal < 499 ? 49 : 0;
  const platformFee = normalizedItems.length > 0 ? 7 : 0;
  const total = Math.max(0, subtotal + shippingFee + platformFee);

  return {
    mrp,
    subtotal,
    savings,
    shippingFee,
    platformFee,
    total,
  };
};

const requireAuthenticated = (authContext) => async (req, res, next) => {
  try {
    const token = resolveTokenFromRequest(req, authContext);
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub)
      .select("_id role name email phone vendorStatus")
      .lean();

    if (!user) {
      return res.status(401).json({ ok: false, message: "Session expired" });
    }

    req.authUser = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ ok: false, message: "Session expired" });
  }
};

const requireCustomer = (req, res, next) => {
  if (!req.authUser || req.authUser.role !== "customer") {
    return res.status(403).json({ ok: false, message: "Customer access required" });
  }

  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.authUser || req.authUser.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Admin access required" });
  }

  return next();
};

const requireVendor = (req, res, next) => {
  if (!req.authUser || req.authUser.role !== "vendor") {
    return res.status(403).json({ ok: false, message: "Vendor access required" });
  }

  if (req.authUser.vendorStatus && req.authUser.vendorStatus !== "approved") {
    return res.status(403).json({ ok: false, message: "Vendor account is not approved" });
  }

  return next();
};

const toOrderAddress = (input) => {
  const source = input && typeof input === "object" ? input : {};

  const fullName = normalizeString(source.fullName);
  const phone = normalizePhone(source.phone);
  const line1 = normalizeString(source.line1);
  const city = normalizeString(source.city);
  const state = normalizeString(source.state);
  const postalCode = normalizeString(source.postalCode);

  if (!fullName || !phone || !line1 || !city || !state || !postalCode) {
    return null;
  }

  const tagInput = normalizeString(source.tag);
  const tag = tagInput === "Home" || tagInput === "Work" || tagInput === "Other" ? tagInput : "Home";

  const nowIso = new Date().toISOString();

  return {
    id: normalizeString(source.id) || `addr-${Date.now().toString(36)}`,
    fullName,
    phone,
    line1,
    line2: normalizeString(source.line2) || undefined,
    landmark: normalizeString(source.landmark) || undefined,
    city,
    state,
    postalCode,
    tag,
    createdAt: normalizeString(source.createdAt) || nowIso,
    updatedAt: nowIso,
  };
};

const toStoredItems = async (itemsInput) => {
  if (!Array.isArray(itemsInput)) {
    return { items: [], vendors: [] };
  }

  const rawItems = itemsInput
    .map((item) => (item && typeof item === "object" ? item : null))
    .filter(Boolean);

  const candidateProductIds = rawItems
    .map((item) => {
      const product = item.product && typeof item.product === "object" ? item.product : {};
      return normalizeString(product.id || item.productId);
    })
    .filter((productId) => isObjectId(productId));

  const uniqueProductIds = Array.from(new Set(candidateProductIds));
  const productDocs =
    uniqueProductIds.length > 0
      ? await VendorProduct.find({ _id: { $in: uniqueProductIds } })
          .select("_id vendor productName image price oldPrice categoryLabel sellerName")
          .lean()
      : [];

  const productMap = new Map(productDocs.map((product) => [String(product._id), product]));

  const vendorObjectIdByKey = new Map();
  const storedItems = [];

  rawItems.forEach((item, index) => {
    const product = item.product && typeof item.product === "object" ? item.product : {};

    const productId = normalizeString(product.id || item.productId);
    const productDoc = productMap.get(productId);

    const vendorIdCandidate = normalizeString(
      product.storeId || item.storeId || item.vendorId || (productDoc?.vendor ? String(productDoc.vendor) : "")
    );

    let vendorObjectId = null;
    if (productDoc?.vendor) {
      const vendorToken = String(productDoc.vendor);
      if (isObjectId(vendorToken)) {
        vendorObjectId = new mongoose.Types.ObjectId(vendorToken);
      }
    }

    if (!vendorObjectId && isObjectId(vendorIdCandidate)) {
      vendorObjectId = new mongoose.Types.ObjectId(vendorIdCandidate);
    }

    const quantity = toPositiveInteger(item.quantity, 1);
    const price = toNonNegativeNumber(product.price, toNonNegativeNumber(productDoc?.price, 0));
    const oldPrice = toNonNegativeNumber(product.oldPrice, toNonNegativeNumber(productDoc?.oldPrice, price));

    const name =
      normalizeString(product.name) ||
      normalizeString(productDoc?.productName) ||
      `Order Item ${index + 1}`;

    if (!name) {
      return;
    }

    const vendorKey = vendorObjectId ? String(vendorObjectId) : normalizeString(vendorIdCandidate);
    if (vendorObjectId && vendorKey && !vendorObjectIdByKey.has(vendorKey)) {
      vendorObjectIdByKey.set(vendorKey, vendorObjectId);
    }

    storedItems.push({
      product: productDoc?._id ? new mongoose.Types.ObjectId(String(productDoc._id)) : undefined,
      productId: productId || normalizeString(item.productId),
      vendor: vendorObjectId || undefined,
      vendorId: vendorKey || undefined,
      name,
      image: normalizeString(product.image) || normalizeString(productDoc?.image) || "",
      quantity,
      price,
      oldPrice,
      categoryLabel: normalizeString(product.categoryLabel) || normalizeString(productDoc?.categoryLabel) || "Products",
      sellerName: normalizeString(product.sellerName) || normalizeString(productDoc?.sellerName) || "Winkget Seller",
      href: normalizeString(product.href) || "/",
    });
  });

  return {
    items: storedItems,
    vendors: Array.from(vendorObjectIdByKey.values()),
  };
};

const toStorefrontCartItem = (item, index) => {
  const price = toNonNegativeNumber(item.price, 0);
  const oldPrice = toNonNegativeNumber(item.oldPrice, price);
  const productId = normalizeString(item.productId || (item.product ? String(item.product) : "")) || `item-${index + 1}`;
  const storeId = normalizeString(item.vendorId || (item.vendor ? String(item.vendor) : "")) || "store";

  return {
    product: {
      id: productId,
      storeId,
      name: normalizeString(item.name) || "Product",
      image: normalizeString(item.image) || "",
      price,
      oldPrice,
      priceText: formatPriceText(price),
      oldPriceText: formatPriceText(oldPrice),
      sellerName: normalizeString(item.sellerName) || "Winkget Seller",
      categoryLabel: normalizeString(item.categoryLabel) || "Products",
      href: normalizeString(item.href) || "/",
    },
    quantity: toPositiveInteger(item.quantity, 1),
  };
};

const toCustomerOrder = (order) => {
  const orderData = order && typeof order === "object" ? order : {};
  const status = normalizeString(orderData.status);

  return {
    id: String(orderData._id || orderData.id || ""),
    orderNo: normalizeString(orderData.orderNo),
    userId: String(orderData.customer || ""),
    createdAt: orderData.createdAt,
    mode: orderData.mode === "buy-now" ? "buy-now" : "cart",
    items: Array.isArray(orderData.items) ? orderData.items.map(toStorefrontCartItem) : [],
    totals: {
      mrp: toNonNegativeNumber(orderData.totals?.mrp, 0),
      subtotal: toNonNegativeNumber(orderData.totals?.subtotal, 0),
      savings: toNonNegativeNumber(orderData.totals?.savings, 0),
      shippingFee: toNonNegativeNumber(orderData.totals?.shippingFee, 0),
      platformFee: toNonNegativeNumber(orderData.totals?.platformFee, 0),
      total: toNonNegativeNumber(orderData.totals?.total, 0),
    },
    address: orderData.address,
    paymentMethod: normalizeString(orderData.paymentMethod) || "cod",
    paymentStatus: normalizeString(orderData.paymentStatus) || "pending",
    orderStatus: normalizeString(orderData.orderStatus) || "placed",
    status: ADMIN_STATUS_VALUES.has(status) ? status : "Pending",
  };
};

const toAdminOrderSummary = (order) => {
  const orderData = order && typeof order === "object" ? order : {};

  const customerName =
    normalizeString(orderData.customerSnapshot?.name) ||
    normalizeString(orderData.customerName) ||
    "Customer";

  const status = normalizeString(orderData.status);

  return {
    id: String(orderData._id || orderData.id || ""),
    orderNo: normalizeString(orderData.orderNo),
    customer: customerName,
    amount: Math.round(toNonNegativeNumber(orderData.totals?.total, 0)),
    status: ADMIN_STATUS_VALUES.has(status) ? status : "Pending",
    createdAt: orderData.createdAt,
  };
};

const toVendorOrderAddress = (address) => {
  const addressData = address && typeof address === "object" ? address : {};

  return {
    fullName: normalizeString(addressData.fullName) || "Customer",
    phone: normalizePhone(addressData.phone),
    line1: normalizeString(addressData.line1),
    line2: normalizeString(addressData.line2),
    landmark: normalizeString(addressData.landmark),
    city: normalizeString(addressData.city),
    state: normalizeString(addressData.state),
    postalCode: normalizeString(addressData.postalCode),
  };
};

const toVendorOrderSummary = (order, vendorId) => {
  const orderData = order && typeof order === "object" ? order : {};
  const rawItems = Array.isArray(orderData.items) ? orderData.items : [];

  const vendorItems = rawItems.filter((item) => {
    const itemVendorId = normalizeString(item.vendorId || (item.vendor ? String(item.vendor) : ""));
    return itemVendorId && itemVendorId === vendorId;
  });

  if (vendorItems.length === 0) {
    return null;
  }

  const subtotal = vendorItems.reduce(
    (sum, item) => sum + toNonNegativeNumber(item.price, 0) * toPositiveInteger(item.quantity, 1),
    0
  );
  const mrp = vendorItems.reduce((sum, item) => {
    const effectiveMrp = toNonNegativeNumber(item.oldPrice, 0) > 0 ? toNonNegativeNumber(item.oldPrice, 0) : toNonNegativeNumber(item.price, 0);
    return sum + effectiveMrp * toPositiveInteger(item.quantity, 1);
  }, 0);
  const savings = Math.max(0, mrp - subtotal);

  const itemCount = vendorItems.reduce((sum, item) => sum + toPositiveInteger(item.quantity, 1), 0);
  const status = normalizeString(orderData.status);
  const vendorCount = Array.isArray(orderData.vendors) ? orderData.vendors.length : 0;
  const shippingFee = vendorCount <= 1 ? toNonNegativeNumber(orderData.totals?.shippingFee, 0) : 0;
  const platformFee = vendorCount <= 1 ? toNonNegativeNumber(orderData.totals?.platformFee, 0) : 0;
  const amount = Math.round(Math.max(0, subtotal + shippingFee + platformFee));

  return {
    id: String(orderData._id || orderData.id || ""),
    orderNo: normalizeString(orderData.orderNo),
    customer:
      normalizeString(orderData.customerSnapshot?.name) ||
      normalizeString(orderData.customerName) ||
      "Customer",
    customerEmail: normalizeString(orderData.customerSnapshot?.email),
    customerPhone: normalizePhone(orderData.customerSnapshot?.phone),
    amount: Math.round(amount),
    status: ADMIN_STATUS_VALUES.has(status) ? status : "Pending",
    paymentMethod: normalizeString(orderData.paymentMethod) || "cod",
    paymentStatus: normalizeString(orderData.paymentStatus) || "pending",
    createdAt: orderData.createdAt,
    itemCount,
    address: toVendorOrderAddress(orderData.address),
    totals: {
      mrp: Math.round(mrp),
      subtotal: Math.round(subtotal),
      savings: Math.round(savings),
      shippingFee: Math.round(shippingFee),
      platformFee: Math.round(platformFee),
      total: amount,
    },
    items: vendorItems.map((item) => ({
      id: normalizeString(item.productId || (item.product ? String(item.product) : "")),
      name: normalizeString(item.name) || "Product",
      quantity: toPositiveInteger(item.quantity, 1),
      price: Math.round(toNonNegativeNumber(item.price, 0)),
      oldPrice: Math.round(toNonNegativeNumber(item.oldPrice, 0)),
      image: normalizeString(item.image) || "",
    })),
  };
};

const buildOrderNo = async () => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = `#WG${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const exists = await Order.findOne({ orderNo: candidate }).select("_id").lean();
    if (!exists) {
      return candidate;
    }
  }

  return `#WG${Date.now().toString(36).toUpperCase()}`;
};

router.post("/orders", requireAuthenticated("customer"), requireCustomer, async (req, res) => {
  try {
    const modeInput = normalizeString(req.body?.mode).toLowerCase();
    const paymentMethodInput = normalizeString(req.body?.paymentMethod).toLowerCase();

    if (!ORDER_MODE_VALUES.has(modeInput)) {
      return res.status(400).json({ ok: false, message: "Invalid checkout mode" });
    }

    if (!PAYMENT_METHOD_VALUES.has(paymentMethodInput)) {
      return res.status(400).json({ ok: false, message: "Invalid payment method" });
    }

    const { items, vendors } = await toStoredItems(req.body?.items);
    if (items.length === 0) {
      return res.status(400).json({ ok: false, message: "Order must include at least one item" });
    }

    const address = toOrderAddress(req.body?.address);
    if (!address) {
      return res.status(400).json({ ok: false, message: "Complete delivery address is required" });
    }

    const totals = computeTotals(items);
    const orderNo = await buildOrderNo();

    const createdOrder = await Order.create({
      orderNo,
      customer: req.authUser._id,
      customerSnapshot: {
        name: normalizeString(req.authUser.name),
        email: normalizeString(req.authUser.email),
        phone: normalizePhone(req.authUser.phone),
      },
      mode: modeInput,
      items,
      vendors,
      totals,
      address,
      paymentMethod: paymentMethodInput,
      paymentStatus: paymentMethodInput === "cod" ? "cod_pending" : "paid",
      orderStatus: "placed",
      status: "Pending",
    });

    return res.status(201).json({
      ok: true,
      message: "Order placed successfully",
      order: toCustomerOrder(createdOrder.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to place order", error: error.message });
  }
});

router.get("/orders/my", requireAuthenticated("customer"), requireCustomer, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 120), 1), 300);

    const orders = await Order.find({ customer: req.authUser._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      ok: true,
      orders: orders.map(toCustomerOrder),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load orders", error: error.message });
  }
});

router.get("/orders/my/:orderId", requireAuthenticated("customer"), requireCustomer, async (req, res) => {
  try {
    const orderId = normalizeString(req.params.orderId);
    if (!isObjectId(orderId)) {
      return res.status(400).json({ ok: false, message: "Invalid order id" });
    }

    const order = await Order.findOne({
      _id: orderId,
      customer: req.authUser._id,
    }).lean();

    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    return res.status(200).json({
      ok: true,
      order: toCustomerOrder(order),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load order", error: error.message });
  }
});

router.get("/orders", requireAuthenticated("admin"), requireAdmin, async (req, res) => {
  try {
    const statusInput = normalizeString(req.query.status);
    const searchInput = normalizeString(req.query.search);
    const limit = Math.min(Math.max(Number(req.query.limit || 120), 1), 500);

    const query = {};

    if (statusInput) {
      if (!ADMIN_STATUS_VALUES.has(statusInput)) {
        return res.status(400).json({ ok: false, message: "Invalid order status" });
      }
      query.status = statusInput;
    }

    if (searchInput) {
      const regex = new RegExp(escapeRegex(searchInput), "i");
      query.$or = [
        { orderNo: regex },
        { "customerSnapshot.name": regex },
        { "customerSnapshot.phone": regex },
      ];
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      ok: true,
      orders: orders.map(toAdminOrderSummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load admin orders", error: error.message });
  }
});

router.get("/orders/vendor", requireAuthenticated("vendor"), requireVendor, async (req, res) => {
  try {
    const vendorId = String(req.authUser._id);
    const statusInput = normalizeString(req.query.status);
    const searchInput = normalizeString(req.query.search);
    const limit = Math.min(Math.max(Number(req.query.limit || 120), 1), 500);

    const query = {
      vendors: req.authUser._id,
    };

    if (statusInput) {
      if (!ADMIN_STATUS_VALUES.has(statusInput)) {
        return res.status(400).json({ ok: false, message: "Invalid order status" });
      }
      query.status = statusInput;
    }

    if (searchInput) {
      const regex = new RegExp(escapeRegex(searchInput), "i");
      query.$or = [
        { orderNo: regex },
        { "customerSnapshot.name": regex },
        { "items.name": regex },
      ];
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const mappedOrders = orders
      .map((order) => toVendorOrderSummary(order, vendorId))
      .filter(Boolean);

    const summary = mappedOrders.reduce(
      (accumulator, order) => {
        accumulator.total += 1;
        accumulator.revenue += toNonNegativeNumber(order.amount, 0);

        if (order.status === "Pending") accumulator.pending += 1;
        if (order.status === "Completed") accumulator.completed += 1;
        if (order.status === "Disputed") accumulator.disputed += 1;

        return accumulator;
      },
      {
        total: 0,
        pending: 0,
        completed: 0,
        disputed: 0,
        revenue: 0,
      }
    );

    return res.status(200).json({
      ok: true,
      summary,
      orders: mappedOrders,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load vendor orders", error: error.message });
  }
});

router.patch("/orders/:orderId/status", requireAuthenticated("admin"), requireAdmin, async (req, res) => {
  try {
    const orderId = normalizeString(req.params.orderId);
    const nextStatus = normalizeString(req.body?.status);

    if (!isObjectId(orderId)) {
      return res.status(400).json({ ok: false, message: "Invalid order id" });
    }

    if (!ADMIN_STATUS_VALUES.has(nextStatus)) {
      return res.status(400).json({ ok: false, message: "Invalid order status" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, { $set: { status: nextStatus } }, { new: true }).lean();
    if (!updatedOrder) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    return res.status(200).json({
      ok: true,
      message: "Order status updated",
      order: toAdminOrderSummary(updatedOrder),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update order status", error: error.message });
  }
});

router.patch("/orders/vendor/:orderId/status", requireAuthenticated("vendor"), requireVendor, async (req, res) => {
  try {
    const vendorId = String(req.authUser._id);
    const orderId = normalizeString(req.params.orderId);
    const nextStatus = normalizeString(req.body?.status);

    if (!isObjectId(orderId)) {
      return res.status(400).json({ ok: false, message: "Invalid order id" });
    }

    if (!ADMIN_STATUS_VALUES.has(nextStatus)) {
      return res.status(400).json({ ok: false, message: "Invalid order status" });
    }

    const existingOrder = await Order.findOne({
      _id: orderId,
      vendors: req.authUser._id,
    })
      .select("_id vendors status")
      .lean();

    if (!existingOrder) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    const vendorCount = Array.isArray(existingOrder.vendors) ? existingOrder.vendors.length : 0;
    if (vendorCount > 1) {
      return res.status(409).json({
        ok: false,
        message: "Status update is available only for single-vendor orders",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: nextStatus } },
      { new: true }
    ).lean();

    if (!updatedOrder) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    const summaryOrder = toVendorOrderSummary(updatedOrder, vendorId);
    if (!summaryOrder) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    return res.status(200).json({
      ok: true,
      message: "Order status updated",
      order: summaryOrder,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update order status", error: error.message });
  }
});

module.exports = router;
