"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildProductSlug } from "@/data/productSlug";
import type { ProductDetailModel, RelatedProductModel } from "@/lib/storeCatalog";
import { addToCart, isWishlisted, makeStoreProduct, setBuyNowSelection, toggleWishlist } from "@/lib/shopStorage";

type ProductDetailPageClientProps = {
  product: ProductDetailModel;
  relatedProducts?: RelatedProductModel[];
};

export default function ProductDetailPageClient({
  product,
  relatedProducts = [],
}: ProductDetailPageClientProps) {
  const router = useRouter();
  const galleryImages = useMemo(() => {
    const deduped = Array.from(new Set([product.image, ...(product.gallery || [])].filter(Boolean)));
    return deduped.length > 0 ? deduped : [product.image];
  }, [product.gallery, product.image]);

  const [activeImage, setActiveImage] = useState(galleryImages[0] || product.image || "");
  const [quantity, setQuantity] = useState(1);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [wishlisted, setWishlisted] = useState(() => isWishlisted(product?.id));

  const productHref = `/product/${encodeURIComponent(buildProductSlug(product))}`;
  const storeProduct = useMemo(() => makeStoreProduct(product, productHref), [product, productHref]);

  const discountText = useMemo(() => {
    const discount = Number(product.discount) || 0; 
    return discount > 0 ? `${discount}% OFF` : "";
  }, [product.discount]);

  const shortDescription = useMemo(() => {
    const text = String(product.description || "");
    if (text.length <= 250) {
      return text;
    }

    return `${text.slice(0, 250)}...`;
  }, [product.description]);

  const currentPrice = Number(product.price) || 0;
  const hasPrice = currentPrice > 0;
  const oldPrice = Number(product.oldPrice) || currentPrice;
  const totalPrice = currentPrice * quantity;

  const onAddToCart = () => {
    addToCart(storeProduct, quantity);
  };

  const onSaveForLater = () => {
    const next = toggleWishlist(storeProduct);
    setWishlisted(next);
  };

  const onBuyNow = () => {
    setBuyNowSelection(storeProduct, quantity);
    router.push("/checkout?mode=buy-now");
  };

  return (
    <div className="space-y-4 px-3 pb-6 pt-3 sm:px-4 lg:px-6 xl:px-8">
      <nav className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 md:block">
        <Link href="/" className="hover:text-blue-700">
          Home
        </Link>
        <span className="px-2">/</span>
        <Link
          href={`/category/${encodeURIComponent(product.categorySlug || "")}`}
          className="hover:text-blue-700"
        >
          {product.categoryLabel || "Category"}
        </Link>
        <span className="px-2">/</span>
        <span className="text-slate-800">{product.subcategoryName || "Products"}</span>
      </nav>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="order-1 space-y-3">
            {/* Product Gallery */}
            <div className="relative flex flex-col gap-3">
              {/* Main Image */}
              <div className="relative mx-auto w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="h-[350px] w-full sm:h-[420px]">
                  <img src={activeImage} alt={product.name} className="h-full w-full object-contain" />
                </div>
                {discountText ? (
                  <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                    {discountText}
                  </span>
                ) : null}
                <div className="absolute right-3 top-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={onSaveForLater}
                    className={`grid h-9 w-9 place-items-center rounded-full border shadow-sm ${
                      wishlisted
                        ? "border-[#d41158]/30 bg-[#f2ece4] text-[#d41158]"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                      <path d="M12.001 4.529a5.998 5.998 0 0 1 8.484 8.485l-7.778 7.778a1 1 0 0 1-1.414 0l-7.778-7.778a6 6 0 0 1 8.486-8.485Zm0 2.122-1.415-1.414a4 4 0 1 0-5.656 5.656l7.071 7.071 7.071-7.071a4 4 0 1 0-5.656-5.656l-1.415 1.414Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
                  >
                    ↗
                  </button>
                </div>
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2 overflow-x-auto pb-1 md:max-h-[440px] md:flex-col md:overflow-x-hidden md:overflow-y-auto md:pr-1">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${product.id}-thumb-${index}`}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className={`shrink-0 overflow-hidden rounded-lg border bg-white p-0 ${
                      activeImage === image ? "border-blue-600 ring-1 ring-blue-200" : "border-slate-200"
                    }`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} className="h-[64px] w-[64px] object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-3 border-t border-slate-200 pt-3">
              <p className="text-sm text-blue-700 underline-offset-2 hover:underline">
                Visit the {product.sellerName} Store
              </p>
              <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{product.name}</h1>
              <p className="text-sm text-slate-500 sm:text-base">
                {Number(product.reviews) > 0
                  ? `${Number(product.rating || 0).toFixed(1)} rating from ${Number(product.reviews)} reviews`
                  : "Be the first to review this product"}
              </p>

              {/* Description */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm leading-6 text-slate-700">
                  {product.description
                    ? showFullDescription
                      ? product.description
                      : shortDescription
                    : "Description not provided by seller yet."}
                  {String(product.description || "").length > 250 ? (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription((prev) => !prev)}
                      className="ml-2 font-semibold text-blue-700"
                    >
                      {showFullDescription ? "Read Less" : "Read More"}
                    </button>
                  ) : null}
                </p>
              </div>

              {/* Key Attributes */}
              {product.keyAttributes.length > 0 ? (
                <div className="rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 px-3 py-2 text-base font-semibold text-slate-900 sm:text-lg">
                    Key Attributes
                  </div>
                  <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
                    {product.keyAttributes.slice(0, 4).map(([label, value], index) => (
                      <div key={`${label}-${index}`} className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-slate-700">{label}</p>
                        <p className="text-sm text-slate-600">{value}</p>
                      </div>
                    ))}
                  </div>
                  {product.keyAttributes.length > 4 ? (
                    <button type="button" className="px-3 pb-3 text-sm font-semibold text-blue-700">
                      View all attributes
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Sidebar - Price & Actions (Desktop) / Top (Mobile) */}
          <aside className="order-2 lg:order-1">
            <div className="sticky top-20 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:top-24">
              {/* Price Section */}
              <div className="space-y-2">
                <div className="flex items-end gap-2">
                  <p className="whitespace-nowrap text-2xl font-bold leading-none text-slate-900">
                    {hasPrice ? product.priceText : "Price on request"}
                  </p>
                  {oldPrice > currentPrice ? (
                    <p className="whitespace-nowrap pb-0.5 text-sm text-slate-400 line-through">{product.oldPriceText}</p>
                  ) : null}
                </div>
                {discountText ? (
                  <span className="inline-block rounded-full bg-emerald-500 px-2.5 py-0.5 text-sm font-semibold text-white">
                    {discountText}
                  </span>
                ) : null}
              </div>

              {/* Shipping & Delivery */}
              <div className="space-y-2 border-t border-slate-200 pt-2">
                <p className="text-xs font-medium text-emerald-700">{product.shippingLabel || "Shipping details not provided"}</p>
                {product.deliveryByText ? (
                  <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                    Delivery by <span className="font-semibold">{product.deliveryByText}</span>
                  </div>
                ) : null}
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 p-2">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-lg text-slate-700 transition hover:bg-slate-100"
                >
                  −
                </button>
                <span className="flex-1 text-center text-sm font-semibold text-slate-800">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => prev + 1)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-lg text-slate-700 transition hover:bg-slate-100"
                >
                  +
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onAddToCart}
                  disabled={!hasPrice}
                  className="rounded-lg border border-indigo-800 bg-indigo-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-900 disabled:opacity-50"
                >
                  ADD TO CART
                </button>
                <button
                  type="button"
                  onClick={onBuyNow}
                  disabled={!hasPrice}
                  className={`rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
                    hasPrice
                      ? "bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.35)]"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  BUY NOW
                </button>
              </div>

              {/* Save for Later */}
              <button
                type="button"
                onClick={onSaveForLater}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                {wishlisted ? "❤️ WISHLISTED" : "🤍 SAVE FOR LATER"}
              </button>

              {/* Total Price */}
              <div className="border-t border-slate-200 pt-2">
                <p className="text-xs text-slate-600">
                  {hasPrice ? (
                    <>
                      Total: <span className="font-semibold text-slate-900">Rs. {totalPrice.toLocaleString("en-IN")}</span>
                    </>
                  ) : (
                    <span className="font-semibold text-slate-700">Contact seller for pricing</span>
                  )}
                </p>
              </div>

              {/* Seller & Policy Info */}
              <div className="space-y-2 border-t border-slate-200 pt-2">
                <div className="rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-700 sm:text-sm">
                  <p>
                    Sold By: <span className="font-semibold text-[#d41158]">{product.sellerName}</span>
                  </p>
                  {product.vendorSource ? (
                    <p className="mt-1">
                      Vendor Source: <span className="text-blue-700">{product.vendorSource}</span>
                    </p>
                  ) : null}
                  <p className="mt-1 text-amber-500 font-medium">
                    {Number(product.rating || 0).toFixed(1)} / 5 ({Number(product.reviews || 0)} reviews)
                  </p>
                </div>

                <div className="rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs text-slate-700 sm:text-sm">
                  <p className="font-medium">
                    {typeof product.isCancellable === "boolean"
                      ? product.isCancellable
                        ? "✓ Cancellable"
                        : "✗ Not Cancellable"
                      : "Cancellation policy not specified"}
                  </p>
                  <p className="font-medium">
                    {typeof product.isReturnable === "boolean"
                      ? product.isReturnable
                        ? "✓ Returnable (7 days)"
                        : "✗ Not Returnable"
                      : "Return policy not specified"}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* About & Details Sections */}
      <section className="space-y-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">About Product</h2>
          {product.description ? (
            <p className="mt-3 text-sm leading-6 text-slate-700">{product.description}</p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-500">Description not provided by seller yet.</p>
          )}

          {product.highlights.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {product.highlights.map((item, index) => (
                <li key={`${product.id}-h-${index}`} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        {product.keyAttributes.length > 0 ? (
          <article className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">Product Details</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-300">
              {product.keyAttributes.map(([label, value], index) => (
                <div key={`${product.id}-${label}-${index}`} className="border-b border-slate-200 last:border-b-0">
                  <p className="bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{label}</p>
                  <p className="px-3 py-2 text-sm text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {product.specifications && product.specifications.length > 0 ? (
          <article className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">Technical Specifications</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-300">
              {product.specifications.map(([label, value], index) => (
                <div
                  key={`${product.id}-spec-${label}-${index}`}
                  className="border-b border-slate-200 last:border-b-0"
                >
                  <p className="bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{label}</p>
                  <p className="px-3 py-2 text-sm text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </section>

      {/* Related Products Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Other Products You May Like</h2>
          {product.categorySlug ? (
            <Link
              href={`/category/${encodeURIComponent(product.categorySlug)}`}
              className="text-xs font-semibold text-blue-700 hover:underline sm:text-sm"
            >
              View all
            </Link>
          ) : null}
        </div>

        {relatedProducts.length ? (
          <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {relatedProducts.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-2 sm:p-3">
                <Link href={item.href} className="block overflow-hidden rounded-lg border border-slate-100 bg-white">
                  <img src={item.image} alt={item.name} className="h-28 w-full bg-white p-1 object-contain sm:h-36" />
                </Link>
                <Link href={item.href} className="mt-2 block line-clamp-2 text-xs font-semibold text-slate-800 hover:text-blue-700 sm:text-sm">
                  {item.name}
                </Link>
                <p className="mt-1 text-xs text-slate-500">{item.sellerName}</p>
                <div className="mt-2 flex items-center gap-1 text-xs sm:text-sm">
                  <p className="font-bold text-slate-900">{item.priceText}</p>
                  {Number(item.oldPrice) > Number(item.price) ? (
                    <p className="text-slate-400 line-through">{item.oldPriceText}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Related products will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
