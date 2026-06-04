"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import { buildProductSlug } from "@/data/productSlug";
import {
  CART_UPDATED_EVENT,
  readCart,
  removeFromCart,
  setBuyNowSelection,
  setCartItemQuantity,
  type StorefrontCartItem,
} from "@/lib/shopStorage";
import { computeCheckoutTotals } from "@/lib/checkoutStore";

const formatPrice = (value: number) => `Rs. ${Math.max(0, Math.round(value)).toLocaleString("en-IN")}`;

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

export default function CartPage() {
  const [items, setItems] = useState<StorefrontCartItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const syncCart = () => {
      setItems(readCart());
    };

    syncCart();

    const onCartUpdate = () => {
      syncCart();
    };

    window.addEventListener(CART_UPDATED_EVENT, onCartUpdate as EventListener);
    window.addEventListener("storage", onCartUpdate);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, onCartUpdate as EventListener);
      window.removeEventListener("storage", onCartUpdate);
    };
  }, []);

  const totals = useMemo(() => computeCheckoutTotals(items), [items]);

  const totalUnits = useMemo(() => {
    return items.reduce((count, item) => count + Math.max(1, Number(item.quantity || 1)), 0);
  }, [items]);

  const updateQuantity = (productId: string, nextQuantity: number) => {
    const nextItems = setCartItemQuantity(productId, nextQuantity);
    setItems(nextItems);
  };

  const removeItem = (productId: string) => {
    const nextItems = removeFromCart(productId);
    setItems(nextItems);
  };

  const buyNowItem = (item: StorefrontCartItem) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    setBuyNowSelection(item.product, quantity);
    router.push("/checkout?mode=buy-now");
  };

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#f1f3f6] px-2 py-3 sm:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-none space-y-0">
        <header className="bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="brand-wordmark text-[1.25rem] font-bold text-[#1f2937]">Your Cart</p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Continue Shopping
            </Link>
          </div>
        </header>

        {items.length === 0 ? (
          <section className="bg-white p-10 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600">
              <ShoppingCart size={26} />
            </div>
            <p className="text-lg font-semibold text-[#0f172a]">Your cart is empty</p>
            <p className="mt-1 text-sm text-[#64748b]">Add products from stores, then come back here to checkout.</p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Explore Products
            </Link>
          </section>
        ) : (
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_350px]">
            <section className="divide-y divide-[#e5e7eb] bg-white">
              {items.map((item) => {
                const unitPrice = Number(item.product.price || 0);
                const quantity = Math.max(1, Number(item.quantity || 1));
                const lineTotal = unitPrice * quantity;
                const productHref = resolveProductHref(item);
                const vendorProfileHref = resolveVendorProfileHref(item);

                return (
                  <article
                    key={item.product.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(productHref)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(productHref);
                      }
                    }}
                    className="grid cursor-pointer gap-3 bg-white p-3 transition hover:bg-[#f8fafc] sm:grid-cols-[96px_minmax(0,1fr)]"
                  >
                    <div className="overflow-hidden rounded bg-blue-50/50">
                      <img src={item.product.image} alt={item.product.name} className="h-24 w-full object-contain" loading="lazy" />
                    </div>

                    <div className="space-y-2">
                      <p className="line-clamp-2 text-[1rem] font-semibold text-[#0f172a]">{item.product.name}</p>
                      <p className="text-xs text-[#6b7280]">
                        Seller:{" "}
                        <Link
                          href={vendorProfileHref}
                          onClick={(event) => event.stopPropagation()}
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          {item.product.sellerName || "Winkget Seller"}
                        </Link>
                      </p>

                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xl font-bold text-[#111827]">{formatPrice(unitPrice)}</p>
                        {Number(item.product.oldPrice || 0) > unitPrice ? (
                          <p className="text-sm text-[#94a3b8] line-through">{formatPrice(Number(item.product.oldPrice || 0))}</p>
                        ) : null}
                        <p className="text-sm font-semibold text-[#166534]">Total: {formatPrice(lineTotal)}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center rounded-lg border border-[#ced8ee] bg-white">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateQuantity(item.product.id, quantity - 1);
                            }}
                            className="grid h-8 w-8 place-items-center text-[#374151] hover:bg-blue-50"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-10 text-center text-sm font-semibold text-[#0f172a]">{quantity}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              updateQuantity(item.product.id, quantity + 1);
                            }}
                            className="grid h-8 w-8 place-items-center text-[#374151] hover:bg-blue-50"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeItem(item.product.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#f3c5c5] bg-[#fff5f5] px-2.5 py-1.5 text-xs font-semibold text-[#b91c1c] hover:bg-[#ffeceb]"
                        >
                          <Trash2 size={14} /> Remove
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            buyNowItem(item);
                          }}
                          className="inline-flex items-center rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit border-t border-[#e5e7eb] bg-white p-4 lg:border-l lg:border-t-0 lg:border-[#e5e7eb]">
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
                  <span>You Save</span>
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

              <div className="mt-3 border-t border-dashed border-[#d5deea] pt-3">
                <div className="flex items-center justify-between text-lg font-bold text-[#0f172a]">
                  <span>Total Payable</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
              </div>

              <Link
                href="/checkout?mode=cart"
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
              >
                Proceed to Checkout
              </Link>

              <p className="mt-3 flex items-center gap-1.5 text-xs text-[#475569]">
                <ShieldCheck size={14} className="text-[#16a34a]" /> Secure checkout with trusted payment options
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
