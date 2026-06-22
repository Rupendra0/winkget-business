import {
  createCategory,
  createSubcategory,
  fetchCategories,
  fetchSubcategories,
  fetchHomePlacements,
  fetchHomePromoSection,
  fetchHomeSponsorSection,
  fetchHomeExploreSection,
  fetchHomeWellnessSection,
  updateHomePlacements,
  updateHomePromoSection,
  updateHomeSponsorSection,
  updateHomeExploreSection,
  updateHomeWellnessSection,
  updateCategory,
  updateSubcategory,
  type CustomFormField,
  type EffectiveCustomForm,
  type AdminHomePlacements,
  type AdminHomePromoSection,
  type AdminHomeSponsorSection,
  type AdminHomeExploreSection,
  type AdminHomeWellnessSection,
  type AdminCategory,
  type AdminSubcategory,
  type AdminDirectoryUser,
} from "@/lib/adminClient";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const AUTH_RETRY_DELAY_MS = 220;
const AUTH_TOKEN_STORAGE_KEY = "winkget_admin_token";

const readAuthToken = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
};

type ApiEnvelope<T> = {
  ok: boolean;
  message?: string;
} & T;

export type UserMutationInput = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: "admin" | "customer" | "vendor";
  vendorStatus?: "pending" | "approved" | "rejected";
  vendorReviewNote?: string;
  businessName?: string;
  businessCategoryId?: string;
  businessSubcategoryId?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  city?: string;
  sublocality?: string;
  state?: string;
  postalCode?: string;
  gstNumber?: string;
  gstDocument?: string;
  website?: string;
  shopOpeningTime?: string;
  shopClosingTime?: string;
  establishmentYear?: number | null;
  serviceTags?: string[];
  businessDescription?: string;
  idProofType?: string;
  idProofNumber?: string;
  idProofDocument?: string;
  marketingOptIn?: boolean;
  customFormData?: Record<string, string | number | string[]>;
  status?: "active" | "inactive";
  cardImage?: string;
};

export type AdminUserDetail = AdminDirectoryUser & {
  businessCategory?: {
    id: string;
    name?: string;
  };
  businessSubcategory?: {
    id: string;
    name?: string;
  };
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  city?: string;
  sublocality?: string;
  state?: string;
  postalCode?: string;
  gstNumber?: string;
  gstDocument?: string;
  website?: string;
  shopOpeningTime?: string;
  shopClosingTime?: string;
  establishmentYear?: number;
  serviceTags?: string[];
  businessDescription?: string;
  idProofType?: string;
  idProofNumber?: string;
  idProofDocument?: string;
  marketingOptIn?: boolean;
  customFormData?: Record<string, string | number | string[]>;
  effectiveCustomForm?: EffectiveCustomForm;
  vendorReviewNote?: string;
  cardImage?: string;
};

export type OrderRecord = {
  id: string;
  orderNo: string;
  customer: string;
  amount: number;
  status: "Pending" | "Disputed" | "Completed";
  createdAt: string;
};

export type ProductRecord = {
  id: string;
  name: string;
  category: string;
  seller: string;
  price: number;
  status: "Active" | "Draft" | "Blocked";
};

export type InquiryStatus = "Open" | "In Progress" | "Closed";

export type InquiryRecord = {
  id: string;
  subject: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  channel: "Email" | "Phone" | "Web";
  status: InquiryStatus;
  adminNote?: string;
  vendor?: {
    id: string;
    businessName?: string;
    businessPhone?: string;
    city?: string;
    state?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type SecondaryNode = {
  id: string;
  parentSubcategoryId: string;
  label: string;
};

const FALLBACK_ORDERS: OrderRecord[] = [
  {
    id: "o-1001",
    orderNo: "#1001",
    customer: "Riya Sharma",
    amount: 980,
    status: "Pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: "o-1002",
    orderNo: "#1002",
    customer: "Aarav Mehta",
    amount: 1240,
    status: "Disputed",
    createdAt: new Date(Date.now() - 3600_000 * 4).toISOString(),
  },
  {
    id: "o-1003",
    orderNo: "#1003",
    customer: "Meera S.",
    amount: 540,
    status: "Completed",
    createdAt: new Date(Date.now() - 3600_000 * 8).toISOString(),
  },
];

const FALLBACK_PRODUCTS: ProductRecord[] = [
  { id: "p-1", name: "Industrial Drill", category: "Tools", seller: "BuildPro", price: 14999, status: "Active" },
  { id: "p-2", name: "Bulk Stationery Pack", category: "Office", seller: "Paperline", price: 1999, status: "Draft" },
  { id: "p-3", name: "Restaurant POS Kit", category: "Electronics", seller: "FoodTech", price: 35999, status: "Blocked" },
];

async function requestJson<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const execute = async (): Promise<{ response: Response; payload: ApiEnvelope<T> | null }> => {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    headers.set("X-Auth-Context", "admin");
    const token = readAuthToken();

    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      credentials: "include",
    });

    let payload: ApiEnvelope<T> | null = null;
    try {
      payload = (await response.json()) as ApiEnvelope<T>;
    } catch {
      payload = null;
    }

    return { response, payload };
  };

  let { response, payload } = await execute();

  if ((!response.ok || !payload?.ok) && (response.status === 401 || response.status === 403)) {
    await new Promise((resolve) => setTimeout(resolve, AUTH_RETRY_DELAY_MS));
    const retryResult = await execute();
    response = retryResult.response;
    payload = retryResult.payload;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return payload;
}

export async function fetchUsers(params: {
  search?: string;
  role?: "all" | "admin" | "customer" | "vendor";
}): Promise<AdminDirectoryUser[]> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.role) searchParams.set("role", params.role);

  const query = searchParams.toString();
  const path = query ? `/api/admin/users?${query}` : "/api/admin/users";
  const payload = await requestJson<{ users: AdminDirectoryUser[] }>(path);
  return payload.users || [];
}

export async function fetchUserDetails(id: string): Promise<AdminUserDetail> {
  const payload = await requestJson<{ user: AdminUserDetail }>(`/api/admin/users/${id}`);
  return payload.user;
}

export async function createUser(input: UserMutationInput): Promise<void> {
  await requestJson<Record<string, never>>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateUser(id: string, input: UserMutationInput): Promise<void> {
  await requestJson<Record<string, never>>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await requestJson<Record<string, never>>(`/api/admin/users/${id}`, {
    method: "DELETE",
  });
}

export async function fetchOrders(status?: "Pending" | "Disputed"): Promise<OrderRecord[]> {
  const search = new URLSearchParams();
  if (status) search.set("status", status);
  const query = search.toString();
  const path = query ? `/api/orders?${query}` : "/api/orders";

  try {
    const payload = await requestJson<{ orders: OrderRecord[] }>(path);
    return payload.orders || [];
  } catch {
    if (!status) return FALLBACK_ORDERS;
    return FALLBACK_ORDERS.filter((order) => order.status === status);
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderRecord["status"]
): Promise<OrderRecord> {
  const normalizedId = String(orderId || "").trim();
  if (!normalizedId) {
    throw new Error("Order id is required");
  }

  const payload = await requestJson<{ order: OrderRecord }>(`/api/orders/${encodeURIComponent(normalizedId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  return payload.order;
}

export async function fetchProducts(): Promise<ProductRecord[]> {
  try {
    const payload = await requestJson<{ products: ProductRecord[] }>("/api/products");
    return payload.products || [];
  } catch {
    return FALLBACK_PRODUCTS;
  }
}

export async function fetchInquiries(filters?: {
  status?: InquiryStatus;
  search?: string;
  limit?: number;
}): Promise<InquiryRecord[]> {
  const searchParams = new URLSearchParams();
  if (filters?.status) searchParams.set("status", filters.status);
  if (filters?.search) searchParams.set("search", filters.search);
  if (typeof filters?.limit === "number") searchParams.set("limit", String(filters.limit));

  const query = searchParams.toString();
  const path = query ? `/api/inquiries?${query}` : "/api/inquiries";
  const payload = await requestJson<{ inquiries: InquiryRecord[] }>(path);
  return payload.inquiries || [];
}

export async function updateInquiry(
  id: string,
  input: { status?: InquiryStatus; adminNote?: string }
): Promise<InquiryRecord> {
  const payload = await requestJson<{ inquiry: InquiryRecord }>(`/api/inquiries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return payload.inquiry;
}

export async function fetchCategoryExplorer() {
  const [categories, subcategories] = await Promise.all([
    fetchCategories({ includeInactive: true }),
    fetchSubcategories({ includeInactive: true }),
  ]);

  return { categories, subcategories };
}

export async function fetchHomePlacementsConfig(): Promise<AdminHomePlacements> {
  return fetchHomePlacements();
}

export async function updateHomePlacementsConfig(input: {
  leftImage?: string;
  middleImage?: string;
  rightImage?: string;
}): Promise<AdminHomePlacements> {
  return updateHomePlacements(input);
}

export async function fetchHomePromoSectionConfig(): Promise<AdminHomePromoSection> {
  return fetchHomePromoSection();
}

export async function updateHomePromoSectionConfig(input: {
  heading?: string;
  cards?: Array<{
    cardId: string;
    categoryId?: string;
    title?: string;
    image?: string;
    link?: string;
  }>;
}): Promise<AdminHomePromoSection> {
  return updateHomePromoSection(input);
}

export async function fetchHomeSponsorSectionConfig(): Promise<AdminHomeSponsorSection> {
  return fetchHomeSponsorSection();
}

export async function updateHomeSponsorSectionConfig(input: {
  heading?: string;
  cards?: Array<{
    cardId: string;
    title?: string;
    image?: string;
    link?: string;
  }>;
}): Promise<AdminHomeSponsorSection> {
  return updateHomeSponsorSection(input);
}

export async function fetchHomeExploreSectionConfig(): Promise<AdminHomeExploreSection> {
  return fetchHomeExploreSection();
}

export async function updateHomeExploreSectionConfig(input: {
  heading?: string;
  cards?: Array<{
    cardId: string;
    categoryId?: string;
    title?: string;
    image?: string;
    link?: string;
  }>;
}): Promise<AdminHomeExploreSection> {
  return updateHomeExploreSection(input);
}

export async function fetchHomeWellnessSectionConfig(): Promise<AdminHomeWellnessSection> {
  return fetchHomeWellnessSection();
}

export async function updateHomeWellnessSectionConfig(input: {
  heading?: string;
  cards?: Array<{
    cardId: string;
    categoryId?: string;
    title?: string;
    image?: string;
    link?: string;
  }>;
}): Promise<AdminHomeWellnessSection> {
  return updateHomeWellnessSection(input);
}

export async function fetchActiveCategoriesForAds() {
  const categories = await fetchCategories({ includeInactive: false });
  return categories.sort((left, right) => {
    const leftOrder = Number.isFinite(Number(left.sortOrder)) ? Number(left.sortOrder) : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(Number(right.sortOrder)) ? Number(right.sortOrder) : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.name || "").localeCompare(String(right.name || ""));
  });
}

export async function createCategoryNode(input: {
  name: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  customFormEnabled?: boolean;
  customFormTitle?: string;
  customFormFields?: CustomFormField[];
}) {
  return createCategory(input);
}

export async function createSubcategoryNode(input: {
  categoryId: string;
  parentSubcategoryId?: string;
  name: string;
  icon?: string;
  coverImage?: string;
  sortOrder?: number;
  isActive?: boolean;
  customFormEnabled?: boolean;
  customFormTitle?: string;
  customFormFields?: CustomFormField[];
}) {
  return createSubcategory(input);
}

export async function updateCategoryNode(categoryId: string, input: {
  name?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  customFormEnabled?: boolean;
  customFormTitle?: string;
  customFormFields?: CustomFormField[];
}) {
  return updateCategory(categoryId, input);
}

export async function updateSubcategoryNode(subcategoryId: string, input: {
  categoryId?: string;
  parentSubcategoryId?: string;
  name?: string;
  icon?: string;
  coverImage?: string;
  sortOrder?: number;
  isActive?: boolean;
  customFormEnabled?: boolean;
  customFormTitle?: string;
  customFormFields?: CustomFormField[];
}) {
  return updateSubcategory(subcategoryId, input);
}

export async function deleteCategoryNode(categoryId: string) {
  return requestJson<Record<string, never>>(`/api/admin/categories/${categoryId}`, {
    method: "DELETE",
  });
}

export async function deleteSubcategoryNode(subcategoryId: string) {
  return requestJson<Record<string, never>>(`/api/admin/subcategories/${subcategoryId}`, {
    method: "DELETE",
  });
}

export function createSecondaryNode(parentSubcategoryId: string, label: string): SecondaryNode {
  return {
    id: `secondary-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    parentSubcategoryId,
    label,
  };
}

export type { AdminCategory, AdminSubcategory, AdminDirectoryUser };
