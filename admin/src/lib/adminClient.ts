export type UserRole = "admin" | "vendor" | "customer";
export type VendorStatus = "pending" | "approved" | "rejected";

export type CustomFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multi-select"
  | "email"
  | "phone"
  | "url";

export type CustomFormField = {
  key: string;
  label: string;
  type: CustomFormFieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  span?: 6 | 12;
  sortOrder: number;
};

export type EffectiveCustomForm = {
  source: "none" | "category" | "subcategory";
  title?: string;
  fields: CustomFormField[];
};

export type AdminUser = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role: UserRole;
};

export type VendorRecord = {
  id: string;
  name?: string;
  businessName?: string;
  businessCategory?: {
    id: string;
    name?: string;
  };
  businessSubcategory?: {
    id: string;
    name?: string;
  };
  email?: string;
  phone?: string;
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
  establishmentYear?: number;
  serviceTags?: string[];
  businessDescription?: string;
  idProofType?: string;
  idProofNumber?: string;
  idProofDocument?: string;
  marketingOptIn?: boolean;
  customFormData?: Record<string, string | number | string[]>;
  vendorStatus: VendorStatus;
  vendorReviewNote?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminDirectoryUser = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  role: UserRole;
  vendorStatus?: VendorStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type DashboardStats = {
  totalUsers: number;
  admins: number;
  customers: number;
  vendors: number;
  pendingVendors: number;
  approvedVendors: number;
  rejectedVendors: number;
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  totalSubcategories: number;
  activeSubcategories: number;
  inactiveSubcategories: number;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  customFormEnabled?: boolean;
  customFormTitle?: string;
  customFormFields?: CustomFormField[];
  createdAt?: string;
  updatedAt?: string;
};

export type AdminSubcategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  customFormEnabled?: boolean;
  customFormTitle?: string;
  customFormFields?: CustomFormField[];
  category?: {
    id: string;
    name?: string;
  };
  parentSubcategory?: {
    id: string;
    name?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type AdminCityLocality = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
};

export type AdminCity = {
  id: string;
  name: string;
  slug: string;
  state?: string;
  isActive: boolean;
  sortOrder: number;
  localities: AdminCityLocality[];
  createdAt?: string;
  updatedAt?: string;
};

export type AdminHomePlacements = {
  key: string;
  leftImage?: string;
  middleImage?: string;
  rightImage?: string;
  updatedAt?: string;
};

export type AdminHomePromoCard = {
  cardId: string;
  order: number;
  categoryId?: string;
  categoryName?: string;
  categorySlug?: string;
  title?: string;
  image?: string;
  link?: string;
};

export type AdminHomePromoSection = {
  key: string;
  heading: string;
  cards: AdminHomePromoCard[];
  updatedAt?: string;
};

export type AdminHomeExploreSection = {
  key: string;
  heading: string;
  cards: AdminHomePromoCard[];
  updatedAt?: string;
};

export type AdminHomeWellnessSection = {
  key: string;
  heading: string;
  cards: AdminHomePromoCard[];
  updatedAt?: string;
};

export type AdminHomeSponsorSection = {
  key: string;
  heading: string;
  cards: AdminHomePromoCard[];
  updatedAt?: string;
};

type DashboardResponse = {
  ok: true;
  stats: DashboardStats;
  pendingVendors: VendorRecord[];
};

type VendorListResponse = {
  ok: true;
  vendors: VendorRecord[];
};

type UserListResponse = {
  ok: true;
  users: AdminDirectoryUser[];
};

type CategoryListResponse = {
  ok: true;
  categories: AdminCategory[];
};

type SubcategoryListResponse = {
  ok: true;
  subcategories: AdminSubcategory[];
};

type CityListResponse = {
  ok: true;
  cities: AdminCity[];
};

type HomePlacementsResponse = {
  ok: true;
  placements: AdminHomePlacements;
};

type HomePromoSectionResponse = {
  ok: true;
  section: AdminHomePromoSection;
};

type HomeExploreSectionResponse = {
  ok: true;
  section: AdminHomeExploreSection;
};

type HomeWellnessSectionResponse = {
  ok: true;
  section: AdminHomeWellnessSection;
};

type HomeSponsorSectionResponse = {
  ok: true;
  section: AdminHomeSponsorSection;
};

type ApiResponse<T> = T & {
  ok: boolean;
  message?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const AUTH_RETRY_DELAY_MS = 220;
const AUTH_TOKEN_STORAGE_KEY = "winkget_admin_token";

const readAuthToken = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
};

const writeAuthToken = (token?: string) => {
  if (typeof window === "undefined") return;

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

async function requestJson<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const execute = async (): Promise<{ response: Response; payload: ApiResponse<T> | null }> => {
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
      credentials: "include",
      cache: "no-store",
    });

    let payload: ApiResponse<T> | null = null;
    try {
      payload = (await response.json()) as ApiResponse<T>;
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

export async function fetchAdminSession(): Promise<AdminUser | null> {
  try {
    const payload = await requestJson<{ user: AdminUser }>("/api/admin/me");
    return payload.user || null;
  } catch {
    return null;
  }
}

export async function loginAsAdmin(identifier: string, password: string): Promise<AdminUser> {
  const payload = await requestJson<{ user: AdminUser; token?: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password, authContext: "admin" }),
  });

  const user = payload.user;
  const token = typeof payload.token === "string" ? payload.token : "";

  if (token) {
    writeAuthToken(token);
  }

  if (!user || user.role !== "admin") {
    await logoutAdmin().catch(() => undefined);
    throw new Error("This account does not have admin access");
  }

  return user;
}

export async function logoutAdmin(): Promise<void> {
  try {
    await requestJson<Record<string, never>>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ authContext: "admin" }),
    });
  } finally {
    writeAuthToken(undefined);
  }
}

export async function fetchDashboard(): Promise<{ stats: DashboardStats; pendingVendors: VendorRecord[] }> {
  const payload = await requestJson<DashboardResponse>("/api/admin/dashboard");
  return {
    stats: payload.stats,
    pendingVendors: payload.pendingVendors || [],
  };
}

export async function fetchVendors(params: {
  status?: "all" | VendorStatus;
  search?: string;
}): Promise<VendorRecord[]> {
  const searchParams = new URLSearchParams();
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.search) {
    searchParams.set("search", params.search);
  }

  const query = searchParams.toString();
  const path = query ? `/api/admin/vendors?${query}` : "/api/admin/vendors";
  const payload = await requestJson<VendorListResponse>(path);
  return payload.vendors || [];
}

export async function fetchAdminUsers(params?: {
  role?: "all" | UserRole;
  search?: string;
}): Promise<AdminDirectoryUser[]> {
  const searchParams = new URLSearchParams();
  if (params?.role) {
    searchParams.set("role", params.role);
  }
  if (params?.search) {
    searchParams.set("search", params.search);
  }

  const query = searchParams.toString();
  const path = query ? `/api/admin/users?${query}` : "/api/admin/users";
  const payload = await requestJson<UserListResponse>(path);
  return payload.users || [];
}

export async function updateVendorStatus(vendorId: string, status: VendorStatus, note?: string): Promise<VendorRecord> {
  const payload = await requestJson<{ vendor: VendorRecord }>(`/api/admin/vendors/${vendorId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });

  return payload.vendor;
}

export async function fetchCategories(params?: {
  includeInactive?: boolean;
  search?: string;
}): Promise<AdminCategory[]> {
  const searchParams = new URLSearchParams();
  if (params?.includeInactive !== undefined) {
    searchParams.set("includeInactive", String(params.includeInactive));
  }
  if (params?.search) {
    searchParams.set("search", params.search);
  }

  const query = searchParams.toString();
  const path = query ? `/api/admin/categories?${query}` : "/api/admin/categories";
  const payload = await requestJson<CategoryListResponse>(path);
  return payload.categories || [];
}

export async function fetchSubcategories(params?: {
  includeInactive?: boolean;
  search?: string;
  categoryId?: string;
  parentSubcategoryId?: string;
}): Promise<AdminSubcategory[]> {
  const searchParams = new URLSearchParams();
  if (params?.includeInactive !== undefined) {
    searchParams.set("includeInactive", String(params.includeInactive));
  }
  if (params?.search) {
    searchParams.set("search", params.search);
  }
  if (params?.categoryId) {
    searchParams.set("categoryId", params.categoryId);
  }
  if (params?.parentSubcategoryId) {
    searchParams.set("parentSubcategoryId", params.parentSubcategoryId);
  }

  const query = searchParams.toString();
  const path = query ? `/api/admin/subcategories?${query}` : "/api/admin/subcategories";
  const payload = await requestJson<SubcategoryListResponse>(path);
  return payload.subcategories || [];
}

export async function fetchCities(params?: {
  includeInactive?: boolean;
  search?: string;
}): Promise<AdminCity[]> {
  const searchParams = new URLSearchParams();
  if (params?.includeInactive !== undefined) {
    searchParams.set("includeInactive", String(params.includeInactive));
  }
  if (params?.search) {
    searchParams.set("search", params.search);
  }

  const query = searchParams.toString();
  const path = query ? `/api/admin/cities?${query}` : "/api/admin/cities";
  const payload = await requestJson<CityListResponse>(path);
  return payload.cities || [];
}

export async function fetchHomePlacements(): Promise<AdminHomePlacements> {
  const payload = await requestJson<HomePlacementsResponse>("/api/admin/ads/home-placements");
  return payload.placements || { key: "home-placements" };
}

export async function updateHomePlacements(input: {
  leftImage?: string;
  middleImage?: string;
  rightImage?: string;
}): Promise<AdminHomePlacements> {
  const payload = await requestJson<HomePlacementsResponse>("/api/admin/ads/home-placements", {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return payload.placements;
}

export async function fetchHomePromoSection(): Promise<AdminHomePromoSection> {
  const payload = await requestJson<HomePromoSectionResponse>("/api/admin/ads/home-promo-cards");
  return payload.section || { key: "home-promo-cards", heading: "Featured Offers", cards: [] };
}

export async function updateHomePromoSection(input: {
  heading?: string;
  cards?: Array<{
    cardId: string;
    categoryId?: string;
    title?: string;
    image?: string;
    link?: string;
  }>;
}): Promise<AdminHomePromoSection> {
  const payload = await requestJson<HomePromoSectionResponse>("/api/admin/ads/home-promo-cards", {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return payload.section;
}

export async function fetchHomeExploreSection(): Promise<AdminHomeExploreSection> {
  const payload = await requestJson<HomeExploreSectionResponse>("/api/admin/ads/home-explore-cards");
  return payload.section || { key: "home-explore-cards", heading: "Explore", cards: [] };
}

export async function updateHomeExploreSection(input: {
  heading?: string;
  cards?: Array<{
    cardId: string;
    categoryId?: string;
    title?: string;
    image?: string;
    link?: string;
  }>;
}): Promise<AdminHomeExploreSection> {
  const payload = await requestJson<HomeExploreSectionResponse>("/api/admin/ads/home-explore-cards", {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return payload.section;
}

export async function fetchHomeWellnessSection(): Promise<AdminHomeWellnessSection> {
  const payload = await requestJson<HomeWellnessSectionResponse>("/api/admin/ads/home-wellness-cards");
  return payload.section || { key: "home-wellness-cards", heading: "Health & Wellness", cards: [] };
}

export async function updateHomeWellnessSection(input: {
  heading?: string;
  cards?: Array<{
    cardId: string;
    categoryId?: string;
    title?: string;
    image?: string;
    link?: string;
  }>;
}): Promise<AdminHomeWellnessSection> {
  const payload = await requestJson<HomeWellnessSectionResponse>("/api/admin/ads/home-wellness-cards", {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return payload.section;
}

export async function fetchHomeSponsorSection(): Promise<AdminHomeSponsorSection> {
  const payload = await requestJson<HomeSponsorSectionResponse>("/api/admin/ads/home-sponsor-cards");
  return payload.section || { key: "home-sponsor-cards", heading: "Brand Partners", cards: [] };
}

export async function updateHomeSponsorSection(input: {
  heading?: string;
  cards?: Array<{
    cardId: string;
    title?: string;
    image?: string;
    link?: string;
  }>;
}): Promise<AdminHomeSponsorSection> {
  const payload = await requestJson<HomeSponsorSectionResponse>("/api/admin/ads/home-sponsor-cards", {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return payload.section;
}

export async function createCategory(input: {
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  customFormEnabled?: boolean;
  customFormTitle?: string;
  customFormFields?: CustomFormField[];
}): Promise<AdminCategory> {
  const payload = await requestJson<{ category: AdminCategory }>("/api/admin/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return payload.category;
}

export async function updateCategory(
  categoryId: string,
  input: {
    name?: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
    isActive?: boolean;
    customFormEnabled?: boolean;
    customFormTitle?: string;
    customFormFields?: CustomFormField[];
  }
): Promise<AdminCategory> {
  const payload = await requestJson<{ category: AdminCategory }>(`/api/admin/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return payload.category;
}

export async function createSubcategory(input: {
  categoryId: string;
  parentSubcategoryId?: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  customFormEnabled?: boolean;
  customFormTitle?: string;
  customFormFields?: CustomFormField[];
}): Promise<AdminSubcategory> {
  const payload = await requestJson<{ subcategory: AdminSubcategory }>("/api/admin/subcategories", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return payload.subcategory;
}

export async function updateSubcategory(
  subcategoryId: string,
  input: {
    categoryId?: string;
    parentSubcategoryId?: string;
    name?: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
    isActive?: boolean;
    customFormEnabled?: boolean;
    customFormTitle?: string;
    customFormFields?: CustomFormField[];
  }
): Promise<AdminSubcategory> {
  const payload = await requestJson<{ subcategory: AdminSubcategory }>(`/api/admin/subcategories/${subcategoryId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return payload.subcategory;
}

export async function createCity(input: {
  name: string;
  state: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<AdminCity> {
  const payload = await requestJson<{ city: AdminCity }>("/api/admin/cities", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return payload.city;
}

export async function updateCity(
  cityId: string,
  input: {
    name?: string;
    state?: string;
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<AdminCity> {
  const payload = await requestJson<{ city: AdminCity }>(`/api/admin/cities/${cityId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return payload.city;
}

export async function createCityLocality(
  cityId: string,
  input: {
    name: string;
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<AdminCity> {
  const payload = await requestJson<{ city: AdminCity }>(`/api/admin/cities/${cityId}/localities`, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return payload.city;
}

export async function updateCityLocality(
  cityId: string,
  localityId: string,
  input: {
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<AdminCity> {
  const payload = await requestJson<{ city: AdminCity }>(`/api/admin/cities/${cityId}/localities/${localityId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

  return payload.city;
}

export async function deleteCity(cityId: string): Promise<void> {
  await requestJson<Record<string, never>>(`/api/admin/cities/${cityId}`, {
    method: "DELETE",
  });
}

export async function deleteCityLocality(cityId: string, localityId: string): Promise<AdminCity> {
  const payload = await requestJson<{ city: AdminCity }>(`/api/admin/cities/${cityId}/localities/${localityId}`, {
    method: "DELETE",
  });

  return payload.city;
}

export { BACKEND_URL, toErrorMessage };
