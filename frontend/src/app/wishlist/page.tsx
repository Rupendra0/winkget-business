"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart, Trash2, ArrowLeft } from "lucide-react";
import { buildProductSlug } from "@/data/productSlug";
import {
  readWishlist,
  toggleWishlist,
  addToCart,
  getCartCount,
  type StorefrontStoredProduct,
} from "@/lib/shopStorage";

const formatPrice = (value: number) => `Rs. ${Math.max(0, Math.round(value)).toLocaleString("en-IN")}`;

const resolveProductHref = (item: StorefrontStoredProduct) => {
  const storedHref = String(item?.href || "").trim();
  if (storedHref && storedHref !== "/") {
    return storedHref;
  }

  const slug = buildProductSlug({
    id: item.id,
    name: item.name,
    storeId: item.storeId,
    sellerName: item.sellerName,
  });

  if (!slug) {
    return "/";
  }

  return `/product/${encodeURIComponent(slug)}`;
};

const resolveVendorProfileHref = (item: StorefrontStoredProduct) => {
  const storeId = String(item?.storeId || "").trim();
  if (!storeId) {
    return "/";
  }

  return `/listing/${encodeURIComponent(storeId)}`;
};

export default function WishlistPage() {
  const [items, setItems] = useState<StorefrontStoredProduct[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const router = useRouter();

  const syncWishlist = () => {
    setItems(readWishlist());
  };

  useEffect(() => {
    syncWishlist();
    setCartCount(getCartCount());

    const onWishlistUpdate = () => {
      syncWishlist();
    };

    const onCartUpdate = () => {
      setCartCount(getCartCount());
    };

    window.addEventListener("shop:wishlist-updated", onWishlistUpdate as EventListener);
    window.addEventListener("shop:cart-updated", onCartUpdate as EventListener);
    window.addEventListener("storage", onWishlistUpdate);

    return () => {
      window.removeEventListener("shop:wishlist-updated", onWishlistUpdate as EventListener);
      window.removeEventListener("shop:cart-updated", onCartUpdate as EventListener);
      window.removeEventListener("storage", onWishlistUpdate);
    };
  }, []);

  const handleRemove = (product: StorefrontStoredProduct, event: React.MouseEvent) => {
    event.stopPropagation();
    toggleWishlist(product);
    syncWishlist();
  };

  const handleAddToCart = (product: StorefrontStoredProduct, event: React.MouseEvent) => {
    event.stopPropagation();
    addToCart(product, 1);
    router.push("/cart");
  };

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#f1f3f6] pb-8">
      {/* Mobile-only Flipkart-style Blue Header */}
      <header className="flex md:hidden bg-[#2874f0] text-white px-4 py-3 items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white hover:opacity-90" aria-label="Back">
            <ArrowLeft size={20} strokeWidth={2.4} />
          </button>
          <div>
            <h1 className="text-sm font-bold leading-tight">My Wishlist</h1>
            <p className="text-[10px] text-blue-100 font-medium flex items-center gap-1 mt-0.5">
              <span className="h-1 w-1 bg-blue-200 rounded-full" />
              Private • {items.length} {items.length === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
        <Link href="/cart" className="relative text-white hover:opacity-90" aria-label="Cart">
          <ShoppingCart size={20} />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-[#2874f0]">
              {cartCount}
            </span>
          )}
        </Link>
      </header>

      {/* Desktop-only Header */}
      <header className="hidden md:block bg-white px-5 py-4 border-b border-slate-100">
        <div className="mx-auto w-full max-w-7xl flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">My Wishlist</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Private • {items.length} {items.length === 1 ? "item" : "items"}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95 shadow-sm"
          >
            Continue Shopping
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl mt-2 px-2 sm:px-4">
        {items.length === 0 ? (
          <section className="bg-white rounded-xl border border-slate-200/60 p-12 text-center mt-4">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600">
              <Heart className="fill-blue-100 text-blue-600" size={26} />
            </div>
            <p className="text-lg font-semibold text-[#0f172a]">Your wishlist is empty</p>
            <p className="mt-1 text-sm text-[#64748b]">Save products you like here to purchase them later.</p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition active:scale-95 shadow-sm"
            >
              Explore Products
            </Link>
          </section>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4 mt-2">
            {items.map((item) => {
              const productHref = resolveProductHref(item);
              const discountPercent = item.oldPrice > item.price 
                ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
                : 0;

              return (
                <div
                  key={item.id}
                  onClick={() => router.push(productHref)}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200/80 bg-white transition cursor-pointer"
                >
                  {/* Image Container */}
                  <div className="aspect-square w-full overflow-hidden bg-white relative border-b border-slate-100/50 flex items-center justify-center p-1.5">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain mx-auto transition duration-300 group-hover:scale-105"
                    />
                    <button
                      onClick={(e) => handleRemove(item, e)}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-400 hover:text-red-500 hover:bg-white border border-slate-100 transition-colors z-10"
                      title="Remove from wishlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="flex flex-1 flex-col p-2.5 md:p-3 justify-between">
                    <div className="space-y-1">
                      <h3 className="line-clamp-2 text-xs md:text-sm font-semibold text-slate-800 leading-snug h-8 md:h-10">
                        {item.name}
                      </h3>

                      {/* Pricing Row */}
                      <div className="flex items-baseline gap-1.5 flex-wrap pt-0.5">
                        <span className="text-xs md:text-sm font-bold text-slate-900">
                          {formatPrice(item.price)}
                        </span>
                        {item.oldPrice > item.price && (
                          <>
                            <span className="text-[10px] md:text-xs text-slate-400 line-through">
                              {formatPrice(item.oldPrice)}
                            </span>
                            {discountPercent > 0 && (
                              <span className="text-[10px] md:text-xs font-bold text-emerald-600">
                                ↓{discountPercent}%
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Rating and Assured Badge */}
                      <div className="flex items-center gap-1.5 pt-0.5 text-[9px] md:text-[11px] text-emerald-600 font-medium">
                        <span>★★★★★</span>
                        <span className="bg-blue-50 text-blue-600 px-1 py-0.2 rounded text-[7px] font-extrabold tracking-wide uppercase border border-blue-100 select-none scale-90 origin-left">
                          Assured
                        </span>
                      </div>
                    </div>

                    {/* Actions button */}
                    <div className="mt-3">
                      <button
                        onClick={(e) => handleAddToCart(item, e)}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-slate-200 bg-white hover:bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-600 transition-colors"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

