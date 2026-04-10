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
  fetchVendorById,
  fetchVendorStoreProducts,
  toListingProfileFromVendor,
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
  keyAttributes: Array<[string, string]>;
  highlights: string[];
  specifications: Array<[string, string]>;
  categorySlug: string;
  categoryLabel: string;
  subcategoryName: string;
  sellerName: string;
  vendorSource: string;
  rating: number;
  reviews: number;
  shippingLabel: string;
  deliveryByText: string;
  isCancellable: boolean;
  isReturnable: boolean;
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

const buildDeliveryText = () => {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 3);

  const weekday = nextDate.toLocaleDateString("en-IN", { weekday: "long" });
  const day = nextDate.toLocaleDateString("en-IN", { day: "2-digit" });
  const month = nextDate.toLocaleDateString("en-IN", { month: "short" });

  return `${weekday}, ${day} ${month}`;
};

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

const deriveDiscount = (product: StoreProduct, productIndex: number) => {
  const badge = normalizeString(product.badge);
  const badgeDiscountMatch = badge.match(/(\d{1,2})\s*%/);
  if (badgeDiscountMatch) {
    const parsedDiscount = Number(badgeDiscountMatch[1]);
    if (Number.isFinite(parsedDiscount) && parsedDiscount > 0) {
      return Math.min(parsedDiscount, 70);
    }
  }

  return productIndex % 2 === 0 ? 14 : 10;
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
    const safePriceValue = priceValue > 0 ? priceValue : 499 + index * 150;
    const oldPriceValue = parsePriceValue(product.oldPrice, safePriceValue);

    const image =
      normalizeString(product.image) ||
      normalizeString(product.heroImage) ||
      (Array.isArray(product.gallery) ? normalizeString(product.gallery[0]) : "") ||
      fallbackImage;

    const subcategoryName = normalizeString(product.subcategoryName);
    const categoryLabel = normalizeString(product.categoryLabel || product.categorySlug || profile.category || "Products");
    const category = subcategoryName || categoryLabel;
    const placementInput = normalizeString(product.storePlacement).toLowerCase();
    const storePlacement = placementInput === "featured" || placementInput === "trending" ? placementInput : undefined;

    return {
      id,
      name: productName,
      price: formatPriceText(safePriceValue),
      category,
      imageUrl: image,
      badge: normalizeString(product.badge) || undefined,
      categorySlug: normalizeString(product.categorySlug) || toCategorySlug(categoryLabel),
      categoryLabel,
      subcategoryName: category,
      shortDescription: normalizeString(product.shortDescription) || undefined,
      description: normalizeString(product.description) || undefined,
      gallery: Array.isArray(product.gallery) ? uniqueStrings(product.gallery.map((value) => normalizeString(value))) : [],
      oldPriceValue,
      inventory: Number.isFinite(Number(product.inventory)) ? Number(product.inventory) : undefined,
      moq: Number.isFinite(Number(product.moq)) ? Number(product.moq) : undefined,
      sellerName: normalizeString(product.sellerName || profile.name) || profile.name,
      vendorSource: normalizeString(product.vendorSource) || "Winkget Marketplace",
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
      storePlacement,
    };
  });
};

const toProductGallery = (product: StoreProduct, storeData: StorePageData) => {
  const productGallery = Array.isArray(product.gallery) ? product.gallery : [];

  return uniqueStrings([
    ...productGallery,
    product.imageUrl,
    ...storeData.products.map((item) => item.imageUrl),
    storeData.bannerImage,
    storeData.logoImage,
  ]).slice(0, 5);
};

const toHighlights = (product: StoreProduct, storeData: StorePageData) => {
  const explicitHighlights = Array.isArray(product.highlights)
    ? product.highlights.map((item) => normalizeString(item)).filter(Boolean)
    : [];

  if (explicitHighlights.length > 0) {
    return uniqueStrings(explicitHighlights).slice(0, 6);
  }

  return uniqueStrings([
    `${storeData.storeName} verified seller guarantee`,
    "Quality checked before dispatch",
    "Secure payments and doorstep delivery",
    product.badge,
  ]).slice(0, 5);
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

  return [
    ["Product ID", normalizeString(product.id)],
    ["Category", normalizeString(product.category) || "Products"],
    ["Seller", normalizeString(storeData.storeName)],
    ["Availability", "In Stock"],
    ["Dispatch", "Within 24 Hours"],
  ] as Array<[string, string]>;
};

const toSpecifications = (product: StoreProduct, storeData: StorePageData) => {
  if (Array.isArray(product.specifications) && product.specifications.length > 0) {
    const mapped = product.specifications
      .map((item) => [normalizeString(item.label), normalizeString(item.value)] as [string, string])
      .filter(([label, value]) => label && value);

    if (mapped.length > 0) {
      return mapped;
    }
  }

  return [
    ["Brand", normalizeString(storeData.storeName)],
    ["Model", normalizeString(product.name)],
    ["Category", normalizeString(product.category) || "Products"],
    ["Shipping", "Standard + Express"],
    ["Warranty", "Manufacturer warranty where applicable"],
  ] as Array<[string, string]>;
};

const toProductDescription = (product: StoreProduct, storeData: StorePageData) => {
  const explicitDescription = normalizeString(product.description || product.shortDescription);
  if (explicitDescription) {
    return explicitDescription;
  }

  const productName = normalizeString(product.name) || "This product";
  const storeName = normalizeString(storeData.storeName) || "our seller";
  const category = normalizeString(product.category) || "daily-use category";

  return `${productName} is offered by ${storeName} with verified quality checks and competitive pricing. This item belongs to the ${category} category and is curated for reliable performance, easy ordering, and quick delivery through Winkget.`;
};

const toProductModel = (
  product: StoreProduct,
  storeData: StorePageData,
  productIndex: number
): ProductDetailModel => {
  const parsedPrice = parsePriceValue(product.price, 0);
  const fallbackPrice = 999 + productIndex * 250;
  const price = parsedPrice > 0 ? parsedPrice : fallbackPrice;
  const parsedOldPrice = parsePriceValue(product.oldPriceValue, 0);
  const derivedDiscount = deriveDiscount(product, productIndex);
  const derivedOldPrice = derivedDiscount > 0 ? Math.max(price, Math.round(price / (1 - derivedDiscount / 100))) : price;
  const oldPrice = parsedOldPrice > 0 ? Math.max(parsedOldPrice, price) : derivedOldPrice;
  const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  const categoryLabel = normalizeString(product.categoryLabel || product.category) || "Products";
  const categorySlug = normalizeString(product.categorySlug) || toCategorySlug(categoryLabel);
  const gallery = toProductGallery(product, storeData);
  const image = gallery[0] || storeData.logoImage || storeData.bannerImage;
  const sellerName = normalizeString(product.sellerName || storeData.storeName) || "Winkget Seller";
  const rating = Number.isFinite(Number(product.rating)) ? Number(product.rating) : Number(storeData.rating || 0);
  const reviews = Number.isFinite(Number(product.reviews)) ? Number(product.reviews) : Number(storeData.reviews || 0);

  return {
    id: normalizeString(product.id),
    storeId: normalizeString(storeData.id),
    name: normalizeString(product.name) || "Product",
    image,
    gallery,
    price,
    oldPrice,
    discount,
    priceText: formatPriceText(price),
    oldPriceText: formatPriceText(oldPrice),
    description: toProductDescription(product, storeData),
    keyAttributes: toKeyAttributes(product, storeData),
    highlights: toHighlights(product, storeData),
    specifications: toSpecifications(product, storeData),
    categorySlug,
    categoryLabel,
    subcategoryName: normalizeString(product.subcategoryName || product.category) || categoryLabel,
    sellerName,
    vendorSource: normalizeString(product.vendorSource) || "Winkget Marketplace",
    rating,
    reviews,
    shippingLabel: normalizeString(product.shippingLabel) || "Free Shipping",
    deliveryByText: normalizeString(product.deliveryByText) || buildDeliveryText(),
    isCancellable: typeof product.isCancellable === "boolean" ? product.isCancellable : true,
    isReturnable: typeof product.isReturnable === "boolean" ? product.isReturnable : true,
  };
};

const toRelatedProductModel = (
  product: StoreProduct,
  storeData: StorePageData,
  productIndex: number
): RelatedProductModel => {
  const mapped = toProductModel(product, storeData, productIndex);

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
  const mappedProduct = toProductModel(product, storeData, productIndex);

  const relatedProducts = storeData.products
    .filter((candidate) => candidate.id !== product.id)
    .slice(0, 6)
    .map((candidate, index) => toRelatedProductModel(candidate, storeData, index));

  return {
    product: mappedProduct,
    relatedProducts,
  };
};

export const toStoreDataFromProfile = (
  profile: ListingProfile,
  idFallback: string,
  vendorProducts: CatalogVendorProduct[] = []
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
  const mappedProducts = toStoreProductsFromVendorProducts(vendorProducts, profile, storeId);

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

  const products = mappedProducts.length > 0 ? mappedProducts : fallbackProducts;
  const categories = uniqueStrings([
    ...products.map((product) => normalizeString(product.categoryLabel || product.category)),
    categoryLabel,
    "Deals",
    "Top Rated",
    "New",
  ]).slice(0, 12);

  const featuredFromPlacement = products
    .filter((item) => item.storePlacement === "featured")
    .map((item) => item.id);
  const trendingFromPlacement = products
    .filter((item) => item.storePlacement === "trending")
    .map((item) => item.id);

  const featuredProductIds =
    featuredFromPlacement.length > 0
      ? featuredFromPlacement.slice(0, 6)
      : products.slice(0, Math.min(6, products.length)).map((item) => item.id);

  const trendingProductIds =
    trendingFromPlacement.length > 0
      ? trendingFromPlacement.slice(0, 6)
      : products.length > 1
        ? products.slice(1, Math.min(7, products.length)).map((item) => item.id)
        : featuredProductIds;

  return {
    id: storeId,
    storeName: profileName,
    tagline: "Shop by category",
    bannerImage: imageUrl,
    logoImage: normalizeString(profile.logoImage) || imageUrl,
    rating: Number(profile.rating || 0),
    reviews: Number(profile.reviews || 0),
    address: addressLabel,
    categories,
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

    const liveProducts = await fetchVendorStoreProducts(resolvedId, {
      status: "live",
      limit: 300,
    });

    const baseProfile = toListingProfileFromVendor(liveVendor);
    const profile = {
      ...baseProfile,
      logoImage: normalizeString(liveVendor.myStoreImage) || baseProfile.logoImage,
      coverImage: normalizeString(liveVendor.myStoreBannerImage) || baseProfile.coverImage,
    };
    return toStoreDataFromProfile(profile, resolvedId, liveProducts);
  };

  if (shouldPreferLiveVendor) {
    const liveStore = await resolveLiveVendorStore();
    if (liveStore) {
      return liveStore;
    }
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
