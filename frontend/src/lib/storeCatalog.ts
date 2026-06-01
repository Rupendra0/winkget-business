import { categoryPages } from "@/data/categoryData";
import {
  buildFallbackProfile,
  listingProfiles,
  storePages,
  type ListingProfile,
  type StorePageData,
  type StoreProduct,
} from "@/data/listingData";
import { buildProductSlug, parseProductSlug, toSlugToken } from "@/data/productSlug";
import {
  fetchSubcategories,
  fetchVendorById,
  fetchVendorStoreProducts,
  toListingProfileFromVendor,
  type CatalogSubcategory,
  type CatalogVendorProduct,
} from "@/lib/catalogClient";

export type ProductDetailModel = {
  id: string;
  storeId: string;
  name: string;
  image: string;
  gallery: string[];
  price: number;
  oldPrice: number;
  discount: number;
  priceText: string;
  oldPriceText: string;
  description: string;
  shortDescription?: string;
  detailedDescription?: string;
  keyAttributes: Array<[string, string]>;
  highlights: string[];
  specifications: Array<[string, string]>;
  categorySlug: string;
  categoryLabel: string;
  subcategoryName: string;
  sellerName: string;
  supplierName?: string;
  originCountry?: string;
  vendorSource?: string;
  rating: number;
  reviews: number;
  shippingLabel?: string;
  deliveryByText?: string;
  isCancellable?: boolean;
  isReturnable?: boolean;
  detailedDescriptionBlocks?: Array<{ image: string; headline: string; text: string }>;
  showDeliveryBadge?: boolean;
  showTopBrand?: boolean;
  showFreeDelivery?: boolean;
  showSecureTransaction?: boolean;
  showCashOnDelivery?: boolean;
  show7DaySupport?: boolean;
  showAssured?: boolean;
};

export type RelatedProductModel = {
  id: string;
  href: string;
  name: string;
  image: string;
  sellerName: string;
  price: number;
  oldPrice: number;
  priceText: string;
  oldPriceText: string;
};

const findListing = (id: string) => {
  for (const category of categoryPages) {
    const listing = category.listings.find((item) => item.id === id);
    if (listing) {
      return listing;
    }
  }

  return null;
};

const normalizeString = (value: unknown) => String(value || "").trim();
const normalizeCategoryKey = (value: unknown) => normalizeString(value).toLowerCase();

const parsePriceValue = (value: string | number | undefined, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const numeric = Number(String(value || "").replace(/[^0-9.]/g, ""));
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.max(0, Math.round(numeric));
  }

  return Math.max(0, Math.round(fallback));
};

const formatPriceText = (value: number) => `₹${Math.max(0, Math.round(value)).toLocaleString("en-IN")}`;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const uniqueStrings = (values: Array<string | undefined>) => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = normalizeString(value);
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(normalized);
  });

  return result;
};

const toStoreCategoryBarItems = (subcategories: CatalogSubcategory[]) => {
  const source = Array.isArray(subcategories) ? [...subcategories] : [];
  const childrenByParent = new Map<string, CatalogSubcategory[]>();

  source.forEach((subcategory) => {
    const parentId = normalizeString(subcategory.parentSubcategory?.id);
    if (!parentId) return;

    const children = childrenByParent.get(parentId) || [];
    children.push(subcategory);
    childrenByParent.set(parentId, children);
  });

  source.sort((left, right) => {
    const leftOrder = Number.isFinite(Number(left.sortOrder)) ? Number(left.sortOrder) : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(Number(right.sortOrder)) ? Number(right.sortOrder) : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return String(left.name || "").localeCompare(String(right.name || ""));
  });

  const collectDescendantLabels = (subcategoryId: string, lineage = new Set<string>()): string[] => {
    const normalizedId = normalizeString(subcategoryId);
    if (!normalizedId || lineage.has(normalizedId)) return [];

    const nextLineage = new Set(lineage);
    nextLineage.add(normalizedId);

    return (childrenByParent.get(normalizedId) || []).flatMap((child) => [
      normalizeString(child.name),
      ...collectDescendantLabels(normalizeString(child.id), nextLineage),
    ]);
  };

  return source
    .filter((subcategory) => !subcategory.parentSubcategory?.id)
    .map((subcategory) => {
      const id = normalizeString(subcategory.id);
      const label = normalizeString(subcategory.name);
      const iconImage = normalizeString(subcategory.icon);
      if (!id || !label) {
        return null;
      }

      return {
        id,
        label,
        iconImage: iconImage || undefined,
        filterLabels: uniqueStrings([label, ...collectDescendantLabels(id)]),
      };
    })
    .filter((item): item is { id: string; label: string; iconImage: string | undefined; filterLabels: string[] } => Boolean(item))
    .slice(0, 12);
};

const isRestaurantCategoryLabel = (value: string) => normalizeCategoryKey(value) === "restaurant";

const isRestaurantMarketplaceProfile = (profile: ListingProfile, categoryLabel: string) => {
  return [categoryLabel, profile.category].some((value) => isRestaurantCategoryLabel(value));
};

const toPriceForTwoLabel = (profile: ListingProfile) => {
  const rawRange = normalizeString(profile.priceRange);
  if (!rawRange) {
    return "₹300 for two";
  }

  if (/for\s*two/i.test(rawRange)) {
    return rawRange;
  }

  const rupeeMatch = rawRange.match(/₹\s*[\d,]+/i);
  if (rupeeMatch?.[0]) {
    return `${rupeeMatch[0]} for two`;
  }

  return "₹300 for two";
};

const toDeliveryTimeLabel = (profile: ListingProfile) => {
  const serviceHints = [
    ...(Array.isArray(profile.tags) ? profile.tags : []),
    ...(Array.isArray(profile.services) ? profile.services : []),
  ];

  const matchedHint = serviceHints.find((item) => /\d+\s*(?:-|to)\s*\d+\s*min|\d+\s*min/i.test(String(item || "")));
  if (matchedHint) {
    return normalizeString(matchedHint);
  }

  return "20-45 min";
};

const toCuisineLabel = (profile: ListingProfile, fallback: string) => {
  const cuisineTokens = uniqueStrings([
    ...(Array.isArray(profile.tags) ? profile.tags : []),
    ...(Array.isArray(profile.services) ? profile.services : []),
  ])
    .filter((item) => item.length <= 32)
    .slice(0, 2);

  if (cuisineTokens.length > 0) {
    return cuisineTokens.join(" • ");
  }

  return fallback || "Multi-cuisine";
};

const toQuickFilterChips = (profile: ListingProfile, categories: string[]) => {
  return uniqueStrings([
    ...(Array.isArray(profile.tags) ? profile.tags : []),
    ...(Array.isArray(profile.services) ? profile.services : []),
    ...categories,
  ]).slice(0, 10);
};

const toRestaurantHeroSubtitle = (profile: ListingProfile) => {
  const rawDescription = normalizeString(profile.description);
  if (!rawDescription) {
    return "Freshly cooked favourites delivered with fast and reliable service.";
  }

  if (rawDescription.length <= 140) {
    return rawDescription;
  }

  return `${rawDescription.slice(0, 137).trimEnd()}...`;
};

const deriveDiscount = (product: StoreProduct) => {
  const badge = normalizeString(product.badge);
  const badgeDiscountMatch = badge.match(/(\d{1,2})\s*%/);
  if (badgeDiscountMatch) {
    const parsedDiscount = Number(badgeDiscountMatch[1]);
    if (Number.isFinite(parsedDiscount) && parsedDiscount > 0) {
      return Math.min(parsedDiscount, 70);
    }
  }

  return 0;
};

const toCategorySlug = (value: string) => {
  const token = toSlugToken(value);
  return token === "na" ? "products" : token;
};

const toStoreProductsFromVendorProducts = (
  vendorProducts: CatalogVendorProduct[],
  profile: ListingProfile,
  storeId: string
): StoreProduct[] => {
  const fallbackImage = normalizeString(profile.logoImage) || normalizeString(profile.coverImage);

  return vendorProducts.map((product, index) => {
    const id = normalizeString(product.id) || `${storeId}-product-${index + 1}`;
    const productName = normalizeString(product.productName) || `Product ${index + 1}`;

    const priceValue = parsePriceValue(product.price, 0);
    const oldPriceValue = parsePriceValue(product.oldPrice, 0);

    const image =
      normalizeString(product.image) ||
      normalizeString(product.heroImage) ||
      (Array.isArray(product.gallery) ? normalizeString(product.gallery[0]) : "") ||
      fallbackImage;

    const subcategoryName = normalizeString(product.subcategoryName);
    const categoryLabel = normalizeString(product.categoryLabel || product.categorySlug || profile.category || "Products");
    const category = categoryLabel;
    const placementInput = normalizeString(product.storePlacement).toLowerCase();
    const storePlacement = placementInput === "featured" || placementInput === "trending" ? placementInput : undefined;

    return {
      id,
      name: productName,
      price: formatPriceText(priceValue),
      category,
      imageUrl: image,
      badge: normalizeString(product.badge) || undefined,
      categorySlug: normalizeString(product.categorySlug) || toCategorySlug(categoryLabel),
      categoryLabel,
      subcategoryName: subcategoryName || undefined,
      shortDescription: normalizeString(product.shortDescription) || undefined,
      description: normalizeString(product.description) || undefined,
      detailedDescription: normalizeString(product.detailedDescription) || undefined,
      gallery: Array.isArray(product.gallery) ? uniqueStrings(product.gallery.map((value) => normalizeString(value))) : [],
      oldPriceValue,
      inventory: Number.isFinite(Number(product.inventory)) ? Number(product.inventory) : undefined,
      moq: Number.isFinite(Number(product.moq)) ? Number(product.moq) : undefined,
      originCountry: normalizeString(product.originCountry) || undefined,
      supplierName: normalizeString(product.supplierName) || undefined,
      sellerName: normalizeString(product.sellerName || profile.name) || profile.name,
      vendorSource: normalizeString(product.vendorSource) || undefined,
      rating: Number.isFinite(Number(product.rating)) ? Number(product.rating) : undefined,
      reviews: Number.isFinite(Number(product.reviews)) ? Number(product.reviews) : undefined,
      shippingLabel: normalizeString(product.shippingLabel) || undefined,
      deliveryByText: normalizeString(product.deliveryByText) || undefined,
      shippingTimeline: normalizeString(product.shippingTimeline) || undefined,
      isCancellable: typeof product.isCancellable === "boolean" ? product.isCancellable : undefined,
      isReturnable: typeof product.isReturnable === "boolean" ? product.isReturnable : undefined,
      highlights: Array.isArray(product.highlights)
        ? uniqueStrings(product.highlights.map((value) => normalizeString(value)))
        : undefined,
      keyAttributes: Array.isArray(product.keyAttributes)
        ? product.keyAttributes
            .map((item) => ({
              label: normalizeString(item.label),
              value: normalizeString(item.value),
            }))
            .filter((item) => item.label && item.value)
        : undefined,
      specifications: Array.isArray(product.specifications)
        ? product.specifications
            .map((item) => ({
              label: normalizeString(item.label),
              value: normalizeString(item.value),
            }))
            .filter((item) => item.label && item.value)
        : undefined,
      tags: Array.isArray(product.tags) ? uniqueStrings(product.tags.map((value) => normalizeString(value))) : undefined,
      detailedDescriptionBlocks: Array.isArray(product.detailedDescriptionBlocks)
        ? product.detailedDescriptionBlocks
            .map((item) => ({
              image: normalizeString(item?.image) || undefined,
              headline: normalizeString(item?.headline) || undefined,
              text: normalizeString(item?.text) || undefined,
            }))
            .filter((item) => item.image || item.headline || item.text)
        : undefined,
      showDeliveryBadge: product.showDeliveryBadge === true,
      showTopBrand: product.showTopBrand === true,
      showFreeDelivery: product.showFreeDelivery === true,
      showSecureTransaction: product.showSecureTransaction === true,
      showCashOnDelivery: product.showCashOnDelivery === true,
      show7DaySupport: product.show7DaySupport === true,
      showAssured: product.showAssured === true,
      storePlacement,
    };
  });
};

const toProductGallery = (product: StoreProduct) => {
  const productGallery = Array.isArray(product.gallery) ? product.gallery : [];

  return uniqueStrings([...productGallery, product.imageUrl]).slice(0, 8);
};

const toHighlights = (product: StoreProduct) => {
  const explicitHighlights = Array.isArray(product.highlights)
    ? product.highlights.map((item) => normalizeString(item)).filter(Boolean)
    : [];

  if (explicitHighlights.length > 0) {
    return uniqueStrings(explicitHighlights).slice(0, 6);
  }

  return [];
};

const toKeyAttributes = (product: StoreProduct, storeData: StorePageData) => {
  if (Array.isArray(product.keyAttributes) && product.keyAttributes.length > 0) {
    const mapped = product.keyAttributes
      .map((item) => [normalizeString(item.label), normalizeString(item.value)] as [string, string])
      .filter(([label, value]) => label && value);

    if (mapped.length > 0) {
      return mapped;
    }
  }

  const derived: Array<[string, string]> = [
    ["Product ID", normalizeString(product.id)],
    ["Category", normalizeString(product.categoryLabel || product.category)],
    ["Seller", normalizeString(product.sellerName || storeData.storeName)],
  ];

  if (Number.isFinite(Number(product.inventory))) {
    derived.push(["Stock", String(Number(product.inventory))]);
  }

  if (Number.isFinite(Number(product.moq))) {
    derived.push(["MOQ", String(Number(product.moq))]);
  }

  if (normalizeString(product.shippingTimeline)) {
    derived.push(["Shipping Timeline", normalizeString(product.shippingTimeline)]);
  }

  return derived.filter((item) => Boolean(item[1]));
};

const toSpecifications = (product: StoreProduct) => {
  if (Array.isArray(product.specifications) && product.specifications.length > 0) {
    const mapped = product.specifications
      .map((item) => [normalizeString(item.label), normalizeString(item.value)] as [string, string])
      .filter(([label, value]) => label && value);

    if (mapped.length > 0) {
      return mapped;
    }
  }

  const derived: Array<[string, string]> = [
    ["Category", normalizeString(product.categoryLabel || product.category)],
    ["Subcategory", normalizeString(product.subcategoryName)],
    ["Shipping", normalizeString(product.shippingLabel)],
    ["Delivery", normalizeString(product.deliveryByText)],
  ];

  return derived.filter((item) => Boolean(item[1]));
};

const toProductDescription = (product: StoreProduct) => {
  const explicitDescription = normalizeString(product.description);
  if (explicitDescription) {
    return explicitDescription;
  }

  return "";
};

const toProductModel = (
  product: StoreProduct,
  storeData: StorePageData
): ProductDetailModel => {
  const price = parsePriceValue(product.price, 0);
  const parsedOldPrice = parsePriceValue(product.oldPriceValue, 0);
  const oldPrice = parsedOldPrice > price ? parsedOldPrice : 0;
  const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  const categoryLabel = normalizeString(product.categoryLabel || product.category);
  const categorySlug = normalizeString(product.categorySlug) || toCategorySlug(categoryLabel);
  const gallery = toProductGallery(product);
  const image = gallery[0] || normalizeString(product.imageUrl) || storeData.logoImage;
  const sellerName = normalizeString(product.sellerName || storeData.storeName);
  const rating = Number.isFinite(Number(product.rating)) ? Number(product.rating) : 0;
  const reviews = Number.isFinite(Number(product.reviews)) ? Number(product.reviews) : 0;
  const badgeDiscount = deriveDiscount(product);
  const effectiveDiscount = discount > 0 ? discount : badgeDiscount;

  return {
    id: normalizeString(product.id),
    storeId: normalizeString(storeData.id),
    name: normalizeString(product.name) || "Product",
    image,
    gallery,
    price,
    oldPrice,
    discount: effectiveDiscount,
    priceText: formatPriceText(price),
    oldPriceText: formatPriceText(oldPrice > 0 ? oldPrice : price),
    description: toProductDescription(product),
    shortDescription: normalizeString(product.shortDescription) || undefined,
    detailedDescription: normalizeString(product.detailedDescription) || undefined,
    keyAttributes: toKeyAttributes(product, storeData),
    highlights: toHighlights(product),
    specifications: toSpecifications(product),
    categorySlug,
    categoryLabel,
    subcategoryName: normalizeString(product.subcategoryName || product.category),
    sellerName,
    supplierName: normalizeString(product.supplierName) || undefined,
    originCountry: normalizeString(product.originCountry) || undefined,
    vendorSource: normalizeString(product.vendorSource) || undefined,
    rating,
    reviews,
    shippingLabel: normalizeString(product.shippingLabel) || undefined,
    deliveryByText: normalizeString(product.deliveryByText) || undefined,
    isCancellable: typeof product.isCancellable === "boolean" ? product.isCancellable : undefined,
    isReturnable: typeof product.isReturnable === "boolean" ? product.isReturnable : undefined,
    detailedDescriptionBlocks: Array.isArray(product.detailedDescriptionBlocks)
      ? product.detailedDescriptionBlocks
          .map((item) => ({
            image: normalizeString(item?.image),
            headline: normalizeString(item?.headline),
            text: normalizeString(item?.text),
          }))
          .filter((item) => item.image || item.headline || item.text)
      : undefined,
    showDeliveryBadge: product.showDeliveryBadge === true,
    showTopBrand: product.showTopBrand === true,
    showFreeDelivery: product.showFreeDelivery === true,
    showSecureTransaction: product.showSecureTransaction === true,
    showCashOnDelivery: product.showCashOnDelivery === true,
    show7DaySupport: product.show7DaySupport === true,
    showAssured: product.showAssured === true,
  };
};

const toRelatedProductModel = (
  product: StoreProduct,
  storeData: StorePageData
): RelatedProductModel => {
  const mapped = toProductModel(product, storeData);

  return {
    id: mapped.id,
    href: `/product/${encodeURIComponent(
      buildProductSlug({
        id: mapped.id,
        name: mapped.name,
        storeId: mapped.storeId,
        sellerName: mapped.sellerName,
      })
    )}`,
    name: mapped.name,
    image: mapped.image,
    sellerName: mapped.sellerName,
    price: mapped.price,
    oldPrice: mapped.oldPrice,
    priceText: mapped.priceText,
    oldPriceText: mapped.oldPriceText,
  };
};

const findProductInStore = (storeData: StorePageData, productToken: string) => {
  const productIndex = storeData.products.findIndex((candidate) => toSlugToken(candidate.id) === productToken);
  if (productIndex < 0) {
    return null;
  }

  const product = storeData.products[productIndex];
  const mappedProduct = toProductModel(product, storeData);

  const relatedProducts = storeData.products
    .filter((candidate) => candidate.id !== product.id)
    .slice(0, 12)
    .map((candidate) => toRelatedProductModel(candidate, storeData));

  return {
    product: mappedProduct,
    relatedProducts,
  };
};

export const toStoreDataFromProfile = (
  profile: ListingProfile,
  idFallback: string,
  vendorProducts: CatalogVendorProduct[] = [],
  options?: {
    includeMockFallbackProducts?: boolean;
    categoryBarItems?: Array<{
      id: string;
      label: string;
      iconImage?: string;
    }>;
  }
): StorePageData => {
  const fallbackId = normalizeString(idFallback);
  const profileId = normalizeString(profile.id);
  const rawStoreId = normalizeString(profile.storeId);
  const storeId =
    rawStoreId && (rawStoreId === profileId || rawStoreId === fallbackId)
      ? rawStoreId
      : profileId || fallbackId || "store";

  const profileName = normalizeString(profile.name) || "Business Store";
  const categoryLabel = normalizeString(profile.category) || "Business";
  const imageUrl = normalizeString(profile.coverImage) || normalizeString(profile.logoImage);
  const addressLabel = [profile.address, profile.city].filter(Boolean).join(", ") || "Address unavailable";
  const addressParts = normalizeString(profile.address)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const sublocalityLabel = normalizeString(profile.sublocality) || addressParts[0] || "";
  const mappedProducts = toStoreProductsFromVendorProducts(vendorProducts, profile, storeId);
  const includeMockFallbackProducts = options?.includeMockFallbackProducts ?? true;

  const fallbackProducts: StoreProduct[] = [
    {
      id: `${storeId}-product-1`,
      name: `${profileName} Featured Product`,
      price: "₹1,999",
      category: categoryLabel,
      imageUrl,
    },
    {
      id: `${storeId}-product-2`,
      name: `${profileName} Bestseller`,
      price: "₹2,499",
      category: categoryLabel,
      imageUrl,
    },
  ];

  const products = mappedProducts.length > 0 ? mappedProducts : includeMockFallbackProducts ? fallbackProducts : [];
  const categories = uniqueStrings([
    ...products.map((product) => normalizeString(product.categoryLabel || product.category)),
    categoryLabel,
  ]).slice(0, 12);
  const categoryBarItems = Array.isArray(options?.categoryBarItems)
    ? options.categoryBarItems
        .map((item) => ({
          id: normalizeString(item.id),
          label: normalizeString(item.label),
          iconImage: normalizeString(item.iconImage) || undefined,
        }))
        .filter((item) => item.id && item.label)
    : [];
  const isRestaurantMarketplace = isRestaurantMarketplaceProfile(profile, categoryLabel);
  const quickFilterChips = toQuickFilterChips(profile, categories);
  const contactPhone = normalizeString(profile.businessAlternatePhone || profile.phone);
  const whatsappPhone = normalizeString(profile.whatsapp || profile.phone || profile.businessAlternatePhone);

  const featuredFromPlacement = products
    .filter((item) => item.storePlacement === "featured")
    .map((item) => item.id);
  const trendingFromPlacement = products
    .filter((item) => item.storePlacement === "trending")
    .map((item) => item.id);

  const allProductIds = products.map((item) => item.id);
  const explicitFeaturedIds = Array.from(new Set(featuredFromPlacement));
  const explicitTrendingIds = Array.from(new Set(trendingFromPlacement));

  const featuredFallbackPool = allProductIds.filter((id) => !explicitTrendingIds.includes(id));
  const featuredProductIds =
    explicitFeaturedIds.length > 0
      ? explicitFeaturedIds.slice(0, 6)
      : featuredFallbackPool.slice(0, 6);

  const featuredIdSet = new Set(featuredProductIds);
  const trendingFallbackPool = allProductIds.filter((id) => !featuredIdSet.has(id));
  const trendingProductIds =
    explicitTrendingIds.length > 0
      ? explicitTrendingIds.filter((id) => !featuredIdSet.has(id)).slice(0, 6)
      : trendingFallbackPool.slice(0, 6);

  return {
    id: storeId,
    storeName: profileName,
    createdAt: normalizeString(profile.createdAt) || undefined,
    tagline: "Shop by category",
    bannerImage: imageUrl,
    logoImage: normalizeString(profile.logoImage) || imageUrl,
    storeCategory: categoryLabel,
    isRestaurantMarketplace,
    isStoreOpen: typeof profile.isStoreOpen === "boolean" ? profile.isStoreOpen : null,
    contactPhone: contactPhone || undefined,
    whatsappPhone: whatsappPhone || undefined,
    deliveryTimeLabel: isRestaurantMarketplace ? toDeliveryTimeLabel(profile) : undefined,
    priceForTwoLabel: isRestaurantMarketplace ? toPriceForTwoLabel(profile) : undefined,
    deliveryFeeLabel: isRestaurantMarketplace ? "FREE above ₹299" : undefined,
    quickFilterChips: quickFilterChips.length > 0 ? quickFilterChips : undefined,
    heroTitle: isRestaurantMarketplace ? "Super Delicious Food Menu" : undefined,
    heroSubtitle: isRestaurantMarketplace ? toRestaurantHeroSubtitle(profile) : undefined,
    cuisineLabel: isRestaurantMarketplace ? toCuisineLabel(profile, categoryLabel) : undefined,
    rating: Number(profile.rating || 0),
    reviews: Number(profile.reviews || 0),
    address: addressLabel,
    city: normalizeString(profile.city) || undefined,
    sublocality: sublocalityLabel || undefined,
    establishmentYear: profile.establishmentYear,
    categories,
    categoryBarItems: categoryBarItems.length > 0 ? categoryBarItems : undefined,
    filters: [
      { label: "Price", options: ["Under ₹1,000", "₹1,000 - ₹10,000", "₹10,000+"] },
      { label: "Brand", options: ["Top Brands", "Budget", "Premium"] },
      { label: "Availability", options: ["In stock", "Pre-order"] },
    ],
    products,
    featured: {
      title: "Featured Products",
      subtitle: "Handpicked for you",
      productIds: featuredProductIds,
    },
    trending: {
      title: "Trending Products",
      subtitle: "Most popular",
      productIds: trendingProductIds,
    },
    aboutTitle: "About",
    aboutBody:
      normalizeString(profile.description) ||
      "Explore verified products with trusted delivery and support from our marketplace.",
  };
};

export async function resolveStoreDataById(id: string): Promise<StorePageData | null> {
  const resolvedId = normalizeString(id);
  if (!resolvedId) {
    return null;
  }

  const shouldPreferLiveVendor = OBJECT_ID_REGEX.test(resolvedId);
  const resolveLiveVendorStore = async () => {
    const liveVendor = await fetchVendorById(resolvedId);
    if (!liveVendor) {
      return null;
    }

    const businessCategoryId = normalizeString(liveVendor.businessCategory?.id);
    const [liveProducts, liveSubcategories] = await Promise.all([
      fetchVendorStoreProducts(resolvedId, {
        status: "live",
        limit: 300,
      }),
      businessCategoryId
        ? fetchSubcategories({
            categoryId: businessCategoryId,
            cacheBust: `store-${Date.now()}`,
          })
        : Promise.resolve([]),
    ]);
    const categoryBarItems = toStoreCategoryBarItems(liveSubcategories);

    const baseProfile = toListingProfileFromVendor(liveVendor);
    const profile = {
      ...baseProfile,
      logoImage: normalizeString(liveVendor.myStoreImage) || baseProfile.logoImage,
      coverImage: normalizeString(liveVendor.myStoreBannerImage) || baseProfile.coverImage,
    };
    return toStoreDataFromProfile(profile, resolvedId, liveProducts, {
      includeMockFallbackProducts: false,
      categoryBarItems,
    });
  };

  if (shouldPreferLiveVendor) {
    return resolveLiveVendorStore();
  }

  const staticStore = storePages[resolvedId];
  if (staticStore) {
    return staticStore;
  }

  if (!shouldPreferLiveVendor) {
    const liveStore = await resolveLiveVendorStore();
    if (liveStore) {
      return liveStore;
    }
  }

  const listing = findListing(resolvedId);
  if (!listing) {
    return null;
  }

  const profile = listingProfiles[resolvedId] ?? buildFallbackProfile(listing);
  const mappedStoreId = normalizeString(profile.storeId);
  const mappedStore =
    mappedStoreId && mappedStoreId.toLowerCase() === resolvedId.toLowerCase()
      ? storePages[mappedStoreId]
      : undefined;

  if (mappedStore) {
    return mappedStore;
  }

  return toStoreDataFromProfile(profile, resolvedId);
}

export async function resolveProductBySlug(
  slug: string
): Promise<{ product: ProductDetailModel; relatedProducts: RelatedProductModel[] } | null> {
  const { storeToken, productToken } = parseProductSlug(slug);
  if (!productToken || productToken === "na") {
    return null;
  }

  if (storeToken && storeToken !== "na") {
    const storeFromToken = await resolveStoreDataById(storeToken);
    if (storeFromToken) {
      const result = findProductInStore(storeFromToken, productToken);
      if (result) {
        return result;
      }
    }

    if (OBJECT_ID_REGEX.test(storeToken)) {
      return null;
    }
  }

  const checkedStoreIds = new Set<string>();

  for (const storeData of Object.values(storePages)) {
    checkedStoreIds.add(normalizeString(storeData.id));
    const result = findProductInStore(storeData, productToken);
    if (result) {
      return result;
    }
  }

  for (const profile of Object.values(listingProfiles)) {
    const profileStoreId = normalizeString(profile.storeId) || normalizeString(profile.id);
    if (!profileStoreId || checkedStoreIds.has(profileStoreId)) {
      continue;
    }

    const mappedStore = toStoreDataFromProfile(profile, profile.id);
    checkedStoreIds.add(profileStoreId);

    const result = findProductInStore(mappedStore, productToken);
    if (result) {
      return result;
    }
  }

  return null;
}
