"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { buildProductSlug } from "@/data/productSlug";
import {
  readWishlist,
  toggleWishlist,
  addToCart,
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
  const router = useRouter();

  const syncWishlist = () => {
    setItems(readWishlist());
  };

  useEffect(() => {
    syncWishlist();

    const onWishlistUpdate = () => {
      syncWishlist();
    };

    window.addEventListener("shop:wishlist-updated", onWishlistUpdate as EventListener);
    window.addEventListener("storage", onWishlistUpdate);

    return () => {
      window.removeEventListener("shop:wishlist-updated", onWishlistUpdate as EventListener);
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
    // Visual indicator or redirect to cart
    router.push("/cart");
  };

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#f1f3f6] px-2 py-3 sm:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-none space-y-0">
        <header className="bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="brand-wordmark text-[1.25rem] font-bold text-[#1f2937]">My Wishlist</p>
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
              <Heart className="fill-blue-100 text-blue-600" size={26} />
            </div>
            <p className="text-lg font-semibold text-[#0f172a]">Your wishlist is empty</p>
            <p className="mt-1 text-sm text-[#64748b]">Save products you like here to purchase them later.</p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Explore Products
            </Link>
          </section>
        ) : (
          <div className="grid gap-4 bg-white p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const productHref = resolveProductHref(item);
              const vendorProfileHref = resolveVendorProfileHref(item);

              return (
                <div
                  key={item.id}
                  onClick={() => router.push(productHref)}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition duration-200 hover:shadow-md cursor-pointer"
                >
                  {/* Image */}
                  <div className="aspect-square w-full overflow-hidden bg-slate-50 relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
                    />
                    <button
                      onClick={(e) => handleRemove(item, e)}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-500 hover:text-red-500 hover:bg-white shadow transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col p-3">
                    <span className="text-[11px] font-semibold text-blue-600 hover:underline">
                      <Link href={vendorProfileHref} onClick={(e) => e.stopPropagation()}>
                        {item.sellerName}
                      </Link>
                    </span>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-800 flex-1">
                      {item.name}
                    </h3>

                    {/* Pricing */}
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-base font-bold text-slate-900">
                        {formatPrice(item.price)}
                      </span>
                      {item.oldPrice > item.price ? (
                        <span className="text-xs text-slate-400 line-through">
                          {formatPrice(item.oldPrice)}
                        </span>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={(e) => handleAddToCart(item, e)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors"
                      >
                        <ShoppingCart size={14} />
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
