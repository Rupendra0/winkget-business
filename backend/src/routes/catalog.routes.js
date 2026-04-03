const express = require("express");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const User = require("../models/User");

const router = express.Router();
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const toCategorySummary = (category) => ({
  id: String(category._id),
  name: category.name,
  slug: category.slug,
  description: category.description,
  isActive: category.isActive,
  sortOrder: category.sortOrder,
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

const DEFAULT_VENDOR_IMAGE =
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=60";

const toSafeRegex = (value) => new RegExp(String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

const toVendorAddress = (vendor) =>
  [vendor.businessAddress, vendor.city, vendor.state].map((part) => String(part || "").trim()).filter(Boolean).join(", ");

const toVendorSummary = (vendor) => {
  const address = toVendorAddress(vendor);
  return {
    id: String(vendor._id),
    name: vendor.name,
    businessName: vendor.businessName,
    rating: typeof vendor.rating === "number" ? vendor.rating : undefined,
    reviews: typeof vendor.reviews === "number" ? vendor.reviews : undefined,
    verified: vendor.vendorStatus === "approved",
    address: address || "Address unavailable",
    city: vendor.city || "",
    sublocality: vendor.city || "",
    subcategory: vendor.businessSubcategory?.name || vendor.businessCategory?.name || "",
    imageUrl: vendor.image || DEFAULT_VENDOR_IMAGE,
    ctaLabel: "Inquiry",
    badges: vendor.vendorStatus === "approved" ? ["Verified"] : [],
    priceRange: undefined,
    tags: Array.isArray(vendor.serviceTags) ? vendor.serviceTags.slice(0, 4) : [],
    businessCategory: toCategoryReference(vendor.businessCategory),
    businessSubcategory: toSubcategoryReference(vendor.businessSubcategory),
  };
};

const toVendorDetail = (vendor) => {
  const summary = toVendorSummary(vendor);
  return {
    ...summary,
    businessEmail: vendor.businessEmail,
    businessPhone: vendor.businessPhone,
    businessAlternatePhone: vendor.businessAlternatePhone,
    website: vendor.website,
    businessDescription: vendor.businessDescription,
    businessAddress: vendor.businessAddress,
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

router.get("/categories", async (_req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("_id name slug description isActive sortOrder");

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
      .select("_id category parentSubcategory name slug description isActive sortOrder")
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

    if (resolvedCategoryId) {
      query.businessCategory = resolvedCategoryId;
    }

    if (subcategoryId) {
      query.businessSubcategory = subcategoryId;
    }

    if (city) {
      query.city = toSafeRegex(city);
    }

    if (search) {
      const regex = toSafeRegex(search);
      query.$or = [{ businessName: regex }, { name: regex }, { businessDescription: regex }, { serviceTags: regex }];
    }

    const vendors = await User.find(query)
      .sort({ updatedAt: -1, businessName: 1, name: 1 })
      .select(
        "_id name businessName city state businessAddress businessCategory businessSubcategory businessPhone businessEmail businessAlternatePhone website serviceTags businessDescription image marketingOptIn vendorStatus establishmentYear yearsInBusiness shopOpeningTime shopClosingTime"
      )
      .populate("businessCategory", "_id name slug")
      .populate("businessSubcategory", "_id name slug");

    return res.status(200).json({
      ok: true,
      vendors: vendors.map(toVendorSummary),
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
        "_id name businessName city state postalCode businessAddress businessCategory businessSubcategory businessPhone businessEmail businessAlternatePhone website serviceTags businessDescription image marketingOptIn vendorStatus establishmentYear yearsInBusiness shopOpeningTime shopClosingTime"
      )
      .populate("businessCategory", "_id name slug")
      .populate("businessSubcategory", "_id name slug");

    if (!vendor) {
      return res.status(404).json({ ok: false, message: "Vendor not found" });
    }

    return res.status(200).json({
      ok: true,
      vendor: toVendorDetail(vendor),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load vendor", error: error.message });
  }
});

module.exports = router;
