"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  Lock,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { buildProductSlug } from "@/data/productSlug";
import { AUTH_BACKEND_URL, fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { buildAuthHref } from "@/lib/authRedirect";
import {
  computeCheckoutTotals,
  readAddresses,
  readCheckoutItems,
  saveAddress,
  saveCheckoutDraft,
  seedAddressFromUserProfile,
  setSelectedAddress,
  type AddressDraft,
  type CheckoutMode,
  type SavedAddress,
} from "@/lib/checkoutStore";
import { type StorefrontCartItem } from "@/lib/shopStorage";

const formatPrice = (value: number) => `Rs. ${Math.max(0, Math.round(value)).toLocaleString("en-IN")}`;

const EMPTY_ADDRESS_DRAFT: AddressDraft = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  postalCode: "",
  tag: "Home",
};

const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);

const toAddressDraft = (address: SavedAddress): AddressDraft => ({
  fullName: address.fullName,
  phone: address.phone,
  line1: address.line1,
  line2: address.line2 || "",
  landmark: address.landmark || "",
  city: address.city,
  state: address.state,
  postalCode: address.postalCode,
  tag: address.tag,
});

const resolveProductHref = (item: StorefrontCartItem) => {
  const storedHref = String(item?.product?.href || "").trim();
  if (storedHref && storedHref !== "/") {
    return storedHref;
  }

  const slug = buildProductSlug({
    id: item.product.id,
    name: item.product.name,
    storeId: item.product.storeId,
    sellerName: item.product.sellerName,
  });

  if (!slug) {
    return "/";
  }

  return `/product/${encodeURIComponent(slug)}`;
};

const resolveVendorProfileHref = (item: StorefrontCartItem) => {
  const storeId = String(item?.product?.storeId || "").trim();
  if (!storeId) {
    return "/";
  }

  return `/listing/${encodeURIComponent(storeId)}`;
};

export default function CheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const mode = (searchParams.get("mode") === "buy-now" ? "buy-now" : "cart") as CheckoutMode;
  const currentPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<StorefrontCartItem[]>([]);
  const [selectedAddressId, setSelectedAddressIdState] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(EMPTY_ADDRESS_DRAFT);
  const [addressError, setAddressError] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      setItems(readCheckoutItems(mode));
    }
  }, [mode, isMounted]);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      setAuthChecked(false);
      const currentUser = await fetchCurrentUser();
      if (!active) return;

      setUser(currentUser);

      if (currentUser?.id) {
        seedAddressFromUserProfile(currentUser);
        const nextAddressState = readAddresses(currentUser.id);
        setAddresses(nextAddressState.addresses);
        setSelectedAddressIdState(nextAddressState.selectedAddressId || nextAddressState.addresses[0]?.id || "");
        setShowAddressForm(nextAddressState.addresses.length === 0);
      } else {
        setAddresses([]);
        setSelectedAddressIdState("");
      }

      setAuthChecked(true);
    };

    void loadSession();

    const handleAuthChange = () => {
      if (active) void loadSession();
    };
    window.addEventListener("auth:changed", handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener("auth:changed", handleAuthChange);
    };
  }, []);

  const totals = useMemo(() => computeCheckoutTotals(items), [items]);

  const selectedAddress = useMemo(() => {
    if (addresses.length === 0) return null;
    return addresses.find((item) => item.id === selectedAddressId) || addresses[0] || null;
  }, [addresses, selectedAddressId]);

  const totalUnits = useMemo(() => {
    return items.reduce((count, item) => count + Math.max(1, Number(item.quantity || 1)), 0);
  }, [items]);

  const syncPrimaryAddressToProfile = async (nextAddress: SavedAddress) => {
    if (!user) {
      return;
    }

    const normalizedName = String(user.name || "").trim();
    const normalizedEmail = String(user.email || "").trim().toLowerCase();
    const normalizedPhone = normalizePhone(String(user.phone || ""));

    if (!normalizedName || (!normalizedEmail && !normalizedPhone)) {
      return;
    }

    try {
      await fetch(`${AUTH_BACKEND_URL}/api/auth/me`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone,
          businessAddress: nextAddress.line1,
          sublocality: nextAddress.line2 || "",
          city: nextAddress.city,
          state: nextAddress.state,
          postalCode: nextAddress.postalCode,
        }),
      });
    } catch {
      // Address is still saved locally even if profile sync fails.
    }
  };

  const handleAddressSelect = (addressId: string) => {
    if (!user?.id) {
      return;
    }

    setSelectedAddress(user.id, addressId);
    setSelectedAddressIdState(addressId);
  };

  const handleAddressSelectFromPicker = (addressId: string) => {
    handleAddressSelect(addressId);
    setIsAddressPickerOpen(false);
  };

  const handleAddressSave = async () => {
    if (!user?.id || savingAddress) {
      return;
    }

    setAddressError("");
    setSavingAddress(true);

    const saved = saveAddress(user.id, addressDraft, {
      addressId: editingAddressId || undefined,
      setAsDefault: true,
    });

    if (!saved) {
      setAddressError("Please fill full name, phone, address, city, state and postal code.");
      setSavingAddress(false);
      return;
    }

    await syncPrimaryAddressToProfile(saved);

    const nextAddressState = readAddresses(user.id);
    setAddresses(nextAddressState.addresses);
    setSelectedAddressIdState(nextAddressState.selectedAddressId || saved.id);
    setIsAddressPickerOpen(false);
    setShowAddressForm(false);
    setEditingAddressId("");
    setAddressDraft(EMPTY_ADDRESS_DRAFT);
    setSavingAddress(false);
  };

  const openAddAddress = () => {
    setIsAddressPickerOpen(false);
    setEditingAddressId("");
    setAddressDraft({
      ...EMPTY_ADDRESS_DRAFT,
      fullName: String(user?.name || "").trim(),
      phone: normalizePhone(String(user?.phone || "")),
    });
    setAddressError("");
    setShowAddressForm(true);
  };

  const openEditAddress = (address: SavedAddress) => {
    setIsAddressPickerOpen(false);
    setEditingAddressId(address.id);
    setAddressDraft(toAddressDraft(address));
    setAddressError("");
    setShowAddressForm(true);
  };

  const openAddressPicker = () => {
    if (!user || addresses.length === 0) {
      return;
    }

    setIsAddressPickerOpen(true);
  };

  const handleContinueToPayment = () => {
    if (!user?.id || !selectedAddress || items.length === 0) {
      return;
    }

    saveCheckoutDraft({
      userId: user.id,
      mode,
      items,
      totals,
      addressId: selectedAddress.id,
      createdAt: new Date().toISOString(),
    });

    router.push("/checkout/payment");
  };

  if (!isMounted) {
    return (
      <main className="page-scaled-fonts min-h-[calc(100vh-84px)] bg-[#f1f3f6] px-0 pt-0 pb-44 sm:px-4 lg:px-12 lg:pb-6">
        <div className="mx-auto w-full max-w-6xl animate-pulse space-y-4 pt-0 sm:pt-4">
          <div className="h-12 bg-white rounded border border-gray-200" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="h-96 bg-white rounded border border-gray-200" />
            <div className="h-64 bg-white rounded border border-gray-200" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-scaled-fonts min-h-[calc(100vh-84px)] bg-[#f1f3f6] px-0 pt-0 pb-44 sm:px-4 lg:px-12 lg:pb-6">
      <div className="mx-auto w-full max-w-6xl space-y-0 pt-0 sm:pt-0">
        {items.length === 0 ? (
          <div className="border-none sm:border sm:rounded-2xl overflow-hidden bg-white divide-y divide-gray-100">
            {/* Header */}
            <header className="bg-white py-4 px-4 flex items-center justify-between sticky top-0 z-30 sm:relative sm:top-auto sm:z-auto">
              <div className="flex items-center gap-3">
                <ShoppingBag size={22} className="text-[#1f2937] shrink-0" />
                <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600">
                <Lock size={12} className="text-gray-500" />
                <span>100% Secure</span>
              </div>
            </header>

            {/* Steps row */}
            <div className="bg-slate-50/50 flex flex-wrap items-center gap-4 px-4 py-3 text-xs sm:text-sm border-b border-gray-100">
              <div className="inline-flex items-center gap-2 font-semibold text-[#1f2937]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-xs text-blue-700 font-bold">1</span>
                Address
              </div>
              <div className="inline-flex items-center gap-2 font-semibold text-[#1f2937]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white font-bold">2</span>
                Order Summary
              </div>
              <div className="inline-flex items-center gap-2 text-[#64748b]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e5e7eb] text-xs font-bold">3</span>
                Payment
              </div>
            </div>
            <section className="bg-white p-8 text-center">
              <p className="text-lg font-semibold text-[#0f172a]">No items available for checkout</p>
              <p className="mt-1 text-sm text-[#64748b]">Add products to cart or click Buy Now on a product page.</p>
              <Link
                href="/cart"
                className="mt-4 inline-flex items-center rounded px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-blue-50"
              >
                Open Cart
              </Link>
            </section>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] pt-4">
            <section className="space-y-0 border-none sm:border sm:rounded-2xl overflow-hidden bg-white divide-y divide-gray-100">
              
              {/* Header */}
              <header className="bg-white py-4 px-4 flex items-center justify-between sticky top-0 z-30 sm:relative sm:top-auto sm:z-auto">
                <div className="flex items-center gap-3">
                  <ShoppingBag size={22} className="text-[#1f2937] shrink-0" />
                  <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600">
                  <Lock size={12} className="text-gray-500" />
                  <span>100% Secure</span>
                </div>
              </header>

              {/* Steps row */}
              <div className="bg-slate-50/50 sticky top-[60px] z-20 sm:relative sm:top-auto sm:z-auto flex flex-wrap items-center gap-4 px-4 py-3 text-xs sm:text-sm border-b border-gray-100">
                <div className="inline-flex items-center gap-2 font-semibold text-[#1f2937]">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-xs text-blue-700 font-bold">1</span>
                  Address
                </div>
                <div className="inline-flex items-center gap-2 font-semibold text-[#1f2937]">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white font-bold">2</span>
                  Order Summary
                </div>
                <div className="inline-flex items-center gap-2 text-[#64748b]">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e5e7eb] text-xs font-bold">3</span>
                  Payment
                </div>
              </div>
              <article className="bg-white p-4 sm:p-6 select-none">
                {!authChecked ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#64748b]">Delivery Address</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-[#64748b]">Checking login status...</p>
                  </>
                ) : !user ? (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#64748b]">Delivery Address</p>
                      </div>
                    </div>
                    <div className="mt-3 bg-blue-50 p-3">
                      <p className="text-sm font-semibold text-blue-900">Login required to place order</p>
                      <p className="mt-1 text-xs text-blue-800">Please login or signup before continuing to payment.</p>
                      <Link
                        href={buildAuthHref(currentPath)}
                        className="mt-3 inline-flex items-center rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Login / Signup
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    {addresses.length > 0 && !showAddressForm && selectedAddress ? (
                      <div className="w-full text-left space-y-2">
                        {/* Top row: Deliver to: and Change button */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800">Deliver to:</span>
                          <button
                            type="button"
                            onClick={openAddressPicker}
                            className="border border-gray-200 hover:border-gray-300 px-4 py-1 text-xs font-semibold text-blue-600 hover:bg-slate-50 transition rounded bg-white shadow-sm"
                          >
                            Change
                          </button>
                        </div>

                        {/* Name and tag */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-gray-950">{selectedAddress.fullName}</span>
                          <span className="bg-gray-100 text-[10px] font-bold text-gray-500 px-1.5 py-0.5 rounded tracking-wide uppercase">
                            {selectedAddress.tag}
                          </span>
                        </div>

                        {/* Address details */}
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {selectedAddress.line1}
                          {selectedAddress.line2 ? `, ${selectedAddress.line2}` : ""}
                          {selectedAddress.landmark ? `, ${selectedAddress.landmark}` : ""}
                          {`, ${selectedAddress.city}`}
                          {selectedAddress.state ? `, ${selectedAddress.state}` : ""}
                          {` ${selectedAddress.postalCode}`}
                        </p>

                        {/* Phone number */}
                        <p className="text-sm text-gray-700">
                          {selectedAddress.phone}
                        </p>
                      </div>
                    ) : null}

                    {showAddressForm ? (
                      <div className="mt-3 space-y-3 p-3">
                        <p className="text-sm font-semibold text-[#0f172a]">
                          {editingAddressId ? "Edit Address" : "Add Delivery Address"}
                        </p>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            value={addressDraft.fullName}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, fullName: event.target.value }))}
                            placeholder="Full name"
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                          />
                          <input
                            type="tel"
                            value={addressDraft.phone}
                            onChange={(event) =>
                              setAddressDraft((current) => ({ ...current, phone: normalizePhone(event.target.value) }))
                            }
                            placeholder="Phone number"
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                          />
                        </div>

                        <input
                          type="text"
                          value={addressDraft.line1}
                          onChange={(event) => setAddressDraft((current) => ({ ...current, line1: event.target.value }))}
                          placeholder="House no, building, street"
                          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                        />

                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            value={addressDraft.line2 || ""}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, line2: event.target.value }))}
                            placeholder="Area, locality"
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                          />
                          <input
                            type="text"
                            value={addressDraft.landmark || ""}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, landmark: event.target.value }))}
                            placeholder="Landmark (optional)"
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                          />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          <input
                            type="text"
                            value={addressDraft.city}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, city: event.target.value }))}
                            placeholder="City"
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                          />
                          <input
                            type="text"
                            value={addressDraft.state}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, state: event.target.value }))}
                            placeholder="State"
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                          />
                          <input
                            type="text"
                            value={addressDraft.postalCode}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, postalCode: event.target.value }))}
                            placeholder="PIN code"
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {(["Home", "Work", "Other"] as const).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setAddressDraft((current) => ({ ...current, tag }))}
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                addressDraft.tag === tag
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-white text-[#475569]"
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>

                        {addressError ? (
                          <p className="inline-flex items-center gap-1 text-xs font-semibold text-[#b91c1c]">
                            <AlertCircle size={13} /> {addressError}
                          </p>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAddressSave()}
                            disabled={savingAddress}
                            className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {savingAddress ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                          </button>

                          {addresses.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddressForm(false);
                                setEditingAddressId("");
                                setAddressDraft(EMPTY_ADDRESS_DRAFT);
                              }}
                              className="rounded bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]"
                            >
                              Cancel
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {isAddressPickerOpen && addresses.length > 0 ? (
                      <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3"
                        onClick={() => setIsAddressPickerOpen(false)}
                      >
                        <section
                          className="w-full max-w-xl bg-white p-5 rounded-2xl shadow-xl border border-slate-100"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="text-base font-semibold text-[#0f172a]">Select Delivery Address</p>
                            <button
                              type="button"
                              onClick={openAddAddress}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition active:scale-95"
                            >
                              <Plus size={16} /> Add New
                            </button>
                          </div>

                          <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
                            {addresses.map((address) => {
                              const isSelected = selectedAddress?.id === address.id;

                              return (
                                <div
                                  key={address.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleAddressSelectFromPicker(address.id)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      handleAddressSelectFromPicker(address.id);
                                    }
                                  }}
                                  className={`w-full px-3 py-3 text-left transition rounded-xl ${
                                    isSelected
                                      ? "bg-blue-50 border border-blue-100"
                                      : "bg-white hover:bg-blue-50/20 border border-transparent"
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f172a]">
                                      {isSelected ? <Check size={14} className="text-blue-600" /> : null}
                                      {address.fullName}
                                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#475569] border border-slate-100">
                                        {address.tag}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openEditAddress(address);
                                      }}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2 text-sm font-bold text-orange-700 hover:bg-orange-100 hover:border-orange-300 transition active:scale-95"
                                    >
                                      <Pencil size={14} /> Edit
                                    </button>
                                  </div>
                                  <p className="mt-1 text-sm text-[#334155]">
                                    {address.line1}
                                    {address.line2 ? `, ${address.line2}` : ""}
                                    {address.landmark ? `, ${address.landmark}` : ""}
                                  </p>
                                  <p className="mt-1 text-xs text-[#64748b]">
                                    {address.city}, {address.state} - {address.postalCode} | {address.phone}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setIsAddressPickerOpen(false)}
                              className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-5 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition active:scale-95 shadow-sm"
                            >
                              Close
                            </button>
                          </div>
                        </section>
                      </div>
                    ) : null}
                  </>
                )}
              </article>

              <article className="bg-white">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#64748b]">Order Summary</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const unitPrice = Number(item.product.price || 0);
                    const quantity = Math.max(1, Number(item.quantity || 1));
                    const lineTotal = unitPrice * quantity;
                    const productHref = resolveProductHref(item);
                    const vendorProfileHref = resolveVendorProfileHref(item);

                    return (
                      <div
                        key={item.product.id}
                        onClick={() => router.push(productHref)}
                        className="cursor-pointer transition hover:bg-[#f8fafc] bg-white"
                      >
                        <div className="flex gap-4 p-4">
                          {/* Left Column: Image & Qty */}
                          <div className="w-20 sm:w-24 shrink-0 flex flex-col items-center">
                            <div className="block overflow-hidden rounded bg-gray-50 border border-gray-100 p-1 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center bg-white">
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                className="max-h-full max-w-full object-contain mx-auto"
                                loading="lazy"
                              />
                            </div>
                            <span className="mt-2 text-xs font-semibold text-[#475569]">Qty: {quantity}</span>
                          </div>

                          {/* Right Column: Title, Seller, Price, Total */}
                          <div className="flex-1 space-y-1 min-w-0">
                            <h3 className="line-clamp-1 md:line-clamp-2 text-sm font-semibold text-gray-900 leading-snug">
                              {item.product.name}
                            </h3>
                            <div className="text-[11px] text-gray-500">
                              Seller:{" "}
                              <span className="font-semibold text-blue-600">
                                {item.product.sellerName || "Winkget Seller"}
                              </span>
                            </div>

                            <div className="flex items-baseline gap-2 pt-1 flex-wrap">
                              <span className="text-base font-bold text-gray-900">{formatPrice(unitPrice)}</span>
                              {Number(item.product.oldPrice || 0) > unitPrice && (
                                <span className="text-xs text-gray-400 line-through">
                                  {formatPrice(Number(item.product.oldPrice || 0))}
                                </span>
                              )}
                            </div>

                            <div className="text-xs font-semibold text-emerald-600 mt-1">
                              Total: {formatPrice(lineTotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <aside className="h-fit border-y border-gray-200 sm:border sm:rounded-2xl bg-white p-6 space-y-4 mt-4 lg:sticky lg:top-24 lg:self-start lg:mt-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Price Details</p>

              <div className="mt-3 space-y-2 text-sm text-[#334155]">
                <div className="flex items-center justify-between">
                  <span>Items ({totalUnits})</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>MRP</span>
                  <span>{formatPrice(totals.mrp)}</span>
                </div>
                <div className="flex items-center justify-between text-[#166534]">
                  <span>Savings</span>
                  <span>-{formatPrice(totals.savings)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery Fee</span>
                  <span>{totals.shippingFee > 0 ? formatPrice(totals.shippingFee) : "Free"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Platform Fee</span>
                  <span>{formatPrice(totals.platformFee)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-[#d5deea] pt-3">
                <div className="flex items-center justify-between text-base font-bold text-gray-900">
                  <span>Total Payable</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={!user || !selectedAddress || items.length === 0}
                className="hidden lg:inline-flex mt-4 w-full items-center justify-center gap-1 rounded bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue <ChevronRight size={16} />
              </button>

              <div className="hidden lg:block">
                {!user ? (
                  <p className="mt-2 text-xs font-semibold text-[#b45309]">Login is required to continue payment.</p>
                ) : !selectedAddress ? (
                  <p className="mt-2 text-xs font-semibold text-[#b45309]">Please add/select an address to continue.</p>
                ) : null}
              </div>

              <div className="mt-3 space-y-1 text-xs text-[#475569]">
                <p className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#16a34a]" /> 100% secure payment checkout
                </p>
                <p className="inline-flex items-center gap-1.5">
                  <Truck size={14} className="text-[#2563eb]" /> Fast delivery updates on your orders page
                </p>
                <p className="inline-flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#0f766e]" /> Easy address management for repeat orders
                </p>
                <p className="inline-flex items-center gap-1.5">
                  <Home size={14} className="text-[#64748b]" /> Mode: {mode === "buy-now" ? "Buy Now" : "Cart Checkout"}
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar for Mobile View */}
      {items.length > 0 && (
        <div className="fixed bottom-[calc(62px+env(safe-area-inset-bottom))] left-0 right-0 z-40 flex flex-col border-t border-gray-200 bg-white lg:hidden">
          {/* Savings Ribbon */}
          {totals.savings > 0 && (
            <div className="bg-[#f0faf5] px-4 py-2 border-b border-[#e1f5eb] flex items-center justify-center gap-1.5 text-xs text-[#166534] font-bold">
              <span>You'll save {formatPrice(totals.savings)} on this order!</span>
            </div>
          )}
          
          {/* Main Price & Action Row */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex flex-col">
              {totals.savings > 0 && (
                <span className="text-[10px] text-gray-400 line-through leading-none">
                  {formatPrice(totals.mrp + totals.shippingFee + totals.platformFee)}
                </span>
              )}
              <span className="text-base font-bold text-gray-900 flex items-center gap-1 mt-0.5 leading-none">
                {formatPrice(totals.total)}
                <span className="text-gray-400 text-xs font-normal">ⓘ</span>
              </span>
            </div>
            
            {!user ? (
              <Link
                href={buildAuthHref(currentPath)}
                className="inline-flex items-center justify-center rounded bg-blue-600 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-blue-700 active:scale-95 leading-none"
              >
                Login
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={!selectedAddress}
                className="inline-flex items-center justify-center rounded bg-blue-600 px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-blue-700 active:scale-95 leading-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
