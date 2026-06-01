const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export type SearchHitType = "product" | "vendor" | "category" | "subcategory";

export type SearchHit = {
  id: string;
  type: SearchHitType;
  city?: string;
  cities?: string[];
  sublocality?: string;
  vendorId?: string;
  vendorName?: string;
  vendorImage?: string;
  vendorPhone?: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  price?: number;
  categoryId?: string;
  categoryName?: string;
  categorySlug?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  subcategorySlug?: string;
  icon?: string;
  rating?: number;
  reviews?: number;
  isStoreOpen?: boolean | null;
  storeStatusSource?: string;
  products?: string[];
  tags?: string[];
};

export type SearchSection = {
  hits: SearchHit[];
  total: number;
};

export type SearchResponse = {
  ok: boolean;
  query: string;
  city: string;
  sections?: {
    products: SearchSection;
    vendors: SearchSection;
    categories: SearchSection;
    subcategories: SearchSection;
  };
  hits?: SearchHit[];
  total?: number;
  type?: SearchHitType;
  facets?: Record<string, Record<string, number>>;
};

export type SearchSuggestion = {
  label: string;
  type: SearchHitType;
  vendorId?: string;
  productId?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  vendorImage?: string;
  productImage?: string;
};

const toQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export async function fetchSearchResults(params: {
  query: string;
  city: string;
  type?: SearchHitType | "";
  limit?: number;
  offset?: number;
  openNow?: boolean;
  minRating?: number;
  category?: string;
  subcategory?: string;
}): Promise<SearchResponse | null> {
  const query = String(params.query || "").trim();
  const city = String(params.city || "").trim();
  if (!query || !city) return null;

  try {
    const qs = toQueryString({
      q: query,
      city,
      type: params.type || undefined,
      limit: params.limit,
      offset: params.offset,
      openNow: params.openNow ? "true" : undefined,
      minRating: params.minRating,
      category: params.category,
      subcategory: params.subcategory,
    });
    const response = await fetch(`${BACKEND_URL}/api/search${qs}`, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as SearchResponse;
    if (!payload.ok) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function fetchSearchSuggestions(params: {
  query: string;
  city: string;
}): Promise<SearchSuggestion[]> {
  const query = String(params.query || "").trim();
  const city = String(params.city || "").trim();
  if (!query || !city) return [];

  try {
    const qs = toQueryString({ q: query, city });
    const response = await fetch(`${BACKEND_URL}/api/search/suggest${qs}`, { cache: "no-store" });
    if (!response.ok) return [];
    const payload = (await response.json()) as { ok: boolean; suggestions?: SearchSuggestion[] };
    if (!payload.ok || !Array.isArray(payload.suggestions)) return [];
    return payload.suggestions;
  } catch {
    return [];
  }
}
