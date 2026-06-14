const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const City = require("../models/City");
const HomePlacement = require("../models/HomePlacement");
const User = require("../models/User");
const Review = require("../models/Review");
const { sanitizeCustomFormFields } = require("../lib/customForm");
const { toStoreStatusSummary } = require("../lib/storeStatus");
const { hasScopedAuthCookie } = require("../lib/authCookies");
const { getCachedRouteEntry, setCachedRouteEntry } = require("../lib/redis");

const router = express.Router();
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const HOME_PLACEMENT_KEY = "home-placements";
const HOME_PROMO_SECTION_KEY = "home-promo-cards";
const HOME_EXPLORE_SECTION_KEY = "home-explore-cards";
const HOME_WELLNESS_SECTION_KEY = "home-wellness-cards";
const HOME_SPONSOR_SECTION_KEY = "home-sponsor-cards";
const HOME_PROMO_CARD_COUNT = 5;
const HOME_EXPLORE_CARD_COUNT = 5;
const HOME_WELLNESS_CARD_COUNT = 5;
const HOME_SPONSOR_CARD_COUNT = 7;
const HOME_PROMO_DEFAULT_HEADING = "Featured Offers";
const HOME_EXPLORE_DEFAULT_HEADING = "Explore";
const HOME_WELLNESS_DEFAULT_HEADING = "Health & Wellness";
const HOME_SPONSOR_DEFAULT_HEADING = "Brand Partners";
const HOME_PROMO_CARD_IDS = Array.from({ length: HOME_PROMO_CARD_COUNT }, (_, index) => `card-${index + 1}`);
const HOME_EXPLORE_CARD_IDS = Array.from({ length: HOME_EXPLORE_CARD_COUNT }, (_, index) => `card-${index + 1}`);
const HOME_WELLNESS_CARD_IDS = Array.from({ length: HOME_WELLNESS_CARD_COUNT }, (_, index) => `card-${index + 1}`);
const HOME_SPONSOR_CARD_IDS = Array.from({ length: HOME_SPONSOR_CARD_COUNT }, (_, index) => `card-${index + 1}`);

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const PUBLIC_GET_MAX_AGE_SECONDS = toPositiveInt(process.env.PUBLIC_GET_MAX_AGE_SECONDS, 300);
const PUBLIC_ROUTE_CACHE_TTL_SECONDS = toPositiveInt(process.env.PUBLIC_ROUTE_CACHE_TTL_SECONDS, 180);

const withPublicGetCache = (handler, ttlSeconds = PUBLIC_ROUTE_CACHE_TTL_SECONDS) => async (req, res, next) => {
  const hasAuthContext = Boolean(req.headers.authorization || hasScopedAuthCookie(req, "customer"));
  if (hasAuthContext) {
    return handler(req, res, next);
  }

  const cacheKey = req.originalUrl || req.url;
  try {
    const cached = await getCachedRouteEntry(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.status(cached.statusCode).json(cached.payload);
    }
  } catch (error) {
    console.error("Cache read error:", error);
  }

  res.setHeader("X-Cache", "MISS");

  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      setCachedRouteEntry(cacheKey, res.statusCode, body, ttlSeconds).catch((err) =>
        console.error("Cache write error:", err)
      );
    }
    return originalJson.call(this, body);
  };

  try {
    await handler(req, res, next);
  } catch (err) {
    next(err);
  }
};

const toCategorySummary = (category) => ({
  id: String(category._id),
  name: category.name,
  slug: category.slug,
  description: category.description,
  image: category.image,
  icon: category.icon,
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
  const rootId = String(rootSubcategoryId || "").trim();
  if (!OBJECT_ID_REGEX.test(rootId)) {
    return [];
  }

  const rows = await Subcategory.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(rootId),
      },
    },
    {
      $graphLookup: {
        from: Subcategory.collection.name,
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parentSubcategory",
        as: "descendants",
        restrictSearchWithMatch: { isActive: true },
      },
    },
    {
      $project: {
        descendantIds: "$descendants._id",
      },
    },
  ]);

  if (!rows[0]?.descendantIds) {
    return [];
  }

  return rows[0].descendantIds.map((id) => String(id));
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
    createdAt: vendor.createdAt,
    name: vendor.name,
    businessName: vendor.businessName,
    businessType: vendor.businessType || "store",
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
    gstNumber: vendor.gstNumber,
    subcategory: vendor.businessSubcategory?.name || vendor.businessCategory?.name || "",
    imageUrl: vendor.image || DEFAULT_VENDOR_IMAGE,
    shopBannerImage: vendor.shopBannerImage || "",
    myStoreImage: vendor.myStoreImage || "",
    myStoreBannerImage: vendor.myStoreBannerImage || "",
    shopGallery: Array.isArray(vendor.shopGallery) ? vendor.shopGallery.filter(Boolean) : [],
    ctaLabel: "Inquiry",
    badges: vendor.vendorStatus === "approved" ? ["Verified"] : [],
    priceRange: undefined,
    tags: Array.isArray(vendor.serviceTags) ? vendor.serviceTags : [],
    businessDescription: vendor.businessDescription,
    establishmentYear: vendor.establishmentYear,
    yearsInBusiness: vendor.yearsInBusiness,
    shopOpeningTime: vendor.shopOpeningTime,
    shopClosingTime: vendor.shopClosingTime,
    ...toStoreStatusSummary(vendor),
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
    gstNumber: vendor.gstNumber,
    serviceTags: Array.isArray(vendor.serviceTags) ? vendor.serviceTags : [],
  };
};

const toSubcategorySummary = (subcategory) => ({
  id: String(subcategory._id),
  name: subcategory.name,
  slug: subcategory.slug,
  description: subcategory.description,
  icon: subcategory.icon,
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

const toHomePlacementSummary = (placement) => {
  const slots = placement?.slots && typeof placement.slots === "object" ? placement.slots : {};

  return {
    leftImage: String(slots.leftImage || "").trim(),
    middleImage: String(slots.middleImage || "").trim(),
    rightImage: String(slots.rightImage || "").trim(),
    updatedAt: placement?.updatedAt,
  };
};

const toHomeCardSectionSummary = ({
  key,
  heading,
  defaultHeading,
  cardIds,
  cards,
  updatedAt,
}) => {
  const cardById = new Map();

  cards.forEach((card, index) => {
    const cardIdInput = String(card?.cardId || "").trim();
    const fallbackCardId = cardIds[index];
    const cardId = cardIds.includes(cardIdInput) ? cardIdInput : fallbackCardId;
    if (!cardId || cardById.has(cardId)) {
      return;
    }

    const categoryDoc = card?.category && typeof card.category === "object" ? card.category : null;
    cardById.set(cardId, {
      cardId,
      categoryId: String(categoryDoc?._id || card?.category || "").trim(),
      categoryName: String(categoryDoc?.name || "").trim(),
      categorySlug: String(categoryDoc?.slug || "").trim(),
      title: String(card?.title || "").trim(),
      image: String(card?.image || "").trim(),
      link: String(card?.link || "").trim(),
    });
  });

  return {
    key,
    heading: String(heading || "").trim() || defaultHeading,
    cards: cardIds.map((cardId, index) => {
      const card = cardById.get(cardId);
      return {
        cardId,
        order: index + 1,
        categoryId: card?.categoryId || "",
        categoryName: card?.categoryName || "",
        categorySlug: card?.categorySlug || "",
        title: card?.title || "",
        image: card?.image || "",
        link: card?.link || "",
      };
    }),
    updatedAt,
  };
};

const toHomePromoSectionSummary = (placement) =>
  toHomeCardSectionSummary({
    key: HOME_PROMO_SECTION_KEY,
    heading: placement?.promoHeading,
    defaultHeading: HOME_PROMO_DEFAULT_HEADING,
    cardIds: HOME_PROMO_CARD_IDS,
    cards: Array.isArray(placement?.promoCards) ? placement.promoCards : [],
    updatedAt: placement?.updatedAt,
  });

const toHomeExploreSectionSummary = (placement) =>
  toHomeCardSectionSummary({
    key: HOME_EXPLORE_SECTION_KEY,
    heading: placement?.exploreHeading,
    defaultHeading: HOME_EXPLORE_DEFAULT_HEADING,
    cardIds: HOME_EXPLORE_CARD_IDS,
    cards: Array.isArray(placement?.exploreCards) ? placement.exploreCards : [],
    updatedAt: placement?.updatedAt,
  });

const toHomeWellnessSectionSummary = (placement) =>
  toHomeCardSectionSummary({
    key: HOME_WELLNESS_SECTION_KEY,
    heading: placement?.wellnessHeading,
    defaultHeading: HOME_WELLNESS_DEFAULT_HEADING,
    cardIds: HOME_WELLNESS_CARD_IDS,
    cards: Array.isArray(placement?.wellnessCards) ? placement.wellnessCards : [],
    updatedAt: placement?.updatedAt,
  });

const toHomeSponsorSectionSummary = (placement) =>
  toHomeCardSectionSummary({
    key: HOME_SPONSOR_SECTION_KEY,
    heading: placement?.sponsorHeading,
    defaultHeading: HOME_SPONSOR_DEFAULT_HEADING,
    cardIds: HOME_SPONSOR_CARD_IDS,
    cards: Array.isArray(placement?.sponsorCards) ? placement.sponsorCards : [],
    updatedAt: placement?.updatedAt,
  });

router.get("/cities", withPublicGetCache(async (_req, res) => {
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
}));

router.get("/home-placements", async (_req, res) => {
  try {
    const placement = await HomePlacement.findOne({ key: HOME_PLACEMENT_KEY }).lean();

    res.set("Cache-Control", "private, no-store");

    return res.status(200).json({
      ok: true,
      placements: toHomePlacementSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load home placements", error: error.message });
  }
});

router.get("/home-promo-cards", async (_req, res) => {
  try {
    const placement = await HomePlacement.findOne({ key: HOME_PROMO_SECTION_KEY }).lean();
    if (placement) {
      await HomePlacement.populate(placement, { path: "promoCards.category", select: "_id name slug isActive" });
    }

    res.set("Cache-Control", "private, no-store");

    return res.status(200).json({
      ok: true,
      section: toHomePromoSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load home promo cards", error: error.message });
  }
});

router.get("/home-explore-cards", async (_req, res) => {
  try {
    const placement = await HomePlacement.findOne({ key: HOME_EXPLORE_SECTION_KEY }).lean();
    if (placement) {
      await HomePlacement.populate(placement, { path: "exploreCards.category", select: "_id name slug isActive" });
    }

    res.set("Cache-Control", "private, no-store");

    return res.status(200).json({
      ok: true,
      section: toHomeExploreSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load explore cards", error: error.message });
  }
});

router.get("/home-wellness-cards", async (_req, res) => {
  try {
    const placement = await HomePlacement.findOne({ key: HOME_WELLNESS_SECTION_KEY }).lean();
    if (placement) {
      await HomePlacement.populate(placement, { path: "wellnessCards.category", select: "_id name slug isActive" });
    }

    res.set("Cache-Control", "private, no-store");

    return res.status(200).json({
      ok: true,
      section: toHomeWellnessSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load health and wellness cards", error: error.message });
  }
});

router.get("/home-sponsor-cards", async (_req, res) => {
  try {
    const placement = await HomePlacement.findOne({ key: HOME_SPONSOR_SECTION_KEY }).lean();

    res.set("Cache-Control", "private, no-store");

    return res.status(200).json({
      ok: true,
      section: toHomeSponsorSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load sponsor cards", error: error.message });
  }
});

router.get("/categories", withPublicGetCache(async (_req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("_id name slug description image icon isActive sortOrder customFormEnabled customFormTitle customFormFields")
      .lean();

    return res.status(200).json({
      ok: true,
      categories: categories.map(toCategorySummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load categories", error: error.message });
  }
}));

router.get("/subcategories", withPublicGetCache(async (req, res) => {
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
      .select("_id category parentSubcategory name slug description icon isActive sortOrder customFormEnabled customFormTitle customFormFields")
      .lean();

    await Subcategory.populate(subcategories, { path: "category", select: "_id name" });
    await Subcategory.populate(subcategories, { path: "parentSubcategory", select: "_id name" });

    return res.status(200).json({
      ok: true,
      subcategories: subcategories.map(toSubcategorySummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load subcategories", error: error.message });
  }
}));

router.get("/vendors", withPublicGetCache(async (req, res) => {
  const traceStartTime = Date.now();
  const traceId = Math.random().toString(36).substring(2, 11);
  const logStep = (stepName) => {
    const duration = Date.now() - traceStartTime;
    console.log(`[vendors-trace][${traceId}] ${stepName} at ${duration}ms`);
  };

  try {
    logStep("Handler Enter");
    const categoryIdInput = String(req.query.categoryId || "").trim();
    const categorySlug = String(req.query.categorySlug || "").trim().toLowerCase();
    const subcategoryId = String(req.query.subcategoryId || "").trim();
    const city = String(req.query.city || "").trim();
    const sublocality = String(req.query.sublocality || "").trim();
    const search = String(req.query.search || "").trim();

    let resolvedCategoryId = categoryIdInput;

    if (categorySlug) {
      logStep("Resolving categorySlug: " + categorySlug);
      const category = await Category.findOne({ slug: categorySlug, isActive: true }).select("_id").lean();
      logStep("Category slug resolved");
      if (!category) {
        logStep("Category slug resolved to null, exiting early");
        return res.status(200).json({ ok: true, vendors: [] });
      }
      resolvedCategoryId = String(category._id);
    }

    if (resolvedCategoryId && !OBJECT_ID_REGEX.test(resolvedCategoryId)) {
      logStep("Invalid Category ID, exiting early");
      return res.status(400).json({ ok: false, message: "Invalid category id" });
    }

    if (subcategoryId && !OBJECT_ID_REGEX.test(subcategoryId)) {
      logStep("Invalid Subcategory ID, exiting early");
      return res.status(400).json({ ok: false, message: "Invalid subcategory id" });
    }

    const query = {
      role: "vendor",
      vendorStatus: "approved",
    };

    let subcategoryFilterIds = [];

    if (subcategoryId) {
      logStep("Resolving subcategoryId: " + subcategoryId);
      const selectedSubcategory = await Subcategory.findOne({
        _id: subcategoryId,
        isActive: true,
      })
        .select("_id category")
        .lean();
      logStep("Subcategory resolved");

      if (!selectedSubcategory) {
        logStep("Subcategory not found, exiting early");
        return res.status(200).json({ ok: true, vendors: [] });
      }

      const selectedCategoryId = String(selectedSubcategory.category);
      if (resolvedCategoryId && resolvedCategoryId !== selectedCategoryId) {
        logStep("Category mismatch, exiting early");
        return res.status(200).json({ ok: true, vendors: [] });
      }

      logStep("Collecting descendants for subcategory: " + subcategoryId);
      const descendantSubcategoryIds = await collectDescendantSubcategoryIds(selectedSubcategory._id);
      logStep("Descendants collected: " + descendantSubcategoryIds.length);
      subcategoryFilterIds = [String(selectedSubcategory._id), ...descendantSubcategoryIds];
    }

    if (resolvedCategoryId) {
      query.businessCategory = resolvedCategoryId;
    }

    if (subcategoryFilterIds.length > 0) {
      query.businessSubcategory = { $in: subcategoryFilterIds };
    }

    let resolvedCity = "";
    let resolvedSublocality = "";

    if (city) {
      logStep("Resolving city: " + city + ", sublocality: " + sublocality);
      const cityDoc = await City.findOne({
        $or: [
          { name: new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          { slug: city.toLowerCase() }
        ],
        isActive: true
      })
        .select("name localities")
        .lean();
      logStep("City resolved");

      if (cityDoc) {
        resolvedCity = cityDoc.name;
        if (sublocality) {
          const matchedLocality = (cityDoc.localities || []).find(
            (loc) =>
              loc.name.toLowerCase() === sublocality.toLowerCase() ||
              loc.slug === sublocality.toLowerCase()
          );
          if (matchedLocality) {
            resolvedSublocality = matchedLocality.name;
          } else {
            resolvedSublocality = sublocality;
          }
        }
      } else {
        resolvedCity = city;
        resolvedSublocality = sublocality;
      }
    } else if (sublocality) {
      resolvedSublocality = sublocality;
    }

    if (resolvedCity) {
      query.city = resolvedCity;
    }

    if (resolvedSublocality) {
      query.sublocality = resolvedSublocality;
    }

    if (search) {
      logStep("Resolving search: " + search);
      const regex = toSafeRegex(search);
      query.$or = [{ businessName: regex }, { name: regex }, { businessDescription: regex }, { serviceTags: regex }];
    }

    const limit = toPositiveInt(req.query.limit, 0);
    const page = toPositiveInt(req.query.page, 1);

    logStep("Building User query");
    let dbQuery = User.find(query)
      .sort({ updatedAt: -1, businessName: 1, name: 1 })
      .select(
          "_id name businessName businessType city sublocality state businessAddress businessCategory businessSubcategory businessPhone businessEmail businessAlternatePhone website gstNumber serviceTags businessDescription image marketingOptIn vendorStatus establishmentYear yearsInBusiness shopOpeningTime shopClosingTime storeStatusMode manualStoreStatus manualStoreStatusUpdatedAt"
      )
      .lean();

    if (limit > 0) {
      dbQuery = dbQuery.skip((page - 1) * limit).limit(limit);
    }

    logStep("Executing User query");
    const vendors = await dbQuery;
    logStep("User query completed: " + vendors.length + " vendors fetched");

    logStep("Populating Category");
    await User.populate(vendors, { path: "businessCategory", select: "_id name slug" });
    logStep("Populating Subcategory");
    await User.populate(vendors, { path: "businessSubcategory", select: "_id name slug" });
    logStep("Populate completed");

    logStep("Executing Review aggregate query");
    const reviewSummaryByVendorId = await getVendorReviewSummaryMap(vendors.map((vendor) => vendor._id));
    logStep("Review aggregate query completed");

    logStep("Mapping vendors to summary objects");
    const mappedVendors = vendors.map((vendor) => toVendorSummary(vendor, reviewSummaryByVendorId));
    logStep("Mapping completed");

    logStep("Sending success response");
    return res.status(200).json({
      ok: true,
      vendors: mappedVendors,
    });
  } catch (error) {
    logStep("Error caught in handler: " + error.message);
    return res.status(500).json({ ok: false, message: "Failed to load vendors", error: error.message });
  }
}));

router.get("/vendors/:id", withPublicGetCache(async (req, res) => {
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
        "_id name businessName businessType city sublocality state postalCode businessAddress businessCategory businessSubcategory businessPhone businessEmail businessAlternatePhone website gstNumber serviceTags businessDescription image shopBannerImage myStoreImage myStoreBannerImage shopGallery marketingOptIn vendorStatus establishmentYear yearsInBusiness shopOpeningTime shopClosingTime storeStatusMode manualStoreStatus manualStoreStatusUpdatedAt createdAt"
      )
      .lean();

    if (!vendor) {
      return res.status(404).json({ ok: false, message: "Vendor not found" });
    }

    await User.populate(vendor, { path: "businessCategory", select: "_id name slug" });
    await User.populate(vendor, { path: "businessSubcategory", select: "_id name slug" });

    const reviewSummaryByVendorId = await getVendorReviewSummaryMap([vendor._id]);

    return res.status(200).json({
      ok: true,
      vendor: toVendorDetail(vendor, reviewSummaryByVendorId),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load vendor", error: error.message });
  }
}));

module.exports = router;
