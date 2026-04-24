const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const VendorProduct = require("../models/VendorProduct");
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

const isValidMediaValue = (value) => {
  const normalized = normalizeMediaValue(value);
  if (!normalized) return true;
  if (normalized.length > MAX_MEDIA_VALUE_LENGTH) return false;
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

const toProductSummary = (product) => ({
  id: String(product._id),
  vendorId: String(product.vendor),
  slug: product.slug,
  categorySlug: product.categorySlug,
  categoryLabel: product.categoryLabel,
  subcategorySlug: product.subcategorySlug,
  subcategoryName: product.subcategoryName,
  productName: product.productName,
  shortDescription: product.shortDescription,
  description: product.description,
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
  status: product.status,
  storePlacement: product.storePlacement,
  sourcePlatform: product.sourcePlatform,
  sourceRecordId: product.sourceRecordId,
  publishedAt: product.publishedAt,
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

  const payload = {
    categorySlug,
    categoryLabel: categoryLabel || categorySlug,
    subcategorySlug,
    subcategoryName: subcategoryName || subcategorySlug || "",
    productName,
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

  if (payload.status === "live") {
    payload.publishedAt = existingProduct?.publishedAt || new Date();
  }

  return { payload };
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

    const productSlugInput = slugify(req.body?.slug || payload.productName);
    const slug = await ensureUniqueSlug(req.vendorUser._id, productSlugInput);

    const created = await VendorProduct.create({
      vendor: req.vendorUser._id,
      slug,
      ...payload,
    });

    return res.status(201).json({
      ok: true,
      message: "Product created",
      product: toProductSummary(created.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to create product", error: error.message });
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

    const nextSlugInput = slugify(req.body?.slug || payload.productName || existing.slug);
    const nextSlug = await ensureUniqueSlug(req.vendorUser._id, nextSlugInput, existing._id);

    existing.slug = nextSlug;
    Object.assign(existing, payload);
    await existing.save();

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

    return res.status(200).json({ ok: true, message: "Product removed" });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to remove product", error: error.message });
  }
});

router.get("/vendors/:id/products", async (req, res) => {
  try {
    const vendorId = normalizeString(req.params.id);
    if (!OBJECT_ID_REGEX.test(vendorId)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    }

    const statusInput = normalizeString(req.query.status || "live").toLowerCase();
    if (statusInput && !PUBLIC_STATUS_VALUES.has(statusInput)) {
      return res.status(400).json({ ok: false, message: "Invalid product status" });
    }

    const search = normalizeString(req.query.search);
    const limit = Math.min(Math.max(Number(req.query.limit || 80), 1), 200);

    const query = {
      vendor: vendorId,
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

module.exports = router;
