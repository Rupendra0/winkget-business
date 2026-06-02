"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { buildAuthHref } from "@/lib/authRedirect";
import { paymentMethodLabel, readOrderById, type CheckoutOrder } from "@/lib/checkoutStore";

const formatPrice = (value: number) => `Rs. ${Math.max(0, Math.round(value || 0)).toLocaleString("en-IN")}`;
const formatDateTime = (value: string) => {
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

const formatStatus = (value: CheckoutOrder["status"]) => value;

const statusClassName = (value: CheckoutOrder["status"]) => {
  if (value === "Completed") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (value === "Disputed") {
    return "bg-rose-50 text-rose-700";
  }
  return "bg-amber-50 text-amber-800";
};

export default function OrderDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const orderId = typeof params?.id === "string" ? params.id : "";

  const [user, setUser] = useState<AuthUser | null>(null);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessionAndOrder = async () => {
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        router.replace(buildAuthHref(pathname || "/orders"));
        return;
      }

      setUser(currentUser);
      const nextOrder = await readOrderById(currentUser.id, orderId);
      setOrder(nextOrder);
      setLoading(false);
    };

    void loadSessionAndOrder();
  }, [orderId, pathname, router]);

  const itemCount = useMemo(() => {
    if (!order) return 0;
    return order.items.reduce((count, item) => count + Math.max(1, Number(item.quantity || 1)), 0);
  }, [order]);

  if (loading || !user) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-2 py-3 sm:px-4 lg:px-6">
        <div className="mx-auto h-72 w-full max-w-none animate-pulse bg-white" />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-2 py-3 sm:px-4 lg:px-6">
        <div className="mx-auto w-full max-w-none bg-white p-7">
          <p className="text-xl font-bold text-slate-900">Order not found</p>
          <p className="mt-2 text-sm text-slate-600">This order is unavailable or does not belong to your account.</p>
          <Link
            href="/orders"
            className="mt-5 inline-flex items-center justify-center rounded bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            Back to My Orders
          </Link>
        </div>
      </main>
    );
  }

  const paymentState = String(order.paymentStatus || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (token) => token.toUpperCase());

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-2 py-3 sm:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-none space-y-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/orders"
            className="inline-flex items-center rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            Back to My Orders
          </Link>

          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClassName(order.status)}`}>
            {formatStatus(order.status)}
          </span>
        </div>

        <section className="bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e5e7eb] pb-4">
            <div>
              <p className="text-lg font-bold uppercase tracking-[0.1em] text-blue-700">Order Details</p>
              <p className="mt-1 text-xs font-bold text-slate-600 sm:text-s">Order id : {order.id}</p>
              <p className="mt-1 text-xs font-medium text-slate-600">Placed on {formatDateTime(order.createdAt)}</p>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Amount</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{formatPrice(order.totals.total)}</p>
              <p className="mt-1 text-xs font-medium text-slate-600">{itemCount} item{itemCount > 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-0 bg-white">
                <div className="mt-3 space-y-3">
                  {order.items.map((item) => (
                    <div key={`${order.id}-${item.product.id}`} className="flex items-center gap-3 border-b border-[#e5e7eb] bg-slate-50 p-3 last:border-b-0">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-white">
                        {item.product.image ? (
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-slate-100 text-xs font-bold text-slate-500">P</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.product.name}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-600">Qty: {Math.max(1, Number(item.quantity || 1))}</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatPrice(item.product.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              <article className="border-t border-[#e5e7eb] bg-white p-4">
                <p className="text-sm font-bold text-slate-900">Delivery Address</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{order.address.fullName}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {order.address.line1}
                  {order.address.line2 ? `, ${order.address.line2}` : ""}
                  {order.address.landmark ? `, ${order.address.landmark}` : ""}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {order.address.city}, {order.address.state} - {order.address.postalCode}
                </p>
                <p className="mt-1 text-sm text-slate-700">Phone: {order.address.phone}</p>
              </article>
            </div>

            <div className="border-t border-[#e5e7eb] bg-white xl:border-l xl:border-t-0 xl:border-[#e5e7eb]">
              <article className="bg-white p-4">
                <p className="text-sm font-bold text-slate-900">Price Details</p>

                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <span>MRP</span>
                    <span className="font-semibold">{formatPrice(order.totals.mrp)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatPrice(order.totals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-emerald-700">
                    <span>Savings</span>
                    <span className="font-semibold">-{formatPrice(order.totals.savings)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Shipping Fee</span>
                    <span className="font-semibold">{order.totals.shippingFee > 0 ? formatPrice(order.totals.shippingFee) : "Free"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Platform Fee</span>
                    <span className="font-semibold">{formatPrice(order.totals.platformFee)}</span>
                  </div>
                </div>

                <div className="mt-3 border-t border-[#e5e7eb] pt-3">
                  <div className="flex items-center justify-between gap-2 text-base font-bold text-slate-900">
                    <span>Total</span>
                    <span>{formatPrice(order.totals.total)}</span>
                  </div>
                </div>
              </article>

              <article className="border-t border-[#e5e7eb] bg-white p-4">
                <p className="text-sm font-bold text-slate-900">Payment & Order Info</p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p>
                    Payment Method: <span className="font-semibold">{paymentMethodLabel(order.paymentMethod)}</span>
                  </p>
                  <p>
                    Payment Status: <span className="font-semibold">{paymentState}</span>
                  </p>
                  <p>
                    Order Type: <span className="font-semibold">{order.mode === "buy-now" ? "Buy Now" : "Cart Order"}</span>
                  </p>
                  <p>
                    Order Status: <span className="font-semibold">{formatStatus(order.status)}</span>
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
