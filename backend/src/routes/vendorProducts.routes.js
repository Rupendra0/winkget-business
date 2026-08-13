const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const VendorProduct = require("../models/VendorProduct");
const {
  scheduleProductDelete,
  scheduleProductIndex,
  scheduleVendorIndex,
} = require("../lib/search/indexer");
const { resolveTokenFromRequest } = require("../lib/authCookies");

const router = express.Router();

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const STATUS_VALUES = new Set(["draft", "pending", "live", "rejected", "archived"]);
const STORE_PLACEMENT_VALUES = new Set(["featured", "trending"]);
const PUBLIC_STATUS_VALUES = new Set(["live"]);
const URL_REGEX = /^https?:\/\/[^\s]+$/i;
const IMAGE_DATA_URL_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/;
const MAX_MEDIA_VALUE_LENGTH = 3000000;

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.verify(token, secret);
};

const requireVendor = async (req, res, next) => {
  try {
    const token = resolveTokenFromRequest(req, "vendor");
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const { isTokenBlacklisted } = require("../lib/redis");
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ ok: false, message: "Session revoked" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub)
      .select("_id role vendorStatus businessName")
      .lean();

    if (!user || user.role !== "vendor") {
      return res.status(403).json({ ok: false, message: "Vendor access required" });
    }

    if (user.vendorStatus && user.vendorStatus !== "approved") {
      return res.status(403).json({ ok: false, message: "Vendor account is not approved" });
    }

    req.vendorUser = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ ok: false, message: "Session expired" });
  }
};

const normalizeString = (value) => String(value || "").trim();

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeMediaValue = (value) => normalizeString(value);

const { uploadImage } = require("../lib/mediaStorage");

const isValidMediaValue = (value) => {
  const normalized = normalizeMediaValue(value);
  if (!normalized) return true;
  if (normalized.length > MAX_MEDIA_VALUE_LENGTH) return false;
  if (normalized.startsWith("/uploads/")) return true;
  
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    try {
      const arr = JSON.parse(normalized);
      if (Array.isArray(arr)) {
        return arr.every((item) => isValidMediaValue(item));
      }
    } catch {
      // Fallback
    }
  }
  
  return URL_REGEX.test(normalized) || IMAGE_DATA_URL_REGEX.test(normalized);
};

const toNonNegativeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const toStringArray = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(
    new Set(
      input
        .map((value) => normalizeString(value))
        .filter(Boolean)
    )
  );
};

const toLabelValueArray = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const label = normalizeString(item?.label);
      const value = normalizeString(item?.value);
      if (!label || !value) {
        return null;
      }

      return { label, value };
    })
    .filter(Boolean);
};

const toVariantArray = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const size = normalizeString(item?.size);
      const color = normalizeString(item?.color);
      const image = normalizeMediaValue(item?.image);

      if (image && !isValidMediaValue(image)) {
        return null;
      }

      const variant = {
        size,
        color,
        mrp: toNonNegativeNumber(item?.mrp, 0),
        sellingPrice: toNonNegativeNumber(item?.sellingPrice, 0),
        stock: toNonNegativeNumber(item?.stock, 0),
        image,
        customFields: item?.customFields || {},
      };

      const hasValue =
        variant.size ||
        variant.color ||
        variant.mrp > 0 ||
        variant.sellingPrice > 0 ||
        variant.stock > 0 ||
        variant.image;

      return hasValue ? variant : null;
    })
    .filter(Boolean);
};

const toDescriptionBlockArray = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const image = normalizeMediaValue(item?.image);
      const headline = normalizeString(item?.headline);
      const text = normalizeString(item?.text);

      if (!image && !headline && !text) {
        return null;
      }

      if (image && !isValidMediaValue(image)) {
        return null;
      }

      return { image, headline, text };
    })
    .filter(Boolean);
};

const toDescriptionPointArray = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      const heading = normalizeString(item?.heading);
      const content = normalizeString(item?.content);

      if (!heading && !content) {
        return null;
      }

      return { heading, content };
    })
    .filter(Boolean);
};

const toProductSummary = (product) => ({
  id: String(product._id),
  vendorId: String(product.vendor),
  slug: product.slug,
  categorySlug: product.categorySlug,
  categoryLabel: product.categoryLabel,
  subcategorySlug: product.subcategorySlug,
  subcategoryName: product.subcategoryName,
  productName: product.productName,
  barcode: product.barcode,
  shortDescription: product.shortDescription,
  description: product.description,
  detailedDescription: product.detailedDescription,
  originCountry: product.originCountry,
  supplierName: product.supplierName,
  image: product.image,
  heroImage: product.heroImage,
  subcategoryImage: product.subcategoryImage,
  gallery: Array.isArray(product.gallery) ? product.gallery : [],
  price: Number(product.price || 0),
  oldPrice: Number(product.oldPrice || 0),
  inventory: Number(product.inventory || 0),
  moq: Number(product.moq || 0),
  badge: product.badge,
  brand: product.brand,
  sellerName: product.sellerName,
  vendorSource: product.vendorSource,
  rating: Number(product.rating || 0),
  reviews: Number(product.reviews || 0),
  deliveryByText: product.deliveryByText,
  shippingLabel: product.shippingLabel,
  shippingTimeline: product.shippingTimeline,
  isCancellable: Boolean(product.isCancellable),
  isReturnable: Boolean(product.isReturnable),
  highlights: Array.isArray(product.highlights) ? product.highlights : [],
  keyAttributes: Array.isArray(product.keyAttributes) ? product.keyAttributes : [],
  specifications: Array.isArray(product.specifications) ? product.specifications : [],
  tags: Array.isArray(product.tags) ? product.tags : [],
  variantData: Array.isArray(product.variantData) ? product.variantData : [],
  detailedDescriptionBlocks: Array.isArray(product.detailedDescriptionBlocks) ? product.detailedDescriptionBlocks : [],
  descriptionPoints: Array.isArray(product.descriptionPoints) ? product.descriptionPoints : [],
  status: product.status,
  storePlacement: product.storePlacement,
  showDeliveryBadge: product.showDeliveryBadge !== false,
  showTopBrand: Boolean(product.showTopBrand),
  showFreeDelivery: product.showFreeDelivery !== false,
  showSecureTransaction: product.showSecureTransaction !== false,
  showCashOnDelivery: Boolean(product.showCashOnDelivery),
  show7DaySupport: product.show7DaySupport !== false,
  showAssured: Boolean(product.showAssured),
  sourcePlatform: product.sourcePlatform,
  sourceRecordId: product.sourceRecordId,
  publishedAt: product.publishedAt,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const PUBLIC_PRODUCT_SUMMARY_FIELDS = [
  "_id",
  "vendor",
  "slug",
  "categorySlug",
  "categoryLabel",
  "subcategorySlug",
  "subcategoryName",
  "productName",
  "shortDescription",
  "description",
  "detailedDescription",
  "originCountry",
  "supplierName",
  "image",
  "heroImage",
  "subcategoryImage",
  "gallery",
  "price",
  "oldPrice",
  "inventory",
  "moq",
  "badge",
  "brand",
  "sellerName",
  "vendorSource",
  "rating",
  "reviews",
  "deliveryByText",
  "shippingLabel",
  "shippingTimeline",
  "isCancellable",
  "isReturnable",
  "highlights",
  "keyAttributes",
  "specifications",
  "tags",
  "variantData",
  "detailedDescriptionBlocks",
  "descriptionPoints",
  "status",
  "storePlacement",
  "showDeliveryBadge",
  "showTopBrand",
  "showFreeDelivery",
  "showSecureTransaction",
  "showCashOnDelivery",
  "show7DaySupport",
  "showAssured",
  "sourcePlatform",
  "sourceRecordId",
  "publishedAt",
  "createdAt",
  "updatedAt",
].join(" ");

const PUBLIC_PRODUCT_STORE_FIELDS = [
  "_id",
  "vendor",
  "slug",
  "categorySlug",
  "categoryLabel",
  "subcategorySlug",
  "subcategoryName",
  "productName",
  "shortDescription",
  "description",
  "detailedDescription",
  "image",
  "heroImage",
  "gallery",
  "price",
  "oldPrice",
  "inventory",
  "moq",
  "badge",
  "brand",
  "sellerName",
  "supplierName",
  "vendorSource",
  "rating",
  "reviews",
  "deliveryByText",
  "shippingLabel",
  "shippingTimeline",
  "isCancellable",
  "isReturnable",
  "highlights",
  "keyAttributes",
  "specifications",
  "tags",
  "variantData",
  "descriptionPoints",
  "detailedDescriptionBlocks",
  "status",
  "storePlacement",
  "showDeliveryBadge",
  "showTopBrand",
  "showFreeDelivery",
  "showSecureTransaction",
  "showCashOnDelivery",
  "show7DaySupport",
  "showAssured",
  "createdAt",
  "updatedAt",
].join(" ");

const toProductStoreSummary = (product) => ({
  id: String(product._id),
  vendorId: String(product.vendor),
  slug: product.slug,
  categorySlug: product.categorySlug,
  categoryLabel: product.categoryLabel,
  subcategorySlug: product.subcategorySlug,
  subcategoryName: product.subcategoryName,
  productName: product.productName,
  barcode: product.barcode,
  shortDescription: product.shortDescription,
  description: product.description,
  detailedDescription: product.detailedDescription,
  image: product.image,
  heroImage: product.heroImage,
  gallery: Array.isArray(product.gallery) ? product.gallery : [],
  price: Number(product.price || 0),
  oldPrice: Number(product.oldPrice || 0),
  inventory: Number(product.inventory || 0),
  moq: Number(product.moq || 0),
  badge: product.badge,
  brand: product.brand,
  sellerName: product.sellerName,
  supplierName: product.supplierName,
  vendorSource: product.vendorSource,
  rating: Number(product.rating || 0),
  reviews: Number(product.reviews || 0),
  deliveryByText: product.deliveryByText,
  shippingLabel: product.shippingLabel,
  shippingTimeline: product.shippingTimeline,
  isCancellable: Boolean(product.isCancellable),
  isReturnable: Boolean(product.isReturnable),
  highlights: Array.isArray(product.highlights) ? product.highlights : [],
  keyAttributes: Array.isArray(product.keyAttributes) ? product.keyAttributes : [],
  specifications: Array.isArray(product.specifications) ? product.specifications : [],
  tags: Array.isArray(product.tags) ? product.tags : [],
  variantData: Array.isArray(product.variantData) ? product.variantData : [],
  descriptionPoints: Array.isArray(product.descriptionPoints) ? product.descriptionPoints : [],
  detailedDescriptionBlocks: Array.isArray(product.detailedDescriptionBlocks) ? product.detailedDescriptionBlocks : [],
  status: product.status,
  storePlacement: product.storePlacement,
  showDeliveryBadge: product.showDeliveryBadge !== false,
  showTopBrand: Boolean(product.showTopBrand),
  showFreeDelivery: product.showFreeDelivery !== false,
  showSecureTransaction: product.showSecureTransaction !== false,
  showCashOnDelivery: Boolean(product.showCashOnDelivery),
  show7DaySupport: product.show7DaySupport !== false,
  showAssured: Boolean(product.showAssured),
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const buildProductDocumentInput = (body, existingProduct = null) => {
  const categorySlug = slugify(body?.categorySlug || existingProduct?.categorySlug);
  const subcategorySlug = slugify(body?.subcategorySlug || existingProduct?.subcategorySlug || "");
  const productName = normalizeString(body?.productName || existingProduct?.productName);
  const categoryLabel = normalizeString(body?.categoryLabel || existingProduct?.categoryLabel);
  const subcategoryName = normalizeString(body?.subcategoryName || existingProduct?.subcategoryName || "");

  if (!categorySlug) {
    return { error: "Category slug is required" };
  }

  if (!productName) {
    return { error: "Product name is required" };
  }

  const image = normalizeMediaValue(body?.image ?? existingProduct?.image);
  const heroImage = normalizeMediaValue(body?.heroImage ?? existingProduct?.heroImage);
  const subcategoryImage = normalizeMediaValue(body?.subcategoryImage ?? existingProduct?.subcategoryImage);
  const gallery = Array.isArray(body?.gallery)
    ? Array.from(
        new Set(
          body.gallery
            .map((item) => normalizeMediaValue(item))
            .filter(Boolean)
        )
      )
    : Array.isArray(existingProduct?.gallery)
      ? existingProduct.gallery
      : [];

  const allImages = [image, heroImage, subcategoryImage, ...gallery].filter(Boolean);
  const hasInvalidImage = allImages.some((item) => !isValidMediaValue(item));
  if (hasInvalidImage) {
    return { error: "Images must be valid URLs or image data values" };
  }

  const statusInput = normalizeString(body?.status || existingProduct?.status || "draft").toLowerCase();
  const status = STATUS_VALUES.has(statusInput) ? statusInput : "draft";
  const storePlacementInput = normalizeString(body?.storePlacement ?? existingProduct?.storePlacement).toLowerCase();
  const storePlacement = STORE_PLACEMENT_VALUES.has(storePlacementInput) ? storePlacementInput : undefined;

  const keyAttributes = toLabelValueArray(body?.keyAttributes ?? existingProduct?.keyAttributes);
  const specifications = toLabelValueArray(body?.specifications ?? existingProduct?.specifications);
  const highlights = toStringArray(body?.highlights ?? existingProduct?.highlights);
  const tags = toStringArray(body?.tags ?? existingProduct?.tags);
  const variantData = toVariantArray(body?.variantData ?? existingProduct?.variantData);
  const detailedDescriptionBlocks = toDescriptionBlockArray(
    body?.detailedDescriptionBlocks ?? existingProduct?.detailedDescriptionBlocks
  );
  const descriptionPoints = toDescriptionPointArray(
    body?.descriptionPoints ?? existingProduct?.descriptionPoints
  );

  const barcode = normalizeString(body?.barcode ?? existingProduct?.barcode);

  const payload = {
    categorySlug,
    categoryLabel: categoryLabel || categorySlug,
    subcategorySlug,
    subcategoryName: subcategoryName || subcategorySlug || "",
    productName,
    barcode,
    shortDescription: normalizeString(body?.shortDescription ?? existingProduct?.shortDescription),
    description: normalizeString(body?.description ?? existingProduct?.description),
    image,
    heroImage,
    subcategoryImage,
    gallery,
    price: toNonNegativeNumber(body?.price ?? existingProduct?.price, 0),
    oldPrice: toNonNegativeNumber(body?.oldPrice ?? existingProduct?.oldPrice, 0),
    inventory: toNonNegativeNumber(body?.inventory ?? existingProduct?.inventory, 0),
    moq: toNonNegativeNumber(body?.moq ?? existingProduct?.moq, 0),
    badge: normalizeString(body?.badge ?? existingProduct?.badge),
    brand: normalizeString(body?.brand ?? existingProduct?.brand),
    sellerName: normalizeString(body?.sellerName ?? existingProduct?.sellerName),
    vendorSource: normalizeString(body?.vendorSource ?? existingProduct?.vendorSource),
    rating: Math.min(toNonNegativeNumber(body?.rating ?? existingProduct?.rating, 0), 5),
    reviews: toNonNegativeNumber(body?.reviews ?? existingProduct?.reviews, 0),
    deliveryByText: normalizeString(body?.deliveryByText ?? existingProduct?.deliveryByText),
    shippingLabel: normalizeString(body?.shippingLabel ?? existingProduct?.shippingLabel),
    shippingTimeline: normalizeString(body?.shippingTimeline ?? existingProduct?.shippingTimeline),
    isCancellable:
      typeof body?.isCancellable === "boolean"
        ? body.isCancellable
        : existingProduct
          ? Boolean(existingProduct.isCancellable)
          : false,
    isReturnable:
      typeof body?.isReturnable === "boolean"
        ? body.isReturnable
        : existingProduct
          ? Boolean(existingProduct.isReturnable)
          : false,
    highlights,
    keyAttributes,
    specifications,
    tags,
    variantData,
    detailedDescriptionBlocks,
    descriptionPoints,
    status,
    storePlacement,
    sourcePlatform: normalizeString(body?.sourcePlatform || existingProduct?.sourcePlatform || "vendor-panel"),
    sourceRecordId: normalizeString(body?.sourceRecordId || existingProduct?.sourceRecordId),
  };

  if (!payload.image && payload.gallery.length > 0) {
    payload.image = payload.gallery[0];
  }

  if (!payload.image) {
    return { error: "Primary product image is required" };
  }

  const isPhysicalProduct = (catLabel) => {
    const cat = String(catLabel || '').trim().toLowerCase();
    if (['restaurant', 'bars', 'food', 'beverages', 'bakery', 'cafe', 'meal', 'dinner', 'lunch', 'breakfast'].includes(cat)) {
      return false;
    }
    if (['home services', 'salon', 'beauty', 'health', 'fitness', 'education', 'classes', 'cleaning', 'repair', 'local services', 'services'].includes(cat)) {
      return false;
    }
    return true;
  };

  if (isPhysicalProduct(payload.categoryLabel)) {
    if (!payload.barcode) {
      return { error: "Barcode is required for physical products" };
    }
    if (Array.isArray(payload.variantData) && payload.variantData.length > 0) {
      for (const variant of payload.variantData) {
        if (!variant.barcode || !String(variant.barcode).trim()) {
          return { error: `Barcode is required for all variants of physical products (e.g., Size: ${variant.size || 'N/A'}, Color: ${variant.color || 'N/A'})` };
        }
      }
    }
  }

  if (payload.status === "live") {
    payload.publishedAt = existingProduct?.publishedAt || new Date();
  }

  return { payload };
};

const resolvePayloadImages = async (payload) => {
  const uploadCache = new Map();
  const cachedUpload = async (img) => {
    if (!img) return "";
    const trimmed = img.trim();
    if (uploadCache.has(trimmed)) {
      return uploadCache.get(trimmed);
    }
    const uploadedUrl = await uploadImage(img);
    uploadCache.set(trimmed, uploadedUrl);
    return uploadedUrl;
  };

  if (payload.image) payload.image = await cachedUpload(payload.image);
  if (payload.heroImage) payload.heroImage = await cachedUpload(payload.heroImage);
  if (payload.subcategoryImage) payload.subcategoryImage = await cachedUpload(payload.subcategoryImage);
  
  if (Array.isArray(payload.gallery)) {
    payload.gallery = await Promise.all(payload.gallery.map((img) => cachedUpload(img)));
  }
  
  if (Array.isArray(payload.variantData)) {
    payload.variantData = await Promise.all(
      payload.variantData.map(async (v) => {
        const varObj = v.toObject ? v.toObject() : v;
        let resolvedImage = v.image;
        if (v.image && v.image.trim().startsWith("[") && v.image.trim().endsWith("]")) {
          try {
            const arr = JSON.parse(v.image);
            if (Array.isArray(arr)) {
              const uploadedArr = await Promise.all(arr.map((img) => cachedUpload(img)));
              resolvedImage = JSON.stringify(uploadedArr);
            }
          } catch {
            resolvedImage = await cachedUpload(v.image);
          }
        } else if (v.image) {
          resolvedImage = await cachedUpload(v.image);
        }
        return {
          ...varObj,
          image: resolvedImage,
        };
      })
    );
  }
  
  if (Array.isArray(payload.detailedDescriptionBlocks)) {
    payload.detailedDescriptionBlocks = await Promise.all(
      payload.detailedDescriptionBlocks.map(async (b) => {
        const blockObj = b.toObject ? b.toObject() : b;
        return {
          ...blockObj,
          image: b.image ? await uploadImage(b.image) : undefined,
        };
      })
    );
  }
  
  return payload;
};

const ensureUniqueSlug = async (vendorId, requestedSlug, excludeProductId) => {
  const baseSlug = slugify(requestedSlug || "product") || "product";
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const query = {
      vendor: vendorId,
      slug: candidate,
    };

    if (excludeProductId) {
      query._id = { $ne: excludeProductId };
    }

    const exists = await VendorProduct.findOne(query).select("_id").lean();
    if (!exists) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

router.post("/vendor/products", requireVendor, async (req, res) => {
  try {
    const { payload, error } = buildProductDocumentInput(req.body);
    if (error) {
      return res.status(400).json({ ok: false, message: error });
    }

    const barcodesToCheck = [];
    if (payload.barcode) barcodesToCheck.push(payload.barcode);
    if (Array.isArray(payload.variantData)) {
      payload.variantData.forEach(v => {
        if (v.barcode) barcodesToCheck.push(v.barcode);
      });
    }

    if (barcodesToCheck.length > 0) {
      const dupBarcode = await VendorProduct.findOne({
        vendor: req.vendorUser._id,
        $or: [
          { barcode: { $in: barcodesToCheck } },
          { "variantData.barcode": { $in: barcodesToCheck } }
        ],
        isDeleted: { $ne: true }
      });
      if (dupBarcode) {
        return res.status(400).json({ ok: false, message: `One or more barcodes (parent or variant) already exist in your inventory.` });
      }
    }

    // Resolve base64 images asynchronously before saving to MongoDB
    await resolvePayloadImages(payload);

    const productSlugInput = slugify(req.body?.slug || payload.productName);
    const slug = await ensureUniqueSlug(req.vendorUser._id, productSlugInput);

    const created = await VendorProduct.create({
      vendor: req.vendorUser._id,
      slug,
      ...payload,
    });

    scheduleProductIndex(String(created._id));
    scheduleVendorIndex(String(req.vendorUser._id));

    return res.status(201).json({
      ok: true,
      message: "Product created",
      product: toProductSummary(created.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to create product", error: error.message });
  }
});

router.get("/vendor/products/check-barcode", requireVendor, async (req, res) => {
  try {
    const barcodeStr = normalizeString(req.query.barcode);
    if (!barcodeStr) {
      return res.status(400).json({ ok: false, message: "Barcode parameter is required" });
    }

    const barcodeNum = Number(barcodeStr);
    const queryConditions = [
      { barcode: barcodeStr },
      { "variantData.barcode": barcodeStr }
    ];

    if (Number.isFinite(barcodeNum)) {
      queryConditions.push(
        { barcode: barcodeNum },
        { "variantData.barcode": barcodeNum }
      );
    }

    let matched = await VendorProduct.findOne({
      $or: queryConditions,
      isDeleted: { $ne: true }
    }).lean();

    if (!matched) {
      // Fallback: Check the admin master catalog (masterproducts collection) directly at the driver level
      try {
        const masterProduct = await VendorProduct.db.collection("masterproducts").findOne({
          $or: queryConditions,
          isDeleted: { $ne: true }
        });
        if (masterProduct) {
          matched = masterProduct;
        }
      } catch (err) {
        console.error("Master catalog check failed:", err.message);
      }
    }

    if (!matched) {
      return res.status(404).json({ ok: false, exists: false, message: "No product found with this barcode" });
    }

    return res.status(200).json({
      ok: true,
      exists: true,
      product: toProductSummary(matched)
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to check barcode", error: error.message });
  }
});

router.get("/vendor/products/suggest", requireVendor, async (req, res) => {
  const { q } = req.query;
  if (!q || !String(q).trim()) {
    return res.status(200).json({ ok: true, suggestions: [] });
  }

  const queryStr = String(q).trim();
  const regex = new RegExp(queryStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  try {
    // 1. Query masterproducts collection
    const db = VendorProduct.db;
    const masterProducts = await db.collection('masterproducts').find({
      $or: [
        { name: regex },
        { productName: regex }
      ],
      isDeleted: { $ne: true },
      barcode: { $exists: true, $ne: null }
    }).project({ name: 1, productName: 1, barcode: 1 }).limit(15).toArray();

    // 2. Query VendorProduct collection
    const vendorProducts = await VendorProduct.find({
      $or: [
        { productName: regex },
        { name: regex }
      ],
      isDeleted: { $ne: true },
      barcode: { $exists: true, $ne: null }
    }).select('productName name barcode').limit(15).lean();

    // Consolidate suggestions by barcode
    const suggestionsMap = new Map();

    const addSuggestion = (name, barcode, source) => {
      const cleanBarcode = String(barcode || '').trim();
      const cleanName = String(name || '').trim();
      if (!cleanBarcode || !cleanName) return;

      if (!suggestionsMap.has(cleanBarcode)) {
        suggestionsMap.set(cleanBarcode, {
          name: cleanName,
          barcode: cleanBarcode,
          source
        });
      }
    };

    vendorProducts.forEach(p => addSuggestion(p.productName || p.name, p.barcode, 'vendorproducts'));
    masterProducts.forEach(p => addSuggestion(p.name || p.productName, p.barcode, 'masterproducts'));

    const suggestions = Array.from(suggestionsMap.values()).slice(0, 15);
    return res.status(200).json({ ok: true, suggestions });
  } catch (error) {
    console.error('[Suggest Endpoint Error]', error);
    return res.status(500).json({ ok: false, message: 'Database query failed.', error: error.message });
  }
});

router.get("/vendor/products", requireVendor, async (req, res) => {
  try {
    const statusInput = normalizeString(req.query.status).toLowerCase();
    const categorySlug = slugify(req.query.categorySlug || "");
    const subcategorySlug = slugify(req.query.subcategorySlug || "");
    const search = normalizeString(req.query.search);
    const limit = Math.min(Math.max(Number(req.query.limit || 120), 1), 300);

    const query = {
      vendor: req.vendorUser._id,
      isDeleted: { $ne: true },
      sourcePlatform: { $in: ["winkget_business", "winkget-business", "both"] },
    };

    if (statusInput) {
      if (!STATUS_VALUES.has(statusInput)) {
        return res.status(400).json({ ok: false, message: "Invalid product status" });
      }
      query.status = statusInput;
    }

    if (categorySlug) {
      query.categorySlug = categorySlug;
    }

    if (subcategorySlug) {
      query.subcategorySlug = subcategorySlug;
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { productName: regex },
        { categoryLabel: regex },
        { subcategoryName: regex },
        { brand: regex },
        { tags: regex },
      ];
    }

    const products = await VendorProduct.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      ok: true,
      products: products.map(toProductSummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load vendor products", error: error.message });
  }
});

router.patch("/vendor/products/:id", requireVendor, async (req, res) => {
  try {
    const productId = normalizeString(req.params.id);
    if (!OBJECT_ID_REGEX.test(productId)) {
      return res.status(400).json({ ok: false, message: "Invalid product id" });
    }

    const existing = await VendorProduct.findOne({
      _id: productId,
      vendor: req.vendorUser._id,
      isDeleted: { $ne: true },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, message: "Product not found" });
    }

    const { payload, error } = buildProductDocumentInput(req.body, existing.toObject());
    if (error) {
      return res.status(400).json({ ok: false, message: error });
    }

    const barcodesToCheck = [];
    if (payload.barcode) barcodesToCheck.push(payload.barcode);
    if (Array.isArray(payload.variantData)) {
      payload.variantData.forEach(v => {
        if (v.barcode) barcodesToCheck.push(v.barcode);
      });
    }

    if (barcodesToCheck.length > 0) {
      const dupBarcode = await VendorProduct.findOne({
        _id: { $ne: existing._id },
        vendor: req.vendorUser._id,
        $or: [
          { barcode: { $in: barcodesToCheck } },
          { "variantData.barcode": { $in: barcodesToCheck } }
        ],
        isDeleted: { $ne: true }
      });
      if (dupBarcode) {
        return res.status(400).json({ ok: false, message: `One or more barcodes (parent or variant) already exist in your inventory.` });
      }
    }

    // Resolve base64 images asynchronously before saving to MongoDB
    await resolvePayloadImages(payload);

    const nextSlugInput = slugify(req.body?.slug || payload.productName || existing.slug);
    const nextSlug = await ensureUniqueSlug(req.vendorUser._id, nextSlugInput, existing._id);

    existing.slug = nextSlug;
    Object.assign(existing, payload);
    
    if (payload.variantData) {
      existing.variantData = payload.variantData;
      existing.markModified("variantData");
    }
    if (payload.detailedDescriptionBlocks) {
      existing.detailedDescriptionBlocks = payload.detailedDescriptionBlocks;
      existing.markModified("detailedDescriptionBlocks");
    }
    if (payload.keyAttributes) {
      existing.keyAttributes = payload.keyAttributes;
      existing.markModified("keyAttributes");
    }
    if (payload.specifications) {
      existing.specifications = payload.specifications;
      existing.markModified("specifications");
    }
    if (payload.descriptionPoints) {
      existing.descriptionPoints = payload.descriptionPoints;
      existing.markModified("descriptionPoints");
    }

    await existing.save();

    scheduleProductIndex(String(existing._id));
    scheduleVendorIndex(String(req.vendorUser._id));

    return res.status(200).json({
      ok: true,
      message: "Product updated",
      product: toProductSummary(existing.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update product", error: error.message });
  }
});

router.delete("/vendor/products/:id", requireVendor, async (req, res) => {
  try {
    const productId = normalizeString(req.params.id);
    if (!OBJECT_ID_REGEX.test(productId)) {
      return res.status(400).json({ ok: false, message: "Invalid product id" });
    }

    const existing = await VendorProduct.findOne({
      _id: productId,
      vendor: req.vendorUser._id,
      isDeleted: { $ne: true },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, message: "Product not found" });
    }

    existing.isDeleted = true;
    existing.status = "archived";
    await existing.save();

    scheduleProductDelete(String(existing._id));
    scheduleVendorIndex(String(req.vendorUser._id));

    return res.status(200).json({ ok: true, message: "Product removed" });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to remove product", error: error.message });
  }
});

router.get("/vendors/:id/products", async (req, res) => {
  try {
    const vendorId = normalizeString(req.params.id);
    let vendorObjId = vendorId;
    if (!OBJECT_ID_REGEX.test(vendorId)) {
      let vendor = await User.findOne({ slug: vendorId, role: "vendor", vendorStatus: "approved" }).select("_id").lean();
      if (!vendor) {
        const allVendors = await User.find({ role: "vendor", vendorStatus: "approved" }).select("_id slug businessName name").lean();
        vendor = allVendors.find((v) => {
          const s1 = String(v.slug || "").trim().toLowerCase();
          if (s1 === vendorId.toLowerCase()) return true;

          const s2 = String(v.businessName || v.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          return s2 === vendorId.toLowerCase();
        });
      }

      if (!vendor) {
        return res.status(404).json({ ok: false, message: "Vendor not found" });
      }
      vendorObjId = String(vendor._id);
    }

    const statusInput = normalizeString(req.query.status || "live").toLowerCase();
    if (statusInput && !PUBLIC_STATUS_VALUES.has(statusInput)) {
      return res.status(400).json({ ok: false, message: "Invalid product status" });
    }

    const search = normalizeString(req.query.search);
    const limit = Math.min(Math.max(Number(req.query.limit || 40), 1), 200);
    const isStoreView = normalizeString(req.query.view).toLowerCase() === "store";

    const query = {
      vendor: vendorObjId,
      isDeleted: { $ne: true },
    };

    if (statusInput) {
      query.status = statusInput;
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ productName: regex }, { categoryLabel: regex }, { subcategoryName: regex }, { brand: regex }];
    }

    const products = await VendorProduct.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .select(isStoreView ? PUBLIC_PRODUCT_STORE_FIELDS : PUBLIC_PRODUCT_SUMMARY_FIELDS)
      .limit(limit)
      .lean();

    return res.status(200).json({
      ok: true,
      products: products.map(isStoreView ? toProductStoreSummary : toProductSummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load vendor products", error: error.message });
  }
});

module.exports = router;
