const express = require("express");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const User = require("../models/User");
const {
  ensureSearchIndex,
  reindexSearchDocuments,
  scheduleCategoryIndex,
  scheduleProductIndex,
  scheduleVendorIndex,
} = require("../lib/search/indexer");

const router = express.Router();

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const MAX_OFFSET = 5000;

const normalizeString = (value) => String(value || "").trim();

const toSearchableText = (values) =>
  (Array.isArray(values) ? values : [])
    .map((value) => normalizeString(value))
    .filter(Boolean)
    .join(" ");

const normalizeType = (value) => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return "";

  if (normalized === "product" || normalized === "products") return "product";
  if (normalized === "vendor" || normalized === "vendors") return "vendor";
  if (normalized === "category" || normalized === "categories") return "category";
  if (normalized === "subcategory" || normalized === "subcategories") return "subcategory";
  return "";
};

const escapeFilterValue = (value) => String(value || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"");

const buildCityFilter = (city) => {
  const normalized = normalizeString(city).toLowerCase();
  if (!normalized) return "";
  return `cities = \"${escapeFilterValue(normalized)}\"`;
};

const buildSearchFilter = ({ city, type, openNow, minRating, categorySlug, subcategorySlug }) => {
  const filters = [];
  const cityFilter = buildCityFilter(city);
  if (cityFilter) filters.push(cityFilter);
  if (type) filters.push(`type = \"${type}\"`);
  if (categorySlug) filters.push(`categorySlug = \"${escapeFilterValue(categorySlug)}\"`);
  if (subcategorySlug) filters.push(`subcategorySlug = \"${escapeFilterValue(subcategorySlug)}\"`);
  if (openNow) filters.push("isStoreOpen = true");
  if (Number.isFinite(minRating) && minRating > 0) filters.push(`rating >= ${minRating}`);
  return filters.length > 0 ? filters.join(" AND ") : "";
};

const resolveCityFromRequest = (req) =>
  normalizeString(req.query.city || req.headers["x-user-city"] || req.headers["x-city"] || "");

const clampNumber = (value, fallback, min, max) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.floor(numeric), min), max);
};

const hydrateVendorLocations = async (hits) => {
  if (!Array.isArray(hits) || hits.length === 0) {
    return [];
  }

  const vendorIds = Array.from(
    new Set(
      hits
        .map((hit) => normalizeString(hit.vendorId || ""))
        .filter(Boolean)
    )
  );

  if (vendorIds.length === 0) {
    return hits;
  }

  const vendors = await User.find({ _id: { $in: vendorIds }, role: "vendor" })
    .select("_id city sublocality")
    .lean();
  const vendorById = new Map(vendors.map((vendor) => [String(vendor._id), vendor]));

  return hits.map((hit) => {
    const vendor = vendorById.get(normalizeString(hit.vendorId || ""));
    if (!vendor) {
      return hit;
    }

    const city = normalizeString(vendor.city || hit.city || "");
    const sublocality = normalizeString(vendor.sublocality || hit.sublocality || "");
    return {
      ...hit,
      city,
      sublocality,
    };
  });
};

const hydrateCategoryIcons = async (hits, type) => {
  if (!Array.isArray(hits) || hits.length === 0) {
    return [];
  }

  const idField = type === "subcategory" ? "subcategoryId" : "categoryId";
  const Model = type === "subcategory" ? Subcategory : Category;
  const ids = Array.from(
    new Set(
      hits
        .map((hit) => normalizeString(hit[idField] || ""))
        .filter(Boolean)
    )
  );

  if (ids.length === 0) {
    return hits;
  }

  const docs = await Model.find({ _id: { $in: ids } })
    .select("_id icon")
    .lean();
  const iconById = new Map(docs.map((doc) => [String(doc._id), normalizeString(doc.icon || "")]));

  return hits.map((hit) => ({
    ...hit,
    icon: iconById.get(normalizeString(hit[idField] || "")) || normalizeString(hit.icon || ""),
  }));
};

const buildSubcategoryHit = (subcategory, categoryHit, depth) => {
  const categoryId = subcategory.category?._id ? String(subcategory.category._id) : "";
  const parentSubcategory = subcategory.parentSubcategory || null;

  return {
    id: `subcategory_${String(subcategory._id)}`,
    type: "subcategory",
    rankGroup: 3,
    subcategoryId: String(subcategory._id),
    subcategoryName: normalizeString(subcategory.name || ""),
    subcategorySlug: normalizeString(subcategory.slug || ""),
    parentSubcategoryId: parentSubcategory?._id ? String(parentSubcategory._id) : undefined,
    parentSubcategoryName: normalizeString(parentSubcategory?.name || ""),
    hierarchyDepth: depth,
    sortOrder: Number.isFinite(Number(subcategory.sortOrder)) ? Number(subcategory.sortOrder) : 0,
    categoryId,
    categoryName: normalizeString(subcategory.category?.name || categoryHit.categoryName || ""),
    categorySlug: normalizeString(subcategory.category?.slug || categoryHit.categorySlug || ""),
    icon: normalizeString(subcategory.icon || ""),
    cities: Array.isArray(categoryHit.cities) ? categoryHit.cities : [],
    updatedAt: subcategory.updatedAt || subcategory.createdAt || null,
    searchableText: toSearchableText([
      subcategory.name,
      subcategory.slug,
      subcategory.description,
      subcategory.category?.name,
      parentSubcategory?.name,
    ]),
  };
};

const buildChildSubcategoryHits = async (categoryHits) => {
  if (!Array.isArray(categoryHits) || categoryHits.length === 0) {
    return [];
  }

  const categoryIds = Array.from(
    new Set(
      categoryHits
        .map((hit) => normalizeString(hit.categoryId || ""))
        .filter(Boolean)
    )
  );

  if (categoryIds.length === 0) {
    return [];
  }

  const categoryById = new Map(categoryHits.map((hit) => [normalizeString(hit.categoryId || ""), hit]));
  const subcategories = await Subcategory.find({
    category: { $in: categoryIds },
    isActive: true,
  })
    .select("_id name slug description icon category parentSubcategory sortOrder updatedAt createdAt")
    .populate("category", "_id name slug")
    .populate("parentSubcategory", "_id name")
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  const byCategory = new Map();
  subcategories.forEach((subcategory) => {
    const categoryId = subcategory.category?._id ? String(subcategory.category._id) : "";
    if (!categoryId) return;
    const parentId = subcategory.parentSubcategory?._id ? String(subcategory.parentSubcategory._id) : "";
    const categoryGroup = byCategory.get(categoryId) || new Map();
    const siblings = categoryGroup.get(parentId) || [];
    siblings.push(subcategory);
    categoryGroup.set(parentId, siblings);
    byCategory.set(categoryId, categoryGroup);
  });

  const ordered = [];
  const walk = (categoryId, parentId, depth, lineage) => {
    const categoryGroup = byCategory.get(categoryId);
    const siblings = categoryGroup?.get(parentId) || [];
    siblings.forEach((subcategory) => {
      const subcategoryId = String(subcategory._id);
      if (lineage.has(subcategoryId)) return;

      const categoryHit = categoryById.get(categoryId) || {};
      ordered.push(buildSubcategoryHit(subcategory, categoryHit, depth));
      walk(categoryId, subcategoryId, depth + 1, new Set([...lineage, subcategoryId]));
    });
  };

  categoryIds.forEach((categoryId) => {
    walk(categoryId, "", 1, new Set());
  });

  return ordered;
};

const mergePreferredSubcategoryHits = (preferredHits, searchHits) => {
  const seen = new Set();
  const merged = [];

  for (const hit of [...preferredHits, ...searchHits]) {
    const key = normalizeString(hit.subcategoryId || hit.id || "").toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(hit);
  }

  return merged;
};

const requireSearchAdmin = (req, res, next) => {
  const token = normalizeString(req.headers["x-search-token"] || req.query.token || "");
  const expected = normalizeString(process.env.SEARCH_ADMIN_TOKEN || "");
  if (!expected || token !== expected) {
    return res.status(403).json({ ok: false, message: "Search admin token required" });
  }

  return next();
};

router.get("/search", async (req, res) => {
  try {
    const query = normalizeString(req.query.q || "");
    if (!query) {
      return res.status(400).json({ ok: false, message: "Search query is required" });
    }

    const city = resolveCityFromRequest(req);
    if (!city) {
      return res.status(400).json({ ok: false, message: "City is required" });
    }

    const limit = clampNumber(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = clampNumber(req.query.offset, 0, 0, MAX_OFFSET);
    const type = normalizeType(req.query.type || "");

    const openNow = String(req.query.openNow || "").toLowerCase() === "true";
    const minRating = clampNumber(req.query.minRating, 0, 0, 5);
    const categorySlug = normalizeString(req.query.category || "");
    const subcategorySlug = normalizeString(req.query.subcategory || "");

    const index = await ensureSearchIndex();

    if (type) {
      const filter = buildSearchFilter({ city, type, openNow, minRating, categorySlug, subcategorySlug });
      const response = await index.search(query, {
        filter,
        limit,
        offset,
        facets: ["categorySlug", "subcategorySlug"],
      });
      let hits = response.hits;
      if (type === "vendor" || type === "product") {
        hits = await hydrateVendorLocations(hits);
      } else if (type === "category" || type === "subcategory") {
        hits = await hydrateCategoryIcons(hits, type);
        if (type === "category") {
          const childSubcategories = await buildChildSubcategoryHits(hits);
          hits = [...hits, ...childSubcategories];
        }
      }

      return res.status(200).json({
        ok: true,
        query,
        city,
        type,
        hits,
        total: response.estimatedTotalHits,
        facets: response.facetDistribution || {},
      });
    }

    const baseFilter = buildSearchFilter({
      city,
      openNow,
      minRating,
      categorySlug,
      subcategorySlug,
    });

    const [
      products,
      vendors,
      categories,
      subcategories,
      facetResponse,
    ] = await Promise.all([
      index.search(query, {
        filter: buildSearchFilter({ city, type: "product", openNow, minRating, categorySlug, subcategorySlug }),
        limit,
        offset,
      }),
      index.search(query, {
        filter: buildSearchFilter({ city, type: "vendor", openNow, minRating, categorySlug, subcategorySlug }),
        limit,
        offset,
      }),
      index.search(query, {
        filter: buildSearchFilter({ city, type: "category", openNow, minRating, categorySlug, subcategorySlug }),
        limit,
        offset,
      }),
      index.search(query, {
        filter: buildSearchFilter({ city, type: "subcategory", openNow, minRating, categorySlug, subcategorySlug }),
        limit,
        offset,
      }),
      index.search(query, {
        filter: baseFilter,
        limit: 0,
        facets: ["categorySlug", "subcategorySlug"],
      }),
    ]);

    const hydratedCategories = await hydrateCategoryIcons(categories.hits, "category");
    const hydratedSubcategories = await hydrateCategoryIcons(subcategories.hits, "subcategory");
    const childSubcategories = await buildChildSubcategoryHits(hydratedCategories);
    const orderedSubcategories = mergePreferredSubcategoryHits(childSubcategories, hydratedSubcategories);

    return res.status(200).json({
      ok: true,
      query,
      city,
      sections: {
        products: { hits: await hydrateVendorLocations(products.hits), total: products.estimatedTotalHits },
        vendors: { hits: await hydrateVendorLocations(vendors.hits), total: vendors.estimatedTotalHits },
        categories: { hits: hydratedCategories, total: categories.estimatedTotalHits },
        subcategories: { hits: orderedSubcategories, total: Math.max(subcategories.estimatedTotalHits, orderedSubcategories.length) },
      },
      facets: facetResponse.facetDistribution || {},
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Search failed", error: error.message });
  }
});

router.get("/search/suggest", async (req, res) => {
  try {
    const query = normalizeString(req.query.q || "");
    if (!query) {
      return res.status(400).json({ ok: false, message: "Search query is required" });
    }

    const city = resolveCityFromRequest(req);
    if (!city) {
      return res.status(400).json({ ok: false, message: "City is required" });
    }

    const index = await ensureSearchIndex();
    const normalizedQuery = query.toLowerCase();
    const containsQuery = (value) => String(value || "").toLowerCase().includes(normalizedQuery);

    const suggestions = [];
    const seen = new Set();
    const addSuggestion = (label, type, payload = {}) => {
      const key = `${type}:${label}`.toLowerCase();
      if (!label || seen.has(key)) return;
      seen.add(key);
      suggestions.push({ label, type, ...payload });
    };

    const categoryResponse = await index.search(query, {
      filter: buildSearchFilter({ city, type: "category" }),
      limit: 5,
      attributesToRetrieve: ["categoryName", "categorySlug"],
    });

    const categoryHits = Array.isArray(categoryResponse.hits) ? categoryResponse.hits : [];
    const primaryCategory = categoryHits.find((hit) => containsQuery(hit.categoryName));
    const categorySlug = primaryCategory?.categorySlug || "";

    if (primaryCategory && containsQuery(primaryCategory.categoryName)) {
      addSuggestion(primaryCategory.categoryName, "category", { categorySlug });
    }

    const vendorResponse = await index.search(query, {
      filter: buildSearchFilter({ city, type: "vendor" }),
      limit: 12,
      attributesToRetrieve: ["vendorName", "vendorId", "vendorImage", "categorySlug"],
    });

    const vendorHits = Array.isArray(vendorResponse.hits) ? vendorResponse.hits : [];
    vendorHits
      .filter((hit) => containsQuery(hit.vendorName))
      .forEach((hit) =>
        addSuggestion(hit.vendorName, "vendor", {
          vendorId: hit.vendorId,
          vendorImage: hit.vendorImage,
        })
      );

    const productResponse = await index.search(query, {
      filter: buildSearchFilter({ city, type: "product" }),
      limit: 12,
      attributesToRetrieve: ["productName", "productId", "productImage", "vendorId", "categorySlug"],
    });

    const productHits = Array.isArray(productResponse.hits) ? productResponse.hits : [];
    productHits
      .filter((hit) => containsQuery(hit.productName))
      .forEach((hit) =>
        addSuggestion(hit.productName, "product", {
          productId: hit.productId,
          vendorId: hit.vendorId,
          productImage: hit.productImage,
        })
      );

    if (categorySlug) {
      const vendorCategoryResponse = await index.search("", {
        filter: buildSearchFilter({ city, type: "vendor", categorySlug }),
        limit: 12,
        attributesToRetrieve: ["vendorName", "vendorId", "vendorImage"],
      });

      const vendorCategoryHits = Array.isArray(vendorCategoryResponse.hits)
        ? vendorCategoryResponse.hits
        : [];
      vendorCategoryHits.forEach((hit) =>
        addSuggestion(hit.vendorName, "vendor", {
          vendorId: hit.vendorId,
          vendorImage: hit.vendorImage,
        })
      );

      const productCategoryResponse = await index.search("", {
        filter: buildSearchFilter({ city, type: "product", categorySlug }),
        limit: 12,
        attributesToRetrieve: ["productName", "productId", "productImage", "vendorId"],
      });

      const productCategoryHits = Array.isArray(productCategoryResponse.hits)
        ? productCategoryResponse.hits
        : [];
      productCategoryHits.forEach((hit) =>
        addSuggestion(hit.productName, "product", {
          productId: hit.productId,
          vendorId: hit.vendorId,
          productImage: hit.productImage,
        })
      );
    }

    const ordered = suggestions.slice(0, 10);

    return res.status(200).json({
      ok: true,
      query,
      city,
      suggestions: ordered,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Autocomplete failed", error: error.message });
  }
});

router.post("/search/reindex", requireSearchAdmin, async (_req, res) => {
  try {
    const result = await reindexSearchDocuments();
    return res.status(200).json({ ok: true, message: "Search index rebuilt", ...result });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Search reindex failed", error: error.message });
  }
});

router.post("/search/sync", requireSearchAdmin, async (req, res) => {
  try {
    const vendorId = normalizeString(req.body?.vendorId || "");
    const productId = normalizeString(req.body?.productId || "");
    const categoryId = normalizeString(req.body?.categoryId || "");
    const subcategoryId = normalizeString(req.body?.subcategoryId || "");

    if (vendorId) scheduleVendorIndex(vendorId);
    if (productId) scheduleProductIndex(productId);
    if (categoryId || subcategoryId) scheduleCategoryIndex(categoryId, subcategoryId);

    return res.status(200).json({ ok: true, message: "Search sync scheduled" });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Search sync failed", error: error.message });
  }
});

module.exports = router;
