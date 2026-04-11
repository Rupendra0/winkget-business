import type { CategoryFilterOption, CategoryListing, CategoryPageData } from "@/data/categoryData";
import type { ListingProfile } from "@/data/listingData";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const DEFAULT_BANNER_IMAGE =
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=60";
const DEFAULT_VENDOR_IMAGE =
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=60";
const DEFAULT_MAP_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60";
const MEDIA_URL_REGEX = /^https?:\/\/[^\s]+$/i;
const IMAGE_DATA_URL_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/;
const DEFAULT_TILE_IMAGES = [
  "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=400&q=60",
  "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=400&q=60",
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=60",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=60",
  "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=400&q=60",
];

type CatalogResponse = {
  ok: boolean;
  message?: string;
};

export type CatalogReference = {
  id: string;
  name: string;
  slug?: string;
};

export type CatalogLocality = {
  id: string;
  name: string;
  slug: string;
  sortOrder?: number;
};

export type CatalogCity = {
  id: string;
  name: string;
  slug: string;
  state?: string;
  sortOrder?: number;
  localities: CatalogLocality[];
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  parentName?: string;
  depth?: number;
  sortOrder?: number;
};

export type CatalogSubcategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  category?: CatalogReference;
  parentSubcategory?: CatalogReference;
  depth?: number;
  lineage?: CatalogReference[];
};

export type CatalogVendorSummary = {
  id: string;
  name?: string;
  businessName?: string;
  businessPhone?: string;
  businessAlternatePhone?: string;
  businessEmail?: string;
  rating?: number;
  reviews?: number;
  verified?: boolean;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  sublocality?: string;
  subcategory?: string;
  imageUrl?: string;
  shopBannerImage?: string;
  myStoreImage?: string;
  myStoreBannerImage?: string;
  shopGallery?: string[];
  ctaLabel?: string;
  badges?: string[];
  priceRange?: string;
  tags?: string[];
  website?: string;
  businessDescription?: string;
  establishmentYear?: number;
  yearsInBusiness?: number;
  shopOpeningTime?: string;
  shopClosingTime?: string;
  storeStatusMode?: "auto" | "manual";
  manualStoreStatus?: "open" | "closed" | null;
  manualStoreStatusUpdatedAt?: string | null;
  isStoreOpen?: boolean | null;
  storeStatusSource?: "manual" | "schedule" | "unknown" | "vendor-status";
  serviceTags?: string[];
  businessCategory?: CatalogReference;
  businessSubcategory?: CatalogReference;
};

export type CatalogVendorDetail = CatalogVendorSummary & {
  businessAddress?: string;
};

export type CatalogVendorProductAttribute = {
  label: string;
  value: string;
};

export type CatalogVendorProductVariant = {
  size?: string;
  color?: string;
  mrp?: number;
  sellingPrice?: number;
  stock?: number;
  image?: string;
};

export type CatalogVendorProduct = {
  id: string;
  vendorId: string;
  slug: string;
  categorySlug: string;
  categoryLabel?: string;
  subcategorySlug: string;
  subcategoryName?: string;
  productName: string;
  shortDescription?: string;
  description?: string;
  image?: string;
  heroImage?: string;
  subcategoryImage?: string;
  gallery?: string[];
  price?: number;
  oldPrice?: number;
  inventory?: number;
  moq?: number;
  badge?: string;
  brand?: string;
  sellerName?: string;
  vendorSource?: string;
  rating?: number;
  reviews?: number;
  deliveryByText?: string;
  shippingLabel?: string;
  shippingTimeline?: string;
  isCancellable?: boolean;
  isReturnable?: boolean;
  highlights?: string[];
  keyAttributes?: CatalogVendorProductAttribute[];
  specifications?: CatalogVendorProductAttribute[];
  tags?: string[];
  variantData?: CatalogVendorProductVariant[];
  status?: "draft" | "pending" | "live" | "rejected" | "archived";
  storePlacement?: "featured" | "trending";
  sourcePlatform?: string;
  sourceRecordId?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CategoryListResponse = CatalogResponse & {
  categories?: CatalogCategory[];
};

type CityListResponse = CatalogResponse & {
  cities?: CatalogCity[];
};

type SubcategoryListResponse = CatalogResponse & {
  subcategories?: CatalogSubcategory[];
};

type VendorListResponse = CatalogResponse & {
  vendors?: CatalogVendorSummary[];
};

type VendorDetailResponse = CatalogResponse & {
  vendor?: CatalogVendorDetail;
};

type VendorProductsResponse = CatalogResponse & {
  products?: CatalogVendorProduct[];
};

type InquiryCreateResponse = CatalogResponse & {
  inquiry?: {
    id: string;
  };
};

const toTitleCase = (value: string) =>
  value
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toQueryString = (params: Record<string, string | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const normalized = String(value || "").trim();
    if (!normalized) return;
    searchParams.set(key, normalized);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(normalized);
  });

  return result;
};

export async function fetchCategories(): Promise<CatalogCategory[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/categories`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as CategoryListResponse;
    if (!payload.ok || !Array.isArray(payload.categories)) {
      return [];
    }

    return payload.categories;
  } catch {
    return [];
  }
}

export async function fetchCities(): Promise<CatalogCity[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/cities`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as CityListResponse;
    if (!payload.ok || !Array.isArray(payload.cities)) {
      return [];
    }

    return payload.cities;
  } catch {
    return [];
  }
}

export async function fetchSubcategories(filters: {
  categoryId?: string;
  categorySlug?: string;
}): Promise<CatalogSubcategory[]> {
  try {
    const query = toQueryString({
      categoryId: filters.categoryId,
      categorySlug: filters.categorySlug,
    });

    const response = await fetch(`${BACKEND_URL}/api/subcategories${query}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as SubcategoryListResponse;
    if (!payload.ok || !Array.isArray(payload.subcategories)) {
      return [];
    }

    return payload.subcategories;
  } catch {
    return [];
  }
}

export async function fetchVendors(filters: {
  categoryId?: string;
  categorySlug?: string;
  subcategoryId?: string;
  city?: string;
  sublocality?: string;
  search?: string;
}): Promise<CatalogVendorSummary[]> {
  try {
    const query = toQueryString({
      categoryId: filters.categoryId,
      categorySlug: filters.categorySlug,
      subcategoryId: filters.subcategoryId,
      city: filters.city,
      sublocality: filters.sublocality,
      search: filters.search,
    });

    const response = await fetch(`${BACKEND_URL}/api/vendors${query}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as VendorListResponse;
    if (!payload.ok || !Array.isArray(payload.vendors)) {
      return [];
    }

    return payload.vendors;
  } catch {
    return [];
  }
}

export async function fetchVendorById(id: string): Promise<CatalogVendorDetail | null> {
  const vendorId = String(id || "").trim();
  if (!vendorId) {
    return null;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/vendors/${vendorId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as VendorDetailResponse;
    if (!payload.ok || !payload.vendor) {
      return null;
    }

    return payload.vendor;
  } catch {
    return null;
  }
}

export async function fetchVendorStoreProducts(
  vendorId: string,
  filters?: {
    status?: "draft" | "pending" | "live" | "rejected" | "archived";
    search?: string;
    limit?: number;
  }
): Promise<CatalogVendorProduct[]> {
  const normalizedVendorId = String(vendorId || "").trim();
  if (!normalizedVendorId) {
    return [];
  }

  try {
    const query = toQueryString({
      status: filters?.status,
      search: filters?.search,
      limit: Number.isFinite(Number(filters?.limit)) ? String(filters?.limit) : undefined,
    });

    const response = await fetch(`${BACKEND_URL}/api/vendors/${normalizedVendorId}/products${query}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as VendorProductsResponse;
    if (!payload.ok || !Array.isArray(payload.products)) {
      return [];
    }

    return payload.products;
  } catch {
    return [];
  }
}

const toListingFromVendor = (vendor: CatalogVendorSummary): CategoryListing => {
  const displayName = vendor.businessName || vendor.name || "Business Profile";
  const subcategoryLabel = vendor.subcategory || vendor.businessSubcategory?.name || vendor.businessCategory?.name || "";
  const subcategoryId = vendor.businessSubcategory?.id || (subcategoryLabel ? `name:${subcategoryLabel}` : undefined);

  return {
    id: vendor.id,
    name: displayName,
    businessName: vendor.businessName,
    rating: Number(vendor.rating || 0),
    reviews: Number(vendor.reviews || 0),
    verified: Boolean(vendor.verified),
    vendorStatus: vendor.verified ? "approved" : undefined,
    address: vendor.address || "Address unavailable",
    city: vendor.city || "",
    sublocality: vendor.sublocality || vendor.city || "",
    subcategory: subcategoryLabel,
    subcategoryId,
    businessDescription: vendor.businessDescription,
    businessPhone: vendor.businessPhone,
    shopOpeningTime: vendor.shopOpeningTime,
    shopClosingTime: vendor.shopClosingTime,
    storeStatusMode: vendor.storeStatusMode,
    manualStoreStatus:
      vendor.manualStoreStatus === "open" || vendor.manualStoreStatus === "closed"
        ? vendor.manualStoreStatus
        : undefined,
    isStoreOpen: typeof vendor.isStoreOpen === "boolean" ? vendor.isStoreOpen : vendor.isStoreOpen === null ? null : undefined,
    storeStatusSource: vendor.storeStatusSource,
    establishmentYear: vendor.establishmentYear,
    imageUrl: vendor.imageUrl || DEFAULT_VENDOR_IMAGE,
    ctaLabel: vendor.ctaLabel || "Inquiry",
    badges: Array.isArray(vendor.badges) ? vendor.badges : vendor.verified ? ["Verified"] : [],
    priceRange: vendor.priceRange,
    tags: Array.isArray(vendor.tags) ? vendor.tags : Array.isArray(vendor.serviceTags) ? vendor.serviceTags : [],
  };
};

const toSubcategoryOptions = (
  subcategories: CatalogSubcategory[],
  categoryName?: string
): CategoryFilterOption[] => {
  const options: CategoryFilterOption[] = [];
  const seen = new Set<string>();
  const normalizedCategoryName = String(categoryName || "").trim().toLowerCase();

  const sortedSubcategories = [...subcategories].sort((left, right) => {
    const leftOrder = Number.isFinite(Number(left.sortOrder)) ? Number(left.sortOrder) : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(Number(right.sortOrder)) ? Number(right.sortOrder) : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.name.localeCompare(right.name);
  });

  sortedSubcategories.forEach((subcategory) => {
    if (subcategory.parentSubcategory?.id) {
      return;
    }

    const id = String(subcategory.id || "").trim();
    const label = String(subcategory.name || "").trim();
    if (label.toLowerCase() === normalizedCategoryName) {
      return;
    }
    if (!id || !label || seen.has(id)) {
      return;
    }
    seen.add(id);
    options.push({ id, label });
  });

  return options;
};

export function buildFallbackCategoryPageData(slug: string): CategoryPageData {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const prettyTitle = toTitleCase(normalizedSlug || "category");

  return {
    slug: normalizedSlug,
    title: prettyTitle,
    city: "Your City",
    banner: {
      title: `${prettyTitle} near you`,
      subtitle: "We are onboarding trusted vendors in your area.",
      imageUrl: DEFAULT_BANNER_IMAGE,
      cta: "Get notified",
    },
    subcategories: [],
    sublocalities: [],
    listings: [],
    exploreTitle: "Explore",
    exploreInsertAfter: 6,
    exploreTiles: [
      {
        label: "Popular",
        imageUrl: DEFAULT_TILE_IMAGES[0],
      },
      {
        label: "Top Rated",
        imageUrl: DEFAULT_TILE_IMAGES[1],
      },
      {
        label: "Nearby",
        imageUrl: DEFAULT_TILE_IMAGES[2],
      },
      {
        label: "Deals",
        imageUrl: DEFAULT_TILE_IMAGES[3],
      },
      {
        label: "More",
        imageUrl: DEFAULT_TILE_IMAGES[4],
      },
    ],
  };
}

export function toCategoryPageDataFromCatalog(input: {
  category: CatalogCategory;
  vendors: CatalogVendorSummary[];
  subcategories: CatalogSubcategory[];
}): CategoryPageData {
  const listings = input.vendors.map(toListingFromVendor);
  const cityValues = uniqueStrings(listings.map((listing) => listing.city));
  const localityValues = uniqueStrings(listings.map((listing) => listing.sublocality));
  const subcategoryOptions = toSubcategoryOptions(input.subcategories, input.category.name);

  const exploreLabels = uniqueStrings(subcategoryOptions.map((option) => option.label)).slice(0, 5);

  const exploreTiles = (exploreLabels.length > 0 ? exploreLabels : ["Popular", "Top Rated", "Nearby", "Deals", "More"]).map(
    (label, index) => ({
      label,
      imageUrl: DEFAULT_TILE_IMAGES[index % DEFAULT_TILE_IMAGES.length],
    })
  );

  const categoryBannerImageRaw = String(input.category.image || "").trim();
  const categoryBannerImage =
    MEDIA_URL_REGEX.test(categoryBannerImageRaw) || IMAGE_DATA_URL_REGEX.test(categoryBannerImageRaw)
      ? categoryBannerImageRaw
      : "";
  const vendorBannerImage =
    uniqueStrings(input.vendors.map((vendor) => String(vendor.shopBannerImage || "").trim())).find(
      (value) => MEDIA_URL_REGEX.test(value) || IMAGE_DATA_URL_REGEX.test(value)
    ) || "";
  const bannerImage = categoryBannerImage || vendorBannerImage || DEFAULT_BANNER_IMAGE;
  const cityLabel = cityValues[0] || "Your City";

  return {
    categoryId: input.category.id,
    slug: input.category.slug,
    title: input.category.name,
    city: cityLabel,
    banner: {
      title: `${input.category.name} in ${cityLabel}`,
      subtitle:
        listings.length > 0
          ? `Discover ${listings.length} verified businesses and compare services in one place.`
          : "We are onboarding trusted vendors in your area.",
      imageUrl: bannerImage,
      cta: listings.length > 0 ? "Connect now" : "Get notified",
    },
    subcategories: subcategoryOptions,
    sublocalities: localityValues,
    listings,
    exploreTitle: "Explore",
    exploreInsertAfter: 6,
    exploreTiles,
  };
}

export function toListingProfileFromVendor(vendor: CatalogVendorDetail): ListingProfile {
  const displayName = vendor.businessName || vendor.name || vendor.id;
  const categoryLabel = vendor.businessSubcategory?.name || vendor.businessCategory?.name || vendor.subcategory || "";
  const phone = vendor.businessPhone || "";
  const email = vendor.businessEmail || "";
  const tags = uniqueStrings([...(vendor.tags || []), ...(vendor.serviceTags || [])]);
  const highlights = uniqueStrings([
    vendor.shopOpeningTime && vendor.shopClosingTime
      ? `Open daily ${vendor.shopOpeningTime} - ${vendor.shopClosingTime}`
      : "",
    vendor.establishmentYear ? `Established in ${vendor.establishmentYear}` : "",
    vendor.city && vendor.state ? `Serving ${vendor.city}, ${vendor.state}` : "",
  ]).filter(Boolean);

  const hours =
    vendor.shopOpeningTime && vendor.shopClosingTime
      ? [{ day: "Mon - Sun", time: `${vendor.shopOpeningTime} - ${vendor.shopClosingTime}` }]
      : [];

  const logoImage = String(vendor.imageUrl || "").trim();
  const coverImage = String(vendor.shopBannerImage || "").trim();
  const filteredGallery = uniqueStrings(
    (Array.isArray(vendor.shopGallery) ? vendor.shopGallery : []).filter(
      (url) => {
        const normalized = String(url || "").trim();
        if (!normalized || normalized === logoImage || normalized === coverImage) {
          return false;
        }

        return MEDIA_URL_REGEX.test(normalized) || IMAGE_DATA_URL_REGEX.test(normalized);
      }
    )
  );

  return {
    id: vendor.id,
    storeId: vendor.id,
    name: displayName,
    category: categoryLabel,
    coverImage,
    logoImage,
    rating: Number(vendor.rating || 0),
    reviews: Number(vendor.reviews || 0),
    priceRange: vendor.priceRange || "",
    badges: Array.isArray(vendor.badges) && vendor.badges.length > 0 ? vendor.badges : vendor.verified ? ["Verified"] : [],
    tags,
    address: vendor.businessAddress || vendor.address || "",
    city: vendor.city || "",
    sublocality: vendor.sublocality || "",
    phone,
    email,
    whatsapp: phone,
    ctaLabel: vendor.ctaLabel || "",
    description: vendor.businessDescription || "",
    highlights,
    services: Array.isArray(vendor.serviceTags) ? uniqueStrings(vendor.serviceTags.map((item) => String(item || ""))) : [],
    amenities: [],
    hours,
    gallery: filteredGallery,
    reviewsList: [],
    mapImage: DEFAULT_MAP_IMAGE,
    suggestionTitle: "Suggestions",
    suggestions: [],
    website: vendor.website,
    businessAlternatePhone: vendor.businessAlternatePhone,
    state: vendor.state,
    postalCode: vendor.postalCode,
    establishmentYear: vendor.establishmentYear,
    yearsInBusiness: vendor.yearsInBusiness,
    shopOpeningTime: vendor.shopOpeningTime,
    shopClosingTime: vendor.shopClosingTime,
    storeStatusMode: vendor.storeStatusMode,
    manualStoreStatus:
      vendor.manualStoreStatus === "open" || vendor.manualStoreStatus === "closed"
        ? vendor.manualStoreStatus
        : undefined,
    isStoreOpen: typeof vendor.isStoreOpen === "boolean" ? vendor.isStoreOpen : vendor.isStoreOpen === null ? null : undefined,
    storeStatusSource: vendor.storeStatusSource,
  };
}

export async function submitVendorInquiry(input: {
  vendorId: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  subject?: string;
  channel?: "Web" | "Email" | "Phone";
}): Promise<{ id: string }> {
  const response = await fetch(`${BACKEND_URL}/api/inquiries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as InquiryCreateResponse;

  if (!response.ok || !payload.ok || !payload.inquiry?.id) {
    throw new Error(payload.message || "Failed to send enquiry");
  }

  return { id: payload.inquiry.id };
}

export async function submitVendorCallRequest(input: {
  vendorId: string;
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message?: string;
}): Promise<{ id: string }> {
  const response = await fetch(`${BACKEND_URL}/api/inquiries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    keepalive: true,
    body: JSON.stringify({
      vendorId: input.vendorId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      subject: input.subject || "Call request",
      message: input.message || "Customer requested a callback from listing call action.",
      channel: "Phone",
    }),
  });

  const payload = (await response.json()) as InquiryCreateResponse;

  if (!response.ok || !payload.ok || !payload.inquiry?.id) {
    throw new Error(payload.message || "Failed to create call request");
  }

  return { id: payload.inquiry.id };
}
