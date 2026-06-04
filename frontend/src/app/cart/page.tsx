"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Percent, ShieldCheck, ShoppingCart, Trash2, Zap } from "lucide-react";
import { buildProductSlug } from "@/data/productSlug";
import {
  CART_UPDATED_EVENT,
  readCart,
  removeFromCart,
  setBuyNowSelection,
  setCartItemQuantity,
  isWishlisted,
  toggleWishlist,
  type StorefrontCartItem,
  type StorefrontStoredProduct,
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

  const saveForLater = (product: StorefrontStoredProduct) => {
    if (!isWishlisted(product.id)) {
      toggleWishlist(product);
    }
    const nextItems = removeFromCart(product.id);
    setItems(nextItems);
  };

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#f1f3f6] px-0 pt-0 pb-44 sm:px-4 lg:px-12 lg:pb-6">
      <div className="mx-auto w-full max-w-6xl space-y-0">
        {items.length === 0 ? (
          <div className="border-y border-gray-200 sm:border sm:rounded-lg overflow-hidden bg-white divide-y divide-gray-100">
            <header className="bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={22} className="text-[#1f2937] shrink-0" />
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
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="border-y border-gray-200 sm:border sm:rounded-lg overflow-hidden bg-white divide-y divide-gray-100">
              <header className="bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={22} className="text-[#1f2937] shrink-0" />
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

              {items.map((item) => {
                const unitPrice = Number(item.product.price || 0);
                const quantity = Math.max(1, Number(item.quantity || 1));
                const lineTotal = unitPrice * quantity;
                const productHref = resolveProductHref(item);
                const vendorProfileHref = resolveVendorProfileHref(item);
                const oldPriceNum = Number(item.product.oldPrice || 0);
                const hasDiscount = oldPriceNum > unitPrice;
                const discountPercent = hasDiscount
                  ? Math.round(((oldPriceNum - unitPrice) / oldPriceNum) * 100)
                  : 0;

                return (
                  <div
                    key={item.product.id}
                    className="bg-white"
                  >
                    <div className="flex gap-4 p-4">
                      {/* Left Column: Image & Qty Dropdown */}
                      <div className="w-20 sm:w-24 shrink-0 flex flex-col items-center">
                        <Link
                          href={productHref}
                          className="block overflow-hidden rounded bg-gray-50 border border-gray-100 p-1 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center"
                        >
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="max-h-full max-w-full object-contain mx-auto"
                            loading="lazy"
                          />
                        </Link>
                        
                        {/* Dropdown Qty */}
                        <div className="mt-3 w-full">
                          <select
                            value={quantity}
                            onChange={(event) => {
                              updateQuantity(item.product.id, Number(event.target.value));
                            }}
                            className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 outline-none cursor-pointer focus:border-blue-500"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((q) => (
                              <option key={q} value={q}>
                                Qty: {q}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <span className="mt-1 text-[10px] font-medium text-pink-600">Only few left</span>
                      </div>

                      {/* Right Column: Title, Rating, Price, Delivery */}
                      <div className="flex-1 space-y-1 min-w-0">
                        <h3 className="line-clamp-1 md:line-clamp-2 text-sm font-semibold text-gray-900 hover:text-blue-600 leading-snug">
                          <Link
                            href={productHref}
                          >
                            {item.product.name}
                          </Link>
                        </h3>
                        
                        <div className="text-[11px] text-gray-500">
                          Seller:{" "}
                          <Link
                            href={vendorProfileHref}
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            {item.product.sellerName || "Winkget Seller"}
                          </Link>
                        </div>

                        {/* Star rating & Assured badge */}
                        <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                          <span className="bg-emerald-600 text-white text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 leading-none">
                            4.2 ★
                          </span>
                          <span className="text-gray-400 font-medium">(50)</span>
                          <span className="bg-gradient-to-r from-blue-600 to-sky-400 text-white font-extrabold px-1.5 py-0.5 rounded-sm text-[8px] tracking-wider ml-1 shadow-sm uppercase leading-none">
                            Assured
                          </span>
                        </div>

                        {/* Price Details */}
                        <div className="flex items-baseline gap-2 pt-1 flex-wrap">
                          <span className="text-base font-bold text-gray-900">{formatPrice(unitPrice)}</span>
                          {hasDiscount && (
                            <>
                              <span className="text-xs text-gray-400 line-through">{formatPrice(oldPriceNum)}</span>
                              <span className="text-xs font-semibold text-emerald-600">{discountPercent}% Off</span>
                            </>
                          )}
                        </div>

                        {/* WOW offer / savings banner */}
                        <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 flex-wrap">
                          <span>WOW! Buy at {formatPrice(unitPrice)}</span>
                          {hasDiscount && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="text-gray-500 font-normal">You save {formatPrice(oldPriceNum - unitPrice)}</span>
                            </>
                          )}
                        </div>

                        {/* Express Delivery promise */}
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 pt-1">
                          <span className="font-semibold text-gray-700">🚚 Delivery by Sat</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-emerald-600 font-semibold">Free Delivery</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row: Save for later, Remove, Buy now */}
                    <div className="flex items-center border-t border-gray-100 divide-x divide-gray-200 text-xs font-semibold text-gray-600 bg-gray-50/50">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          saveForLater(item.product);
                        }}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1.5 hover:bg-gray-100 hover:text-blue-700 transition"
                      >
                        <Heart size={14} className="text-gray-400" /> Save for later
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeItem(item.product.id);
                        }}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1.5 hover:bg-gray-100 hover:text-red-600 transition"
                      >
                        <Trash2 size={14} className="text-gray-400" /> Remove
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          buyNowItem(item);
                        }}
                        className="flex-1 py-2.5 flex items-center justify-center gap-1.5 hover:bg-gray-100 hover:text-blue-700 transition"
                      >
                        <Zap size={14} className="text-gray-400" /> Buy this now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="h-fit border-y border-gray-200 sm:border sm:rounded-lg bg-white p-6 space-y-4 mt-4 lg:sticky lg:top-24 lg:self-start lg:mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Price Details</p>

              <div className="space-y-2 text-sm text-[#334155]">
                <div className="flex items-center justify-between">
                  <span>Items ({totalUnits})</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>MRP</span>
                  <span>{formatPrice(totals.mrp)}</span>
                </div>
                <div className="flex items-center justify-between text-[#166534] font-medium">
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

              <div className="border-t border-dashed border-[#d5deea] pt-3">
                <div className="flex items-center justify-between text-base font-bold text-gray-900">
                  <span>Total Payable</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
              </div>

              {totals.savings > 0 && (
                <div className="bg-emerald-50 rounded-lg p-3 text-emerald-800 text-xs font-semibold border border-emerald-100">
                  🎉 You will save {formatPrice(totals.savings)} on this order!
                </div>
              )}

              <Link
                href="/checkout?mode=cart"
                className="hidden lg:inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition active:scale-[0.98]"
              >
                Proceed to Checkout
              </Link>

              <p className="flex items-center gap-1.5 text-xs text-[#475569] pt-1">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" /> Secure checkout with trusted payment options
              </p>
            </aside>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar for Mobile View */}
      {items.length > 0 && (
        <div className="fixed bottom-[calc(62px+env(safe-area-inset-bottom))] left-0 right-0 z-40 flex flex-col border-t border-gray-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
          {/* Green Savings Ribbon */}
          {totals.savings > 0 && (
            <div className="bg-[#f0faf5] px-4 py-2 border-b border-[#e1f5eb] flex items-center justify-center gap-1.5 text-xs text-[#166534] font-bold">
              <Percent size={12} className="text-emerald-600" />
              <span>You'll save {formatPrice(totals.savings)} on this order!</span>
            </div>
          )}
          
          {/* Main Price & Order Row */}
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
            
            <Link
              href="/checkout?mode=cart"
              className="rounded bg-blue-600 px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-blue-700 active:scale-95 leading-none"
            >
              Place Order
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
