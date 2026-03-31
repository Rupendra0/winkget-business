import {
  createCategory,
  createSubcategory,
  fetchCategories,
  fetchSubcategories,
  updateCategory,
  updateSubcategory,
  type AdminCategory,
  type AdminSubcategory,
  type AdminDirectoryUser,
} from "@/lib/adminClient";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type ApiEnvelope<T> = {
  ok: boolean;
  message?: string;
} & T;

export type UserMutationInput = {
  name?: string;
  email?: string;
  phone?: string;
  role?: "admin" | "customer" | "vendor";
  status?: "active" | "inactive";
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

export type InquiryRecord = {
  id: string;
  subject: string;
  name: string;
  channel: "Email" | "Phone" | "Web";
  status: "Open" | "In Progress" | "Closed";
  createdAt: string;
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

const FALLBACK_INQUIRIES: InquiryRecord[] = [
  {
    id: "i-101",
    subject: "Partner listing issue",
    name: "Deepak Jain",
    channel: "Email",
    status: "Open",
    createdAt: new Date().toISOString(),
  },
  {
    id: "i-102",
    subject: "Order dispute escalation",
    name: "Nisha Kapoor",
    channel: "Web",
    status: "In Progress",
    createdAt: new Date(Date.now() - 3600_000 * 7).toISOString(),
  },
  {
    id: "i-103",
    subject: "Product moderation follow-up",
    name: "Arjun Dev",
    channel: "Phone",
    status: "Closed",
    createdAt: new Date(Date.now() - 3600_000 * 26).toISOString(),
  },
];

async function requestJson<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
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
  const adminPath = query ? `/api/admin/users?${query}` : "/api/admin/users";

  try {
    const payload = await requestJson<{ users: AdminDirectoryUser[] }>(adminPath);
    return payload.users || [];
  } catch {
    const fallbackPath = query ? `/api/users?${query}` : "/api/users";
    const fallback = await requestJson<{ users: AdminDirectoryUser[] }>(fallbackPath);
    return fallback.users || [];
  }
}

export async function createUser(input: UserMutationInput): Promise<void> {
  await requestJson<Record<string, never>>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateUser(id: string, input: UserMutationInput): Promise<void> {
  await requestJson<Record<string, never>>(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await requestJson<Record<string, never>>(`/api/users/${id}`, {
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

export async function fetchProducts(): Promise<ProductRecord[]> {
  try {
    const payload = await requestJson<{ products: ProductRecord[] }>("/api/products");
    return payload.products || [];
  } catch {
    return FALLBACK_PRODUCTS;
  }
}

export async function fetchInquiries(): Promise<InquiryRecord[]> {
  try {
    const payload = await requestJson<{ inquiries: InquiryRecord[] }>("/api/inquiries");
    return payload.inquiries || [];
  } catch {
    return FALLBACK_INQUIRIES;
  }
}

export async function fetchCategoryExplorer() {
  const [categories, subcategories] = await Promise.all([
    fetchCategories({ includeInactive: true }),
    fetchSubcategories({ includeInactive: true }),
  ]);

  return { categories, subcategories };
}

export async function createCategoryNode(input: {
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  return createCategory(input);
}

export async function createSubcategoryNode(input: {
  categoryId: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  return createSubcategory(input);
}

export async function updateCategoryNode(categoryId: string, input: {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  return updateCategory(categoryId, input);
}

export async function updateSubcategoryNode(subcategoryId: string, input: {
  categoryId?: string;
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  return updateSubcategory(subcategoryId, input);
}

export async function deleteCategoryNode(categoryId: string) {
  return requestJson<Record<string, never>>(`/api/categories/${categoryId}`, {
    method: "DELETE",
  });
}

export async function deleteSubcategoryNode(subcategoryId: string) {
  return requestJson<Record<string, never>>(`/api/subcategories/${subcategoryId}`, {
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
