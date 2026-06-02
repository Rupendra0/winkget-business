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
    return "bg-emerald-50 text-emerald-700";
  }
  if (value === "Disputed") {
    return "bg-rose-50 text-rose-700";
  }
  return "bg-amber-50 text-amber-800";
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
      <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-2 py-3 sm:px-4 lg:px-6">
        <div className="mx-auto h-64 w-full max-w-none animate-pulse bg-white p-6" />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f1f3f6] px-2 py-3 sm:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-none bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-s sm:text-3xl font-bold text-slate-900">My Orders</h2>
          </div>

          <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Total Orders: {orders.length}
          </p>
        </div>

        {placedOrderId ? (
          <div className="mt-4 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Order placed successfully. Order ID: <span className="font-semibold">{placedOrderId}</span>
          </div>
        ) : null}

        <div className="mt-6 divide-y divide-[#e5e7eb] bg-white">
          {orders.length === 0 ? (
            <div className="bg-slate-50 p-5 text-sm text-slate-600">
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
                  className="group block bg-white p-4 transition hover:bg-[#f8fafc]"
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
                      <div className="h-14 w-14 overflow-hidden rounded bg-white">
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
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClassName(order.status)}`}>
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
