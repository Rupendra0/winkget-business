import { AUTH_BACKEND_URL, type AuthUser } from "@/lib/authClient";
import {
  clearBuyNowSelection,
  clearCart,
  readBuyNowSelection,
  readCart,
  type StorefrontCartItem,
} from "@/lib/shopStorage";

const ADDRESS_BOOK_STORAGE_KEY = "winkget:checkout:addresses:v1";
const ORDERS_STORAGE_KEY = "winkget:checkout:orders:v1";
const CHECKOUT_DRAFT_STORAGE_KEY = "winkget:checkout:draft:v1";

export const ADDRESS_UPDATED_EVENT = "shop:addresses-updated";
export const ORDER_UPDATED_EVENT = "shop:orders-updated";

export type CheckoutMode = "cart" | "buy-now";

export type SavedAddress = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  tag: "Home" | "Work" | "Other";
  createdAt: string;
  updatedAt: string;
};

export type AddressDraft = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  tag?: "Home" | "Work" | "Other";
};

export type CheckoutTotals = {
  mrp: number;
  subtotal: number;
  savings: number;
  shippingFee: number;
  platformFee: number;
  total: number;
};

export type ActiveCheckoutDraft = {
  userId: string;
  mode: CheckoutMode;
  items: StorefrontCartItem[];
  totals: CheckoutTotals;
  addressId: string;
  createdAt: string;
};

export type PaymentMethod = "cod" | "razorpay" | "upi" | "card" | "netbanking" | "wallet";

export type CheckoutOrder = {
  id: string;
  userId: string;
  createdAt: string;
  mode: CheckoutMode;
  items: StorefrontCartItem[];
  totals: CheckoutTotals;
  address: SavedAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: "pending" | "paid" | "cod_pending";
  orderStatus: "placed" | "confirmed";
  status: "Pending" | "Disputed" | "Completed";
};

type AddressStore = Record<string, { selectedAddressId?: string; addresses: SavedAddress[] }>;
type OrderStore = Record<string, CheckoutOrder[]>;
type DraftStore = Record<string, ActiveCheckoutDraft>;
type ApiEnvelope<T> = {
  ok: boolean;
  message?: string;
} & T;

const BACKEND_URL = AUTH_BACKEND_URL || "http://localhost:5000";

const isBrowser = () => typeof window !== "undefined";

const normalizeString = (value: unknown) => String(value || "").trim();

const normalizePhone = (value: unknown) => String(value || "").replace(/\D/g, "").slice(0, 10);

const normalizePrice = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.round(parsed));
};

const normalizeQuantity = (value: unknown) => {
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

const emitUpdate = (eventName: string, detail: unknown) => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

const sanitizeCartItems = (items: StorefrontCartItem[]) => {
  if (!Array.isArray(items)) {
    return [] as StorefrontCartItem[];
  }

  return items
    .filter((item) => item && item.product && normalizeString(item.product.id))
    .map((item) => {
      const price = normalizePrice(item.product.price);
      const oldPrice = normalizePrice(item.product.oldPrice) || price;

      return {
        ...item,
        quantity: normalizeQuantity(item.quantity),
        product: {
          ...item.product,
          id: normalizeString(item.product.id),
          storeId: normalizeString(item.product.storeId) || "store",
          name: normalizeString(item.product.name) || "Product",
          image: normalizeString(item.product.image),
          price,
          oldPrice,
          priceText: normalizeString(item.product.priceText) || formatPriceText(price),
          oldPriceText: normalizeString(item.product.oldPriceText) || formatPriceText(oldPrice),
          sellerName: normalizeString(item.product.sellerName) || "Winkget Seller",
          categoryLabel: normalizeString(item.product.categoryLabel) || "Products",
          href: normalizeString(item.product.href) || "/",
        },
      };
    });
};

const sanitizeAddress = (input: AddressDraft, addressId?: string, previous?: SavedAddress): SavedAddress | null => {
  const fullName = normalizeString(input.fullName);
  const phone = normalizePhone(input.phone);
  const line1 = normalizeString(input.line1);
  const city = normalizeString(input.city);
  const state = normalizeString(input.state);
  const postalCode = normalizeString(input.postalCode);

  if (!fullName || !phone || !line1 || !city || !state || !postalCode) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: normalizeString(addressId) || normalizeString(previous?.id) || `addr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    fullName,
    phone,
    line1,
    line2: normalizeString(input.line2) || undefined,
    landmark: normalizeString(input.landmark) || undefined,
    city,
    state,
    postalCode,
    tag: input.tag || previous?.tag || "Home",
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  };
};

const readAddressStore = (): AddressStore => {
  const store = safeReadJson<AddressStore>(ADDRESS_BOOK_STORAGE_KEY, {});
  if (!store || typeof store !== "object") {
    return {};
  }

  return store;
};

const writeAddressStore = (store: AddressStore) => {
  safeWriteJson(ADDRESS_BOOK_STORAGE_KEY, store);
  emitUpdate(ADDRESS_UPDATED_EVENT, store);
};

const readOrderStore = (): OrderStore => {
  const store = safeReadJson<OrderStore>(ORDERS_STORAGE_KEY, {});
  if (!store || typeof store !== "object") {
    return {};
  }

  return store;
};

const writeOrderStore = (store: OrderStore) => {
  safeWriteJson(ORDERS_STORAGE_KEY, store);
  emitUpdate(ORDER_UPDATED_EVENT, store);
};

const readDraftStore = (): DraftStore => {
  const store = safeReadJson<DraftStore>(CHECKOUT_DRAFT_STORAGE_KEY, {});
  if (!store || typeof store !== "object") {
    return {};
  }

  return store;
};

const writeDraftStore = (store: DraftStore) => {
  safeWriteJson(CHECKOUT_DRAFT_STORAGE_KEY, store);
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> => {
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
};

const sanitizeSavedAddress = (value: unknown): SavedAddress | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<SavedAddress>;
  const baseAddress = sanitizeAddress(
    {
      fullName: raw.fullName || "",
      phone: raw.phone || "",
      line1: raw.line1 || "",
      line2: raw.line2,
      landmark: raw.landmark,
      city: raw.city || "",
      state: raw.state || "",
      postalCode: raw.postalCode || "",
      tag: raw.tag,
    },
    raw.id
  );

  if (!baseAddress) {
    return null;
  }

  const tag = raw.tag === "Home" || raw.tag === "Work" || raw.tag === "Other" ? raw.tag : baseAddress.tag;

  return {
    ...baseAddress,
    tag,
    createdAt: normalizeString(raw.createdAt) || baseAddress.createdAt,
    updatedAt: normalizeString(raw.updatedAt) || baseAddress.updatedAt,
  };
};

const normalizePaymentMethod = (value: unknown): PaymentMethod => {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "cod") return "cod";
  if (normalized === "razorpay") return "razorpay";
  if (normalized === "upi") return "upi";
  if (normalized === "card") return "card";
  if (normalized === "netbanking") return "netbanking";
  if (normalized === "wallet") return "wallet";
  return "cod";
};

const normalizePaymentStatus = (value: unknown): CheckoutOrder["paymentStatus"] => {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "paid") return "paid";
  if (normalized === "pending") return "pending";
  return "cod_pending";
};

const normalizeOrderStatus = (value: unknown): CheckoutOrder["orderStatus"] => {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "confirmed") return "confirmed";
  return "placed";
};

const normalizeCheckoutOrder = (value: unknown, fallbackUserId: string): CheckoutOrder | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<CheckoutOrder>;
  const id = normalizeString(raw.id);
  if (!id) {
    return null;
  }

  const items = sanitizeCartItems(Array.isArray(raw.items) ? raw.items : []);
  if (items.length === 0) {
    return null;
  }

  const address = sanitizeSavedAddress(raw.address);
  if (!address) {
    return null;
  }

  const createdAt = normalizeString(raw.createdAt) || new Date().toISOString();
  const mode: CheckoutMode = raw.mode === "buy-now" ? "buy-now" : "cart";
  const userId = normalizeString(raw.userId) || fallbackUserId;

  return {
    id,
    userId,
    createdAt,
    mode,
    items,
    totals: computeCheckoutTotals(items),
    address,
    paymentMethod: normalizePaymentMethod(raw.paymentMethod),
    paymentStatus: normalizePaymentStatus(raw.paymentStatus),
    orderStatus: normalizeOrderStatus(raw.orderStatus),
    status:
      normalizeString((raw as any).status) === "Completed"
        ? "Completed"
        : normalizeString((raw as any).status) === "Disputed"
          ? "Disputed"
          : "Pending",
  };
};

const sortOrdersByCreatedAt = (orders: CheckoutOrder[]) =>
  [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

const readLocalOrders = (userId: string) => {
  const store = readOrderStore();
  const entries = Array.isArray(store[userId]) ? store[userId] : [];

  return sortOrdersByCreatedAt(
    entries
      .map((order) => normalizeCheckoutOrder(order, userId))
      .filter((order): order is CheckoutOrder => Boolean(order))
  );
};

const writeOrdersForUser = (userId: string, orders: CheckoutOrder[]) => {
  const store = readOrderStore();
  store[userId] = sortOrdersByCreatedAt(orders);
  writeOrderStore(store);
};

export const readCheckoutItems = (mode: CheckoutMode): StorefrontCartItem[] => {
  if (mode === "buy-now") {
    const selection = readBuyNowSelection();
    if (!selection) {
      return [];
    }

    return sanitizeCartItems([
      {
        product: selection.product,
        quantity: selection.quantity,
      },
    ]);
  }

  return sanitizeCartItems(readCart());
};

export const computeCheckoutTotals = (items: StorefrontCartItem[]): CheckoutTotals => {
  const safeItems = sanitizeCartItems(items);

  const subtotal = safeItems.reduce((sum, item) => sum + normalizePrice(item.product.price) * item.quantity, 0);
  const mrp = safeItems.reduce((sum, item) => {
    const effectiveMrp = normalizePrice(item.product.oldPrice) > 0 ? normalizePrice(item.product.oldPrice) : normalizePrice(item.product.price);
    return sum + effectiveMrp * item.quantity;
  }, 0);
  const savings = Math.max(0, mrp - subtotal);
  const shippingFee = subtotal > 0 && subtotal < 499 ? 49 : 0;
  const platformFee = safeItems.length > 0 ? 7 : 0;
  const total = Math.max(0, subtotal + shippingFee + platformFee);

  return {
    mrp,
    subtotal,
    savings,
    shippingFee,
    platformFee,
    total,
  };
};

export const readAddresses = (userId: string) => {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    return {
      addresses: [] as SavedAddress[],
      selectedAddressId: "",
    };
  }

  const store = readAddressStore();
  const entry = store[normalizedUserId];
  if (!entry) {
    return {
      addresses: [] as SavedAddress[],
      selectedAddressId: "",
    };
  }

  const addresses = Array.isArray(entry.addresses)
    ? entry.addresses.filter((item) => item && normalizeString(item.id))
    : [];

  return {
    addresses,
    selectedAddressId: normalizeString(entry.selectedAddressId),
  };
};

export const getSelectedAddress = (userId: string) => {
  const { addresses, selectedAddressId } = readAddresses(userId);
  if (addresses.length === 0) {
    return null;
  }

  return addresses.find((item) => item.id === selectedAddressId) || addresses[0] || null;
};

export const saveAddress = (userId: string, draft: AddressDraft, options?: { addressId?: string; setAsDefault?: boolean }) => {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    return null;
  }

  const { addresses, selectedAddressId } = readAddresses(normalizedUserId);
  const editingId = normalizeString(options?.addressId);
  const existing = editingId ? addresses.find((item) => item.id === editingId) : undefined;
  const nextAddress = sanitizeAddress(draft, editingId, existing);

  if (!nextAddress) {
    return null;
  }

  const nextAddresses = editingId
    ? addresses.map((item) => (item.id === editingId ? nextAddress : item))
    : [nextAddress, ...addresses];

  const nextSelectedAddressId = options?.setAsDefault === false
    ? selectedAddressId || nextAddress.id
    : nextAddress.id;

  const store = readAddressStore();
  store[normalizedUserId] = {
    selectedAddressId: nextSelectedAddressId,
    addresses: nextAddresses,
  };
  writeAddressStore(store);

  return nextAddress;
};

export const deleteAddress = (userId: string, addressId: string) => {
  const normalizedUserId = normalizeString(userId);
  const normalizedAddressId = normalizeString(addressId);
  if (!normalizedUserId || !normalizedAddressId) {
    return readAddresses(userId);
  }

  const { addresses, selectedAddressId } = readAddresses(normalizedUserId);
  const nextAddresses = addresses.filter((item) => item.id !== normalizedAddressId);

  const store = readAddressStore();
  store[normalizedUserId] = {
    selectedAddressId:
      selectedAddressId === normalizedAddressId
        ? nextAddresses[0]?.id || ""
        : selectedAddressId,
    addresses: nextAddresses,
  };
  writeAddressStore(store);

  return readAddresses(normalizedUserId);
};

export const setSelectedAddress = (userId: string, addressId: string) => {
  const normalizedUserId = normalizeString(userId);
  const normalizedAddressId = normalizeString(addressId);
  if (!normalizedUserId || !normalizedAddressId) {
    return;
  }

  const { addresses } = readAddresses(normalizedUserId);
  if (!addresses.some((item) => item.id === normalizedAddressId)) {
    return;
  }

  const store = readAddressStore();
  store[normalizedUserId] = {
    selectedAddressId: normalizedAddressId,
    addresses,
  };
  writeAddressStore(store);
};

export const seedAddressFromUserProfile = (user: AuthUser | null) => {
  if (!user?.id) {
    return null;
  }

  const existing = readAddresses(user.id);
  if (existing.addresses.length > 0) {
    return existing;
  }

  const hasAddress = Boolean(normalizeString(user.businessAddress) && normalizeString(user.city) && normalizeString(user.state));
  if (!hasAddress) {
    return existing;
  }

  const saved = saveAddress(
    user.id,
    {
      fullName: normalizeString(user.name) || "Saved Address",
      phone: normalizePhone(user.phone) || "0000000000",
      line1: normalizeString(user.businessAddress),
      city: normalizeString(user.city),
      state: normalizeString(user.state),
      postalCode: normalizeString(user.postalCode) || "000000",
      line2: normalizeString(user.sublocality) || undefined,
      tag: "Home",
    },
    { setAsDefault: true }
  );

  if (!saved) {
    return existing;
  }

  return readAddresses(user.id);
};

export const saveCheckoutDraft = (draft: ActiveCheckoutDraft) => {
  const normalizedUserId = normalizeString(draft.userId);
  if (!normalizedUserId) {
    return;
  }

  const store = readDraftStore();
  store[normalizedUserId] = {
    ...draft,
    userId: normalizedUserId,
    items: sanitizeCartItems(draft.items),
    totals: computeCheckoutTotals(draft.items),
    createdAt: normalizeString(draft.createdAt) || new Date().toISOString(),
  };
  writeDraftStore(store);
};

export const readCheckoutDraft = (userId: string) => {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    return null;
  }

  const store = readDraftStore();
  const draft = store[normalizedUserId];
  if (!draft) {
    return null;
  }

  const items = sanitizeCartItems(draft.items);
  if (items.length === 0) {
    return null;
  }

  return {
    ...draft,
    userId: normalizedUserId,
    items,
    totals: computeCheckoutTotals(items),
  };
};

export const clearCheckoutDraft = (userId: string) => {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    return;
  }

  const store = readDraftStore();
  if (!(normalizedUserId in store)) {
    return;
  }

  delete store[normalizedUserId];
  writeDraftStore(store);
};

export const readOrders = async (userId: string) => {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    return [] as CheckoutOrder[];
  }

  const localOrders = readLocalOrders(normalizedUserId);

  try {
    const payload = await requestJson<{ orders?: unknown[] }>("/api/orders/my");
    const remoteOrders = Array.isArray(payload.orders)
      ? payload.orders
          .map((order) => normalizeCheckoutOrder(order, normalizedUserId))
          .filter((order): order is CheckoutOrder => Boolean(order))
      : [];

    writeOrdersForUser(normalizedUserId, remoteOrders);
    return remoteOrders;
  } catch {
    return localOrders;
  }
};

export const readOrderById = async (userId: string, orderId: string) => {
  const normalizedUserId = normalizeString(userId);
  const normalizedOrderId = normalizeString(orderId);
  if (!normalizedUserId || !normalizedOrderId) {
    return null;
  }

  const localOrders = readLocalOrders(normalizedUserId);
  const localMatch = localOrders.find((order) => order.id === normalizedOrderId) || null;

  try {
    const payload = await requestJson<{ order?: unknown }>(`/api/orders/my/${encodeURIComponent(normalizedOrderId)}`);
    const remoteOrder = normalizeCheckoutOrder(payload.order, normalizedUserId);
    if (!remoteOrder) {
      return localMatch;
    }

    const mergedOrders = [remoteOrder, ...localOrders.filter((order) => order.id !== remoteOrder.id)];
    writeOrdersForUser(normalizedUserId, mergedOrders);
    return remoteOrder;
  } catch {
    return localMatch;
  }
};

export const placeOrder = async (input: {
  userId: string;
  mode: CheckoutMode;
  items: StorefrontCartItem[];
  totals: CheckoutTotals;
  address: SavedAddress;
  paymentMethod: PaymentMethod;
}) => {
  const normalizedUserId = normalizeString(input.userId);
  if (!normalizedUserId) {
    return null;
  }

  const items = sanitizeCartItems(input.items);
  if (items.length === 0) {
    return null;
  }

  const address = sanitizeSavedAddress(input.address);
  if (!address) {
    return null;
  }

  const computedTotals = computeCheckoutTotals(items);

  try {
    const payload = await requestJson<{ order?: unknown }>("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        mode: input.mode,
        items,
        totals: computedTotals,
        address,
        paymentMethod: input.paymentMethod,
      }),
    });

    const order = normalizeCheckoutOrder(payload.order, normalizedUserId);
    if (!order) {
      return null;
    }

    const existing = readLocalOrders(normalizedUserId).filter((entry) => entry.id !== order.id);
    writeOrdersForUser(normalizedUserId, [order, ...existing]);

    if (input.mode === "buy-now") {
      clearBuyNowSelection();
    } else {
      clearCart();
    }

    clearCheckoutDraft(normalizedUserId);
    return order;
  } catch {
    return null;
  }
};

export const paymentMethodLabel = (method: PaymentMethod) => {
  if (method === "cod") return "Cash on Delivery";
  if (method === "razorpay") return "Razorpay";
  if (method === "upi") return "UPI";
  if (method === "card") return "Card";
  if (method === "netbanking") return "Net Banking";
  return "Wallet";
};
