const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type ApiEnvelope<T> = {
  ok: boolean;
  message?: string;
} & T;

export type VendorSession = {
  id: string;
  role: string;
  name?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAlternatePhone?: string;
  businessAddress?: string;
  city?: string;
  sublocality?: string;
  state?: string;
  postalCode?: string;
  website?: string;
  businessDescription?: string;
  image?: string;
  shopBannerImage?: string;
  myStoreImage?: string;
  myStoreBannerImage?: string;
  shopGallery?: string[];
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  establishmentYear?: number;
  yearsInBusiness?: number;
  vendorStatus?: "pending" | "approved" | "rejected";
  shopOpeningTime?: string;
  shopClosingTime?: string;
  serviceTags?: string[];
};

export type InquiryStatus = "Open" | "In Progress" | "Closed";

export type VendorInquiry = {
  id: string;
  subject: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  channel: "Web" | "Email" | "Phone";
  status: InquiryStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type VendorCityLocality = {
  id: string;
  name: string;
  slug: string;
};

export type VendorCity = {
  id: string;
  name: string;
  slug: string;
  state?: string;
  localities: VendorCityLocality[];
};

export type VendorInquirySummary = {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
};

export type VendorInquirySnapshot = {
  summary: VendorInquirySummary;
  inquiries: VendorInquiry[];
};

export type VendorProfileUpdateInput = {
  name?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAlternatePhone?: string;
  businessAddress?: string;
  website?: string;
  businessDescription?: string;
  image?: string;
  shopBannerImage?: string;
  myStoreImage?: string;
  myStoreBannerImage?: string;
  shopGallery?: string[];
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  city?: string;
  sublocality?: string;
  state?: string;
  shopOpeningTime?: string;
  shopClosingTime?: string;
  serviceTags?: string[];
};

export type VendorReviewSummary = {
  rating: number;
  reviews: number;
};

export type VendorReview = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type VendorReviewSnapshot = {
  summary: VendorReviewSummary;
  reviews: VendorReview[];
};

export type VendorCatalogSubcategory = {
  id: string;
  name: string;
  slug: string;
};

export type VendorCatalogCategory = {
  id: string;
  name: string;
  slug: string;
  subcategories: VendorCatalogSubcategory[];
};

export type VendorProductAttribute = {
  label: string;
  value: string;
};

export type VendorProductVariant = {
  size: string;
  color: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
  image: string;
};

export type VendorProductRecord = {
  id: string;
  vendorId: string;
  slug: string;
  categorySlug: string;
  categoryLabel: string;
  subcategorySlug: string;
  subcategoryName: string;
  productName: string;
  shortDescription?: string;
  description?: string;
  image: string;
  heroImage?: string;
  subcategoryImage?: string;
  gallery: string[];
  price: number;
  oldPrice: number;
  inventory: number;
  moq: number;
  badge?: string;
  brand?: string;
  sellerName?: string;
  vendorSource?: string;
  rating: number;
  reviews: number;
  deliveryByText?: string;
  shippingLabel?: string;
  shippingTimeline?: string;
  isCancellable: boolean;
  isReturnable: boolean;
  highlights: string[];
  keyAttributes: VendorProductAttribute[];
  specifications: VendorProductAttribute[];
  tags: string[];
  variantData: VendorProductVariant[];
  status: "draft" | "pending" | "live" | "rejected" | "archived";
  storePlacement?: "featured" | "trending";
  sourcePlatform?: string;
  sourceRecordId?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type VendorProductUpsertInput = {
  slug?: string;
  categorySlug: string;
  categoryLabel?: string;
  subcategorySlug: string;
  subcategoryName?: string;
  productName: string;
  shortDescription?: string;
  description?: string;
  image: string;
  heroImage?: string;
  subcategoryImage?: string;
  gallery?: string[];
  price: number;
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
  keyAttributes?: VendorProductAttribute[];
  specifications?: VendorProductAttribute[];
  tags?: string[];
  variantData?: VendorProductVariant[];
  status?: "draft" | "pending" | "live" | "rejected" | "archived";
  storePlacement?: "featured" | "trending";
  sourcePlatform?: string;
  sourceRecordId?: string;
};

function normalizeVendorSession(user: VendorSession | null | undefined): VendorSession | null {
  if (!user || user.role !== "vendor") {
    return null;
  }

  return {
    ...user,
    serviceTags: Array.isArray(user.serviceTags)
      ? user.serviceTags.map((tag) => String(tag || "").trim()).filter(Boolean)
      : [],
    shopGallery: Array.isArray(user.shopGallery)
      ? user.shopGallery.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const method = init?.method || "GET";
  const headers = {
    Accept: "application/json",
    ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
    ...(init?.headers || {}),
  };

  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    cache: "no-store",
    credentials: "include",
    headers,
    body: init?.body,
  });

  const payload = (await response.json().catch(() => ({ ok: false, message: "Invalid server response" }))) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return payload;
}

export async function fetchVendorSession(): Promise<VendorSession | null> {
  try {
    const payload = await requestJson<{ user: VendorSession }>("/api/auth/me");
    return normalizeVendorSession(payload.user);
  } catch {
    return null;
  }
}

export async function loginVendor(identifier: string, password: string): Promise<VendorSession> {
  const payload = await requestJson<{ user: VendorSession }>("/api/auth/vendor/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });

  const normalizedUser = normalizeVendorSession(payload.user);
  if (!normalizedUser) {
    throw new Error("Vendor account required");
  }

  return normalizedUser;
}

export async function logoutVendor(): Promise<void> {
  await requestJson<Record<string, never>>("/api/auth/logout", {
    method: "POST",
  });
}

export async function updateVendorProfile(input: VendorProfileUpdateInput): Promise<VendorSession> {
  const payload = await requestJson<{ user: VendorSession }>("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify(input),
  });

  const normalizedUser = normalizeVendorSession(payload.user);
  if (!normalizedUser) {
    throw new Error("Vendor account required");
  }

  return normalizedUser;
}

export async function fetchVendorInquiries(
  options?: {
    status?: InquiryStatus;
    search?: string;
    limit?: number;
  }
): Promise<VendorInquirySnapshot> {
  const fallback: VendorInquirySnapshot = {
    summary: {
      total: 0,
      open: 0,
      inProgress: 0,
      closed: 0,
    },
    inquiries: [],
  };

  const queryParams = new URLSearchParams();
  const status = String(options?.status || "").trim();
  const search = String(options?.search || "").trim();
  const limit = Number.isFinite(Number(options?.limit)) ? Number(options?.limit) : 120;

  if (status) queryParams.set("status", status);
  if (search) queryParams.set("search", search);
  queryParams.set("limit", String(Math.max(1, Math.min(500, limit))));

  try {
    const payload = await requestJson<{
      summary?: Partial<VendorInquirySummary>;
      inquiries?: Array<Partial<VendorInquiry>>;
    }>(`/api/inquiries/vendor?${queryParams.toString()}`);

    const summaryInput = payload.summary || {};
    const inquiries = Array.isArray(payload.inquiries)
      ? payload.inquiries.map((inquiry, index) => {
          const statusValue = String(inquiry.status || "Open") as InquiryStatus;
          return {
            id: String(inquiry.id || `inquiry-${index}`),
            subject: String(inquiry.subject || "Inquiry").trim() || "Inquiry",
            name: String(inquiry.name || "Customer").trim() || "Customer",
            phone: String(inquiry.phone || "").trim(),
            email: String(inquiry.email || "").trim() || undefined,
            message: String(inquiry.message || "").trim(),
            channel: (inquiry.channel === "Phone" || inquiry.channel === "Email" ? inquiry.channel : "Web") as
              | "Web"
              | "Email"
              | "Phone",
            status:
              statusValue === "In Progress" || statusValue === "Closed" || statusValue === "Open"
                ? statusValue
                : "Open",
            adminNote: String(inquiry.adminNote || "").trim() || undefined,
            createdAt: String(inquiry.createdAt || ""),
            updatedAt: String(inquiry.updatedAt || ""),
          };
        })
      : [];

    return {
      summary: {
        total: Number.isFinite(Number(summaryInput.total)) ? Number(summaryInput.total) : inquiries.length,
        open: Number.isFinite(Number(summaryInput.open))
          ? Number(summaryInput.open)
          : inquiries.filter((inquiry) => inquiry.status === "Open").length,
        inProgress: Number.isFinite(Number(summaryInput.inProgress))
          ? Number(summaryInput.inProgress)
          : inquiries.filter((inquiry) => inquiry.status === "In Progress").length,
        closed: Number.isFinite(Number(summaryInput.closed))
          ? Number(summaryInput.closed)
          : inquiries.filter((inquiry) => inquiry.status === "Closed").length,
      },
      inquiries,
    };
  } catch {
    return fallback;
  }
}

export async function updateVendorInquiryStatus(inquiryId: string, status: InquiryStatus): Promise<VendorInquiry> {
  const normalizedId = String(inquiryId || "").trim();
  if (!normalizedId) {
    throw new Error("Inquiry id is required");
  }

  const payload = await requestJson<{
    inquiry?: Partial<VendorInquiry>;
  }>(`/api/inquiries/vendor/${encodeURIComponent(normalizedId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  const inquiry = payload.inquiry;
  if (!inquiry) {
    throw new Error("Failed to update inquiry");
  }

  const statusValue = String(inquiry.status || "Open") as InquiryStatus;
  return {
    id: String(inquiry.id || normalizedId),
    subject: String(inquiry.subject || "Inquiry").trim() || "Inquiry",
    name: String(inquiry.name || "Customer").trim() || "Customer",
    phone: String(inquiry.phone || "").trim(),
    email: String(inquiry.email || "").trim() || undefined,
    message: String(inquiry.message || "").trim(),
    channel: (inquiry.channel === "Phone" || inquiry.channel === "Email" ? inquiry.channel : "Web") as
      | "Web"
      | "Email"
      | "Phone",
    status:
      statusValue === "In Progress" || statusValue === "Closed" || statusValue === "Open"
        ? statusValue
        : "Open",
    adminNote: String(inquiry.adminNote || "").trim() || undefined,
    createdAt: String(inquiry.createdAt || ""),
    updatedAt: String(inquiry.updatedAt || ""),
  };
}

export async function fetchVendorCities(): Promise<VendorCity[]> {
  try {
    const payload = await requestJson<{
      cities?: Array<
        Partial<VendorCity> & {
          localities?: Array<Partial<VendorCityLocality>>;
        }
      >;
    }>("/api/cities");

    if (!Array.isArray(payload.cities)) {
      return [];
    }

    const normalizedCities: VendorCity[] = [];

    payload.cities.forEach((city, cityIndex) => {
      const cityId = String(city.id || `city-${cityIndex}`);
      const cityName = String(city.name || "").trim();
      const citySlug = String(city.slug || "").trim();

      if (!cityName) {
        return;
      }

      const localities: VendorCityLocality[] = [];
      if (Array.isArray(city.localities)) {
        city.localities.forEach((locality, localityIndex) => {
          const localityName = String(locality.name || "").trim();
          if (!localityName) {
            return;
          }

          localities.push({
            id: String(locality.id || `${cityId}-locality-${localityIndex}`),
            name: localityName,
            slug:
              String(locality.slug || "").trim() ||
              localityName.toLowerCase().replace(/\s+/g, "-"),
          });
        });
      }

      normalizedCities.push({
        id: cityId,
        name: cityName,
        slug: citySlug || cityName.toLowerCase().replace(/\s+/g, "-"),
        state: String(city.state || "").trim() || undefined,
        localities,
      });
    });

    return normalizedCities;
  } catch {
    return [];
  }
}

export async function fetchVendorReviewSnapshot(businessId: string): Promise<VendorReviewSnapshot> {
  const fallback: VendorReviewSnapshot = {
    summary: {
      rating: 0,
      reviews: 0,
    },
    reviews: [],
  };

  const normalizedBusinessId = String(businessId || "").trim();
  if (!normalizedBusinessId) {
    return fallback;
  }

  try {
    const payload = await requestJson<{
      summary?: VendorReviewSummary;
      reviews?: Array<{
        id?: string;
        author?: string;
        rating?: number;
        comment?: string;
        createdAt?: string;
      }>;
    }>(`/api/reviews?businessId=${encodeURIComponent(normalizedBusinessId)}&limit=8`);

    const summary = payload.summary || fallback.summary;
    const reviews = Array.isArray(payload.reviews)
      ? payload.reviews.map((review, index) => ({
          id: String(review.id || `review-${index}`),
          author: String(review.author || "Winkget User").trim() || "Winkget User",
          rating: Number.isFinite(Number(review.rating)) ? Number(review.rating) : 0,
          comment: String(review.comment || "").trim(),
          createdAt: String(review.createdAt || ""),
        }))
      : [];

    return {
      summary: {
        rating: Number.isFinite(Number(summary.rating)) ? Number(summary.rating) : 0,
        reviews: Number.isFinite(Number(summary.reviews)) ? Number(summary.reviews) : 0,
      },
      reviews,
    };
  } catch {
    return fallback;
  }
}

const normalizeVendorProduct = (input: Partial<VendorProductRecord>, index: number): VendorProductRecord => {
  const keyAttributes = Array.isArray(input.keyAttributes)
    ? input.keyAttributes
        .map((item) => ({
          label: String(item?.label || "").trim(),
          value: String(item?.value || "").trim(),
        }))
        .filter((item) => item.label && item.value)
    : [];

  const specifications = Array.isArray(input.specifications)
    ? input.specifications
        .map((item) => ({
          label: String(item?.label || "").trim(),
          value: String(item?.value || "").trim(),
        }))
        .filter((item) => item.label && item.value)
    : [];

  const variantData = Array.isArray(input.variantData)
    ? input.variantData.map((variant) => ({
        size: String(variant?.size || "").trim(),
        color: String(variant?.color || "").trim(),
        mrp: Number.isFinite(Number(variant?.mrp)) ? Number(variant?.mrp) : 0,
        sellingPrice: Number.isFinite(Number(variant?.sellingPrice)) ? Number(variant?.sellingPrice) : 0,
        stock: Number.isFinite(Number(variant?.stock)) ? Number(variant?.stock) : 0,
        image: String(variant?.image || "").trim(),
      }))
    : [];

  const statusInput = String(input.status || "draft").trim().toLowerCase();
  const status =
    statusInput === "pending" ||
    statusInput === "live" ||
    statusInput === "rejected" ||
    statusInput === "archived"
      ? statusInput
      : "draft";

  const storePlacementInput = String(input.storePlacement || "").trim().toLowerCase();
  const storePlacement =
    storePlacementInput === "featured" || storePlacementInput === "trending" ? storePlacementInput : undefined;

  return {
    id: String(input.id || `product-${index}`),
    vendorId: String(input.vendorId || "").trim(),
    slug: String(input.slug || "").trim(),
    categorySlug: String(input.categorySlug || "").trim(),
    categoryLabel: String(input.categoryLabel || "").trim(),
    subcategorySlug: String(input.subcategorySlug || "").trim(),
    subcategoryName: String(input.subcategoryName || "").trim(),
    productName: String(input.productName || "").trim(),
    shortDescription: String(input.shortDescription || "").trim() || undefined,
    description: String(input.description || "").trim() || undefined,
    image: String(input.image || "").trim(),
    heroImage: String(input.heroImage || "").trim() || undefined,
    subcategoryImage: String(input.subcategoryImage || "").trim() || undefined,
    gallery: Array.isArray(input.gallery)
      ? input.gallery.map((value) => String(value || "").trim()).filter(Boolean)
      : [],
    price: Number.isFinite(Number(input.price)) ? Number(input.price) : 0,
    oldPrice: Number.isFinite(Number(input.oldPrice)) ? Number(input.oldPrice) : 0,
    inventory: Number.isFinite(Number(input.inventory)) ? Number(input.inventory) : 0,
    moq: Number.isFinite(Number(input.moq)) ? Number(input.moq) : 0,
    badge: String(input.badge || "").trim() || undefined,
    brand: String(input.brand || "").trim() || undefined,
    sellerName: String(input.sellerName || "").trim() || undefined,
    vendorSource: String(input.vendorSource || "").trim() || undefined,
    rating: Number.isFinite(Number(input.rating)) ? Number(input.rating) : 0,
    reviews: Number.isFinite(Number(input.reviews)) ? Number(input.reviews) : 0,
    deliveryByText: String(input.deliveryByText || "").trim() || undefined,
    shippingLabel: String(input.shippingLabel || "").trim() || undefined,
    shippingTimeline: String(input.shippingTimeline || "").trim() || undefined,
    isCancellable: Boolean(input.isCancellable),
    isReturnable: Boolean(input.isReturnable),
    highlights: Array.isArray(input.highlights)
      ? input.highlights.map((value) => String(value || "").trim()).filter(Boolean)
      : [],
    keyAttributes,
    specifications,
    tags: Array.isArray(input.tags) ? input.tags.map((value) => String(value || "").trim()).filter(Boolean) : [],
    variantData,
    status,
    storePlacement,
    sourcePlatform: String(input.sourcePlatform || "").trim() || undefined,
    sourceRecordId: String(input.sourceRecordId || "").trim() || undefined,
    publishedAt: String(input.publishedAt || "").trim() || undefined,
    createdAt: String(input.createdAt || "").trim(),
    updatedAt: String(input.updatedAt || "").trim(),
  };
};

export async function fetchVendorCategories(): Promise<VendorCatalogCategory[]> {
  try {
    const [categoryPayload, subcategoryPayload] = await Promise.all([
      requestJson<{
        categories?: Array<{ id?: string; name?: string; slug?: string }>;
      }>("/api/categories"),
      requestJson<{
        subcategories?: Array<{
          id?: string;
          name?: string;
          slug?: string;
          category?: { id?: string; name?: string; slug?: string };
        }>;
      }>("/api/subcategories"),
    ]);

    const categories = Array.isArray(categoryPayload.categories) ? categoryPayload.categories : [];
    const subcategories = Array.isArray(subcategoryPayload.subcategories) ? subcategoryPayload.subcategories : [];

    const map = new Map<string, VendorCatalogCategory>();

    categories.forEach((item, index) => {
      const id = String(item.id || `category-${index}`).trim();
      const name = String(item.name || "").trim();
      const slug = String(item.slug || "").trim();
      if (!id || !name || !slug) return;

      map.set(id, {
        id,
        name,
        slug,
        subcategories: [],
      });
    });

    subcategories.forEach((item, index) => {
      const id = String(item.id || `subcategory-${index}`).trim();
      const name = String(item.name || "").trim();
      const slug = String(item.slug || "").trim();
      const categoryId = String(item.category?.id || "").trim();
      if (!id || !name || !slug || !categoryId) return;

      const category = map.get(categoryId);
      if (!category) return;

      if (category.subcategories.some((subcategory) => subcategory.id === id)) {
        return;
      }

      category.subcategories.push({ id, name, slug });
    });

    return Array.from(map.values()).map((category) => ({
      ...category,
      subcategories: [...category.subcategories].sort((left, right) => left.name.localeCompare(right.name)),
    }));
  } catch {
    return [];
  }
}

export async function fetchVendorProducts(options?: {
  status?: VendorProductRecord["status"] | "all";
  categorySlug?: string;
  subcategorySlug?: string;
  search?: string;
  limit?: number;
}): Promise<VendorProductRecord[]> {
  try {
    const query = new URLSearchParams();

    const status = String(options?.status || "").trim().toLowerCase();
    if (status && status !== "all") {
      query.set("status", status);
    }

    const categorySlug = String(options?.categorySlug || "").trim();
    if (categorySlug) query.set("categorySlug", categorySlug);

    const subcategorySlug = String(options?.subcategorySlug || "").trim();
    if (subcategorySlug) query.set("subcategorySlug", subcategorySlug);

    const search = String(options?.search || "").trim();
    if (search) query.set("search", search);

    const limit = Number(options?.limit || 120);
    if (Number.isFinite(limit) && limit > 0) {
      query.set("limit", String(Math.max(1, Math.min(300, Math.floor(limit)))));
    }

    const queryString = query.toString();
    const payload = await requestJson<{
      products?: Array<Partial<VendorProductRecord>>;
    }>(`/api/vendor/products${queryString ? `?${queryString}` : ""}`);

    if (!Array.isArray(payload.products)) {
      return [];
    }

    return payload.products.map((item, index) => normalizeVendorProduct(item, index));
  } catch {
    return [];
  }
}

export async function createVendorProduct(input: VendorProductUpsertInput): Promise<VendorProductRecord> {
  const payload = await requestJson<{
    product?: Partial<VendorProductRecord>;
  }>("/api/vendor/products", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!payload.product) {
    throw new Error("Failed to create vendor product");
  }

  return normalizeVendorProduct(payload.product, 0);
}

export async function updateVendorProduct(
  productId: string,
  input: Partial<VendorProductUpsertInput>
): Promise<VendorProductRecord> {
  const normalizedId = String(productId || "").trim();
  if (!normalizedId) {
    throw new Error("Product id is required");
  }

  const payload = await requestJson<{
    product?: Partial<VendorProductRecord>;
  }>(`/api/vendor/products/${encodeURIComponent(normalizedId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  if (!payload.product) {
    throw new Error("Failed to update vendor product");
  }

  return normalizeVendorProduct(payload.product, 0);
}

export async function deleteVendorProduct(productId: string): Promise<void> {
  const normalizedId = String(productId || "").trim();
  if (!normalizedId) {
    throw new Error("Product id is required");
  }

  await requestJson<Record<string, never>>(`/api/vendor/products/${encodeURIComponent(normalizedId)}`, {
    method: "DELETE",
  });
}
