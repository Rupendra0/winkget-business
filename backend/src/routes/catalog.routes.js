const express = require("express");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const City = require("../models/City");
const User = require("../models/User");
const Review = require("../models/Review");
const { sanitizeCustomFormFields } = require("../lib/customForm");

const router = express.Router();
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const toCategorySummary = (category) => ({
  id: String(category._id),
  name: category.name,
  slug: category.slug,
  description: category.description,
  isActive: category.isActive,
  sortOrder: category.sortOrder,
  customFormEnabled: Boolean(category.customFormEnabled),
  customFormTitle: String(category.customFormTitle || "").trim() || undefined,
  customFormFields: sanitizeCustomFormFields(category.customFormFields),
});

const toCategoryReference = (category) => {
  if (!category) return undefined;

  const categoryId = category._id || category.id || category;
  if (!categoryId) return undefined;

  return {
    id: String(categoryId),
    name: category.name,
    slug: category.slug,
  };
};

const toSubcategoryReference = (subcategory) => {
  if (!subcategory) return undefined;

  const subcategoryId = subcategory._id || subcategory.id || subcategory;
  if (!subcategoryId) return undefined;

  return {
    id: String(subcategoryId),
    name: subcategory.name,
    slug: subcategory.slug,
  };
};

const toCitySummary = (city) => {
  const localities = Array.isArray(city.localities) ? city.localities : [];
  const visibleLocalities = localities
    .filter((locality) => locality.isActive !== false)
    .sort((left, right) => {
      const leftOrder = Number.isFinite(Number(left.sortOrder)) ? Number(left.sortOrder) : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isFinite(Number(right.sortOrder)) ? Number(right.sortOrder) : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left.name || "").localeCompare(String(right.name || ""));
    })
    .map((locality) => ({
      id: String(locality._id),
      name: locality.name,
      slug: locality.slug,
      sortOrder: locality.sortOrder,
    }));

  return {
    id: String(city._id),
    name: city.name,
    slug: city.slug,
    state: city.state,
    sortOrder: city.sortOrder,
    localities: visibleLocalities,
  };
};

const DEFAULT_VENDOR_IMAGE =
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=60";

const toSafeRegex = (value) => new RegExp(String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

const normalizeAddressToken = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toVendorAddress = (vendor) =>
  [vendor.businessAddress, vendor.city, vendor.state]
    .flatMap((part) => String(part || "").split(","))
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .filter((part, index, list) => {
      const normalizedPart = normalizeAddressToken(part);
      if (!normalizedPart) return false;

      return (
        list.findIndex((candidate) => normalizeAddressToken(candidate) === normalizedPart) ===
        index
      );
    })
    .join(", ");

const roundRating = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Number(numeric.toFixed(2));
};

const getVendorReviewSummaryMap = async (vendorIds) => {
  if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
    return new Map();
  }

  const rows = await Review.aggregate([
    {
      $match: {
        vendor: { $in: vendorIds },
        isVisible: true,
      },
    },
    {
      $group: {
        _id: "$vendor",
        reviews: { $sum: 1 },
        rating: { $avg: "$rating" },
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), {
      reviews: Number(row.reviews || 0),
      rating: roundRating(row.rating),
    });
  }

  return map;
};

const collectDescendantSubcategoryIds = async (rootSubcategoryId) => {
  if (!rootSubcategoryId) {
    return [];
  }

  const descendants = [];
  const queue = [String(rootSubcategoryId)];

  while (queue.length > 0) {
    const currentBatch = queue.splice(0, queue.length);
    const childRows = await Subcategory.find({
      parentSubcategory: { $in: currentBatch },
      isActive: true,
    })
      .select("_id")
      .lean();

    const childIds = childRows.map((row) => String(row._id));
    if (childIds.length === 0) {
      continue;
    }

    descendants.push(...childIds);
    queue.push(...childIds);
  }

  return descendants;
};

const toVendorSummary = (vendor, reviewSummaryByVendorId) => {
  const address = toVendorAddress(vendor);
  const summary = reviewSummaryByVendorId?.get(String(vendor._id));
  const rating =
    summary?.rating ?? (typeof vendor.rating === "number" ? Number(vendor.rating) : undefined);
  const reviews =
    summary?.reviews ?? (typeof vendor.reviews === "number" ? Number(vendor.reviews) : undefined);

  return {
    id: String(vendor._id),
    name: vendor.name,
    businessName: vendor.businessName,
    businessPhone: vendor.businessPhone,
    businessAlternatePhone: vendor.businessAlternatePhone,
    businessEmail: vendor.businessEmail,
    rating,
    reviews,
    verified: vendor.vendorStatus === "approved",
    vendorStatus: vendor.vendorStatus,
    address: address || "Address unavailable",
    city: vendor.city || "",
    sublocality: vendor.sublocality || vendor.city || "",
    state: vendor.state,
    postalCode: vendor.postalCode,
    subcategory: vendor.businessSubcategory?.name || vendor.businessCategory?.name || "",
    imageUrl: vendor.image || DEFAULT_VENDOR_IMAGE,
    shopBannerImage: vendor.shopBannerImage || "",
    shopGallery: Array.isArray(vendor.shopGallery) ? vendor.shopGallery.filter(Boolean).slice(0, 12) : [],
    ctaLabel: "Inquiry",
    badges: vendor.vendorStatus === "approved" ? ["Verified"] : [],
    priceRange: undefined,
    tags: Array.isArray(vendor.serviceTags) ? vendor.serviceTags.slice(0, 4) : [],
    businessDescription: vendor.businessDescription,
    establishmentYear: vendor.establishmentYear,
    yearsInBusiness: vendor.yearsInBusiness,
    shopOpeningTime: vendor.shopOpeningTime,
    shopClosingTime: vendor.shopClosingTime,
    businessCategory: toCategoryReference(vendor.businessCategory),
    businessSubcategory: toSubcategoryReference(vendor.businessSubcategory),
  };
};

const toVendorDetail = (vendor, reviewSummaryByVendorId) => {
  const summary = toVendorSummary(vendor, reviewSummaryByVendorId);
  return {
    ...summary,
    businessEmail: vendor.businessEmail,
    businessPhone: vendor.businessPhone,
    businessAlternatePhone: vendor.businessAlternatePhone,
    website: vendor.website,
    businessDescription: vendor.businessDescription,
    businessAddress: vendor.businessAddress,
    sublocality: vendor.sublocality,
    establishmentYear: vendor.establishmentYear,
    yearsInBusiness: vendor.yearsInBusiness,
    shopOpeningTime: vendor.shopOpeningTime,
    shopClosingTime: vendor.shopClosingTime,
    state: vendor.state,
    postalCode: vendor.postalCode,
    serviceTags: Array.isArray(vendor.serviceTags) ? vendor.serviceTags : [],
  };
};

const toSubcategorySummary = (subcategory) => ({
  id: String(subcategory._id),
  name: subcategory.name,
  slug: subcategory.slug,
  description: subcategory.description,
  isActive: subcategory.isActive,
  sortOrder: subcategory.sortOrder,
  customFormEnabled: Boolean(subcategory.customFormEnabled),
  customFormTitle: String(subcategory.customFormTitle || "").trim() || undefined,
  customFormFields: sanitizeCustomFormFields(subcategory.customFormFields),
  category: {
    id: String(subcategory.category._id || subcategory.category),
    name: subcategory.category.name,
  },
  parentSubcategory: subcategory.parentSubcategory
    ? {
        id: String(subcategory.parentSubcategory._id || subcategory.parentSubcategory),
        name: subcategory.parentSubcategory.name,
      }
    : undefined,
});

router.get("/cities", async (_req, res) => {
  try {
    const cities = await City.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("_id name slug state isActive sortOrder localities")
      .lean();

    return res.status(200).json({
      ok: true,
      cities: cities.map(toCitySummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load cities", error: error.message });
  }
});

router.get("/categories", async (_req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("_id name slug description isActive sortOrder customFormEnabled customFormTitle customFormFields");

    return res.status(200).json({
      ok: true,
      categories: categories.map(toCategorySummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load categories", error: error.message });
  }
});

router.get("/subcategories", async (req, res) => {
  try {
    const categoryId = String(req.query.categoryId || "").trim();
    const parentSubcategoryId = String(req.query.parentSubcategoryId || "").trim();
    const search = String(req.query.search || "").trim();

    const query = { isActive: true };

    if (categoryId) {
      if (!OBJECT_ID_REGEX.test(categoryId)) {
        return res.status(400).json({ ok: false, message: "Invalid category id" });
      }

      query.category = categoryId;
    }

    if (parentSubcategoryId) {
      const normalizedParent = parentSubcategoryId.toLowerCase();
      if (normalizedParent === "root" || normalizedParent === "null") {
        query.parentSubcategory = null;
      } else if (!OBJECT_ID_REGEX.test(parentSubcategoryId)) {
        return res.status(400).json({ ok: false, message: "Invalid parent subcategory id" });
      } else {
        query.parentSubcategory = parentSubcategoryId;
      }
    }

    if (search) {
      query.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    const subcategories = await Subcategory.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .select("_id category parentSubcategory name slug description isActive sortOrder customFormEnabled customFormTitle customFormFields")
      .populate("category", "_id name")
      .populate("parentSubcategory", "_id name");

    return res.status(200).json({
      ok: true,
      subcategories: subcategories.map(toSubcategorySummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load subcategories", error: error.message });
  }
});

router.get("/vendors", async (req, res) => {
  try {
    const categoryIdInput = String(req.query.categoryId || "").trim();
    const categorySlug = String(req.query.categorySlug || "").trim().toLowerCase();
    const subcategoryId = String(req.query.subcategoryId || "").trim();
    const city = String(req.query.city || "").trim();
    const sublocality = String(req.query.sublocality || "").trim();
    const search = String(req.query.search || "").trim();

    let resolvedCategoryId = categoryIdInput;

    if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug, isActive: true }).select("_id");
      if (!category) {
        return res.status(200).json({ ok: true, vendors: [] });
      }
      resolvedCategoryId = String(category._id);
    }

    if (resolvedCategoryId && !OBJECT_ID_REGEX.test(resolvedCategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid category id" });
    }

    if (subcategoryId && !OBJECT_ID_REGEX.test(subcategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid subcategory id" });
    }

    const query = {
      role: "vendor",
      vendorStatus: "approved",
    };

    let subcategoryFilterIds = [];

    if (subcategoryId) {
      const selectedSubcategory = await Subcategory.findOne({
        _id: subcategoryId,
        isActive: true,
      })
        .select("_id category")
        .lean();

      if (!selectedSubcategory) {
        return res.status(200).json({ ok: true, vendors: [] });
      }

      const selectedCategoryId = String(selectedSubcategory.category);
      if (resolvedCategoryId && resolvedCategoryId !== selectedCategoryId) {
        return res.status(200).json({ ok: true, vendors: [] });
      }

      const descendantSubcategoryIds = await collectDescendantSubcategoryIds(selectedSubcategory._id);
      subcategoryFilterIds = [String(selectedSubcategory._id), ...descendantSubcategoryIds];
    }

    if (resolvedCategoryId) {
      query.businessCategory = resolvedCategoryId;
    }

    if (subcategoryFilterIds.length > 0) {
      query.businessSubcategory = { $in: subcategoryFilterIds };
    }

    if (city) {
      query.city = toSafeRegex(city);
    }

    if (sublocality) {
      query.sublocality = toSafeRegex(sublocality);
    }

    if (search) {
      const regex = toSafeRegex(search);
      query.$or = [{ businessName: regex }, { name: regex }, { businessDescription: regex }, { serviceTags: regex }];
    }

    const vendors = await User.find(query)
      .sort({ updatedAt: -1, businessName: 1, name: 1 })
      .select(
          "_id name businessName city sublocality state businessAddress businessCategory businessSubcategory businessPhone businessEmail businessAlternatePhone website serviceTags businessDescription image shopBannerImage shopGallery marketingOptIn vendorStatus establishmentYear yearsInBusiness shopOpeningTime shopClosingTime"
      )
      .populate("businessCategory", "_id name slug")
      .populate("businessSubcategory", "_id name slug");

    const reviewSummaryByVendorId = await getVendorReviewSummaryMap(vendors.map((vendor) => vendor._id));

    return res.status(200).json({
      ok: true,
      vendors: vendors.map((vendor) => toVendorSummary(vendor, reviewSummaryByVendorId)),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load vendors", error: error.message });
  }
});

router.get("/vendors/:id", async (req, res) => {
  try {
    const vendorId = String(req.params.id || "").trim();
    if (!OBJECT_ID_REGEX.test(vendorId)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    }

    const vendor = await User.findOne({
      _id: vendorId,
      role: "vendor",
      vendorStatus: "approved",
    })
      .select(
        "_id name businessName city sublocality state postalCode businessAddress businessCategory businessSubcategory businessPhone businessEmail businessAlternatePhone website serviceTags businessDescription image shopBannerImage shopGallery marketingOptIn vendorStatus establishmentYear yearsInBusiness shopOpeningTime shopClosingTime"
      )
      .populate("businessCategory", "_id name slug")
      .populate("businessSubcategory", "_id name slug");

    if (!vendor) {
      return res.status(404).json({ ok: false, message: "Vendor not found" });
    }

    const reviewSummaryByVendorId = await getVendorReviewSummaryMap([vendor._id]);

    return res.status(200).json({
      ok: true,
      vendor: toVendorDetail(vendor, reviewSummaryByVendorId),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load vendor", error: error.message });
  }
});

module.exports = router;
