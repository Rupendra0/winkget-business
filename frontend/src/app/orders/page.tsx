"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Package, MapPin, ShoppingBag, Eye, Calendar, Clock, SlidersHorizontal, CreditCard } from "lucide-react";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { buildAuthHref } from "@/lib/authRedirect";
import { paymentMethodLabel, readOrders, type CheckoutOrder } from "@/lib/checkoutStore";
import { buildProductSlug } from "@/data/productSlug";

const formatPrice = (value: number) => `Rs. ${Math.max(0, Math.round(value)).toLocaleString("en-IN")}`;
const statusLabel = (value: CheckoutOrder["status"]) => value;

const statusClassName = (value: CheckoutOrder["status"]) => {
  if (value === "Completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }
  if (value === "Disputed") {
    return "bg-rose-50 text-rose-700 border-rose-100";
  }
  return "bg-amber-50 text-amber-800 border-amber-100";
};

const formatDate = (value: string) => {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    return "--";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<CheckoutOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [statusFilters, setStatusFilters] = useState({
    onTheWay: false,
    delivered: false,
    cancelled: false,
    returned: false,
  });

  const [timeFilters, setTimeFilters] = useState({
    last30Days: false,
    year2024: false,
    year2023: false,
    older: false,
  });

  useEffect(() => {
    const loadSession = async () => {
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        router.replace(buildAuthHref(pathname || "/orders"));
        return;
      }
      setUser(currentUser);
      const nextOrders = await readOrders(currentUser.id);
      setOrders(nextOrders);
      setLoading(false);
    };

    void loadSession();
  }, [pathname, router]);

  const placedOrderId = String(searchParams.get("placed") || "").trim();

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search Query filter (matches ID, product name, or seller name)
      const query = appliedSearchQuery.toLowerCase().trim();
      if (query) {
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesItems = order.items.some(
          (item) =>
            item.product.name.toLowerCase().includes(query) ||
            (item.product.sellerName || "").toLowerCase().includes(query)
        );
        if (!matchesId && !matchesItems) return false;
      }

      // 2. Status checkbox filter
      const { onTheWay, delivered, cancelled, returned } = statusFilters;
      if (onTheWay || delivered || cancelled || returned) {
        let isMatched = false;
        if (onTheWay && order.status === "Pending") isMatched = true;
        if (delivered && order.status === "Completed") isMatched = true;
        if (cancelled && order.status === "Disputed") isMatched = true;
        if (returned && (order.status as string) === "Returned") isMatched = true; // Placeholder for returned
        if (!isMatched) return false;
      }

      // 3. Time period checkbox filter
      const { last30Days, year2024, year2023, older } = timeFilters;
      if (last30Days || year2024 || year2023 || older) {
        const orderDate = new Date(order.createdAt);
        const orderYear = orderDate.getFullYear();
        const daysDiff = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24);

        let isMatched = false;
        if (last30Days && daysDiff <= 30) isMatched = true;
        if (year2024 && orderYear === 2024) isMatched = true;
        if (year2023 && orderYear === 2023) isMatched = true;
        if (older && orderYear < 2023) isMatched = true;
        if (!isMatched) return false;
      }

      return true;
    });
  }, [orders, appliedSearchQuery, statusFilters, timeFilters]);

  if (loading || !user) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-2 py-6 sm:px-4 lg:px-6">
        <div className="mx-auto h-64 w-full max-w-6xl animate-pulse bg-white rounded-xl" />
      </main>
    );
  }

  // Common Filters Content
  const renderFiltersContent = () => (
    <>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold text-slate-800">Filters</h3>
        {(Object.values(statusFilters).some(Boolean) || Object.values(timeFilters).some(Boolean)) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilters({ onTheWay: false, delivered: false, cancelled: false, returned: false });
              setTimeFilters({ last30Days: false, year2024: false, year2023: false, older: false });
            }}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="mt-4 space-y-6">
        {/* Order Status Filters */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Order Status</h4>
          <div className="space-y-2.5">
            {[
              { label: "On the way", key: "onTheWay" },
              { label: "Delivered", key: "delivered" },
              { label: "Cancelled", key: "cancelled" },
              { label: "Returned", key: "returned" },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={statusFilters[opt.key as keyof typeof statusFilters]}
                  onChange={(e) => {
                    setStatusFilters((prev) => ({ ...prev, [opt.key]: e.target.checked }));
                  }}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Order Time Filters */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Order Time</h4>
          <div className="space-y-2.5">
            {[
              { label: "Last 30 days", key: "last30Days" },
              { label: "2024", key: "year2024" },
              { label: "2023", key: "year2023" },
              { label: "Older", key: "older" },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={timeFilters[opt.key as keyof typeof timeFilters]}
                  onChange={(e) => {
                    setTimeFilters((prev) => ({ ...prev, [opt.key]: e.target.checked }));
                  }}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-2 py-4 sm:px-4 lg:px-12">
      <div className="mx-auto w-full max-w-6xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 px-1">
          <Link href="/" className="hover:text-blue-600 transition">Home</Link>
          <span>&gt;</span>
          <Link href="/profile" className="hover:text-blue-600 transition">My Account</Link>
          <span>&gt;</span>
          <span className="text-slate-700 font-semibold">My Orders</span>
        </div>

        {placedOrderId ? (
          <div className="hidden md:flex mb-4 px-1 text-sm font-bold text-emerald-700 items-center justify-between">
            <span>
              🎉 Order placed successfully! Order ID: <span className="font-mono">{placedOrderId}</span>
            </span>
            <button 
              type="button" 
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("placed");
                router.replace(`${pathname}?${params.toString()}`);
              }}
              className="text-xs font-bold text-emerald-700 hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-[260px_1fr]">
          {/* Left Column: Filters (Desktop only) */}
          <aside className="hidden md:block md:sticky md:top-24 self-start space-y-4">
            <div className="border border-slate-200/80 bg-white p-5 rounded-xl">
              {renderFiltersContent()}
            </div>
          </aside>

          {/* Right Column: Search Bar & Orders List */}
          <div className="space-y-4 min-w-0">
            {/* Search Bar */}
            <div className="sticky top-2 md:relative md:top-auto z-30 md:z-0 flex w-full overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
              <input
                type="text"
                placeholder="Search your orders here"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setAppliedSearchQuery(searchQuery);
                  }
                }}
                className="flex-1 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <button
                type="button"
                onClick={() => setAppliedSearchQuery(searchQuery)}
                className="inline-flex items-center gap-2 bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-95"
              >
                <Search size={16} strokeWidth={2.4} />
                <span className="hidden sm:inline">Search Orders</span>
              </button>
            </div>

            {/* Mobile-only Success Banner (Below Search Bar) */}
            {placedOrderId ? (
              <div className="md:hidden flex items-center justify-between gap-2 px-1 text-[10px] sm:text-xs font-bold text-emerald-700">
                <span className="truncate">
                  🎉 Order placed successfully! ID: <span className="font-mono">{placedOrderId}</span>
                </span>
                <button 
                  type="button" 
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("placed");
                    router.replace(`${pathname}?${params.toString()}`);
                  }}
                  className="underline shrink-0"
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            {/* List Header */}
            <div className="px-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-800">
                  {appliedSearchQuery ? "Search Results" : "My Orders"}
                </h2>
                {/* On desktop, show results count here */}
                <span className="hidden md:inline-flex text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1">
                  Showing {filteredOrders.length} of {orders.length} orders
                </span>
                {/* On mobile, show Filter button on the right edge */}
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
                  className="md:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95"
                >
                  <SlidersHorizontal size={13} className="text-slate-500" />
                  <span>Filter</span>
                </button>
              </div>

              {/* Collapsible Mobile Filters */}
              {isMobileFiltersOpen && (
                <div className="block md:hidden border border-slate-200/80 bg-white p-5 rounded-xl">
                  {renderFiltersContent()}
                </div>
              )}

              {/* On mobile, show results count below */}
              <div className="md:hidden flex items-center justify-between text-xs font-medium text-slate-500 px-1 py-1">
                <span>Showing {filteredOrders.length} of {orders.length} orders</span>
                {(Object.values(statusFilters).some(Boolean) || Object.values(timeFilters).some(Boolean)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilters({ onTheWay: false, delivered: false, cancelled: false, returned: false });
                      setTimeFilters({ last30Days: false, year2024: false, year2023: false, older: false });
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Orders Feed */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="border border-slate-200/80 bg-white p-10 text-center rounded-xl">
                  <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-slate-50 text-slate-400">
                    <Package size={26} />
                  </div>
                  <p className="text-lg font-bold text-slate-800">No orders found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {appliedSearchQuery 
                      ? "Try clearing your search query or adjusting your filters." 
                      : "Start shopping and place your first order."}
                  </p>
                  {appliedSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setAppliedSearchQuery("");
                      }}
                      className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const itemCount = order.items.reduce((count, item) => count + Math.max(1, Number(item.quantity || 1)), 0);
                  const paymentState = String(order.paymentStatus || "pending").replace(/_/g, " ");

                  return (
                    <div
                      key={order.id}
                      className="relative border border-slate-200/80 bg-white rounded-xl overflow-hidden hover:border-slate-300 transition"
                    >
                      {/* Stretched Link for clickable card */}
                      <Link
                        href={`/orders/${encodeURIComponent(order.id)}`}
                        className="absolute inset-0 z-10"
                        aria-label="View order details"
                      />

                      {/* Order Card Header */}
                      <header className="bg-slate-50/70 border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-3 text-xs text-slate-500 font-medium">
                        {/* Desktop Header */}
                        <div className="hidden md:flex flex-1 items-center justify-between">
                          <div>
                            <span>Order ID: <strong className="text-slate-700 font-mono">{order.id}</strong></span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Calendar size={13} className="text-slate-400" />
                            <span>Placed: <strong className="text-slate-700">{formatDate(order.createdAt)}</strong></span>
                          </div>
                        </div>

                        {/* Mobile Header */}
                        <div className="flex md:hidden flex-1 items-center justify-between gap-2">
                          <div>
                            <strong className="text-slate-700 font-mono">{order.id}</strong>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Calendar size={13} className="text-slate-400" />
                            <span className="text-slate-700">{formatDate(order.createdAt)}</span>
                          </div>
                        </div>
                      </header>

                      {/* Order Card Body */}
                      <div className="divide-y divide-slate-100">
                        {order.items.map((item, index) => {
                          const unitPrice = Number(item.product.price || 0);
                          const quantity = Math.max(1, Number(item.quantity || 1));
                          const productHref = `/product/${encodeURIComponent(
                            buildProductSlug({
                              id: item.product.id,
                              name: item.product.name,
                              storeId: item.product.storeId,
                              sellerName: item.product.sellerName,
                            })
                          )}`;

                          return (
                            <div key={`${item.product.id}-${index}`} className="flex gap-4 p-4 items-start">
                              {/* Product Image & Qty Column */}
                              <div className="flex flex-col items-center gap-2 shrink-0">
                                <Link
                                  href={productHref}
                                  className="relative z-20 block h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center rounded border border-slate-100 p-1 hover:opacity-90 transition bg-transparent"
                                >
                                  {item.product.image ? (
                                    <img
                                      src={item.product.image}
                                      alt={item.product.name}
                                      className="max-h-full max-w-full object-contain mx-auto"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="grid h-full w-full place-items-center bg-blue-50 text-xs font-bold text-blue-700">
                                      {item.product.name?.slice(0, 1).toUpperCase() || "P"}
                                    </div>
                                  )}{" "}
                                </Link>
                                <span className="md:hidden text-xs font-semibold text-slate-500">
                                  Qty: <strong className="text-slate-800">{quantity}</strong>
                                </span>
                              </div>

                              {/* Item Details */}
                              <div className="flex-1 min-w-0">
                                <h3 className="line-clamp-1 md:line-clamp-2 text-sm font-semibold text-slate-800 hover:text-blue-600 leading-snug">
                                  <Link href={productHref} className="relative z-20">{item.product.name}</Link>
                                </h3>

                                {/* Desktop-only metadata */}
                                <div className="hidden md:flex text-[11px] text-slate-400 mt-1 items-center gap-1.5 flex-wrap">
                                  <span>Seller: <strong className="text-slate-600">{item.product.sellerName || "Winkget Seller"}</strong></span>
                                  <span>•</span>
                                  <span>Qty: <strong className="text-slate-600">{quantity}</strong></span>
                                  <span>•</span>
                                  <span>Price: <strong className="text-slate-600">{formatPrice(unitPrice)}</strong></span>
                                </div>

                                {/* Mobile-only metadata */}
                                <div className="flex md:hidden text-[11px] text-slate-400 mt-1 items-center gap-1.5 flex-wrap">
                                  <span>Price: <strong className="text-slate-600">{formatPrice(unitPrice)}</strong></span>
                                </div>

                                {/* Badges */}
                                <div className="flex mt-2.5 flex-wrap items-center gap-2">
                                  {/* Delivery status */}
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusClassName(order.status)}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${order.status === "Completed" ? "bg-emerald-600" : order.status === "Disputed" ? "bg-rose-600" : "bg-amber-600"}`} />
                                    {statusLabel(order.status)}
                                  </span>

                                  {/* Payment method info */}
                                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200/60 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                    <CreditCard size={11} className="text-slate-400" />
                                    {paymentMethodLabel(order.paymentMethod)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Order Card Footer */}
                      <footer className="bg-slate-50/40 border-t border-slate-100 px-4 py-3 flex items-center justify-end gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-500">Total:</span>
                          <span className="text-sm font-bold text-slate-900">{formatPrice(order.totals.total)}</span>
                        </div>
                        <Link
                          href={`/orders/${encodeURIComponent(order.id)}`}
                          className="relative z-20 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-95"
                        >
                          <Eye size={12} strokeWidth={2.4} />
                          <span>Details</span>
                        </Link>
                      </footer>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
