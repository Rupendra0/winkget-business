const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");

const router = express.Router();
const AUTH_COOKIE_NAME = "winkget_auth";
const VENDOR_STATUS_VALUES = new Set(["pending", "approved", "rejected"]);
const VENDOR_LIST_STATUS_VALUES = new Set(["all", "pending", "approved", "rejected"]);
const USER_LIST_ROLE_VALUES = new Set(["all", "admin", "customer", "vendor"]);
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.verify(token, secret);
};

const resolveTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const toCategorySummary = (category) => ({
  id: String(category._id),
  name: category.name,
  slug: category.slug,
  description: category.description,
  isActive: category.isActive,
  sortOrder: category.sortOrder,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const toCategoryReference = (category) => {
  if (!category) return undefined;

  const categoryId = category._id || category.id || category;
  if (!categoryId) return undefined;

  return {
    id: String(categoryId),
    name: category.name,
  };
};

const toSubcategoryReference = (subcategory) => {
  if (!subcategory) return undefined;

  const subcategoryId = subcategory._id || subcategory.id || subcategory;
  if (!subcategoryId) return undefined;

  return {
    id: String(subcategoryId),
    name: subcategory.name,
  };
};

const toSubcategorySummary = (subcategory) => ({
  id: String(subcategory._id),
  name: subcategory.name,
  slug: subcategory.slug,
  description: subcategory.description,
  isActive: subcategory.isActive,
  sortOrder: subcategory.sortOrder,
  category: toCategoryReference(subcategory.category),
  createdAt: subcategory.createdAt,
  updatedAt: subcategory.updatedAt,
});

const resolveUniqueSlug = async (baseSlug, excludeCategoryId) => {
  const sanitizedBase = baseSlug || `category-${Date.now()}`;
  let slug = sanitizedBase;
  let suffix = 1;

  // Ensure stable uniqueness for category slug generation.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await Category.findOne(
      excludeCategoryId
        ? {
            slug,
            _id: { $ne: excludeCategoryId },
          }
        : { slug }
    ).select("_id");

    if (!existing) return slug;
    slug = `${sanitizedBase}-${suffix}`;
    suffix += 1;
  }
};

const resolveUniqueSubcategorySlug = async (baseSlug, categoryId, excludeSubcategoryId) => {
  const sanitizedBase = baseSlug || `subcategory-${Date.now()}`;
  let slug = sanitizedBase;
  let suffix = 1;

  // Ensure uniqueness only within the selected category.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = {
      category: categoryId,
      slug,
    };

    if (excludeSubcategoryId) {
      query._id = { $ne: excludeSubcategoryId };
    }

    const existing = await Subcategory.findOne(query).select("_id");
    if (!existing) return slug;

    slug = `${sanitizedBase}-${suffix}`;
    suffix += 1;
  }
};

const toVendorSummary = (vendor) => ({
  id: String(vendor._id),
  name: vendor.name,
  businessName: vendor.businessName,
  businessCategory: toCategoryReference(vendor.businessCategory),
  businessSubcategory: toSubcategoryReference(vendor.businessSubcategory),
  email: vendor.email,
  phone: vendor.phone,
  alternatePhone: vendor.alternatePhone,
  businessEmail: vendor.businessEmail,
  businessPhone: vendor.businessPhone,
  businessAlternatePhone: vendor.businessAlternatePhone,
  businessAddress: vendor.businessAddress,
  city: vendor.city,
  state: vendor.state,
  postalCode: vendor.postalCode,
  gstNumber: vendor.gstNumber,
  website: vendor.website,
  yearsInBusiness: vendor.yearsInBusiness,
  businessDescription: vendor.businessDescription,
  idProofType: vendor.idProofType,
  idProofNumber: vendor.idProofNumber,
  idProofDocument: vendor.idProofDocument,
  marketingOptIn: vendor.marketingOptIn,
  vendorStatus: vendor.vendorStatus,
  vendorReviewNote: vendor.vendorReviewNote,
  createdAt: vendor.createdAt,
  updatedAt: vendor.updatedAt,
});

const toUserSummary = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone,
  businessName: user.businessName,
  role: user.role,
  vendorStatus: user.vendorStatus,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const requireAdmin = async (req, res, next) => {
  try {
    const token = resolveTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select("_id name email phone role");

    if (!user || user.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Admin access required" });
    }

    req.adminUser = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ ok: false, message: "Session expired" });
  }
};

router.get("/admin/me", requireAdmin, (req, res) => {
  return res.status(200).json({
    ok: true,
    user: {
      id: String(req.adminUser._id),
      name: req.adminUser.name,
      email: req.adminUser.email,
      phone: req.adminUser.phone,
      role: req.adminUser.role,
    },
  });
});

router.get("/admin/dashboard", requireAdmin, async (_req, res) => {
  try {
    const [
      totalUsers,
      admins,
      customers,
      vendors,
      pendingVendors,
      approvedVendors,
      rejectedVendors,
      totalCategories,
      activeCategories,
      totalSubcategories,
      activeSubcategories,
      newestPendingVendors,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "vendor" }),
      User.countDocuments({ role: "vendor", vendorStatus: "pending" }),
      User.countDocuments({ role: "vendor", vendorStatus: "approved" }),
      User.countDocuments({ role: "vendor", vendorStatus: "rejected" }),
      Category.countDocuments({}),
      Category.countDocuments({ isActive: true }),
      Subcategory.countDocuments({}),
      Subcategory.countDocuments({ isActive: true }),
      User.find({ role: "vendor", vendorStatus: "pending" })
        .sort({ createdAt: -1 })
        .limit(8)
        .select(
          "_id name businessName businessCategory businessSubcategory email phone alternatePhone businessEmail businessPhone businessAlternatePhone businessAddress city state postalCode gstNumber website yearsInBusiness businessDescription idProofType idProofNumber idProofDocument marketingOptIn vendorStatus vendorReviewNote createdAt updatedAt"
        )
        .populate("businessCategory", "_id name")
        .populate("businessSubcategory", "_id name"),
    ]);

    return res.status(200).json({
      ok: true,
      stats: {
        totalUsers,
        admins,
        customers,
        vendors,
        pendingVendors,
        approvedVendors,
        rejectedVendors,
        totalCategories,
        activeCategories,
        inactiveCategories: Math.max(totalCategories - activeCategories, 0),
        totalSubcategories,
        activeSubcategories,
        inactiveSubcategories: Math.max(totalSubcategories - activeSubcategories, 0),
      },
      pendingVendors: newestPendingVendors.map(toVendorSummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load admin dashboard", error: error.message });
  }
});

router.get("/admin/vendors", requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "all").toLowerCase();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 60), 1), 200);

    if (!VENDOR_LIST_STATUS_VALUES.has(status)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor status filter" });
    }

    const query = { role: "vendor" };
    if (status !== "all") {
      query.vendorStatus = status;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { name: regex },
        { businessName: regex },
        { email: regex },
        { phone: regex },
        { businessEmail: regex },
        { businessPhone: regex },
      ];
    }

    const vendors = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        "_id name businessName businessCategory businessSubcategory email phone alternatePhone businessEmail businessPhone businessAlternatePhone businessAddress city state postalCode gstNumber website yearsInBusiness businessDescription idProofType idProofNumber idProofDocument marketingOptIn vendorStatus vendorReviewNote createdAt updatedAt"
      )
      .populate("businessCategory", "_id name")
      .populate("businessSubcategory", "_id name");

    return res.status(200).json({
      ok: true,
      vendors: vendors.map(toVendorSummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load vendors", error: error.message });
  }
});

router.patch("/admin/vendors/:id/status", requireAdmin, async (req, res) => {
  try {
    const vendorId = String(req.params.id || "").trim();
    const nextStatus = String(req.body?.status || "").toLowerCase();
    const reviewNoteInput = req.body?.note;

    if (!VENDOR_STATUS_VALUES.has(nextStatus)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor status" });
    }

    const reviewNote = typeof reviewNoteInput === "string" ? reviewNoteInput.trim() : "";

    const vendor = await User.findOne({ _id: vendorId, role: "vendor" });
    if (!vendor) {
      return res.status(404).json({ ok: false, message: "Vendor not found" });
    }

    vendor.vendorStatus = nextStatus;
    vendor.vendorReviewNote = reviewNote || undefined;
    await vendor.save();
    await vendor.populate("businessCategory", "_id name");
    await vendor.populate("businessSubcategory", "_id name");

    return res.status(200).json({
      ok: true,
      message: `Vendor marked as ${nextStatus}`,
      vendor: toVendorSummary(vendor),
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    }

    return res.status(500).json({ ok: false, message: "Failed to update vendor status", error: error.message });
  }
});

router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const role = String(req.query.role || "all").toLowerCase();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 300);

    if (!USER_LIST_ROLE_VALUES.has(role)) {
      return res.status(400).json({ ok: false, message: "Invalid role filter" });
    }

    const query = role === "all" ? {} : { role };

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { businessName: regex },
        { businessEmail: regex },
        { businessPhone: regex },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("_id name email phone businessName role vendorStatus createdAt updatedAt");

    return res.status(200).json({
      ok: true,
      users: users.map(toUserSummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load users", error: error.message });
  }
});

router.get("/admin/categories", requireAdmin, async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || "true").toLowerCase() !== "false";
    const search = String(req.query.search || "").trim();

    const query = includeInactive ? {} : { isActive: true };
    if (search) {
      query.name = new RegExp(escapeRegex(search), "i");
    }

    const categories = await Category.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .select("_id name slug description isActive sortOrder createdAt updatedAt");

    return res.status(200).json({
      ok: true,
      categories: categories.map(toCategorySummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load categories", error: error.message });
  }
});

router.post("/admin/categories", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const sortOrderInput = req.body?.sortOrder;
    const sortOrder = Number.isFinite(Number(sortOrderInput)) ? Number(sortOrderInput) : 0;
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : true;

    if (!name) {
      return res.status(400).json({ ok: false, message: "Category name is required" });
    }

    const slug = await resolveUniqueSlug(slugify(name));

    const category = await Category.create({
      name,
      slug,
      description: description || undefined,
      isActive,
      sortOrder,
      createdBy: req.adminUser._id,
    });

    return res.status(201).json({
      ok: true,
      message: "Category created",
      category: toCategorySummary(category),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Category already exists" });
    }

    return res.status(500).json({ ok: false, message: "Failed to create category", error: error.message });
  }
});

router.patch("/admin/categories/:id", requireAdmin, async (req, res) => {
  try {
    const categoryId = String(req.params.id || "").trim();
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ ok: false, message: "Category not found" });
    }

    if (req.body?.name !== undefined) {
      const nextName = String(req.body.name || "").trim();
      if (!nextName) {
        return res.status(400).json({ ok: false, message: "Category name cannot be empty" });
      }

      if (nextName !== category.name) {
        category.name = nextName;
        category.slug = await resolveUniqueSlug(slugify(nextName), category._id);
      }
    }

    if (req.body?.description !== undefined) {
      const description = String(req.body.description || "").trim();
      category.description = description || undefined;
    }

    if (req.body?.isActive !== undefined) {
      category.isActive = Boolean(req.body.isActive);
    }

    if (req.body?.sortOrder !== undefined) {
      const numericSort = Number(req.body.sortOrder);
      if (!Number.isFinite(numericSort)) {
        return res.status(400).json({ ok: false, message: "Invalid sort order" });
      }
      category.sortOrder = numericSort;
    }

    await category.save();

    return res.status(200).json({
      ok: true,
      message: "Category updated",
      category: toCategorySummary(category),
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(400).json({ ok: false, message: "Invalid category id" });
    }

    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Category already exists" });
    }

    return res.status(500).json({ ok: false, message: "Failed to update category", error: error.message });
  }
});

router.get("/admin/subcategories", requireAdmin, async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || "true").toLowerCase() !== "false";
    const search = String(req.query.search || "").trim();
    const categoryId = String(req.query.categoryId || "").trim();

    const query = includeInactive ? {} : { isActive: true };

    if (categoryId) {
      if (!OBJECT_ID_REGEX.test(categoryId)) {
        return res.status(400).json({ ok: false, message: "Invalid category id" });
      }

      query.category = categoryId;
    }

    if (search) {
      query.name = new RegExp(escapeRegex(search), "i");
    }

    const subcategories = await Subcategory.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .select("_id category name slug description isActive sortOrder createdAt updatedAt")
      .populate("category", "_id name");

    return res.status(200).json({
      ok: true,
      subcategories: subcategories.map(toSubcategorySummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load subcategories", error: error.message });
  }
});

router.post("/admin/subcategories", requireAdmin, async (req, res) => {
  try {
    const categoryId = String(req.body?.categoryId || "").trim();
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const sortOrderInput = req.body?.sortOrder;
    const sortOrder = Number.isFinite(Number(sortOrderInput)) ? Number(sortOrderInput) : 0;
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : true;

    if (!categoryId || !OBJECT_ID_REGEX.test(categoryId)) {
      return res.status(400).json({ ok: false, message: "Valid category is required" });
    }

    if (!name) {
      return res.status(400).json({ ok: false, message: "Subcategory name is required" });
    }

    const category = await Category.findById(categoryId).select("_id name");
    if (!category) {
      return res.status(404).json({ ok: false, message: "Category not found" });
    }

    const slug = await resolveUniqueSubcategorySlug(slugify(name), category._id);

    const subcategory = await Subcategory.create({
      category: category._id,
      name,
      slug,
      description: description || undefined,
      isActive,
      sortOrder,
      createdBy: req.adminUser._id,
    });

    await subcategory.populate("category", "_id name");

    return res.status(201).json({
      ok: true,
      message: "Subcategory created",
      subcategory: toSubcategorySummary(subcategory),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Subcategory already exists in this category" });
    }

    return res.status(500).json({ ok: false, message: "Failed to create subcategory", error: error.message });
  }
});

router.patch("/admin/subcategories/:id", requireAdmin, async (req, res) => {
  try {
    const subcategoryId = String(req.params.id || "").trim();
    const subcategory = await Subcategory.findById(subcategoryId).populate("category", "_id name");

    if (!subcategory) {
      return res.status(404).json({ ok: false, message: "Subcategory not found" });
    }

    let nextCategory = subcategory.category;

    if (req.body?.categoryId !== undefined) {
      const categoryId = String(req.body.categoryId || "").trim();
      if (!categoryId || !OBJECT_ID_REGEX.test(categoryId)) {
        return res.status(400).json({ ok: false, message: "Invalid category id" });
      }

      const category = await Category.findById(categoryId).select("_id name");
      if (!category) {
        return res.status(404).json({ ok: false, message: "Category not found" });
      }

      nextCategory = category;
      subcategory.category = category._id;
    }

    if (req.body?.name !== undefined) {
      const nextName = String(req.body.name || "").trim();
      if (!nextName) {
        return res.status(400).json({ ok: false, message: "Subcategory name cannot be empty" });
      }

      subcategory.name = nextName;
      subcategory.slug = await resolveUniqueSubcategorySlug(slugify(nextName), nextCategory._id, subcategory._id);
    } else if (req.body?.categoryId !== undefined) {
      subcategory.slug = await resolveUniqueSubcategorySlug(slugify(subcategory.name), nextCategory._id, subcategory._id);
    }

    if (req.body?.description !== undefined) {
      const description = String(req.body.description || "").trim();
      subcategory.description = description || undefined;
    }

    if (req.body?.isActive !== undefined) {
      subcategory.isActive = Boolean(req.body.isActive);
    }

    if (req.body?.sortOrder !== undefined) {
      const numericSort = Number(req.body.sortOrder);
      if (!Number.isFinite(numericSort)) {
        return res.status(400).json({ ok: false, message: "Invalid sort order" });
      }
      subcategory.sortOrder = numericSort;
    }

    await subcategory.save();
    await subcategory.populate("category", "_id name");

    return res.status(200).json({
      ok: true,
      message: "Subcategory updated",
      subcategory: toSubcategorySummary(subcategory),
    });
  } catch (error) {
    if (error?.name === "CastError") {
      return res.status(400).json({ ok: false, message: "Invalid subcategory id" });
    }

    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Subcategory already exists in this category" });
    }

    return res.status(500).json({ ok: false, message: "Failed to update subcategory", error: error.message });
  }
});

module.exports = router;
