const express = require("express");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");

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

module.exports = router;
