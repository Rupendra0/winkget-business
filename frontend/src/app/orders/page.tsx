"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchCurrentUser, type AuthUser } from "@/lib/authClient";
import { buildAuthHref } from "@/lib/authRedirect";
import { paymentMethodLabel, readOrders, type CheckoutOrder } from "@/lib/checkoutStore";

const formatPrice = (value: number) => `Rs. ${Math.max(0, Math.round(value)).toLocaleString("en-IN")}`;
const statusLabel = (value: CheckoutOrder["status"]) => value;

const statusClassName = (value: CheckoutOrder["status"]) => {
  if (value === "Completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (value === "Disputed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
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

  if (loading || !user) {
    return (
      <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8">
        <div className="mx-auto h-64 w-full max-w-none animate-pulse rounded-3xl border border-white/80 bg-white/80 p-6 shadow-xl" />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-4 sm:px-6 lg:px-8 py-8">
      <div className="mx-auto w-full max-w-none rounded-3xl border border-blue-100/80 bg-white/88 p-5 shadow-[0_18px_42px_rgba(30,64,175,0.12)] sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-s sm:text-3xl font-bold text-slate-900">My Orders</h2>
          </div>

          <p className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Total Orders: {orders.length}
          </p>
        </div>

        {placedOrderId ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Order placed successfully. Order ID: <span className="font-semibold">{placedOrderId}</span>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">No orders yet.</p>
              <p className="mt-1">Start shopping and place your first order.</p>
            </div>
          ) : (
            orders.map((order) => {
              const itemCount = order.items.reduce((count, item) => count + Math.max(1, Number(item.quantity || 1)), 0);
              const leadItem = order.items[0] || null;
              const deliveryCity = order.address?.city || "City";
              const paymentState = String(order.paymentStatus || "pending").replace(/_/g, " ");

              return (
                <Link
                  key={order.id}
                  href={`/orders/${encodeURIComponent(order.id)}`}
                  className="group block rounded-2xl border border-[#dbe7ff] bg-white p-4 shadow-[0_10px_24px_rgba(30,64,175,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(30,64,175,0.14)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="mt-0.5 text-xs font-medium text-slate-600">Placed on {formatDate(order.createdAt)}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatPrice(order.totals.total)}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-xl border border-blue-200 bg-white">
                        {leadItem?.product?.image ? (
                          <img
                            src={leadItem.product.image}
                            alt={leadItem.product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-blue-50 text-xs font-bold text-blue-700">
                            {leadItem?.product?.name?.slice(0, 1).toUpperCase() || "P"}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{leadItem?.product?.name || "Order Items"}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClassName(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      <span className="px-2.5 py-1 text-[11px] font-bold">
                      {paymentMethodLabel(order.paymentMethod)}
                    </span>
                    <span className="px-2.5 py-1 text-[11px] font-bold">
                      Payment: {paymentState}
                    </span>
                      <span className="px-2.5 py-1 text-[11px] font-bold">
                      {order.mode === "buy-now" ? "Buy Now" : "Cart Order"}
                    </span>
                      <span className="px-2.5 py-1 text-[11px] font-bold">
                      Items: {itemCount}
                    </span>
                      </div>
                    </div>
                  </div>
                  {order.items.length > 1 ? (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      +{order.items.length - 1} more item{order.items.length - 1 > 1 ? "s" : ""}
                    </p>
                  ) : null}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
