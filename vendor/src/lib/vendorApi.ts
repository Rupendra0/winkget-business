const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

type ApiEnvelope<T> = {
  ok: boolean;
  message?: string;
} & T;

export type VendorBusinessReference = {
  id: string;
  name?: string;
  customFormEnabled?: boolean;
  customFormTitle?: string;
  customFormFields?: Array<{
    key?: string;
    label?: string;
    type?: string;
    required?: boolean;
  }>;
};

export type VendorSession = {
  id: string;
  role: string;
  businessType?: string;
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
  gstNumber?: string;
  gstDocument?: string;
  website?: string;
  businessDescription?: string;
  image?: string;
  shopBannerImage?: string;
  cardImage?: string;
  myStoreImage?: string;
  myStoreBannerImage?: string;
  paymentQrCode?: string;
  shopGallery?: string[];
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  establishmentYear?: number;
  yearsInBusiness?: number;
  vendorStatus?: "pending" | "approved" | "rejected";
  businessCategory?: VendorBusinessReference;
  businessSubcategory?: VendorBusinessReference;
  shopOpeningTime?: string;
  shopClosingTime?: string;
  storeStatusMode?: "auto" | "manual";
  manualStoreStatus?: "open" | "closed";
  manualStoreStatusUpdatedAt?: string | null;
  isStoreOpen?: boolean | null;
  storeStatusSource?: "manual" | "schedule" | "unknown" | "vendor-status";
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

export type VendorOrderStatus = "Pending" | "Confirmed" | "Shipped" | "Out For Delivery" | "Delivery Attempted" | "Completed" | "Disputed";

export type VendorOrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  oldPrice?: number;
  image?: string;
};

export type VendorOrderAddress = {
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
};

export type VendorOrderTotals = {
  mrp: number;
  subtotal: number;
  savings: number;
  shippingFee: number;
  platformFee: number;
  total: number;
};

export type VendorOrderRecord = {
  id: string;
  orderNo: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number;
  status: VendorOrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  itemCount: number;
  address?: VendorOrderAddress;
  totals?: VendorOrderTotals;
  items: VendorOrderItem[];
};

export type VendorOrderSummary = {
  total: number;
  pending: number;
  completed: number;
  disputed: number;
  revenue: number;
};

export type VendorOrderSnapshot = {
  summary: VendorOrderSummary;
  orders: VendorOrderRecord[];
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
  cardImage?: string;
  myStoreImage?: string;
  myStoreBannerImage?: string;
  paymentQrCode?: string;
  shopGallery?: string[];
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  city?: string;
  sublocality?: string;
  state?: string;
  businessCategoryId?: string;
  businessSubcategoryId?: string;
  gstNumber?: string;
  gstDocument?: string;
  shopOpeningTime?: string;
  shopClosingTime?: string;
  establishmentYear?: number;
  storeStatusMode?: "auto" | "manual";
  manualStoreStatus?: "open" | "closed";
  serviceTags?: string[];
};

export type VendorStoreStatusUpdateInput = {
  storeStatusMode: "auto" | "manual";
  manualStoreStatus?: "open" | "closed";
};

export type VendorStoreStatus = {
  storeStatusMode: "auto" | "manual";
  manualStoreStatus?: "open" | "closed";
  manualStoreStatusUpdatedAt?: string | null;
  isStoreOpen?: boolean | null;
  storeStatusSource?: "manual" | "schedule" | "unknown" | "vendor-status";
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
  parentSubcategoryId?: string;
  childSubcategories?: VendorCatalogSubcategory[];
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

export type VendorProductDescriptionBlock = {
  image?: string;
  headline?: string;
  text?: string;
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
  detailedDescriptionBlocks?: VendorProductDescriptionBlock[];
  status: "draft" | "pending" | "live" | "rejected" | "archived";
  storePlacement?: "featured" | "trending";
  sourcePlatform?: string;
  sourceRecordId?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  descriptionPoints?: Array<{ heading: string; content: string }>;
  showDeliveryBadge?: boolean;
  showTopBrand?: boolean;
  showFreeDelivery?: boolean;
  showSecureTransaction?: boolean;
  showCashOnDelivery?: boolean;
  show7DaySupport?: boolean;
  showAssured?: boolean;
  originCountry?: string;
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
  detailedDescriptionBlocks?: VendorProductDescriptionBlock[];
  status?: "draft" | "pending" | "live" | "rejected" | "archived";
  storePlacement?: "featured" | "trending";
  sourcePlatform?: string;
  sourceRecordId?: string;
  descriptionPoints?: Array<{ heading: string; content: string }>;
  showDeliveryBadge?: boolean;
  showTopBrand?: boolean;
  showFreeDelivery?: boolean;
  showSecureTransaction?: boolean;
  showCashOnDelivery?: boolean;
  show7DaySupport?: boolean;
  showAssured?: boolean;
  originCountry?: string;
};

function normalizeVendorSession(user: VendorSession | null | undefined): VendorSession | null {
  if (!user || user.role !== "vendor") {
    return null;
  }

  const normalizedStoreStatusMode = user.storeStatusMode === "manual" ? "manual" : "auto";
  const normalizedManualStoreStatus =
    user.manualStoreStatus === "open" || user.manualStoreStatus === "closed"
      ? user.manualStoreStatus
      : undefined;
  const normalizedStoreStatusSource =
    user.storeStatusSource === "manual" ||
    user.storeStatusSource === "schedule" ||
    user.storeStatusSource === "unknown" ||
    user.storeStatusSource === "vendor-status"
      ? user.storeStatusSource
      : undefined;

  return {
    ...user,
    storeStatusMode: normalizedStoreStatusMode,
    manualStoreStatus: normalizedManualStoreStatus,
    storeStatusSource: normalizedStoreStatusSource,
    isStoreOpen:
      typeof user.isStoreOpen === "boolean"
        ? user.isStoreOpen
        : user.isStoreOpen === null
          ? null
          : undefined,
    manualStoreStatusUpdatedAt:
      user.manualStoreStatusUpdatedAt !== undefined && user.manualStoreStatusUpdatedAt !== null
        ? String(user.manualStoreStatusUpdatedAt)
        : undefined,
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
    "X-Auth-Context": "vendor",
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
    const payload = await requestJson<{ user: VendorSession }>("/api/auth/me?context=vendor");
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
    body: JSON.stringify({ authContext: "vendor" }),
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

export async function updateVendorStoreStatus(input: VendorStoreStatusUpdateInput): Promise<VendorStoreStatus> {
  const payload = await requestJson<{
    storeStatus?: Partial<VendorStoreStatus>;
  }>("/api/vendor/store-status", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  const status = payload.storeStatus || {};
  const storeStatusMode = status.storeStatusMode === "manual" ? "manual" : "auto";
  const manualStoreStatus =
    status.manualStoreStatus === "open" || status.manualStoreStatus === "closed"
      ? status.manualStoreStatus
      : undefined;
  const storeStatusSource =
    status.storeStatusSource === "manual" ||
    status.storeStatusSource === "schedule" ||
    status.storeStatusSource === "unknown" ||
    status.storeStatusSource === "vendor-status"
      ? status.storeStatusSource
      : undefined;

  return {
    storeStatusMode,
    manualStoreStatus,
    manualStoreStatusUpdatedAt:
      status.manualStoreStatusUpdatedAt !== undefined && status.manualStoreStatusUpdatedAt !== null
        ? String(status.manualStoreStatusUpdatedAt)
        : undefined,
    isStoreOpen:
      typeof status.isStoreOpen === "boolean"
        ? status.isStoreOpen
        : status.isStoreOpen === null
          ? null
          : undefined,
    storeStatusSource,
  };
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

export async function fetchVendorOrders(options?: {
  status?: VendorOrderStatus;
  search?: string;
  limit?: number;
}): Promise<VendorOrderSnapshot> {
  const fallback: VendorOrderSnapshot = {
    summary: {
      total: 0,
      pending: 0,
      completed: 0,
      disputed: 0,
      revenue: 0,
    },
    orders: [],
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
      summary?: Partial<VendorOrderSummary>;
      orders?: Array<
        Partial<VendorOrderRecord> & {
          items?: Array<Partial<VendorOrderItem>>;
        }
      >;
    }>(`/api/orders/vendor?${queryParams.toString()}`);

    const orders = Array.isArray(payload.orders)
      ? payload.orders.map((order, index) => {
          const statusValue = String(order.status || "Pending");
          const normalizedStatus: VendorOrderStatus =
            statusValue === "Confirmed" ||
            statusValue === "Shipped" ||
            statusValue === "Out For Delivery" ||
            statusValue === "Delivery Attempted" ||
            statusValue === "Completed" ||
            statusValue === "Disputed"
              ? (statusValue as VendorOrderStatus)
              : "Pending";

          const normalizedItems = Array.isArray(order.items)
            ? order.items.map((item, itemIndex) => ({
                id: String(item.id || `order-item-${index}-${itemIndex}`),
                name: String(item.name || "Product").trim() || "Product",
                quantity: Number.isFinite(Number(item.quantity)) ? Math.max(1, Number(item.quantity)) : 1,
                price: Number.isFinite(Number(item.price)) ? Math.max(0, Number(item.price)) : 0,
                oldPrice: Number.isFinite(Number(item.oldPrice)) ? Math.max(0, Number(item.oldPrice)) : 0,
                image: String(item.image || "").trim() || undefined,
              }))
            : [];

          const itemCountFromItems = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);

          return {
            id: String(order.id || `order-${index}`),
            orderNo: String(order.orderNo || `#ORD-${index + 1}`).trim(),
            customer: String(order.customer || "Customer").trim() || "Customer",
            customerEmail: String(order.customerEmail || "").trim() || undefined,
            customerPhone: String(order.customerPhone || "").trim() || undefined,
            amount: Number.isFinite(Number(order.amount)) ? Math.max(0, Number(order.amount)) : 0,
            status: normalizedStatus,
            paymentMethod: String(order.paymentMethod || "cod").trim().toLowerCase() || "cod",
            paymentStatus: String(order.paymentStatus || "pending").trim().toLowerCase() || "pending",
            createdAt: String(order.createdAt || ""),
            itemCount: Number.isFinite(Number(order.itemCount))
              ? Math.max(0, Number(order.itemCount))
              : itemCountFromItems,
            address:
              order.address && typeof order.address === "object"
                ? {
                    fullName: String(order.address.fullName || "Customer").trim() || "Customer",
                    phone: String(order.address.phone || "").trim() || undefined,
                    line1: String(order.address.line1 || "").trim(),
                    line2: String(order.address.line2 || "").trim() || undefined,
                    landmark: String(order.address.landmark || "").trim() || undefined,
                    city: String(order.address.city || "").trim(),
                    state: String(order.address.state || "").trim(),
                    postalCode: String(order.address.postalCode || "").trim(),
                  }
                : undefined,
            totals:
              order.totals && typeof order.totals === "object"
                ? {
                    mrp: Number.isFinite(Number(order.totals.mrp)) ? Math.max(0, Number(order.totals.mrp)) : 0,
                    subtotal: Number.isFinite(Number(order.totals.subtotal)) ? Math.max(0, Number(order.totals.subtotal)) : 0,
                    savings: Number.isFinite(Number(order.totals.savings)) ? Math.max(0, Number(order.totals.savings)) : 0,
                    shippingFee: Number.isFinite(Number(order.totals.shippingFee)) ? Math.max(0, Number(order.totals.shippingFee)) : 0,
                    platformFee: Number.isFinite(Number(order.totals.platformFee)) ? Math.max(0, Number(order.totals.platformFee)) : 0,
                    total: Number.isFinite(Number(order.totals.total)) ? Math.max(0, Number(order.totals.total)) : 0,
                  }
                : undefined,
            items: normalizedItems,
          };
        })
      : [];

    const summaryInput = payload.summary || {};
    const summary: VendorOrderSummary = {
      total: Number.isFinite(Number(summaryInput.total)) ? Number(summaryInput.total) : orders.length,
      pending: Number.isFinite(Number(summaryInput.pending))
        ? Number(summaryInput.pending)
        : orders.filter((order) => order.status === "Pending").length,
      completed: Number.isFinite(Number(summaryInput.completed))
        ? Number(summaryInput.completed)
        : orders.filter((order) => order.status === "Completed").length,
      disputed: Number.isFinite(Number(summaryInput.disputed))
        ? Number(summaryInput.disputed)
        : orders.filter((order) => order.status === "Disputed").length,
      revenue: Number.isFinite(Number(summaryInput.revenue))
        ? Number(summaryInput.revenue)
        : orders.reduce((sum, order) => sum + Math.max(0, Number(order.amount || 0)), 0),
    };

    return {
      summary,
      orders,
    };
  } catch {
    return fallback;
  }
}

export async function updateVendorOrderStatus(orderId: string, status: VendorOrderStatus): Promise<VendorOrderRecord> {
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) {
    throw new Error("Order id is required");
  }

  const payload = await requestJson<{
    order?: Partial<VendorOrderRecord> & {
      items?: Array<Partial<VendorOrderItem>>;
    };
  }>(`/api/orders/vendor/${encodeURIComponent(normalizedOrderId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  const order = payload.order;
  if (!order) {
    throw new Error("Failed to update order status");
  }

  const statusValue = String(order.status || "Pending");
  const normalizedStatus: VendorOrderStatus =
    statusValue === "Confirmed" ||
    statusValue === "Shipped" ||
    statusValue === "Out For Delivery" ||
    statusValue === "Delivery Attempted" ||
    statusValue === "Completed" ||
    statusValue === "Disputed"
      ? (statusValue as VendorOrderStatus)
      : "Pending";

  const normalizedItems = Array.isArray(order.items)
    ? order.items.map((item, itemIndex) => ({
        id: String(item.id || `order-item-${normalizedOrderId}-${itemIndex}`),
        name: String(item.name || "Product").trim() || "Product",
        quantity: Number.isFinite(Number(item.quantity)) ? Math.max(1, Number(item.quantity)) : 1,
        price: Number.isFinite(Number(item.price)) ? Math.max(0, Number(item.price)) : 0,
        image: String(item.image || "").trim() || undefined,
      }))
    : [];

  const itemCountFromItems = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: String(order.id || normalizedOrderId),
    orderNo: String(order.orderNo || `#ORD-${normalizedOrderId}`).trim(),
    customer: String(order.customer || "Customer").trim() || "Customer",
    amount: Number.isFinite(Number(order.amount)) ? Math.max(0, Number(order.amount)) : 0,
    status: normalizedStatus,
    paymentMethod: String(order.paymentMethod || "cod").trim().toLowerCase() || "cod",
    paymentStatus: String(order.paymentStatus || "pending").trim().toLowerCase() || "pending",
    createdAt: String(order.createdAt || ""),
    itemCount: Number.isFinite(Number(order.itemCount)) ? Math.max(0, Number(order.itemCount)) : itemCountFromItems,
    items: normalizedItems,
  };
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

  const detailedDescriptionBlocks = Array.isArray(input.detailedDescriptionBlocks)
    ? input.detailedDescriptionBlocks
        .map((block) => ({
          image: String(block?.image || "").trim() || undefined,
          headline: String(block?.headline || "").trim() || undefined,
          text: String(block?.text || "").trim() || undefined,
        }))
        .filter((block) => block.image || block.headline || block.text)
    : [];

  const descriptionPoints = Array.isArray(input.descriptionPoints)
    ? input.descriptionPoints
        .map((item) => ({
          heading: String(item?.heading || "").trim(),
          content: String(item?.content || "").trim(),
        }))
        .filter((item) => item.heading || item.content)
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
    detailedDescriptionBlocks,
    descriptionPoints,
    status,
    storePlacement,
    sourcePlatform: String(input.sourcePlatform || "").trim() || undefined,
    sourceRecordId: String(input.sourceRecordId || "").trim() || undefined,
    publishedAt: String(input.publishedAt || "").trim() || undefined,
    createdAt: String(input.createdAt || "").trim(),
    updatedAt: String(input.updatedAt || "").trim(),
  };
};

export async function fetchVendorCategories(options?: { categoryId?: string }): Promise<VendorCatalogCategory[]> {
  try {
    const normalizedCategoryId = String(options?.categoryId || "").trim();
    const shouldFilterByCategory = OBJECT_ID_REGEX.test(normalizedCategoryId);
    const subcategoryQuery = new URLSearchParams();
    if (shouldFilterByCategory) {
      subcategoryQuery.set("categoryId", normalizedCategoryId);
    }

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
          parentSubcategory?: { id?: string; name?: string };
        }>;
      }>(`/api/subcategories${subcategoryQuery.toString() ? `?${subcategoryQuery.toString()}` : ""}`),
    ]);

    const categories = (Array.isArray(categoryPayload.categories) ? categoryPayload.categories : []).filter((category) => {
      if (!shouldFilterByCategory) {
        return true;
      }

      return String(category.id || "").trim() === normalizedCategoryId;
    });
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

    const subcategoryById = new Map<
      string,
      {
        id: string;
        name: string;
        slug: string;
        categoryId: string;
        parentSubcategoryId: string | null;
      }
    >();

    subcategories.forEach((item, index) => {
      const id = String(item.id || `subcategory-${index}`).trim();
      const name = String(item.name || "").trim();
      const slug = String(item.slug || "").trim();
      const categoryId = String(item.category?.id || "").trim();
      const parentSubcategoryId = String(item.parentSubcategory?.id || "").trim() || null;
      if (!id || !name || !slug || !categoryId) return;
      if (!map.has(categoryId)) return;

      subcategoryById.set(id, {
        id,
        name,
        slug,
        categoryId,
        parentSubcategoryId,
      });
    });

    const childMap = new Map<string, Array<{ id: string; name: string; slug: string; categoryId: string; parentSubcategoryId: string | null }>>();
    const rootMap = new Map<string, Array<{ id: string; name: string; slug: string; categoryId: string; parentSubcategoryId: string | null }>>();

    subcategoryById.forEach((subcategory) => {
      const parentId = subcategory.parentSubcategoryId;
      if (parentId && subcategoryById.has(parentId)) {
        const siblings = childMap.get(parentId);
        if (siblings) {
          siblings.push(subcategory);
        } else {
          childMap.set(parentId, [subcategory]);
        }
        return;
      }

      const roots = rootMap.get(subcategory.categoryId);
      if (roots) {
        roots.push(subcategory);
      } else {
        rootMap.set(subcategory.categoryId, [subcategory]);
      }
    });

    const byName = (
      left: { name: string },
      right: { name: string }
    ) => left.name.localeCompare(right.name);

    const buildSubcategoryNode = (
      entry: { id: string; name: string; slug: string; categoryId: string; parentSubcategoryId: string | null },
      lineage = new Set<string>()
    ): VendorCatalogSubcategory => {
      const nextLineage = new Set(lineage);
      if (nextLineage.has(entry.id)) {
        return {
          id: entry.id,
          name: entry.name,
          slug: entry.slug,
          parentSubcategoryId: entry.parentSubcategoryId || undefined,
          childSubcategories: [],
        };
      }

      nextLineage.add(entry.id);

      const childSubcategories = [...(childMap.get(entry.id) || [])]
        .sort(byName)
        .map((child) => buildSubcategoryNode(child, nextLineage));

      return {
        id: entry.id,
        name: entry.name,
        slug: entry.slug,
        parentSubcategoryId: entry.parentSubcategoryId || undefined,
        childSubcategories,
      };
    };

    return Array.from(map.values()).map((category) => ({
      ...category,
      subcategories: [...(rootMap.get(category.id) || [])].sort(byName).map((subcategory) => buildSubcategoryNode(subcategory)),
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
