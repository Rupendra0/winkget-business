type ProductSlugInput = {
  id?: string | number | null;
  name?: string | null;
  storeId?: string | null;
  sellerId?: string | null;
  sellerName?: string | null;
};

const normalizeSegment = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

export const toSlugToken = (value: string | number | null | undefined) => {
  const normalized = normalizeSegment(String(value || ""));
  return normalized || "na";
};

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export type ParsedProductSlug = {
  nameToken: string;
  storeToken: string;
  productToken: string;
};

export const buildProductSlug = (product: ProductSlugInput) => {
  const nameToken = toSlugToken(product.name || "product");
  const storeToken = toSlugToken(product.storeId || product.sellerId || product.sellerName || "store");
  const productToken = toSlugToken(product.id || `${nameToken}-item`);

  return `${nameToken}--${storeToken}--${productToken}`;
};

export const parseProductSlug = (value: string): ParsedProductSlug => {
  const decoded = safeDecodeURIComponent(String(value || "").trim().toLowerCase());
  const parts = decoded
    .split("--")
    .map((part) => normalizeSegment(part))
    .filter(Boolean);

  if (parts.length >= 3) {
    return {
      nameToken: parts[0],
      storeToken: parts[1],
      productToken: parts[2],
    };
  }

  if (parts.length === 2) {
    return {
      nameToken: parts[0],
      storeToken: "",
      productToken: parts[1],
    };
  }

  return {
    nameToken: parts[0] || "",
    storeToken: "",
    productToken: parts[0] || "",
  };
};
