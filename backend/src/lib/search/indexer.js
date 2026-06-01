const Category = require("../../models/Category");
const Review = require("../../models/Review");
const Subcategory = require("../../models/Subcategory");
const User = require("../../models/User");
const VendorProduct = require("../../models/VendorProduct");
const { toStoreStatusSummary } = require("../storeStatus");
const { client, getSearchIndex, MEILI_INDEX } = require("./meilisearchClient");
const { configureSearchIndex } = require("./searchIndex");

const PRODUCT_PREVIEW_LIMIT = 8;
const INDEX_BATCH_SIZE = 800;
const INDEX_QUEUE_DELAY = 400;

let indexConfigured = false;
const pendingTasks = new Map();

const normalizeString = (value) => String(value || "").trim();

const uniqueStrings = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return Array.from(
    new Set(
      items
        .map((item) => normalizeString(item))
        .filter(Boolean)
    )
  );
};

const toSearchableText = (values) =>
  uniqueStrings(values)
    .join(" ")
    .trim();

const roundRating = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

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

const addCityToMap = (map, key, city) => {
  if (!key || !city) return;
  const normalizedCity = normalizeString(city).toLowerCase();
  if (!normalizedCity) return;
  if (!map.has(key)) {
    map.set(key, new Set());
  }
  map.get(key).add(normalizedCity);
};

const ensureSearchIndex = async () => {
  try {
    await client.getIndex(MEILI_INDEX);
  } catch (_error) {
    await client.createIndex(MEILI_INDEX, { primaryKey: "id" });
  }

  const index = getSearchIndex();
  if (!indexConfigured) {
    await configureSearchIndex(index);
    indexConfigured = true;
  }

  return index;
};

const buildVendorDocument = (vendor, options) => {
  const vendorId = String(vendor._id || "").trim();
  if (!vendorId) return null;

  const vendorName = normalizeString(vendor.businessName || vendor.name || "Business");
  const category = vendor.businessCategory || {};
  const subcategory = vendor.businessSubcategory || {};
  const city = normalizeString(vendor.city || "");
  const cityToken = city.toLowerCase();
  const sublocality = normalizeString(vendor.sublocality || "");
  const vendorPhone = normalizeString(vendor.businessPhone || vendor.phone || "");

  const reviewSummary = options.reviewMap.get(vendorId) || { rating: 0, reviews: 0 };
  const storeStatus = toStoreStatusSummary(vendor);
  const products = uniqueStrings(options.productsByVendor.get(vendorId) || []).slice(0, PRODUCT_PREVIEW_LIMIT);
  const tags = uniqueStrings(vendor.serviceTags || []);

  return {
    id: `vendor_${vendorId}`,
    type: "vendor",
    rankGroup: 2,
    vendorId,
    vendorName,
    vendorImage: normalizeString(vendor.myStoreImage || vendor.image || vendor.shopBannerImage || vendor.myStoreBannerImage || ""),
    city,
    sublocality,
    vendorPhone,
    cities: cityToken ? [cityToken] : [],
    categoryId: category._id ? String(category._id) : undefined,
    categoryName: normalizeString(category.name || vendor.businessCategoryName || ""),
    categorySlug: normalizeString(category.slug || vendor.businessCategorySlug || ""),
    subcategoryId: subcategory._id ? String(subcategory._id) : undefined,
    subcategoryName: normalizeString(subcategory.name || vendor.businessSubcategoryName || ""),
    subcategorySlug: normalizeString(subcategory.slug || vendor.businessSubcategorySlug || ""),
    products,
    tags,
    rating: reviewSummary.rating,
    reviews: reviewSummary.reviews,
    isStoreOpen: storeStatus.isStoreOpen,
    storeStatusSource: storeStatus.storeStatusSource,
    vendorStatus: vendor.vendorStatus,
    updatedAt: vendor.updatedAt || vendor.createdAt || null,
    searchableText: toSearchableText([
      vendorName,
      category.name,
      subcategory.name,
      sublocality,
      ...products,
      ...tags,
      vendor.businessDescription,
    ]),
  };
};

const buildProductDocument = (product, vendor) => {
  const productId = String(product._id || "").trim();
  const vendorId = String(vendor?._id || "").trim();
  if (!productId || !vendorId) return null;

  const vendorName = normalizeString(vendor.businessName || vendor.name || "Business");
  const city = normalizeString(vendor.city || "");
  const cityToken = city.toLowerCase();
  const categoryName = normalizeString(product.categoryLabel || vendor.businessCategory?.name || "");
  const categorySlug = normalizeString(product.categorySlug || vendor.businessCategory?.slug || "");
  const subcategoryName = normalizeString(product.subcategoryName || vendor.businessSubcategory?.name || "");
  const subcategorySlug = normalizeString(product.subcategorySlug || vendor.businessSubcategory?.slug || "");
  const tags = uniqueStrings([...(product.tags || []), product.brand || ""]);
  const productName = normalizeString(product.productName || "");
  const storeStatus = toStoreStatusSummary(vendor);

  return {
    id: `product_${productId}`,
    type: "product",
    rankGroup: 1,
    productId,
    productName,
    productImage: normalizeString(product.image || product.heroImage || product.subcategoryImage || ""),
    price: Number(product.price || 0),
    vendorId,
    vendorName,
    city,
    cities: cityToken ? [cityToken] : [],
    categoryName,
    categorySlug,
    subcategoryName,
    subcategorySlug,
    tags,
    rating: Number(product.rating || 0),
    reviews: Number(product.reviews || 0),
    isStoreOpen: storeStatus.isStoreOpen,
    storeStatusSource: storeStatus.storeStatusSource,
    updatedAt: product.updatedAt || product.createdAt || null,
    searchableText: toSearchableText([
      productName,
      vendorName,
      categoryName,
      subcategoryName,
      ...tags,
      product.shortDescription,
      product.description,
    ]),
  };
};

const buildCategoryDocument = (category, cities) => {
  const categoryId = String(category._id || "").trim();
  if (!categoryId) return null;

  return {
    id: `category_${categoryId}`,
    type: "category",
    rankGroup: 4,
    categoryId,
    categoryName: normalizeString(category.name || ""),
    categorySlug: normalizeString(category.slug || ""),
    icon: normalizeString(category.icon || ""),
    cities,
    updatedAt: category.updatedAt || category.createdAt || null,
    searchableText: toSearchableText([category.name, category.slug, category.description]),
  };
};

const buildSubcategoryDocument = (subcategory, cities) => {
  const subcategoryId = String(subcategory._id || "").trim();
  if (!subcategoryId) return null;

  return {
    id: `subcategory_${subcategoryId}`,
    type: "subcategory",
    rankGroup: 3,
    subcategoryId,
    subcategoryName: normalizeString(subcategory.name || ""),
    subcategorySlug: normalizeString(subcategory.slug || ""),
    icon: normalizeString(subcategory.icon || ""),
    categoryId: subcategory.category?._id ? String(subcategory.category._id) : undefined,
    categoryName: normalizeString(subcategory.category?.name || ""),
    categorySlug: normalizeString(subcategory.category?.slug || ""),
    cities,
    updatedAt: subcategory.updatedAt || subcategory.createdAt || null,
    searchableText: toSearchableText([
      subcategory.name,
      subcategory.slug,
      subcategory.description,
      subcategory.category?.name,
    ]),
  };
};

const buildSearchDocuments = async () => {
  const vendors = await User.find({ role: "vendor", vendorStatus: "approved" })
    .select(
      "_id name businessName businessCategory businessSubcategory city sublocality businessPhone phone serviceTags businessDescription myStoreImage image shopBannerImage myStoreBannerImage vendorStatus storeStatusMode manualStoreStatus manualStoreStatusUpdatedAt shopOpeningTime shopClosingTime updatedAt createdAt"
    )
    .populate("businessCategory", "_id name slug")
    .populate("businessSubcategory", "_id name slug")
    .lean();

  const vendorIds = vendors.map((vendor) => vendor._id);
  const reviewMap = await getVendorReviewSummaryMap(vendorIds);

  const products = await VendorProduct.find({
    isDeleted: { $ne: true },
    status: "live",
  })
    .select(
      "_id vendor categorySlug categoryLabel subcategorySlug subcategoryName productName shortDescription description image heroImage subcategoryImage price rating reviews tags brand updatedAt createdAt"
    )
    .lean();

  const vendorMap = new Map(vendors.map((vendor) => [String(vendor._id), vendor]));
  const productsByVendor = new Map();

  products.forEach((product) => {
    const vendorId = String(product.vendor || "");
    if (!vendorMap.has(vendorId)) {
      return;
    }

    if (!productsByVendor.has(vendorId)) {
      productsByVendor.set(vendorId, []);
    }
    productsByVendor.get(vendorId).push(product.productName);
  });

  const vendorDocs = vendors
    .map((vendor) =>
      buildVendorDocument(vendor, {
        reviewMap,
        productsByVendor,
      })
    )
    .filter(Boolean);

  const productDocs = products
    .map((product) => buildProductDocument(product, vendorMap.get(String(product.vendor || ""))))
    .filter(Boolean);

  const categories = await Category.find({ isActive: true })
    .select("_id name slug description icon updatedAt createdAt")
    .lean();

  const subcategories = await Subcategory.find({ isActive: true })
    .select("_id name slug description icon category updatedAt createdAt")
    .populate("category", "_id name slug")
    .lean();

  const citiesByCategory = new Map();
  const citiesBySubcategory = new Map();

  vendors.forEach((vendor) => {
    const city = normalizeString(vendor.city || "");
    const categoryId = vendor.businessCategory?._id ? String(vendor.businessCategory._id) : "";
    const subcategoryId = vendor.businessSubcategory?._id ? String(vendor.businessSubcategory._id) : "";

    if (categoryId) {
      addCityToMap(citiesByCategory, categoryId, city);
    }

    if (subcategoryId) {
      addCityToMap(citiesBySubcategory, subcategoryId, city);
    }
  });

  const categoryDocs = categories
    .map((category) => {
      const citySet = citiesByCategory.get(String(category._id)) || new Set();
      return buildCategoryDocument(category, Array.from(citySet));
    })
    .filter(Boolean);

  const subcategoryDocs = subcategories
    .map((subcategory) => {
      const citySet = citiesBySubcategory.get(String(subcategory._id)) || new Set();
      return buildSubcategoryDocument(subcategory, Array.from(citySet));
    })
    .filter(Boolean);

  return [...productDocs, ...vendorDocs, ...subcategoryDocs, ...categoryDocs];
};

const reindexSearchDocuments = async () => {
  const index = await ensureSearchIndex();
  await index.deleteAllDocuments();

  const documents = await buildSearchDocuments();
  for (let i = 0; i < documents.length; i += INDEX_BATCH_SIZE) {
    const batch = documents.slice(i, i + INDEX_BATCH_SIZE);
    if (batch.length > 0) {
      await index.addDocuments(batch);
    }
  }

  return { total: documents.length };
};

const upsertVendorDocument = async (vendorId) => {
  if (!vendorId) return;

  const index = await ensureSearchIndex();
  const vendor = await User.findOne({ _id: vendorId, role: "vendor" })
    .select(
      "_id name businessName businessCategory businessSubcategory city sublocality businessPhone phone serviceTags businessDescription myStoreImage image shopBannerImage myStoreBannerImage vendorStatus storeStatusMode manualStoreStatus manualStoreStatusUpdatedAt shopOpeningTime shopClosingTime updatedAt createdAt"
    )
    .populate("businessCategory", "_id name slug")
    .populate("businessSubcategory", "_id name slug")
    .lean();

  if (!vendor || vendor.vendorStatus !== "approved") {
    await index.deleteDocuments([`vendor_${vendorId}`]);
    return;
  }

  const reviewMap = await getVendorReviewSummaryMap([vendor._id]);
  const products = await VendorProduct.find({
    vendor: vendor._id,
    isDeleted: { $ne: true },
    status: "live",
  })
    .select("productName")
    .lean();

  const productsByVendor = new Map([[String(vendor._id), products.map((item) => item.productName)]]);
  const document = buildVendorDocument(vendor, { reviewMap, productsByVendor });
  if (document) {
    await index.addDocuments([document]);
  }

  const categoryId = vendor.businessCategory?._id ? String(vendor.businessCategory._id) : "";
  const subcategoryId = vendor.businessSubcategory?._id ? String(vendor.businessSubcategory._id) : "";
  await upsertCategoryDocuments({ categoryId, subcategoryId });
};

const upsertProductDocument = async (productId) => {
  if (!productId) return;

  const index = await ensureSearchIndex();
  const product = await VendorProduct.findOne({ _id: productId })
    .select(
      "_id vendor categorySlug categoryLabel subcategorySlug subcategoryName productName shortDescription description image heroImage subcategoryImage price rating reviews tags brand updatedAt createdAt status isDeleted"
    )
    .lean();

  if (!product || product.isDeleted || product.status !== "live") {
    await index.deleteDocuments([`product_${productId}`]);
    return;
  }

  const vendor = await User.findOne({ _id: product.vendor, role: "vendor", vendorStatus: "approved" })
    .select("_id name businessName city businessCategory businessSubcategory")
    .populate("businessCategory", "_id name slug")
    .populate("businessSubcategory", "_id name slug")
    .lean();

  if (!vendor) {
    await index.deleteDocuments([`product_${productId}`]);
    return;
  }

  const document = buildProductDocument(product, vendor);
  if (document) {
    await index.addDocuments([document]);
  }

  await upsertVendorDocument(String(vendor._id));
};

const deleteProductDocument = async (productId) => {
  if (!productId) return;
  const index = await ensureSearchIndex();
  await index.deleteDocuments([`product_${productId}`]);
};

const upsertCategoryDocuments = async ({ categoryId, subcategoryId }) => {
  const index = await ensureSearchIndex();
  const tasks = [];

  if (categoryId) {
    const category = await Category.findById(categoryId)
      .select("_id name slug description icon updatedAt createdAt")
      .lean();

    if (category) {
      const cities = await User.distinct("city", {
        role: "vendor",
        vendorStatus: "approved",
        businessCategory: categoryId,
        city: { $nin: [null, ""] },
      });

      const doc = buildCategoryDocument(
        category,
        uniqueStrings(cities.map((city) => normalizeString(city).toLowerCase()))
      );
      if (doc) {
        tasks.push(doc);
      }
    }
  }

  if (subcategoryId) {
    const subcategory = await Subcategory.findById(subcategoryId)
      .select("_id name slug description icon category updatedAt createdAt")
      .populate("category", "_id name slug")
      .lean();

    if (subcategory) {
      const cities = await User.distinct("city", {
        role: "vendor",
        vendorStatus: "approved",
        businessSubcategory: subcategoryId,
        city: { $nin: [null, ""] },
      });

      const doc = buildSubcategoryDocument(
        subcategory,
        uniqueStrings(cities.map((city) => normalizeString(city).toLowerCase()))
      );
      if (doc) {
        tasks.push(doc);
      }
    }
  }

  if (tasks.length > 0) {
    await index.addDocuments(tasks);
  }
};

const scheduleTask = (key, task) => {
  if (pendingTasks.has(key)) return;

  const timeout = setTimeout(async () => {
    pendingTasks.delete(key);
    try {
      await task();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Search sync error:", error.message);
    }
  }, INDEX_QUEUE_DELAY);

  pendingTasks.set(key, timeout);
};

const scheduleVendorIndex = (vendorId) => {
  if (!vendorId) return;
  scheduleTask(`vendor:${vendorId}`, () => upsertVendorDocument(vendorId));
};

const scheduleProductIndex = (productId) => {
  if (!productId) return;
  scheduleTask(`product:${productId}`, () => upsertProductDocument(productId));
};

const scheduleProductDelete = (productId) => {
  if (!productId) return;
  scheduleTask(`product-delete:${productId}`, () => deleteProductDocument(productId));
};

const scheduleCategoryIndex = (categoryId, subcategoryId) => {
  if (!categoryId && !subcategoryId) return;
  const key = `category:${categoryId || "none"}:subcategory:${subcategoryId || "none"}`;
  scheduleTask(key, () => upsertCategoryDocuments({ categoryId, subcategoryId }));
};

module.exports = {
  ensureSearchIndex,
  buildSearchDocuments,
  reindexSearchDocuments,
  upsertVendorDocument,
  upsertProductDocument,
  scheduleVendorIndex,
  scheduleProductIndex,
  scheduleProductDelete,
  scheduleCategoryIndex,
};
