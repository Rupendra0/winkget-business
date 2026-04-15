"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Home,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Truck,
} from "lucide-react";
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

export default function CheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const mode = (searchParams.get("mode") === "buy-now" ? "buy-now" : "cart") as CheckoutMode;
  const currentPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState(() => readCheckoutItems(mode));
  const [selectedAddressId, setSelectedAddressIdState] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(EMPTY_ADDRESS_DRAFT);
  const [addressError, setAddressError] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    setItems(readCheckoutItems(mode));
  }, [mode]);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      const currentUser = await fetchCurrentUser();
      if (!active) return;

      setUser(currentUser);

      if (currentUser?.id) {
        seedAddressFromUserProfile(currentUser);
        const nextAddressState = readAddresses(currentUser.id);
        setAddresses(nextAddressState.addresses);
        setSelectedAddressIdState(nextAddressState.selectedAddressId || nextAddressState.addresses[0]?.id || "");
        setShowAddressForm(nextAddressState.addresses.length === 0);
      }

      setAuthChecked(true);
    };

    void loadSession();
    return () => {
      active = false;
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
    setShowAddressForm(false);
    setEditingAddressId("");
    setAddressDraft(EMPTY_ADDRESS_DRAFT);
    setSavingAddress(false);
  };

  const openAddAddress = () => {
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
    setEditingAddressId(address.id);
    setAddressDraft(toAddressDraft(address));
    setAddressError("");
    setShowAddressForm(true);
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

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#f1f3f6] px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1180px] space-y-4">
        <header className="overflow-hidden rounded-2xl border border-[#d6e0fb] bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-sm">
            <div className="inline-flex items-center gap-2 font-semibold text-[#1f2937]">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-[#93c5fd] bg-[#dbeafe] text-xs">1</span>
              Address
            </div>
            <div className="inline-flex items-center gap-2 font-semibold text-[#1f2937]">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-[#93c5fd] bg-[#dbeafe] text-xs">2</span>
              Order Summary
            </div>
            <div className="inline-flex items-center gap-2 text-[#64748b]">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-[#cbd5e1] bg-white text-xs">3</span>
              Payment
            </div>
          </div>
        </header>

        {items.length === 0 ? (
          <section className="rounded-2xl border border-[#dde3ea] bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#0f172a]">No items available for checkout</p>
            <p className="mt-1 text-sm text-[#64748b]">Add products to cart or click Buy Now on a product page.</p>
            <Link
              href="/cart"
              className="mt-4 inline-flex items-center rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc]"
            >
              Open Cart
            </Link>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_350px]">
            <section className="space-y-3">
              <article className="rounded-2xl border border-[#dde3ea] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-[#64748b]">Delivery Address</p>
                  </div>

                  {user ? (
                    <button
                      type="button"
                      onClick={openAddAddress}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#c7d7ff] bg-[#f2f6ff] px-3 py-1.5 text-xs font-semibold text-[#1d4ed8] hover:bg-[#e7efff]"
                    >
                      <Plus size={14} /> Add New
                    </button>
                  ) : null}
                </div>

                {!authChecked ? (
                  <p className="mt-3 text-sm text-[#64748b]">Checking login status...</p>
                ) : !user ? (
                  <div className="mt-3 rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3">
                    <p className="text-sm font-semibold text-[#9a3412]">Login required to place order</p>
                    <p className="mt-1 text-xs text-[#9a3412]">Please login or signup before continuing to payment.</p>
                    <Link
                      href={buildAuthHref(currentPath)}
                      className="mt-3 inline-flex items-center rounded-lg bg-[#1d4ed8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e40af]"
                    >
                      Login / Signup
                    </Link>
                  </div>
                ) : (
                  <>
                    {addresses.length > 0 && !showAddressForm ? (
                      <div className="mt-3 space-y-2">
                        {addresses.map((address) => {
                          const isSelected = selectedAddress?.id === address.id;

                          return (
                            <button
                              type="button"
                              key={address.id}
                              onClick={() => handleAddressSelect(address.id)}
                              className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                                isSelected
                                  ? "border-[#2563eb] bg-[#eff6ff]"
                                  : "border-[#d8e0ea] bg-white hover:border-[#9db2d6]"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f172a]">
                                  {isSelected ? <Check size={14} className="text-[#2563eb]" /> : null}
                                  {address.fullName}
                                  <span className="rounded-full border border-[#cbd5e1] bg-white px-2 py-0.5 text-[10px] font-bold text-[#475569]">
                                    {address.tag}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEditAddress(address);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#cbd5e1] bg-white px-2 py-1 text-[11px] font-semibold text-[#334155] hover:bg-[#f8fafc]"
                                >
                                  <Pencil size={12} /> Edit
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
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {showAddressForm ? (
                      <div className="mt-3 space-y-3 rounded-xl border border-[#d9e3f2] bg-[#f8fbff] p-3">
                        <p className="text-sm font-semibold text-[#0f172a]">
                          {editingAddressId ? "Edit Address" : "Add Delivery Address"}
                        </p>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            value={addressDraft.fullName}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, fullName: event.target.value }))}
                            placeholder="Full name"
                            className="rounded-lg border border-[#cdd8ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                          />
                          <input
                            type="tel"
                            value={addressDraft.phone}
                            onChange={(event) =>
                              setAddressDraft((current) => ({ ...current, phone: normalizePhone(event.target.value) }))
                            }
                            placeholder="Phone number"
                            className="rounded-lg border border-[#cdd8ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                          />
                        </div>

                        <input
                          type="text"
                          value={addressDraft.line1}
                          onChange={(event) => setAddressDraft((current) => ({ ...current, line1: event.target.value }))}
                          placeholder="House no, building, street"
                          className="w-full rounded-lg border border-[#cdd8ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                        />

                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            type="text"
                            value={addressDraft.line2 || ""}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, line2: event.target.value }))}
                            placeholder="Area, locality"
                            className="rounded-lg border border-[#cdd8ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                          />
                          <input
                            type="text"
                            value={addressDraft.landmark || ""}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, landmark: event.target.value }))}
                            placeholder="Landmark (optional)"
                            className="rounded-lg border border-[#cdd8ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                          />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          <input
                            type="text"
                            value={addressDraft.city}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, city: event.target.value }))}
                            placeholder="City"
                            className="rounded-lg border border-[#cdd8ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                          />
                          <input
                            type="text"
                            value={addressDraft.state}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, state: event.target.value }))}
                            placeholder="State"
                            className="rounded-lg border border-[#cdd8ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                          />
                          <input
                            type="text"
                            value={addressDraft.postalCode}
                            onChange={(event) => setAddressDraft((current) => ({ ...current, postalCode: event.target.value }))}
                            placeholder="PIN code"
                            className="rounded-lg border border-[#cdd8ea] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {(["Home", "Work", "Other"] as const).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setAddressDraft((current) => ({ ...current, tag }))}
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                addressDraft.tag === tag
                                  ? "border-[#2563eb] bg-[#dbeafe] text-[#1d4ed8]"
                                  : "border-[#cbd5e1] bg-white text-[#475569]"
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
                            className="rounded-lg bg-[#2554d9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1f47b8] disabled:opacity-60"
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
                              className="rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]"
                            >
                              Cancel
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </article>

              <article className="rounded-2xl border border-[#dde3ea] bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#64748b]">Order Summary</p>
                <div className="mt-2 space-y-2">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-start gap-2 rounded-lg border border-[#e5eaf1] bg-[#f8fbff] px-3 py-2">
                      <img src={item.product.image} alt={item.product.name} className="h-12 w-12 rounded-md border border-[#dce4f2] bg-white object-contain" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold text-[#0f172a]">{item.product.name}</p>
                        <p className="mt-0.5 text-xs text-[#64748b]">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-[#0f172a]">
                        {formatPrice(Number(item.product.price || 0) * Math.max(1, Number(item.quantity || 1)))}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <aside className="h-fit rounded-2xl border border-[#dde3ea] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Payment Summary</p>

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

              <div className="mt-3 border-t border-dashed border-[#d8e0ea] pt-3">
                <div className="flex items-center justify-between text-lg font-bold text-[#0f172a]">
                  <span>Total Amount</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinueToPayment}
                disabled={!user || !selectedAddress || items.length === 0}
                className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#f5bf00] px-4 py-2.5 text-sm font-bold text-[#111827] hover:bg-[#e6b500] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue <ChevronRight size={16} />
              </button>

              {!user ? (
                <p className="mt-2 text-xs font-semibold text-[#b45309]">Login is required to continue payment.</p>
              ) : !selectedAddress ? (
                <p className="mt-2 text-xs font-semibold text-[#b45309]">Please add/select an address to continue.</p>
              ) : null}

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
    </main>
  );
}
