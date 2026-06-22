const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const City = require("../models/City");
const HomePlacement = require("../models/HomePlacement");
const {
  GSTIN_REGEX,
  AADHAAR_REGEX,
  DOCUMENT_DATA_URL_REGEX,
  MAX_DOCUMENT_DATA_LENGTH,
  isValidEstablishmentYear,
} = require("../lib/vendorValidation");
const {
  sanitizeCustomFormFields,
  resolveEffectiveCustomForm,
  validateCustomFormData,
} = require("../lib/customForm");
const { resolveTokenFromRequest } = require("../lib/authCookies");
const { scheduleCategoryIndex, scheduleVendorIndex } = require("../lib/search/indexer");

const router = express.Router();

router.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const originalJson = res.json;
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const { clearCatalogCache } = require("../lib/redis");
        clearCatalogCache().catch((err) =>
          console.error("Error clearing catalog cache in admin middleware:", err)
        );
      }
      return originalJson.call(this, body);
    };
  }
  next();
});

const VENDOR_STATUS_VALUES = new Set(["pending", "approved", "rejected"]);
const VENDOR_LIST_STATUS_VALUES = new Set(["all", "pending", "approved", "rejected"]);
const USER_LIST_ROLE_VALUES = new Set(["all", "admin", "customer", "vendor"]);
const USER_ROLE_VALUES = new Set(["admin", "customer", "vendor"]);
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;
const POSTAL_REGEX = /^[0-9]{5,10}$/;
const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const URL_REGEX = /^https?:\/\/[^\s]+$/i;
const IMAGE_DATA_URL_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/;
const MAX_MEDIA_VALUE_LENGTH = 3000000;
const HOME_PLACEMENT_KEY = "home-placements";
const HOME_PROMO_SECTION_KEY = "home-promo-cards";
const HOME_EXPLORE_SECTION_KEY = "home-explore-cards";
const HOME_WELLNESS_SECTION_KEY = "home-wellness-cards";
const HOME_SPONSOR_SECTION_KEY = "home-sponsor-cards";
const HOME_PROMO_CARD_COUNT = 5;
const HOME_EXPLORE_CARD_COUNT = 5;
const HOME_WELLNESS_CARD_COUNT = 5;
const HOME_SPONSOR_CARD_COUNT = 7;
const HOME_PROMO_HEADING_MAX_LENGTH = 120;
const HOME_CARD_TITLE_MAX_LENGTH = 90;
const HOME_PROMO_DEFAULT_HEADING = "Featured Offers";
const HOME_EXPLORE_DEFAULT_HEADING = "Explore";
const HOME_WELLNESS_DEFAULT_HEADING = "Health & Wellness";
const HOME_SPONSOR_DEFAULT_HEADING = "Brand Partners";
const HOME_PROMO_CARD_IDS = Array.from({ length: HOME_PROMO_CARD_COUNT }, (_, index) => `card-${index + 1}`);
const HOME_EXPLORE_CARD_IDS = Array.from({ length: HOME_EXPLORE_CARD_COUNT }, (_, index) => `card-${index + 1}`);
const HOME_WELLNESS_CARD_IDS = Array.from({ length: HOME_WELLNESS_CARD_COUNT }, (_, index) => `card-${index + 1}`);
const HOME_SPONSOR_CARD_IDS = Array.from({ length: HOME_SPONSOR_CARD_COUNT }, (_, index) => `card-${index + 1}`);
const ID_PROOF_TYPES = new Set(["aadhaar", "pan", "driving_license", "passport", "voter_id", "other"]);

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const toExactRegex = (value) => new RegExp(`^${escapeRegex(String(value || ""))}$`, "i");
const normalizeMediaValue = (value) => String(value || "").trim();
const SPONSOR_LINK_REGEX = /^(https?:\/\/[^\s]+|\/[^\s]*)$/i;

const isValidCategoryMediaValue = (value) => {
  const normalized = normalizeMediaValue(value);
  if (!normalized) return true;
  if (normalized.length > MAX_MEDIA_VALUE_LENGTH) return false;
  return URL_REGEX.test(normalized) || IMAGE_DATA_URL_REGEX.test(normalized);
};

const toHomePlacementSummary = (placement) => {
  const slots = placement?.slots && typeof placement.slots === "object" ? placement.slots : {};

  return {
    key: HOME_PLACEMENT_KEY,
    leftImage: normalizeMediaValue(slots.leftImage) || "",
    middleImage: normalizeMediaValue(slots.middleImage) || "",
    rightImage: normalizeMediaValue(slots.rightImage) || "",
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
  const mappedByCardId = new Map();

  cards.forEach((card, index) => {
    const cardIdInput = String(card?.cardId || "").trim();
    const fallbackCardId = cardIds[index];
    const cardId = cardIds.includes(cardIdInput) ? cardIdInput : fallbackCardId;
    if (!cardId || mappedByCardId.has(cardId)) {
      return;
    }

    const categoryDoc = card?.category && typeof card.category === "object" ? card.category : null;
    const categoryId = categoryDoc
      ? String(categoryDoc._id || categoryDoc.id || "").trim()
      : String(card?.category || "").trim();

    mappedByCardId.set(cardId, {
      cardId,
      categoryId,
      categoryName: String(categoryDoc?.name || "").trim(),
      categorySlug: String(categoryDoc?.slug || "").trim(),
      title: String(card?.title || "").trim(),
      image: normalizeMediaValue(card?.image) || "",
      link: String(card?.link || "").trim(),
    });
  });

  return {
    key,
    heading: String(heading || "").trim() || defaultHeading,
    cards: cardIds.map((cardId, index) => {
      const card = mappedByCardId.get(cardId);
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

const normalizeHomeCardSectionInput = (cardsInput, cardIds) => {
  const cards = Array.isArray(cardsInput) ? cardsInput : [];
  const cardById = new Map();

  cards.forEach((card, index) => {
    const cardIdInput = String(card?.cardId || "").trim();
    const fallbackCardId = cardIds[index];
    const cardId = cardIds.includes(cardIdInput) ? cardIdInput : fallbackCardId;
    if (!cardId || cardById.has(cardId)) {
      return;
    }

    cardById.set(cardId, {
      cardId,
      categoryId: String(card?.categoryId || "").trim(),
      title: String(card?.title || "").trim().slice(0, HOME_CARD_TITLE_MAX_LENGTH),
      image: normalizeMediaValue(card?.image) || "",
      link: String(card?.link || "").trim(),
    });
  });

  return cardIds.map((cardId, index) => {
    const card = cardById.get(cardId);
    return {
      cardId,
      sortOrder: index + 1,
      categoryId: card?.categoryId || "",
      title: card?.title || "",
      image: card?.image || "",
      link: card?.link || "",
    };
  });
};

const normalizeHomePromoCardsInput = (cardsInput) => normalizeHomeCardSectionInput(cardsInput, HOME_PROMO_CARD_IDS);
const normalizeHomeExploreCardsInput = (cardsInput) => normalizeHomeCardSectionInput(cardsInput, HOME_EXPLORE_CARD_IDS);
const normalizeHomeWellnessCardsInput = (cardsInput) => normalizeHomeCardSectionInput(cardsInput, HOME_WELLNESS_CARD_IDS);
const normalizeHomeSponsorCardsInput = (cardsInput) => normalizeHomeCardSectionInput(cardsInput, HOME_SPONSOR_CARD_IDS);

const validateHomeSectionCards = async (cards, options = {}) => {
  const {
    supportsCategory = true,
    validateLink = false,
  } = options;

  for (const card of cards) {
    if (card.image && !isValidCategoryMediaValue(card.image)) {
      return `Image for ${card.cardId} must be a valid URL or image data`;
    }

    if (supportsCategory && card.categoryId && !OBJECT_ID_REGEX.test(card.categoryId)) {
      return `Category for ${card.cardId} is invalid`;
    }

    if (!supportsCategory && card.categoryId) {
      return `Category for ${card.cardId} is not supported`;
    }

    if (validateLink) {
      const link = String(card.link || "").trim();
      if (link && !SPONSOR_LINK_REGEX.test(link)) {
        return `Link for ${card.cardId} must be an absolute URL or start with /`;
      }
    }
  }

  const categoryIds = supportsCategory
    ? Array.from(new Set(cards.map((card) => card.categoryId).filter(Boolean)))
    : [];
  if (supportsCategory && categoryIds.length > 0) {
    const categories = await Category.find({ _id: { $in: categoryIds } }).select("_id").lean();
    if (categories.length !== categoryIds.length) {
      return "One or more selected categories do not exist";
    }
  }

  return "";
};

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.verify(token, secret);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const toObjectId = (value) => {
  const normalized = String(value || "").trim();
  if (!OBJECT_ID_REGEX.test(normalized)) {
    return null;
  }

  return new mongoose.Types.ObjectId(normalized);
};

const toCustomFormSummary = (entity) => {
  const customFormFields = sanitizeCustomFormFields(entity?.customFormFields);
  const customFormEnabled = Boolean(entity?.customFormEnabled) && customFormFields.length > 0;

  return {
    customFormEnabled,
    customFormTitle: customFormEnabled ? String(entity?.customFormTitle || "").trim() || undefined : undefined,
    customFormFields,
  };
};

const toCategorySummary = (category) => ({
  id: String(category._id),
  name: category.name,
  slug: category.slug,
  description: category.description,
  icon: category.icon,
  isActive: category.isActive,
  sortOrder: category.sortOrder,
  ...toCustomFormSummary(category),
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
    ...toCustomFormSummary(category),
  };
};

const toSubcategoryReference = (subcategory) => {
  if (!subcategory) return undefined;

  const subcategoryId = subcategory._id || subcategory.id || subcategory;
  if (!subcategoryId) return undefined;

  return {
    id: String(subcategoryId),
    name: subcategory.name,
    ...toCustomFormSummary(subcategory),
  };
};

const toSubcategorySummary = (subcategory) => ({
  id: String(subcategory._id),
  name: subcategory.name,
  slug: subcategory.slug,
  description: subcategory.description,
  icon: subcategory.icon,
  coverImage: subcategory.coverImage,
  isActive: subcategory.isActive,
  sortOrder: subcategory.sortOrder,
  ...toCustomFormSummary(subcategory),
  category: toCategoryReference(subcategory.category),
  parentSubcategory: toSubcategoryReference(subcategory.parentSubcategory),
  createdAt: subcategory.createdAt,
  updatedAt: subcategory.updatedAt,
});

const toCitySummary = (city, includeInactiveLocalities = false) => {
  const localities = Array.isArray(city.localities) ? city.localities : [];
  const items = localities
    .filter((locality) => includeInactiveLocalities || locality.isActive !== false)
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
      isActive: locality.isActive !== false,
      sortOrder: locality.sortOrder,
    }));

  return {
    id: String(city._id),
    name: city.name,
    slug: city.slug,
    state: city.state,
    isActive: city.isActive,
    sortOrder: city.sortOrder,
    image: city.image,
    localities: items,
    createdAt: city.createdAt,
    updatedAt: city.updatedAt,
  };
};

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
    )
      .select("_id")
      .lean();

    if (!existing) return slug;
    slug = `${sanitizedBase}-${suffix}`;
    suffix += 1;
  }
};

const resolveUniqueSubcategorySlug = async (baseSlug, categoryId, parentSubcategoryId, excludeSubcategoryId) => {
  const sanitizedBase = baseSlug || `subcategory-${Date.now()}`;
  let slug = sanitizedBase;
  let suffix = 1;

  // Ensure uniqueness only within the selected category.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = {
      category: categoryId,
      parentSubcategory: parentSubcategoryId || null,
      slug,
    };

    if (excludeSubcategoryId) {
      query._id = { $ne: excludeSubcategoryId };
    }

    const existing = await Subcategory.findOne(query).select("_id").lean();
    if (!existing) return slug;

    slug = `${sanitizedBase}-${suffix}`;
    suffix += 1;
  }
};

const resolveUniqueCitySlug = async (baseSlug, excludeCityId) => {
  const sanitizedBase = baseSlug || `city-${Date.now()}`;
  let slug = sanitizedBase;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await City.findOne(
      excludeCityId
        ? {
            slug,
            _id: { $ne: excludeCityId },
          }
        : { slug }
    )
      .select("_id")
      .lean();

    if (!existing) return slug;
    slug = `${sanitizedBase}-${suffix}`;
    suffix += 1;
  }
};

const resolveUniqueLocalitySlug = (city, baseSlug, excludeLocalityId) => {
  const localities = Array.isArray(city?.localities) ? city.localities : [];
  const sanitizedBase = baseSlug || `locality-${Date.now()}`;
  let slug = sanitizedBase;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = localities.some((locality) => {
      if (excludeLocalityId && String(locality._id) === String(excludeLocalityId)) {
        return false;
      }

      return String(locality.slug || "") === slug;
    });

    if (!exists) return slug;
    slug = `${sanitizedBase}-${suffix}`;
    suffix += 1;
  }
};

const isDescendantSubcategory = async (candidateParentId, subcategoryId) => {
  if (!candidateParentId || !subcategoryId) return false;

  const rootObjectId = toObjectId(subcategoryId);
  if (!rootObjectId) {
    return false;
  }

  const rows = await Subcategory.aggregate([
    {
      $match: {
        _id: rootObjectId,
      },
    },
    {
      $graphLookup: {
        from: Subcategory.collection.name,
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parentSubcategory",
        as: "descendants",
      },
    },
    {
      $project: {
        descendantIds: "$descendants._id",
      },
    },
  ]);

  const descendantSet = new Set((rows[0]?.descendantIds || []).map((id) => String(id)));
  return descendantSet.has(String(candidateParentId));
};

const collectDescendantSubcategoryIds = async (rootSubcategoryId) => {
  const rootObjectId = toObjectId(rootSubcategoryId);
  if (!rootObjectId) {
    return [];
  }

  const rows = await Subcategory.aggregate([
    {
      $match: {
        _id: rootObjectId,
      },
    },
    {
      $graphLookup: {
        from: Subcategory.collection.name,
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parentSubcategory",
        as: "descendants",
      },
    },
    {
      $project: {
        descendantIds: "$descendants._id",
      },
    },
  ]);

  return (rows[0]?.descendantIds || []).map((id) => String(id));
};

const parseSortOrderRequest = (value) => {
  if (value === undefined || value === null) {
    return {
      provided: false,
      value: null,
      error: "",
    };
  }

  if (typeof value === "string" && !value.trim()) {
    return {
      provided: false,
      value: null,
      error: "",
    };
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    return {
      provided: true,
      value: null,
      error: "Sort order must be a whole number",
    };
  }

  if (numeric <= 0) {
    return {
      provided: true,
      value: null,
      error: "",
    };
  }

  return {
    provided: true,
    value: numeric,
    error: "",
  };
};

const clampSortOrderInsertIndex = (sortOrder, countWithoutCurrent) => {
  if (!Number.isFinite(Number(sortOrder))) {
    return countWithoutCurrent;
  }

  const clamped = Math.max(1, Math.min(Number(sortOrder), countWithoutCurrent + 1));
  return clamped - 1;
};

const fetchOrderedCategoryIds = async () => {
  const categories = await Category.find({})
    .sort({ sortOrder: 1, name: 1, _id: 1 })
    .select("_id")
    .lean();

  return categories.map((category) => String(category._id));
};

const applyCategorySortOrders = async (orderedCategoryIds) => {
  if (!orderedCategoryIds.length) {
    return;
  }

  await Category.bulkWrite(
    orderedCategoryIds.map((categoryId, index) => ({
      updateOne: {
        filter: { _id: categoryId },
        update: { $set: { sortOrder: index + 1 } },
      },
    }))
  );
};

const fetchOrderedCityIds = async () => {
  const cities = await City.find({})
    .sort({ sortOrder: 1, name: 1, _id: 1 })
    .select("_id")
    .lean();

  return cities.map((city) => String(city._id));
};

const applyCitySortOrders = async (orderedCityIds) => {
  if (!orderedCityIds.length) {
    return;
  }

  await City.bulkWrite(
    orderedCityIds.map((cityId, index) => ({
      updateOne: {
        filter: { _id: cityId },
        update: { $set: { sortOrder: index + 1 } },
      },
    }))
  );
};

const resolveObjectIdValue = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  return toObjectId(value);
};

const buildSubcategorySortGroupFilter = (categoryId, parentSubcategoryId) => {
  const categoryObjectId = resolveObjectIdValue(categoryId);
  if (!categoryObjectId) {
    return null;
  }

  return {
    category: categoryObjectId,
    parentSubcategory: resolveObjectIdValue(parentSubcategoryId) || null,
  };
};

const fetchOrderedSubcategoryIds = async (categoryId, parentSubcategoryId) => {
  const query = buildSubcategorySortGroupFilter(categoryId, parentSubcategoryId);
  if (!query) {
    return [];
  }

  const subcategories = await Subcategory.find(query)
    .sort({ sortOrder: 1, name: 1, _id: 1 })
    .select("_id")
    .lean();

  return subcategories.map((subcategory) => String(subcategory._id));
};

const applySubcategorySortOrders = async (orderedSubcategoryIds) => {
  if (!orderedSubcategoryIds.length) {
    return;
  }

  await Subcategory.bulkWrite(
    orderedSubcategoryIds.map((subcategoryId, index) => ({
      updateOne: {
        filter: { _id: subcategoryId },
        update: { $set: { sortOrder: index + 1 } },
      },
    }))
  );
};

const buildSubcategorySortGroupKey = (categoryId, parentSubcategoryId) =>
  `${String(categoryId || "").trim()}:${String(parentSubcategoryId || "root").trim() || "root"}`;

const toVendorSummary = (vendor) => ({
  id: String(vendor._id),
  name: vendor.name,
  businessName: vendor.businessName,
  businessType: vendor.businessType || "store",
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
  sublocality: vendor.sublocality,
  state: vendor.state,
  postalCode: vendor.postalCode,
  gstNumber: vendor.gstNumber,
  gstDocument: vendor.gstDocument,
  website: vendor.website,
  shopOpeningTime: vendor.shopOpeningTime,
  shopClosingTime: vendor.shopClosingTime,
  establishmentYear: vendor.establishmentYear,
  yearsInBusiness: vendor.yearsInBusiness,
  serviceTags: vendor.serviceTags || [],
  businessDescription: vendor.businessDescription,
  idProofType: vendor.idProofType,
  idProofNumber: vendor.idProofNumber,
  idProofDocument: vendor.idProofDocument,
  marketingOptIn: vendor.marketingOptIn,
  customFormData: vendor.customFormData && typeof vendor.customFormData === "object" ? vendor.customFormData : {},
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

const toUserDetail = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone,
  alternatePhone: user.alternatePhone,
  businessName: user.businessName,
  businessCategory: toCategoryReference(user.businessCategory),
  businessSubcategory: toSubcategoryReference(user.businessSubcategory),
  businessEmail: user.businessEmail,
  businessPhone: user.businessPhone,
  businessAlternatePhone: user.businessAlternatePhone,
  businessAddress: user.businessAddress,
  city: user.city,
  sublocality: user.sublocality,
  state: user.state,
  postalCode: user.postalCode,
  gstNumber: user.gstNumber,
  gstDocument: user.gstDocument,
  website: user.website,
  shopOpeningTime: user.shopOpeningTime,
  shopClosingTime: user.shopClosingTime,
  establishmentYear: user.establishmentYear,
  yearsInBusiness: user.yearsInBusiness,
  serviceTags: user.serviceTags || [],
  businessDescription: user.businessDescription,
  idProofType: user.idProofType,
  idProofNumber: user.idProofNumber,
  idProofDocument: user.idProofDocument,
  marketingOptIn: user.marketingOptIn,
  customFormData: user.customFormData && typeof user.customFormData === "object" ? user.customFormData : {},
  effectiveCustomForm:
    user.role === "vendor"
      ? resolveEffectiveCustomForm({
          category: user.businessCategory,
          subcategory: user.businessSubcategory,
        })
      : { source: "none", title: "", fields: [] },
  role: user.role,
  vendorStatus: user.vendorStatus,
  vendorReviewNote: user.vendorReviewNote,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const requireAdmin = async (req, res, next) => {
  try {
    const token = resolveTokenFromRequest(req, "admin");
    if (!token) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const { isTokenBlacklisted } = require("../lib/redis");
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ ok: false, message: "Session revoked" });
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select("_id name email phone role").lean();

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
          "_id name businessName businessType businessCategory businessSubcategory email phone alternatePhone businessEmail businessPhone businessAlternatePhone businessAddress city sublocality state postalCode gstNumber gstDocument website shopOpeningTime shopClosingTime establishmentYear yearsInBusiness serviceTags businessDescription idProofType idProofNumber idProofDocument marketingOptIn customFormData vendorStatus vendorReviewNote createdAt updatedAt"
        )
        .populate("businessCategory", "_id name customFormEnabled customFormTitle customFormFields")
        .populate("businessSubcategory", "_id name customFormEnabled customFormTitle customFormFields")
        .lean(),
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
        "_id name businessName businessType businessCategory businessSubcategory email phone alternatePhone businessEmail businessPhone businessAlternatePhone businessAddress city sublocality state postalCode gstNumber gstDocument website shopOpeningTime shopClosingTime establishmentYear yearsInBusiness serviceTags businessDescription idProofType idProofNumber idProofDocument marketingOptIn customFormData vendorStatus vendorReviewNote createdAt updatedAt"
      )
      .populate("businessCategory", "_id name customFormEnabled customFormTitle customFormFields")
      .populate("businessSubcategory", "_id name customFormEnabled customFormTitle customFormFields")
      .lean();

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

    if (!OBJECT_ID_REGEX.test(vendorId)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    }

    if (!VENDOR_STATUS_VALUES.has(nextStatus)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor status" });
    }

    const vendor = await User.findOne({ _id: vendorId, role: "vendor" })
      .select(
        "_id name businessName businessType businessCategory businessSubcategory email phone alternatePhone businessEmail businessPhone businessAlternatePhone businessAddress city sublocality state postalCode gstNumber gstDocument website shopOpeningTime shopClosingTime establishmentYear yearsInBusiness serviceTags businessDescription idProofType idProofNumber idProofDocument marketingOptIn customFormData vendorStatus vendorReviewNote createdAt updatedAt"
      )
      .populate("businessCategory", "_id name customFormEnabled customFormTitle customFormFields")
      .populate("businessSubcategory", "_id name customFormEnabled customFormTitle customFormFields");

    if (!vendor) {
      return res.status(404).json({ ok: false, message: "Vendor not found" });
    }

    vendor.vendorStatus = nextStatus;

    if (reviewNoteInput !== undefined) {
      const note = String(reviewNoteInput || "").trim();
      vendor.vendorReviewNote = note || undefined;
    }

    await vendor.save();

    scheduleVendorIndex(String(vendor._id));

    return res.status(200).json({
      ok: true,
      message: "Vendor status updated",
      vendor: toVendorSummary(vendor),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update vendor status", error: error.message });
  }
});

router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const role = String(req.query.role || "all").toLowerCase();
    const search = String(req.query.search || "").trim();
    const limitInput = Number(req.query.limit);
    const limit = Number.isFinite(limitInput) ? Math.min(Math.max(Math.floor(limitInput), 1), 500) : 200;

    if (!USER_LIST_ROLE_VALUES.has(role)) {
      return res.status(400).json({ ok: false, message: "Invalid role filter" });
    }

    const query = {};

    if (role !== "all") {
      query.role = role;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { name: regex },
        { businessName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("_id name email phone businessName role vendorStatus createdAt updatedAt")
      .lean();

    return res.status(200).json({
      ok: true,
      users: users.map(toUserSummary),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load users", error: error.message });
  }
});

router.get("/admin/ads/home-explore-cards", requireAdmin, async (_req, res) => {
  try {
    const placement = await HomePlacement.findOne({ key: HOME_EXPLORE_SECTION_KEY })
      .populate("exploreCards.category", "_id name slug isActive")
      .lean();

    return res.status(200).json({
      ok: true,
      section: toHomeExploreSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load explore cards", error: error.message });
  }
});

router.put("/admin/ads/home-explore-cards", requireAdmin, async (req, res) => {
  try {
    const headingInput = String(req.body?.heading || "").trim();
    const heading = headingInput.slice(0, HOME_PROMO_HEADING_MAX_LENGTH);
    const cards = normalizeHomeExploreCardsInput(req.body?.cards);

    const validationMessage = await validateHomeSectionCards(cards);
    if (validationMessage) {
      return res.status(400).json({ ok: false, message: validationMessage });
    }

    const placement = await HomePlacement.findOneAndUpdate(
      { key: HOME_EXPLORE_SECTION_KEY },
      {
        $set: {
          key: HOME_EXPLORE_SECTION_KEY,
          exploreHeading: heading || HOME_EXPLORE_DEFAULT_HEADING,
          exploreCards: cards.map((card) => ({
            cardId: card.cardId,
            category: card.categoryId || undefined,
            title: card.title || undefined,
            image: card.image || undefined,
            sortOrder: card.sortOrder,
          })),
          updatedBy: req.adminUser._id,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate("exploreCards.category", "_id name slug isActive")
      .lean();

    return res.status(200).json({
      ok: true,
      message: "Explore cards updated",
      section: toHomeExploreSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update explore cards", error: error.message });
  }
});

router.get("/admin/ads/home-wellness-cards", requireAdmin, async (_req, res) => {
  try {
    const placement = await HomePlacement.findOne({ key: HOME_WELLNESS_SECTION_KEY })
      .populate("wellnessCards.category", "_id name slug isActive")
      .lean();

    return res.status(200).json({
      ok: true,
      section: toHomeWellnessSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load health and wellness cards", error: error.message });
  }
});

router.put("/admin/ads/home-wellness-cards", requireAdmin, async (req, res) => {
  try {
    const headingInput = String(req.body?.heading || "").trim();
    const heading = headingInput.slice(0, HOME_PROMO_HEADING_MAX_LENGTH);
    const cards = normalizeHomeWellnessCardsInput(req.body?.cards);

    const validationMessage = await validateHomeSectionCards(cards);
    if (validationMessage) {
      return res.status(400).json({ ok: false, message: validationMessage });
    }

    const placement = await HomePlacement.findOneAndUpdate(
      { key: HOME_WELLNESS_SECTION_KEY },
      {
        $set: {
          key: HOME_WELLNESS_SECTION_KEY,
          wellnessHeading: heading || HOME_WELLNESS_DEFAULT_HEADING,
          wellnessCards: cards.map((card) => ({
            cardId: card.cardId,
            category: card.categoryId || undefined,
            title: card.title || undefined,
            image: card.image || undefined,
            sortOrder: card.sortOrder,
          })),
          updatedBy: req.adminUser._id,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate("wellnessCards.category", "_id name slug isActive")
      .lean();

    return res.status(200).json({
      ok: true,
      message: "Health and wellness cards updated",
      section: toHomeWellnessSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update health and wellness cards", error: error.message });
  }
});

router.get("/admin/ads/home-sponsor-cards", requireAdmin, async (_req, res) => {
  try {
    const placement = await HomePlacement.findOne({ key: HOME_SPONSOR_SECTION_KEY })
      .populate("sponsorCards.category", "_id name slug isActive")
      .lean();

    return res.status(200).json({
      ok: true,
      section: toHomeSponsorSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load sponsor cards", error: error.message });
  }
});

router.put("/admin/ads/home-sponsor-cards", requireAdmin, async (req, res) => {
  try {
    const headingInput = String(req.body?.heading || "").trim();
    const heading = headingInput.slice(0, HOME_PROMO_HEADING_MAX_LENGTH);
    const cards = normalizeHomeSponsorCardsInput(req.body?.cards);

    const validationMessage = await validateHomeSectionCards(cards, {
      supportsCategory: false,
      validateLink: true,
    });
    if (validationMessage) {
      return res.status(400).json({ ok: false, message: validationMessage });
    }

    const placement = await HomePlacement.findOneAndUpdate(
      { key: HOME_SPONSOR_SECTION_KEY },
      {
        $set: {
          key: HOME_SPONSOR_SECTION_KEY,
          sponsorHeading: heading || HOME_SPONSOR_DEFAULT_HEADING,
          sponsorCards: cards.map((card) => ({
            cardId: card.cardId,
            title: card.title || undefined,
            image: card.image || undefined,
            link: card.link || undefined,
            sortOrder: card.sortOrder,
          })),
          updatedBy: req.adminUser._id,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate("sponsorCards.category", "_id name slug isActive")
      .lean();

    return res.status(200).json({
      ok: true,
      message: "Sponsor cards updated",
      section: toHomeSponsorSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update sponsor cards", error: error.message });
  }
});

router.get("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = String(req.params.id || "").trim();
    if (!OBJECT_ID_REGEX.test(userId)) {
      return res.status(400).json({ ok: false, message: "Invalid user id" });
    }

    const user = await User.findById(userId)
      .select(
        "_id name email phone alternatePhone businessName businessCategory businessSubcategory businessEmail businessPhone businessAlternatePhone businessAddress city sublocality state postalCode gstNumber gstDocument website shopOpeningTime shopClosingTime establishmentYear yearsInBusiness serviceTags businessDescription idProofType idProofNumber idProofDocument marketingOptIn customFormData role vendorStatus vendorReviewNote createdAt updatedAt"
      )
      .populate("businessCategory", "_id name customFormEnabled customFormTitle customFormFields")
      .populate("businessSubcategory", "_id name customFormEnabled customFormTitle customFormFields")
      .lean();

    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    return res.status(200).json({
      ok: true,
      user: toUserDetail(user),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load user details", error: error.message });
  }
});

router.post("/admin/users", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const role = String(req.body?.role || "customer").toLowerCase();
    const emailInput = String(req.body?.email || "").trim();
    const phoneInput = String(req.body?.phone || "").trim();
    const password = String(req.body?.password || "");
    const vendorStatusInput = String(req.body?.vendorStatus || "").toLowerCase();
    const businessName = String(req.body?.businessName || "").trim();
    const businessCategoryId = String(req.body?.businessCategoryId || "").trim();
    const businessSubcategoryId = String(req.body?.businessSubcategoryId || "").trim();
    const businessEmailInput = String(req.body?.businessEmail || "").trim();
    const businessPhoneInput = String(req.body?.businessPhone || "").trim();
    const businessAddress = String(req.body?.businessAddress || "").trim();
    const city = String(req.body?.city || "").trim();
    const sublocality = String(req.body?.sublocality || "").trim();
    const state = String(req.body?.state || "").trim();
    const postalCode = String(req.body?.postalCode || "").trim();
    const gstNumber = String(req.body?.gstNumber || "").trim();
    const gstDocument = String(req.body?.gstDocument || "").trim();
    const website = String(req.body?.website || "").trim();
    const shopOpeningTime = String(req.body?.shopOpeningTime || "").trim();
    const shopClosingTime = String(req.body?.shopClosingTime || "").trim();
    const establishmentYearInput = req.body?.establishmentYear;
    const serviceTagsInput = Array.isArray(req.body?.serviceTags) ? req.body.serviceTags : [];
    const businessDescription = String(req.body?.businessDescription || "").trim();
    const idProofType = String(req.body?.idProofType || "").trim().toLowerCase();
    const idProofNumber = String(req.body?.idProofNumber || "").trim();
    const idProofDocument = String(req.body?.idProofDocument || "").trim();
    const marketingOptIn = Boolean(req.body?.marketingOptIn);
    const customFormDataInput = req.body?.customFormData;

    if (!name) {
      return res.status(400).json({ ok: false, message: "Name is required" });
    }

    if (!USER_ROLE_VALUES.has(role)) {
      return res.status(400).json({ ok: false, message: "Invalid user role" });
    }

    const email = emailInput ? emailInput.toLowerCase() : "";
    const phone = normalizePhone(phoneInput);
    const businessEmail = businessEmailInput ? businessEmailInput.toLowerCase() : "";
    const businessPhone = normalizePhone(businessPhoneInput);
    const establishmentYear =
      establishmentYearInput === undefined || establishmentYearInput === null || establishmentYearInput === ""
        ? undefined
        : Number(establishmentYearInput);
    const serviceTags = Array.from(
      new Set(
        serviceTagsInput
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .slice(0, 100)
      )
    );

    if (!email && !phone) {
      return res.status(400).json({ ok: false, message: "Email or phone is required" });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email format" });
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      return res.status(400).json({ ok: false, message: "Phone must be exactly 10 digits" });
    }

    if (vendorStatusInput && !VENDOR_STATUS_VALUES.has(vendorStatusInput)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor status" });
    }

    if ((role === "admin" || role === "vendor") && password.length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters for admin/vendor" });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
    }

    if (businessEmail && !EMAIL_REGEX.test(businessEmail)) {
      return res.status(400).json({ ok: false, message: "Invalid business email format" });
    }

    if (businessPhone && !PHONE_REGEX.test(businessPhone)) {
      return res.status(400).json({ ok: false, message: "Business phone must be exactly 10 digits" });
    }

    if (postalCode && !POSTAL_REGEX.test(postalCode)) {
      return res.status(400).json({ ok: false, message: "Postal code must be 5 to 10 digits" });
    }

    if (shopOpeningTime && !TIME_REGEX.test(shopOpeningTime)) {
      return res.status(400).json({ ok: false, message: "Shop opening time must be in HH:MM format" });
    }

    if (shopClosingTime && !TIME_REGEX.test(shopClosingTime)) {
      return res.status(400).json({ ok: false, message: "Shop closing time must be in HH:MM format" });
    }

    if (businessCategoryId && !OBJECT_ID_REGEX.test(businessCategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid business category" });
    }

    if (businessSubcategoryId && !OBJECT_ID_REGEX.test(businessSubcategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid business subcategory" });
    }

    if (!isValidEstablishmentYear(establishmentYear)) {
      return res.status(400).json({ ok: false, message: "Invalid establishment year" });
    }

    if (role === "vendor") {
      if (!businessName || !businessEmail || !businessPhone) {
        return res.status(400).json({
          ok: false,
          message: "Business name, business email and business phone are required for vendors",
        });
      }

      if (idProofType && !ID_PROOF_TYPES.has(idProofType)) {
        return res.status(400).json({ ok: false, message: "Invalid ID proof type" });
      }

      if (idProofType === "aadhaar" && idProofNumber && !AADHAAR_REGEX.test(idProofNumber)) {
        return res.status(400).json({ ok: false, message: "Aadhaar number must be exactly 12 digits" });
      }

      if (idProofDocument) {
        if (!DOCUMENT_DATA_URL_REGEX.test(idProofDocument)) {
          return res.status(400).json({ ok: false, message: "ID proof document must be image, PDF, DOC or DOCX" });
        }

        if (idProofDocument.length > MAX_DOCUMENT_DATA_LENGTH) {
          return res.status(400).json({ ok: false, message: "ID proof document is too large" });
        }
      }

      if (gstDocument) {
        if (!DOCUMENT_DATA_URL_REGEX.test(gstDocument)) {
          return res.status(400).json({ ok: false, message: "GST document must be image, PDF, DOC or DOCX" });
        }

        if (gstDocument.length > MAX_DOCUMENT_DATA_LENGTH) {
          return res.status(400).json({ ok: false, message: "GST document is too large" });
        }
      }
    }

    let category = null;
    if (role === "vendor" && businessCategoryId) {
      category = await Category.findById(businessCategoryId).select(
        "_id name customFormEnabled customFormTitle customFormFields"
      );

      if (!category) {
        return res.status(400).json({ ok: false, message: "Selected business category is invalid" });
      }
    }

    let subcategory = null;
    if (role === "vendor" && businessSubcategoryId) {
      if (!category) {
        return res.status(400).json({ ok: false, message: "Select a business category before subcategory" });
      }

      subcategory = await Subcategory.findOne({
        _id: businessSubcategoryId,
        category: category._id,
      }).select("_id name customFormEnabled customFormTitle customFormFields");

      if (!subcategory) {
        return res.status(400).json({ ok: false, message: "Selected business subcategory is invalid" });
      }
    }

    let resolvedCity = city || undefined;
    let resolvedSublocality = sublocality || undefined;
    let resolvedState = state || undefined;

    if (role === "vendor") {
      if (city) {
        const cityRecord = await City.findOne({ name: toExactRegex(city), isActive: true }).select("name state localities");
        if (!cityRecord) {
          return res.status(400).json({ ok: false, message: "Selected city is invalid or inactive" });
        }

        resolvedCity = cityRecord.name;
        resolvedState = state || String(cityRecord.state || "").trim() || undefined;

        if (sublocality) {
          const matchedLocality = (Array.isArray(cityRecord.localities) ? cityRecord.localities : []).find(
            (locality) => locality.isActive !== false && toExactRegex(sublocality).test(String(locality.name || ""))
          );

          if (!matchedLocality) {
            return res.status(400).json({ ok: false, message: "Selected sublocality is invalid for the selected city" });
          }

          resolvedSublocality = matchedLocality.name;
        }
      } else if (sublocality) {
        return res.status(400).json({ ok: false, message: "Select city before sublocality" });
      }
    }

    let customFormData = {};
    if (role === "vendor") {
      const effectiveCustomForm = resolveEffectiveCustomForm({
        category,
        subcategory,
      });

      const customDataValidation = validateCustomFormData(customFormDataInput, effectiveCustomForm.fields);
      if (!customDataValidation.ok) {
        return res.status(400).json({ ok: false, message: customDataValidation.message || "Invalid custom form data" });
      }

      customFormData = customDataValidation.data;
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

    const user = await User.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      role,
      provider: passwordHash ? "credentials" : "manual",
      passwordHash,
      vendorStatus: role === "vendor" ? vendorStatusInput || "pending" : "approved",
      businessName: role === "vendor" ? businessName || undefined : undefined,
      businessCategory: role === "vendor" ? category?._id : undefined,
      businessSubcategory: role === "vendor" ? subcategory?._id : undefined,
      businessEmail: role === "vendor" ? businessEmail || undefined : undefined,
      businessPhone: role === "vendor" ? businessPhone || undefined : undefined,
      businessAddress: role === "vendor" ? businessAddress || undefined : undefined,
      city: role === "vendor" ? resolvedCity : undefined,
      sublocality: role === "vendor" ? resolvedSublocality : undefined,
      state: role === "vendor" ? resolvedState : undefined,
      postalCode: role === "vendor" ? postalCode || undefined : undefined,
      gstNumber: role === "vendor" ? gstNumber || undefined : undefined,
      gstDocument: role === "vendor" ? gstDocument || undefined : undefined,
      website: role === "vendor" ? website || undefined : undefined,
      shopOpeningTime: role === "vendor" ? shopOpeningTime || undefined : undefined,
      shopClosingTime: role === "vendor" ? shopClosingTime || undefined : undefined,
      establishmentYear: role === "vendor" ? establishmentYear : undefined,
      serviceTags: role === "vendor" ? serviceTags : [],
      businessDescription: role === "vendor" ? businessDescription || undefined : undefined,
      idProofType: role === "vendor" ? idProofType || undefined : undefined,
      idProofNumber: role === "vendor" ? idProofNumber || undefined : undefined,
      idProofDocument: role === "vendor" ? idProofDocument || undefined : undefined,
      marketingOptIn: role === "vendor" ? marketingOptIn : false,
      customFormData: role === "vendor" && Object.keys(customFormData).length > 0 ? customFormData : undefined,
    });

    if (user.role === "vendor") {
      scheduleVendorIndex(String(user._id));
    }

    return res.status(201).json({
      ok: true,
      message: "User created",
      user: toUserSummary(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Email or phone already exists" });
    }

    return res.status(500).json({ ok: false, message: "Failed to create user", error: error.message });
  }
});

router.patch("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = String(req.params.id || "").trim();
    if (!OBJECT_ID_REGEX.test(userId)) {
      return res.status(400).json({ ok: false, message: "Invalid user id" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    if (req.body?.name !== undefined) {
      const nextName = String(req.body.name || "").trim();
      if (!nextName) {
        return res.status(400).json({ ok: false, message: "Name cannot be empty" });
      }
      user.name = nextName;
    }

    if (req.body?.email !== undefined) {
      const nextEmail = String(req.body.email || "").trim().toLowerCase();
      if (nextEmail && !EMAIL_REGEX.test(nextEmail)) {
        return res.status(400).json({ ok: false, message: "Invalid email format" });
      }
      user.email = nextEmail || undefined;
    }

    if (req.body?.phone !== undefined) {
      const nextPhone = normalizePhone(req.body.phone);
      if (nextPhone && !PHONE_REGEX.test(nextPhone)) {
        return res.status(400).json({ ok: false, message: "Phone must be exactly 10 digits" });
      }
      user.phone = nextPhone || undefined;
    }

    if (req.body?.alternatePhone !== undefined) {
      const nextAlternatePhone = normalizePhone(req.body.alternatePhone);
      if (nextAlternatePhone && !PHONE_REGEX.test(nextAlternatePhone)) {
        return res.status(400).json({ ok: false, message: "Alternate phone must be exactly 10 digits" });
      }
      user.alternatePhone = nextAlternatePhone || undefined;
    }

    if (req.body?.password !== undefined) {
      const nextPassword = String(req.body.password || "");
      if (nextPassword && nextPassword.length < 6) {
        return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
      }

      if (nextPassword) {
        user.passwordHash = await bcrypt.hash(nextPassword, 10);
        user.provider = "credentials";
      }
    }

    if (req.body?.role !== undefined) {
      const nextRole = String(req.body.role || "").toLowerCase();
      if (!USER_ROLE_VALUES.has(nextRole)) {
        return res.status(400).json({ ok: false, message: "Invalid user role" });
      }
      user.role = nextRole;
      if (nextRole !== "vendor") {
        user.vendorStatus = "approved";
        user.businessName = undefined;
        user.businessCategory = undefined;
        user.businessSubcategory = undefined;
        user.businessEmail = undefined;
        user.businessPhone = undefined;
        user.businessAlternatePhone = undefined;
        user.businessAddress = undefined;
        user.city = undefined;
        user.sublocality = undefined;
        user.state = undefined;
        user.postalCode = undefined;
        user.gstNumber = undefined;
        user.gstDocument = undefined;
        user.website = undefined;
        user.establishmentYear = undefined;
        user.yearsInBusiness = undefined;
        user.serviceTags = [];
        user.businessDescription = undefined;
        user.idProofType = undefined;
        user.idProofNumber = undefined;
        user.idProofDocument = undefined;
        user.marketingOptIn = false;
        user.customFormData = undefined;
        user.vendorReviewNote = undefined;
      } else if (!user.vendorStatus) {
        user.vendorStatus = "pending";
      }
    }

    const requireVendor = () => {
      if (user.role !== "vendor") {
        return res.status(400).json({ ok: false, message: "Business fields can only be set for vendor users" });
      }
      return null;
    };

    if (req.body?.businessName !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;
      const value = String(req.body.businessName || "").trim();
      user.businessName = value || undefined;
    }

    if (req.body?.businessCategoryId !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.businessCategoryId || "").trim();
      if (!value) {
        user.businessCategory = undefined;
        user.businessSubcategory = undefined;
      } else {
        if (!OBJECT_ID_REGEX.test(value)) {
          return res.status(400).json({ ok: false, message: "Invalid business category" });
        }

        const category = await Category.findById(value).select("_id");
        if (!category) {
          return res.status(400).json({ ok: false, message: "Selected business category is invalid" });
        }

        user.businessCategory = category._id;
      }
    }

    if (req.body?.businessSubcategoryId !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.businessSubcategoryId || "").trim();
      if (!value) {
        user.businessSubcategory = undefined;
      } else {
        if (!OBJECT_ID_REGEX.test(value)) {
          return res.status(400).json({ ok: false, message: "Invalid business subcategory" });
        }

        if (!user.businessCategory) {
          return res.status(400).json({ ok: false, message: "Select a business category before subcategory" });
        }

        const subcategory = await Subcategory.findOne({
          _id: value,
          category: user.businessCategory,
        }).select("_id");

        if (!subcategory) {
          return res.status(400).json({ ok: false, message: "Selected business subcategory is invalid" });
        }

        user.businessSubcategory = subcategory._id;
      }
    }

    const categoryOrSubcategoryChanged =
      req.body?.businessCategoryId !== undefined || req.body?.businessSubcategoryId !== undefined;

    if (req.body?.customFormData !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const category = user.businessCategory
        ? await Category.findById(user.businessCategory).select("_id name customFormEnabled customFormTitle customFormFields")
        : null;
      const subcategory = user.businessSubcategory
        ? await Subcategory.findById(user.businessSubcategory).select("_id name customFormEnabled customFormTitle customFormFields")
        : null;

      const effectiveCustomForm = resolveEffectiveCustomForm({
        category,
        subcategory,
      });

      const customDataValidation = validateCustomFormData(req.body.customFormData, effectiveCustomForm.fields);
      if (!customDataValidation.ok) {
        return res.status(400).json({ ok: false, message: customDataValidation.message || "Invalid custom form data" });
      }

      user.customFormData =
        Object.keys(customDataValidation.data).length > 0 ? customDataValidation.data : undefined;
    } else if (user.role === "vendor" && categoryOrSubcategoryChanged) {
      user.customFormData = undefined;
    }

    if (req.body?.businessEmail !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.businessEmail || "").trim().toLowerCase();
      if (value && !EMAIL_REGEX.test(value)) {
        return res.status(400).json({ ok: false, message: "Invalid business email format" });
      }
      user.businessEmail = value || undefined;
    }

    if (req.body?.businessPhone !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = normalizePhone(req.body.businessPhone);
      if (value && !PHONE_REGEX.test(value)) {
        return res.status(400).json({ ok: false, message: "Business phone must be exactly 10 digits" });
      }
      user.businessPhone = value || undefined;
    }

    if (req.body?.businessAlternatePhone !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = normalizePhone(req.body.businessAlternatePhone);
      if (value && !PHONE_REGEX.test(value)) {
        return res.status(400).json({ ok: false, message: "Business alternate phone must be exactly 10 digits" });
      }
      user.businessAlternatePhone = value || undefined;
    }

    if (req.body?.businessAddress !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;
      const value = String(req.body.businessAddress || "").trim();
      user.businessAddress = value || undefined;
    }

    if (req.body?.city !== undefined || req.body?.sublocality !== undefined || req.body?.state !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const requestedCity =
        req.body?.city !== undefined ? String(req.body.city || "").trim() : String(user.city || "").trim();
      const requestedSublocality =
        req.body?.sublocality !== undefined
          ? String(req.body.sublocality || "").trim()
          : String(user.sublocality || "").trim();
      const requestedState =
        req.body?.state !== undefined ? String(req.body.state || "").trim() : String(user.state || "").trim();

      if (!requestedCity) {
        user.city = undefined;
        user.sublocality = undefined;
        user.state = requestedState || undefined;
      } else {
        const cityRecord = await City.findOne({ name: toExactRegex(requestedCity), isActive: true }).select(
          "name state localities"
        );

        if (!cityRecord) {
          return res.status(400).json({ ok: false, message: "Selected city is invalid or inactive" });
        }

        user.city = cityRecord.name;

        if (requestedSublocality) {
          const matchedLocality = (Array.isArray(cityRecord.localities) ? cityRecord.localities : []).find(
            (locality) =>
              locality.isActive !== false && toExactRegex(requestedSublocality).test(String(locality.name || ""))
          );

          if (!matchedLocality) {
            return res.status(400).json({ ok: false, message: "Selected sublocality is invalid for the selected city" });
          }

          user.sublocality = matchedLocality.name;
        } else if (req.body?.sublocality !== undefined) {
          user.sublocality = undefined;
        }

        const resolvedState = requestedState || String(cityRecord.state || "").trim();
        user.state = resolvedState || undefined;
      }
    }

    if (req.body?.postalCode !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.postalCode || "").trim();
      if (value && !POSTAL_REGEX.test(value)) {
        return res.status(400).json({ ok: false, message: "Postal code must be 5 to 10 digits" });
      }
      user.postalCode = value || undefined;
    }

    if (req.body?.gstNumber !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.gstNumber || "").trim();
      if (value && !GSTIN_REGEX.test(value)) {
        return res.status(400).json({ ok: false, message: "GSTIN must be a valid 15-character value" });
      }
      user.gstNumber = value || undefined;
    }

    if (req.body?.gstDocument !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.gstDocument || "").trim();
      if (value) {
        if (!DOCUMENT_DATA_URL_REGEX.test(value)) {
          return res.status(400).json({ ok: false, message: "GST document must be image, PDF, DOC or DOCX" });
        }

        if (value.length > MAX_DOCUMENT_DATA_LENGTH) {
          return res.status(400).json({ ok: false, message: "GST document is too large" });
        }
      }
      user.gstDocument = value || undefined;
    }

    if (req.body?.website !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.website || "").trim();
      user.website = value || undefined;
    }

    if (req.body?.shopOpeningTime !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.shopOpeningTime || "").trim();
      if (value && !TIME_REGEX.test(value)) {
        return res.status(400).json({ ok: false, message: "Shop opening time must be in HH:MM format" });
      }

      user.shopOpeningTime = value || undefined;
    }

    if (req.body?.shopClosingTime !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.shopClosingTime || "").trim();
      if (value && !TIME_REGEX.test(value)) {
        return res.status(400).json({ ok: false, message: "Shop closing time must be in HH:MM format" });
      }

      user.shopClosingTime = value || undefined;
    }

    if (req.body?.establishmentYear !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = req.body.establishmentYear;
      const numericYear = value === "" || value === null ? undefined : Number(value);

      if (!isValidEstablishmentYear(numericYear)) {
        return res.status(400).json({ ok: false, message: "Invalid establishment year" });
      }

      user.establishmentYear = numericYear;
    }

    if (req.body?.yearsInBusiness !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = req.body.yearsInBusiness;
      const numericYears = value === "" || value === null ? undefined : Number(value);

      if (numericYears !== undefined && (!Number.isFinite(numericYears) || numericYears < 0 || numericYears > 80)) {
        return res.status(400).json({ ok: false, message: "Invalid years in business" });
      }

      user.yearsInBusiness = numericYears;
    }

    if (req.body?.serviceTags !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      if (!Array.isArray(req.body.serviceTags)) {
        return res.status(400).json({ ok: false, message: "Service tags must be an array" });
      }

      const tags = req.body.serviceTags
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .slice(0, 100);

      user.serviceTags = Array.from(new Set(tags));
    }

    if (req.body?.businessDescription !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.businessDescription || "").trim();
      user.businessDescription = value || undefined;
    }

    if (req.body?.idProofType !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.idProofType || "").trim().toLowerCase();
      if (value && !ID_PROOF_TYPES.has(value)) {
        return res.status(400).json({ ok: false, message: "Invalid ID proof type" });
      }
      user.idProofType = value || undefined;
    }

    if (req.body?.idProofNumber !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.idProofNumber || "").trim();
      const effectiveIdProofType =
        req.body?.idProofType !== undefined
          ? String(req.body.idProofType || "").trim().toLowerCase()
          : String(user.idProofType || "").trim().toLowerCase();

      if (effectiveIdProofType === "aadhaar" && value && !AADHAAR_REGEX.test(value)) {
        return res.status(400).json({ ok: false, message: "Aadhaar number must be exactly 12 digits" });
      }

      user.idProofNumber = value || undefined;
    }

    if (req.body?.idProofDocument !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;

      const value = String(req.body.idProofDocument || "").trim();
      if (value) {
        if (!DOCUMENT_DATA_URL_REGEX.test(value)) {
          return res.status(400).json({ ok: false, message: "ID proof document must be image, PDF, DOC or DOCX" });
        }

        if (value.length > MAX_DOCUMENT_DATA_LENGTH) {
          return res.status(400).json({ ok: false, message: "ID proof document is too large" });
        }
      }

      user.idProofDocument = value || undefined;
    }

    if (req.body?.marketingOptIn !== undefined) {
      const vendorError = requireVendor();
      if (vendorError) return vendorError;
      user.marketingOptIn = Boolean(req.body.marketingOptIn);
    }

    if (req.body?.vendorStatus !== undefined) {
      const nextVendorStatus = String(req.body.vendorStatus || "").toLowerCase();

      if (!VENDOR_STATUS_VALUES.has(nextVendorStatus)) {
        return res.status(400).json({ ok: false, message: "Invalid vendor status" });
      }

      if (user.role !== "vendor") {
        return res.status(400).json({ ok: false, message: "Vendor status can only be changed for vendor users" });
      }

      user.vendorStatus = nextVendorStatus;
    }

    if (req.body?.vendorReviewNote !== undefined) {
      const note = String(req.body.vendorReviewNote || "").trim();
      user.vendorReviewNote = note || undefined;
    }

    await user.save();

    if (user.role === "vendor") {
      scheduleVendorIndex(String(user._id));
    }

    await user.populate("businessCategory", "_id name customFormEnabled customFormTitle customFormFields");
    await user.populate("businessSubcategory", "_id name customFormEnabled customFormTitle customFormFields");

    return res.status(200).json({
      ok: true,
      message: "User updated",
      user: toUserDetail(user),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Email or phone already exists" });
    }

    return res.status(500).json({ ok: false, message: "Failed to update user", error: error.message });
  }
});

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = String(req.params.id || "").trim();
    if (!OBJECT_ID_REGEX.test(userId)) {
      return res.status(400).json({ ok: false, message: "Invalid user id" });
    }

    if (String(req.adminUser._id) === userId) {
      return res.status(400).json({ ok: false, message: "You cannot delete your own account" });
    }

    const user = await User.findById(userId).select("_id role").lean();
    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }

    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ ok: false, message: "Cannot delete the last admin user" });
      }
    }

    await User.deleteOne({ _id: user._id });
    return res.status(200).json({ ok: true, message: "User deleted" });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to delete user", error: error.message });
  }
});

router.get("/admin/ads/home-placements", requireAdmin, async (_req, res) => {
  try {
    const placement = await HomePlacement.findOne({ key: HOME_PLACEMENT_KEY }).lean();

    return res.status(200).json({
      ok: true,
      placements: toHomePlacementSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load home placements", error: error.message });
  }
});

router.put("/admin/ads/home-placements", requireAdmin, async (req, res) => {
  try {
    const leftImage = normalizeMediaValue(req.body?.leftImage);
    const middleImage = normalizeMediaValue(req.body?.middleImage);
    const rightImage = normalizeMediaValue(req.body?.rightImage);

    if (leftImage && !isValidCategoryMediaValue(leftImage)) {
      return res.status(400).json({ ok: false, message: "Left banner image must be a valid URL or image data" });
    }

    if (middleImage && !isValidCategoryMediaValue(middleImage)) {
      return res.status(400).json({ ok: false, message: "Middle banner image must be a valid URL or image data" });
    }

    if (rightImage && !isValidCategoryMediaValue(rightImage)) {
      return res.status(400).json({ ok: false, message: "Right banner image must be a valid URL or image data" });
    }

    const placement = await HomePlacement.findOneAndUpdate(
      { key: HOME_PLACEMENT_KEY },
      {
        $set: {
          key: HOME_PLACEMENT_KEY,
          "slots.leftImage": leftImage || undefined,
          "slots.middleImage": middleImage || undefined,
          "slots.rightImage": rightImage || undefined,
          updatedBy: req.adminUser._id,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.status(200).json({
      ok: true,
      message: "Home placements updated",
      placements: toHomePlacementSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update home placements", error: error.message });
  }
});

router.get("/admin/ads/home-promo-cards", requireAdmin, async (_req, res) => {
  try {
    const placement = await HomePlacement.findOne({ key: HOME_PROMO_SECTION_KEY })
      .populate("promoCards.category", "_id name slug isActive")
      .lean();

    return res.status(200).json({
      ok: true,
      section: toHomePromoSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load home promo cards", error: error.message });
  }
});

router.put("/admin/ads/home-promo-cards", requireAdmin, async (req, res) => {
  try {
    const headingInput = String(req.body?.heading || "").trim();
    const heading = headingInput.slice(0, HOME_PROMO_HEADING_MAX_LENGTH);
    const cards = normalizeHomePromoCardsInput(req.body?.cards);

    const validationMessage = await validateHomeSectionCards(cards);
    if (validationMessage) {
      return res.status(400).json({ ok: false, message: validationMessage });
    }

    const placement = await HomePlacement.findOneAndUpdate(
      { key: HOME_PROMO_SECTION_KEY },
      {
        $set: {
          key: HOME_PROMO_SECTION_KEY,
          promoHeading: heading || HOME_PROMO_DEFAULT_HEADING,
          promoCards: cards.map((card) => ({
            cardId: card.cardId,
            category: card.categoryId || undefined,
            title: card.title || undefined,
            image: card.image || undefined,
            sortOrder: card.sortOrder,
          })),
          updatedBy: req.adminUser._id,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate("promoCards.category", "_id name slug isActive")
      .lean();

    return res.status(200).json({
      ok: true,
      message: "Home promo cards updated",
      section: toHomePromoSectionSummary(placement),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update home promo cards", error: error.message });
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
      .select("_id name slug description icon isActive sortOrder customFormEnabled customFormTitle customFormFields createdAt updatedAt")
      .lean();

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
    const iconInput = String(req.body?.icon || "").trim();
    const sortOrderRequest = parseSortOrderRequest(req.body?.sortOrder);
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : true;
    const customFormEnabled = req.body?.customFormEnabled !== undefined ? Boolean(req.body.customFormEnabled) : false;
    const customFormTitle = String(req.body?.customFormTitle || "").trim();
    const customFormFields = sanitizeCustomFormFields(req.body?.customFormFields);

    if (!name) {
      return res.status(400).json({ ok: false, message: "Category name is required" });
    }

    if (iconInput && !isValidCategoryMediaValue(iconInput)) {
      return res.status(400).json({ ok: false, message: "Category icon image must be a valid URL or image data" });
    }

    if (sortOrderRequest.error) {
      return res.status(400).json({ ok: false, message: sortOrderRequest.error });
    }

    const slug = await resolveUniqueSlug(slugify(name));

    const category = await Category.create({
      name,
      slug,
      description: description || undefined,
      icon: iconInput || undefined,
      isActive,
      sortOrder: sortOrderRequest.value || 0,
      customFormEnabled,
      customFormTitle: customFormEnabled ? customFormTitle || undefined : undefined,
      customFormFields: customFormEnabled ? customFormFields : [],
      createdBy: req.adminUser._id,
    });

    const orderedCategoryIds = await fetchOrderedCategoryIds();
    const reorderedCategoryIds = orderedCategoryIds.filter((categoryId) => categoryId !== String(category._id));
    const categoryInsertIndex = clampSortOrderInsertIndex(sortOrderRequest.value, reorderedCategoryIds.length);
    reorderedCategoryIds.splice(categoryInsertIndex, 0, String(category._id));
    await applyCategorySortOrders(reorderedCategoryIds);
    category.sortOrder = categoryInsertIndex + 1;
    scheduleCategoryIndex(String(category._id), "");

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
    const sortOrderRequest = parseSortOrderRequest(req.body?.sortOrder);

    if (!category) {
      return res.status(404).json({ ok: false, message: "Category not found" });
    }

    if (sortOrderRequest.error) {
      return res.status(400).json({ ok: false, message: sortOrderRequest.error });
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

    if (req.body?.icon !== undefined) {
      const icon = String(req.body.icon || "").trim();
      if (icon && !isValidCategoryMediaValue(icon)) {
        return res.status(400).json({ ok: false, message: "Category icon image must be a valid URL or image data" });
      }
      category.icon = icon || undefined;
    }

    if (req.body?.isActive !== undefined) {
      category.isActive = Boolean(req.body.isActive);
    }

    if (req.body?.customFormEnabled !== undefined) {
      category.customFormEnabled = Boolean(req.body.customFormEnabled);
    }

    if (req.body?.customFormTitle !== undefined) {
      const title = String(req.body.customFormTitle || "").trim();
      category.customFormTitle = title || undefined;
    }

    if (req.body?.customFormFields !== undefined) {
      category.customFormFields = sanitizeCustomFormFields(req.body.customFormFields);
    }

    if (!category.customFormEnabled) {
      category.customFormTitle = undefined;
      category.customFormFields = [];
    }

    await category.save();

    if (sortOrderRequest.provided) {
      const orderedCategoryIds = await fetchOrderedCategoryIds();
      const reorderedCategoryIds = orderedCategoryIds.filter((itemId) => itemId !== String(category._id));
      const categoryInsertIndex = clampSortOrderInsertIndex(sortOrderRequest.value, reorderedCategoryIds.length);
      reorderedCategoryIds.splice(categoryInsertIndex, 0, String(category._id));
      await applyCategorySortOrders(reorderedCategoryIds);
      category.sortOrder = categoryInsertIndex + 1;
    }
    scheduleCategoryIndex(String(category._id), "");

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
    const parentSubcategoryId = String(req.query.parentSubcategoryId || "").trim();

    const query = includeInactive ? {} : { isActive: true };

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
      query.name = new RegExp(escapeRegex(search), "i");
    }

    const subcategories = await Subcategory.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .select("_id category parentSubcategory name slug description icon coverImage isActive sortOrder customFormEnabled customFormTitle customFormFields createdAt updatedAt")
      .populate("category", "_id name")
      .populate("parentSubcategory", "_id name")
      .lean();

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
    const parentSubcategoryId = String(req.body?.parentSubcategoryId || "").trim();
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const iconInput = String(req.body?.icon || "").trim();
    const coverImageInput = String(req.body?.coverImage || "").trim();
    const sortOrderRequest = parseSortOrderRequest(req.body?.sortOrder);
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : true;
    const customFormEnabled = req.body?.customFormEnabled !== undefined ? Boolean(req.body.customFormEnabled) : false;
    const customFormTitle = String(req.body?.customFormTitle || "").trim();
    const customFormFields = sanitizeCustomFormFields(req.body?.customFormFields);

    if (!categoryId || !OBJECT_ID_REGEX.test(categoryId)) {
      return res.status(400).json({ ok: false, message: "Valid category is required" });
    }

    if (!name) {
      return res.status(400).json({ ok: false, message: "Subcategory name is required" });
    }

    if (parentSubcategoryId && !OBJECT_ID_REGEX.test(parentSubcategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid parent subcategory id" });
    }

    if (iconInput && !isValidCategoryMediaValue(iconInput)) {
      return res.status(400).json({ ok: false, message: "Subcategory icon image must be a valid URL or image data" });
    }

    if (coverImageInput && !isValidCategoryMediaValue(coverImageInput)) {
      return res.status(400).json({ ok: false, message: "Subcategory cover image must be a valid URL or image data" });
    }

    if (sortOrderRequest.error) {
      return res.status(400).json({ ok: false, message: sortOrderRequest.error });
    }

    const category = await Category.findById(categoryId).select("_id name");
    if (!category) {
      return res.status(404).json({ ok: false, message: "Category not found" });
    }

    let parentSubcategory = null;
    if (parentSubcategoryId) {
      parentSubcategory = await Subcategory.findOne({
        _id: parentSubcategoryId,
        category: category._id,
      }).select("_id name category");

      if (!parentSubcategory) {
        return res.status(404).json({ ok: false, message: "Parent subcategory not found in this category" });
      }
    }

    const slug = await resolveUniqueSubcategorySlug(slugify(name), category._id, parentSubcategory?._id || null);

    const subcategory = await Subcategory.create({
      category: category._id,
      parentSubcategory: parentSubcategory?._id || null,
      name,
      slug,
      description: description || undefined,
      icon: iconInput || undefined,
      coverImage: coverImageInput || undefined,
      isActive,
      sortOrder: sortOrderRequest.value || 0,
      customFormEnabled,
      customFormTitle: customFormEnabled ? customFormTitle || undefined : undefined,
      customFormFields: customFormEnabled ? customFormFields : [],
      createdBy: req.adminUser._id,
    });

    const orderedSubcategoryIds = await fetchOrderedSubcategoryIds(category._id, parentSubcategory?._id || null);
    const reorderedSubcategoryIds = orderedSubcategoryIds.filter((itemId) => itemId !== String(subcategory._id));
    const subcategoryInsertIndex = clampSortOrderInsertIndex(sortOrderRequest.value, reorderedSubcategoryIds.length);
    reorderedSubcategoryIds.splice(subcategoryInsertIndex, 0, String(subcategory._id));
    await applySubcategorySortOrders(reorderedSubcategoryIds);
    subcategory.sortOrder = subcategoryInsertIndex + 1;

    await subcategory.populate("category", "_id name");
    await subcategory.populate("parentSubcategory", "_id name");
    scheduleCategoryIndex(String(category._id), String(subcategory._id));

    return res.status(201).json({
      ok: true,
      message: "Subcategory created",
      subcategory: toSubcategorySummary(subcategory),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Subcategory already exists under this parent" });
    }

    return res.status(500).json({ ok: false, message: "Failed to create subcategory", error: error.message });
  }
});

router.patch("/admin/subcategories/:id", requireAdmin, async (req, res) => {
  try {
    const subcategoryId = String(req.params.id || "").trim();
    const subcategory = await Subcategory.findById(subcategoryId)
      .populate("category", "_id name")
      .populate("parentSubcategory", "_id name category parentSubcategory");
    const sortOrderRequest = parseSortOrderRequest(req.body?.sortOrder);

    if (!subcategory) {
      return res.status(404).json({ ok: false, message: "Subcategory not found" });
    }

    if (sortOrderRequest.error) {
      return res.status(400).json({ ok: false, message: sortOrderRequest.error });
    }

    let nextCategory = subcategory.category;
    let categoryChanged = false;
    let parentChanged = false;
    const previousCategoryId = String(subcategory.category?._id || subcategory.category || "");
    const previousParentSubcategoryId = subcategory.parentSubcategory ? String(subcategory.parentSubcategory._id) : null;
    let nextParentSubcategoryId = previousParentSubcategoryId;
    let parentExplicitlySet = false;

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
      categoryChanged = true;
    }

    if (req.body?.parentSubcategoryId !== undefined) {
      parentExplicitlySet = true;
      const parentSubcategoryId = String(req.body.parentSubcategoryId || "").trim();

      if (!parentSubcategoryId) {
        nextParentSubcategoryId = null;
      } else {
        if (!OBJECT_ID_REGEX.test(parentSubcategoryId)) {
          return res.status(400).json({ ok: false, message: "Invalid parent subcategory id" });
        }

        if (parentSubcategoryId === subcategoryId) {
          return res.status(400).json({ ok: false, message: "A subcategory cannot be its own parent" });
        }

        nextParentSubcategoryId = parentSubcategoryId;
      }
    }

    if (categoryChanged && !parentExplicitlySet) {
      nextParentSubcategoryId = null;
    }

    if (nextParentSubcategoryId) {
      const parentSubcategory = await Subcategory.findOne({
        _id: nextParentSubcategoryId,
        category: nextCategory._id,
      }).select("_id name parentSubcategory");

      if (!parentSubcategory) {
        return res.status(404).json({ ok: false, message: "Parent subcategory not found in this category" });
      }

      const createsCycle = await isDescendantSubcategory(nextParentSubcategoryId, subcategoryId);
      if (createsCycle) {
        return res.status(400).json({ ok: false, message: "Invalid parent relationship would create a cycle" });
      }

      subcategory.parentSubcategory = parentSubcategory._id;
      parentChanged = previousParentSubcategoryId !== String(nextParentSubcategoryId);
    } else {
      parentChanged = Boolean(previousParentSubcategoryId);
      subcategory.parentSubcategory = null;
    }

    if (req.body?.name !== undefined) {
      const nextName = String(req.body.name || "").trim();
      if (!nextName) {
        return res.status(400).json({ ok: false, message: "Subcategory name cannot be empty" });
      }

      subcategory.name = nextName;
      subcategory.slug = await resolveUniqueSubcategorySlug(
        slugify(nextName),
        nextCategory._id,
        subcategory.parentSubcategory || null,
        subcategory._id
      );
    } else if (categoryChanged || parentChanged) {
      subcategory.slug = await resolveUniqueSubcategorySlug(
        slugify(subcategory.name),
        nextCategory._id,
        subcategory.parentSubcategory || null,
        subcategory._id
      );
    }

    if (req.body?.description !== undefined) {
      const description = String(req.body.description || "").trim();
      subcategory.description = description || undefined;
    }

    if (req.body?.icon !== undefined) {
      const icon = String(req.body.icon || "").trim();
      if (icon && !isValidCategoryMediaValue(icon)) {
        return res.status(400).json({ ok: false, message: "Subcategory icon image must be a valid URL or image data" });
      }
      subcategory.icon = icon || undefined;
    }

    if (req.body?.coverImage !== undefined) {
      const coverImage = String(req.body.coverImage || "").trim();
      if (coverImage && !isValidCategoryMediaValue(coverImage)) {
        return res.status(400).json({ ok: false, message: "Subcategory cover image must be a valid URL or image data" });
      }
      subcategory.coverImage = coverImage || undefined;
    }

    if (req.body?.isActive !== undefined) {
      subcategory.isActive = Boolean(req.body.isActive);
    }

    if (req.body?.customFormEnabled !== undefined) {
      subcategory.customFormEnabled = Boolean(req.body.customFormEnabled);
    }

    if (req.body?.customFormTitle !== undefined) {
      const title = String(req.body.customFormTitle || "").trim();
      subcategory.customFormTitle = title || undefined;
    }

    if (req.body?.customFormFields !== undefined) {
      subcategory.customFormFields = sanitizeCustomFormFields(req.body.customFormFields);
    }

    if (!subcategory.customFormEnabled) {
      subcategory.customFormTitle = undefined;
      subcategory.customFormFields = [];
    }

    const nextCategoryId = String(nextCategory?._id || nextCategory || "");
    const nextParentSortGroupId = subcategory.parentSubcategory ? String(subcategory.parentSubcategory) : null;
    const movedAcrossSortGroup =
      previousCategoryId !== nextCategoryId ||
      String(previousParentSubcategoryId || "") !== String(nextParentSortGroupId || "");

    await subcategory.save();

    if (movedAcrossSortGroup) {
      const previousGroupOrderedIds = await fetchOrderedSubcategoryIds(previousCategoryId, previousParentSubcategoryId);
      await applySubcategorySortOrders(previousGroupOrderedIds);

      const nextGroupOrderedIds = await fetchOrderedSubcategoryIds(nextCategoryId, nextParentSortGroupId);
      const reorderedNextGroupIds = nextGroupOrderedIds.filter((itemId) => itemId !== String(subcategory._id));
      const nextGroupInsertIndex = clampSortOrderInsertIndex(sortOrderRequest.value, reorderedNextGroupIds.length);
      reorderedNextGroupIds.splice(nextGroupInsertIndex, 0, String(subcategory._id));
      await applySubcategorySortOrders(reorderedNextGroupIds);
      subcategory.sortOrder = nextGroupInsertIndex + 1;
    } else if (sortOrderRequest.provided) {
      const currentGroupOrderedIds = await fetchOrderedSubcategoryIds(nextCategoryId, nextParentSortGroupId);
      const reorderedCurrentGroupIds = currentGroupOrderedIds.filter((itemId) => itemId !== String(subcategory._id));
      const currentGroupInsertIndex = clampSortOrderInsertIndex(sortOrderRequest.value, reorderedCurrentGroupIds.length);
      reorderedCurrentGroupIds.splice(currentGroupInsertIndex, 0, String(subcategory._id));
      await applySubcategorySortOrders(reorderedCurrentGroupIds);
      subcategory.sortOrder = currentGroupInsertIndex + 1;
    }

    await subcategory.populate("category", "_id name");
    await subcategory.populate("parentSubcategory", "_id name");
    scheduleCategoryIndex(nextCategoryId, String(subcategory._id));

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
      return res.status(409).json({ ok: false, message: "Subcategory already exists under this parent" });
    }

    return res.status(500).json({ ok: false, message: "Failed to update subcategory", error: error.message });
  }
});

router.delete("/admin/categories/:id", requireAdmin, async (req, res) => {
  try {
    const categoryId = String(req.params.id || "").trim();
    if (!OBJECT_ID_REGEX.test(categoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid category id" });
    }

    const category = await Category.findById(categoryId).select("_id name");
    if (!category) {
      return res.status(404).json({ ok: false, message: "Category not found" });
    }

    const linkedSubcategories = await Subcategory.find({ category: category._id }).select("_id").lean();
    const linkedSubcategoryIds = linkedSubcategories.map((item) => item._id);

    if (linkedSubcategoryIds.length > 0) {
      await Subcategory.deleteMany({ _id: { $in: linkedSubcategoryIds } });
    }

    await User.updateMany(
      { businessCategory: category._id },
      {
        $unset: {
          businessCategory: "",
          businessSubcategory: "",
        },
      }
    );

    await category.deleteOne();

    const remainingCategoryIds = await fetchOrderedCategoryIds();
    await applyCategorySortOrders(remainingCategoryIds);

    return res.status(200).json({
      ok: true,
      message: "Category deleted",
      deletedSubcategories: linkedSubcategoryIds.length,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to delete category", error: error.message });
  }
});

router.delete("/admin/subcategories/:id", requireAdmin, async (req, res) => {
  try {
    const subcategoryId = String(req.params.id || "").trim();
    if (!OBJECT_ID_REGEX.test(subcategoryId)) {
      return res.status(400).json({ ok: false, message: "Invalid subcategory id" });
    }

    const subcategory = await Subcategory.findById(subcategoryId).select("_id category parentSubcategory");
    if (!subcategory) {
      return res.status(404).json({ ok: false, message: "Subcategory not found" });
    }

    const descendantIds = await collectDescendantSubcategoryIds(subcategory._id);
    const deleteIds = [String(subcategory._id), ...descendantIds];

    const deletingNodes = await Subcategory.find({ _id: { $in: deleteIds } })
      .select("_id category parentSubcategory")
      .lean();

    const affectedGroups = new Map();
    deletingNodes.forEach((node) => {
      const categoryId = String(node.category || "").trim();
      if (!categoryId) return;

      const parentSubcategoryId = node.parentSubcategory ? String(node.parentSubcategory) : null;
      const groupKey = buildSubcategorySortGroupKey(categoryId, parentSubcategoryId);
      if (affectedGroups.has(groupKey)) {
        return;
      }

      affectedGroups.set(groupKey, {
        categoryId,
        parentSubcategoryId,
      });
    });

    await Subcategory.deleteMany({ _id: { $in: deleteIds } });

    await Promise.all(
      Array.from(affectedGroups.values()).map(async (group) => {
        const orderedSubcategoryIds = await fetchOrderedSubcategoryIds(group.categoryId, group.parentSubcategoryId);
        await applySubcategorySortOrders(orderedSubcategoryIds);
      })
    );

    await User.updateMany(
      { businessSubcategory: { $in: deleteIds } },
      {
        $unset: {
          businessSubcategory: "",
        },
      }
    );

    return res.status(200).json({
      ok: true,
      message: "Subcategory deleted",
      deletedNodes: deleteIds.length,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to delete subcategory", error: error.message });
  }
});

router.get("/admin/cities", requireAdmin, async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || "true").toLowerCase() !== "false";
    const search = String(req.query.search || "").trim();

    const query = includeInactive ? {} : { isActive: true };
    if (search) {
      query.name = new RegExp(escapeRegex(search), "i");
    }

    const cities = await City.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .select("_id name slug state isActive sortOrder localities image createdAt updatedAt")
      .lean();

    return res.status(200).json({
      ok: true,
      cities: cities.map((city) => toCitySummary(city, includeInactive)),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load cities", error: error.message });
  }
});

router.post("/admin/cities", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const state = String(req.body?.state || "").trim();
    const sortOrderRequest = parseSortOrderRequest(req.body?.sortOrder);
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : true;
    const image = String(req.body?.image || "").trim();

    if (!name) {
      return res.status(400).json({ ok: false, message: "City name is required" });
    }

    if (!state) {
      return res.status(400).json({ ok: false, message: "State is required" });
    }

    if (sortOrderRequest.error) {
      return res.status(400).json({ ok: false, message: sortOrderRequest.error });
    }

    const existingByName = await City.findOne({ name: toExactRegex(name) }).select("_id");
    if (existingByName) {
      return res.status(409).json({ ok: false, message: "City already exists" });
    }

    const slug = await resolveUniqueCitySlug(slugify(name));
    const city = await City.create({
      name,
      slug,
      state,
      isActive,
      image,
      sortOrder: sortOrderRequest.value || 0,
      createdBy: req.adminUser._id,
    });

    const orderedCityIds = await fetchOrderedCityIds();
    const reorderedCityIds = orderedCityIds.filter((cityId) => cityId !== String(city._id));
    const cityInsertIndex = clampSortOrderInsertIndex(sortOrderRequest.value, reorderedCityIds.length);
    reorderedCityIds.splice(cityInsertIndex, 0, String(city._id));
    await applyCitySortOrders(reorderedCityIds);
    city.sortOrder = cityInsertIndex + 1;

    return res.status(201).json({
      ok: true,
      message: "City created",
      city: toCitySummary(city, true),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "City already exists" });
    }

    return res.status(500).json({ ok: false, message: "Failed to create city", error: error.message });
  }
});

router.patch("/admin/cities/:id", requireAdmin, async (req, res) => {
  try {
    const cityId = String(req.params.id || "").trim();
    const sortOrderRequest = parseSortOrderRequest(req.body?.sortOrder);
    if (!OBJECT_ID_REGEX.test(cityId)) {
      return res.status(400).json({ ok: false, message: "Invalid city id" });
    }

    if (sortOrderRequest.error) {
      return res.status(400).json({ ok: false, message: sortOrderRequest.error });
    }

    const city = await City.findById(cityId);
    if (!city) {
      return res.status(404).json({ ok: false, message: "City not found" });
    }

    if (req.body?.name !== undefined) {
      const nextName = String(req.body.name || "").trim();
      if (!nextName) {
        return res.status(400).json({ ok: false, message: "City name cannot be empty" });
      }

      const duplicate = await City.findOne({
        _id: { $ne: city._id },
        name: toExactRegex(nextName),
      }).select("_id");

      if (duplicate) {
        return res.status(409).json({ ok: false, message: "City already exists" });
      }

      city.name = nextName;
      city.slug = await resolveUniqueCitySlug(slugify(nextName), city._id);
    }

    if (req.body?.state !== undefined) {
      const nextState = String(req.body.state || "").trim();
      if (!nextState) {
        return res.status(400).json({ ok: false, message: "State cannot be empty" });
      }

      city.state = nextState;
    }

    if (req.body?.isActive !== undefined) {
      city.isActive = Boolean(req.body.isActive);
    }

    if (req.body?.image !== undefined) {
      city.image = String(req.body.image || "").trim();
    }

    await city.save();

    if (sortOrderRequest.provided) {
      const orderedCityIds = await fetchOrderedCityIds();
      const reorderedCityIds = orderedCityIds.filter((itemId) => itemId !== String(city._id));
      const cityInsertIndex = clampSortOrderInsertIndex(sortOrderRequest.value, reorderedCityIds.length);
      reorderedCityIds.splice(cityInsertIndex, 0, String(city._id));
      await applyCitySortOrders(reorderedCityIds);
      city.sortOrder = cityInsertIndex + 1;
    }

    return res.status(200).json({
      ok: true,
      message: "City updated",
      city: toCitySummary(city, true),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ ok: false, message: "City already exists" });
    }

    return res.status(500).json({ ok: false, message: "Failed to update city", error: error.message });
  }
});

router.post("/admin/cities/:id/localities", requireAdmin, async (req, res) => {
  try {
    const cityId = String(req.params.id || "").trim();
    if (!OBJECT_ID_REGEX.test(cityId)) {
      return res.status(400).json({ ok: false, message: "Invalid city id" });
    }

    const name = String(req.body?.name || "").trim();
    const sortOrderInput = req.body?.sortOrder;
    const sortOrder = Number.isFinite(Number(sortOrderInput)) ? Number(sortOrderInput) : 0;
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : true;

    if (!name) {
      return res.status(400).json({ ok: false, message: "Locality name is required" });
    }

    const city = await City.findById(cityId);
    if (!city) {
      return res.status(404).json({ ok: false, message: "City not found" });
    }

    const duplicateByName = (Array.isArray(city.localities) ? city.localities : []).some(
      (locality) => toExactRegex(name).test(String(locality.name || ""))
    );
    if (duplicateByName) {
      return res.status(409).json({ ok: false, message: "Locality already exists for this city" });
    }

    const slug = resolveUniqueLocalitySlug(city, slugify(name));
    city.localities.push({
      name,
      slug,
      isActive,
      sortOrder,
    });

    await city.save();

    return res.status(201).json({
      ok: true,
      message: "Locality created",
      city: toCitySummary(city, true),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to create locality", error: error.message });
  }
});

router.patch("/admin/cities/:cityId/localities/:localityId", requireAdmin, async (req, res) => {
  try {
    const cityId = String(req.params.cityId || "").trim();
    const localityId = String(req.params.localityId || "").trim();
    if (!OBJECT_ID_REGEX.test(cityId) || !OBJECT_ID_REGEX.test(localityId)) {
      return res.status(400).json({ ok: false, message: "Invalid city/locality id" });
    }

    const city = await City.findById(cityId);
    if (!city) {
      return res.status(404).json({ ok: false, message: "City not found" });
    }

    const locality = (Array.isArray(city.localities) ? city.localities : []).find(
      (item) => String(item._id) === localityId
    );

    if (!locality) {
      return res.status(404).json({ ok: false, message: "Locality not found" });
    }

    if (req.body?.name !== undefined) {
      const nextName = String(req.body.name || "").trim();
      if (!nextName) {
        return res.status(400).json({ ok: false, message: "Locality name cannot be empty" });
      }

      const duplicateByName = (Array.isArray(city.localities) ? city.localities : []).some(
        (item) => String(item._id) !== localityId && toExactRegex(nextName).test(String(item.name || ""))
      );
      if (duplicateByName) {
        return res.status(409).json({ ok: false, message: "Locality already exists for this city" });
      }

      locality.name = nextName;
      locality.slug = resolveUniqueLocalitySlug(city, slugify(nextName), localityId);
    }

    if (req.body?.isActive !== undefined) {
      locality.isActive = Boolean(req.body.isActive);
    }

    if (req.body?.sortOrder !== undefined) {
      const numericSort = Number(req.body.sortOrder);
      if (!Number.isFinite(numericSort)) {
        return res.status(400).json({ ok: false, message: "Invalid sort order" });
      }
      locality.sortOrder = numericSort;
    }

    await city.save();

    return res.status(200).json({
      ok: true,
      message: "Locality updated",
      city: toCitySummary(city, true),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to update locality", error: error.message });
  }
});

router.delete("/admin/cities/:id", requireAdmin, async (req, res) => {
  try {
    const cityId = String(req.params.id || "").trim();
    if (!OBJECT_ID_REGEX.test(cityId)) {
      return res.status(400).json({ ok: false, message: "Invalid city id" });
    }

    const city = await City.findById(cityId);
    if (!city) {
      return res.status(404).json({ ok: false, message: "City not found" });
    }

    const cityName = String(city.name || "").trim();
    const updateResult = await User.updateMany(
      {
        role: "vendor",
        city: toExactRegex(cityName),
      },
      {
        $unset: {
          city: "",
          sublocality: "",
          state: "",
        },
      }
    );

    await city.deleteOne();

    const remainingCityIds = await fetchOrderedCityIds();
    await applyCitySortOrders(remainingCityIds);

    return res.status(200).json({
      ok: true,
      message: "City deleted",
      affectedVendors: Number(updateResult.modifiedCount || 0),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to delete city", error: error.message });
  }
});

router.delete("/admin/cities/:cityId/localities/:localityId", requireAdmin, async (req, res) => {
  try {
    const cityId = String(req.params.cityId || "").trim();
    const localityId = String(req.params.localityId || "").trim();

    if (!OBJECT_ID_REGEX.test(cityId) || !OBJECT_ID_REGEX.test(localityId)) {
      return res.status(400).json({ ok: false, message: "Invalid city/locality id" });
    }

    const city = await City.findById(cityId);
    if (!city) {
      return res.status(404).json({ ok: false, message: "City not found" });
    }

    const locality = city.localities.id(localityId);
    if (!locality) {
      return res.status(404).json({ ok: false, message: "Locality not found" });
    }

    const localityName = String(locality.name || "").trim();
    locality.deleteOne();
    await city.save();

    const updateResult = await User.updateMany(
      {
        role: "vendor",
        city: toExactRegex(String(city.name || "")),
        sublocality: toExactRegex(localityName),
      },
      {
        $unset: {
          sublocality: "",
        },
      }
    );

    return res.status(200).json({
      ok: true,
      message: "Locality deleted",
      affectedVendors: Number(updateResult.modifiedCount || 0),
      city: toCitySummary(city, true),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to delete locality", error: error.message });
  }
});

module.exports = router;
