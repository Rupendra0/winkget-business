const CART_STORAGE_KEY = "winkget:cart:v1";
const BUY_NOW_STORAGE_KEY = "winkget:buy-now:v1";
const WISHLIST_STORAGE_KEY = "winkget:wishlist:v1";

export const CART_UPDATED_EVENT = "shop:cart-updated";
export const BUY_NOW_UPDATED_EVENT = "shop:buy-now-updated";

export type StorefrontStoredProduct = {
  id: string;
  storeId: string;
  name: string;
  image: string;
  price: number;
  oldPrice: number;
  priceText: string;
  oldPriceText: string;
  sellerName: string;
  categoryLabel: string;
  href: string;
};

export type StorefrontCartItem = {
  product: StorefrontStoredProduct;
  quantity: number;
};

export type StorefrontBuyNowSelection = {
  product: StorefrontStoredProduct;
  quantity: number;
  updatedAt: string;
};

type StoreProductInput = {
  id?: string | null;
  storeId?: string | null;
  name?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  price?: number | string | null;
  oldPrice?: number | string | null;
  priceText?: string | null;
  oldPriceText?: string | null;
  sellerName?: string | null;
  storeName?: string | null;
  category?: string | null;
  categoryLabel?: string | null;
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1518441902117-fb1c5ed0f2e3?auto=format&fit=crop&w=800&q=70";

const isBrowser = () => typeof window !== "undefined";

const normalizeString = (value: unknown) => String(value || "").trim();

const parsePriceNumber = (value: number | string | null | undefined, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  const parsed = Number(String(value || "").replace(/[^0-9.]/g, ""));
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.max(0, Math.round(parsed));
  }

  return Math.max(0, Math.round(fallback));
};

const normalizeQuantity = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, Math.round(parsed));
};

const formatPriceText = (value: number) => `₹${Math.max(0, Math.round(value)).toLocaleString("en-IN")}`;

const safeReadJson = <T>(key: string, fallback: T): T => {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    return fallback;
  }
};

const safeWriteJson = (key: string, value: unknown) => {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures.
  }
};

const emitStoreUpdate = (eventName: string, detail: unknown) => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

const getCartCountFromItems = (items: StorefrontCartItem[]) => {
  const uniqueProductIds = new Set(
    items
      .map((item) => normalizeString(item?.product?.id))
      .filter(Boolean)
  );

  return uniqueProductIds.size;
};

const writeCart = (items: StorefrontCartItem[]) => {
  safeWriteJson(CART_STORAGE_KEY, items);
  emitStoreUpdate(CART_UPDATED_EVENT, {
    cart: items,
    count: getCartCountFromItems(items),
  });
};

export const makeStoreProduct = (input: StoreProductInput, href: string): StorefrontStoredProduct => {
  const id = normalizeString(input.id) || "product";
  const storeId = normalizeString(input.storeId) || "store";
  const name = normalizeString(input.name) || "Product";
  const image = normalizeString(input.image) || normalizeString(input.imageUrl) || DEFAULT_IMAGE;

  const price = parsePriceNumber(input.price, 0);
  const oldPrice = parsePriceNumber(input.oldPrice, price);

  const priceText = normalizeString(input.priceText) || formatPriceText(price);
  const oldPriceText = normalizeString(input.oldPriceText) || formatPriceText(oldPrice);

  const sellerName = normalizeString(input.sellerName) || normalizeString(input.storeName) || "Winkget Seller";
  const categoryLabel = normalizeString(input.categoryLabel) || normalizeString(input.category) || "Products";

  return {
    id,
    storeId,
    name,
    image,
    price,
    oldPrice,
    priceText,
    oldPriceText,
    sellerName,
    categoryLabel,
    href: normalizeString(href) || "/",
  };
};

export const readCart = (): StorefrontCartItem[] => {
  const cart = safeReadJson<StorefrontCartItem[]>(CART_STORAGE_KEY, []);
  if (!Array.isArray(cart)) {
    return [];
  }

  return cart
    .filter((item) => item && item.product && normalizeString(item.product.id))
    .map((item) => ({
      ...item,
      quantity: normalizeQuantity(item.quantity),
    }));
};

export const getCartCount = () => getCartCountFromItems(readCart());

export const addToCart = (product: StorefrontStoredProduct, quantity = 1) => {
  const nextQty = normalizeQuantity(quantity);
  const currentCart = readCart();
  const existingIndex = currentCart.findIndex((item) => item.product.id === product.id);

  let nextCart: StorefrontCartItem[];

  if (existingIndex >= 0) {
    nextCart = [...currentCart];
    const existing = nextCart[existingIndex];
    nextCart[existingIndex] = {
      ...existing,
      product,
      quantity: existing.quantity + nextQty,
    };
  } else {
    nextCart = [...currentCart, { product, quantity: nextQty }];
  }

  writeCart(nextCart);

  return nextCart;
};

export const setCartItemQuantity = (productId: string, quantity: number) => {
  const normalizedProductId = normalizeString(productId);
  if (!normalizedProductId) {
    return readCart();
  }

  const currentCart = readCart();
  const nextQuantity = Number(quantity);
  if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
    const nextCart = currentCart.filter((item) => item.product.id !== normalizedProductId);
    writeCart(nextCart);
    return nextCart;
  }

  const nextCart = currentCart.map((item) =>
    item.product.id === normalizedProductId ? { ...item, quantity: normalizeQuantity(nextQuantity) } : item
  );

  writeCart(nextCart);
  return nextCart;
};

export const removeFromCart = (productId: string) => {
  const normalizedProductId = normalizeString(productId);
  if (!normalizedProductId) {
    return readCart();
  }

  const nextCart = readCart().filter((item) => item.product.id !== normalizedProductId);
  writeCart(nextCart);
  return nextCart;
};

export const clearCart = () => {
  const nextCart: StorefrontCartItem[] = [];
  writeCart(nextCart);
  return nextCart;
};

export const readBuyNowSelection = (): StorefrontBuyNowSelection | null => {
  const selection = safeReadJson<StorefrontBuyNowSelection | null>(BUY_NOW_STORAGE_KEY, null);

  if (!selection || typeof selection !== "object") {
    return null;
  }

  if (!selection.product || !normalizeString(selection.product.id)) {
    return null;
  }

  return {
    product: selection.product,
    quantity: normalizeQuantity(selection.quantity),
    updatedAt: normalizeString(selection.updatedAt) || new Date().toISOString(),
  };
};

export const setBuyNowSelection = (product: StorefrontStoredProduct, quantity = 1) => {
  const selection: StorefrontBuyNowSelection = {
    product,
    quantity: normalizeQuantity(quantity),
    updatedAt: new Date().toISOString(),
  };

  safeWriteJson(BUY_NOW_STORAGE_KEY, selection);
  emitStoreUpdate(BUY_NOW_UPDATED_EVENT, { selection });

  return selection;
};

export const clearBuyNowSelection = () => {
  safeWriteJson(BUY_NOW_STORAGE_KEY, null);
  emitStoreUpdate(BUY_NOW_UPDATED_EVENT, { selection: null });

  return null;
};

export const readWishlist = (): StorefrontStoredProduct[] => {
  const wishlist = safeReadJson<StorefrontStoredProduct[]>(WISHLIST_STORAGE_KEY, []);
  if (!Array.isArray(wishlist)) {
    return [];
  }

  return wishlist.filter((item) => item && normalizeString(item.id));
};

export const isWishlisted = (productId: string | null | undefined) => {
  const id = normalizeString(productId);
  if (!id) {
    return false;
  }

  return readWishlist().some((item) => item.id === id);
};

export const toggleWishlist = (product: StorefrontStoredProduct) => {
  const currentWishlist = readWishlist();
  const exists = currentWishlist.some((item) => item.id === product.id);

  const nextWishlist = exists
    ? currentWishlist.filter((item) => item.id !== product.id)
    : [product, ...currentWishlist];

  safeWriteJson(WISHLIST_STORAGE_KEY, nextWishlist);
  emitStoreUpdate("shop:wishlist-updated", { wishlist: nextWishlist });

  return !exists;
};
