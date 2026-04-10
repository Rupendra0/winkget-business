"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildProductSlug } from "@/data/productSlug";
import type { ProductDetailModel, RelatedProductModel } from "@/lib/storeCatalog";
import { addToCart, isWishlisted, makeStoreProduct, toggleWishlist } from "@/lib/shopStorage";

type ProductDetailPageClientProps = {
  product: ProductDetailModel;
  relatedProducts?: RelatedProductModel[];
};

export default function ProductDetailPageClient({
  product,
  relatedProducts = [],
}: ProductDetailPageClientProps) {
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

  return (
    <div className="space-y-4 px-3 pb-6 pt-3 sm:px-4 lg:px-6 xl:px-8">
      <nav className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
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
        <div className="grid gap-2 lg:grid-cols-[92px_minmax(0,1fr)_280px]">
          <aside className="order-2 lg:order-1">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:max-h-[440px] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pr-1">
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
          </aside>

          <div className="order-1 lg:order-2">
            <div className="grid gap-4 xl:grid-cols-[minmax(340px,520px)_minmax(0,1fr)]">
              <div className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="h-[400px] w-full">
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

              <div className="space-y-3">
                <p className="text-sm text-blue-700 underline-offset-2 hover:underline">
                  Visit the {product.sellerName} Store
                </p>
                <h1 className="text-3xl font-bold leading-tight text-slate-900">{product.name}</h1>
                <p className="text-base text-slate-500">
                  {Number(product.reviews) > 0
                    ? `${Number(product.rating || 0).toFixed(1)} rating from ${Number(product.reviews)} reviews`
                    : "Be the first to review this product"}
                </p>

                <div className="border-t border-slate-200 pt-3 text-[17px] leading-8 text-slate-700">
                  {product.description
                    ? showFullDescription
                      ? product.description
                      : shortDescription
                    : "Description not provided by seller yet."}
                  {String(product.description || "").length > 250 ? (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription((prev) => !prev)}
                      className="ml-2 text-sm font-semibold text-blue-700"
                    >
                      {showFullDescription ? "Read Less" : "Read More"}
                    </button>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 px-3 py-2 text-lg font-semibold text-slate-900">
                    Key Attributes
                  </div>
                  {product.keyAttributes.length > 0 ? (
                    <>
                      <div className="grid grid-cols-[170px_1fr] gap-x-3 gap-y-2 px-3 py-3 text-[15px]">
                        {product.keyAttributes.slice(0, 5).map(([label, value], index) => (
                          <div key={`${label}-${index}`} className="contents">
                            <p className="font-semibold text-slate-700">{label}</p>
                            <p className="text-slate-700">{value}</p>
                          </div>
                        ))}
                      </div>
                      {product.keyAttributes.length > 5 ? (
                        <button type="button" className="px-3 pb-3 text-sm font-semibold text-blue-700">
                          View full attributes
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <p className="px-3 py-3 text-sm text-slate-500">No key attributes provided yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="order-3">
            <div className="sticky top-24 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-end gap-2">
                <p className="whitespace-nowrap text-2xl font-bold leading-none text-slate-900">{hasPrice ? product.priceText : "Price on request"}</p>
                {oldPrice > currentPrice ? (
                  <p className="whitespace-nowrap pb-0.5 text-base text-slate-400 line-through">{product.oldPriceText}</p>
                ) : null}
                {discountText ? (
                  <span className="mb-0.5 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                    {discountText}
                  </span>
                ) : null}
              </div>

              <p className="text-xs font-medium text-emerald-700">{product.shippingLabel || "Shipping details not provided"}</p>
              {product.deliveryByText ? (
                <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 text-sm text-slate-800">
                  Delivery by <span className="font-semibold">{product.deliveryByText}</span>
                </div>
              ) : null}

              <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-xl text-slate-700 transition hover:bg-slate-100"
                >
                  -
                </button>
                <span className="min-w-8 text-center text-base font-semibold text-slate-800">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => prev + 1)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-xl text-slate-700 transition hover:bg-slate-100"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={onAddToCart}
                  disabled={!hasPrice}
                  className="rounded-full bg-indigo-800 px-4 py-1 text-[11px] font-semibold tracking-wide text-white transition hover:bg-indigo-900"
                >
                  ADD TO CART
                </button>
              </div>

              <div className="grid grid-cols-[0.95fr_1.35fr] gap-2">
                <button
                  type="button"
                  onClick={onSaveForLater}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  {wishlisted ? "WISHLISTED" : "SAVE FOR LATER"}
                </button>
                <Link
                  href="/checkout"
                  className={`rounded-lg px-5 py-2 text-center text-sm font-extrabold tracking-wide transition ${
                    hasPrice
                      ? "bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white ring-1 ring-cyan-300/70 shadow-[0_8px_18px_rgba(37,99,235,0.35)] hover:scale-[1.01] hover:from-blue-800 hover:via-blue-700 hover:to-cyan-600"
                      : "pointer-events-none bg-slate-200 text-slate-500"
                  }`}
                >
                  BUY NOW
                </Link>
              </div>

              <div className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700">
                <p>
                  Sold By: <span className="font-semibold text-[#d41158]">{product.sellerName}</span>
                </p>
                {product.vendorSource ? (
                  <p className="mt-0.5">
                    Vendor Source: <span className="text-blue-700">{product.vendorSource}</span>
                  </p>
                ) : null}
                <p className="mt-0.5 text-amber-500">
                  {Number(product.rating || 0).toFixed(1)} / 5 ({Number(product.reviews || 0)} reviews)
                </p>
              </div>

              <div className="rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-700">
                <p>
                  {typeof product.isCancellable === "boolean"
                    ? product.isCancellable
                      ? "Cancellable"
                      : "Not Cancellable"
                    : "Cancellation policy not specified"}
                </p>
                <p>
                  {typeof product.isReturnable === "boolean"
                    ? product.isReturnable
                      ? "Returnable"
                      : "Not Returnable"
                    : "Return policy not specified"}
                </p>
              </div>

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
          </aside>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-bold text-slate-900">About Product</h2>
          {product.description ? (
            <p className="mt-2 text-sm leading-6 text-slate-700">{product.description}</p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-500">Description not provided by seller yet.</p>
          )}

          {product.highlights.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {product.highlights.map((item, index) => (
                <li key={`${product.id}-h-${index}`} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-700" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No highlights provided yet.</p>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-bold text-slate-900">Product Details</h2>
          {product.keyAttributes.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-300">
              {product.keyAttributes.map(([label, value], index) => (
                <div key={`${product.id}-${label}-${index}`} className="grid grid-cols-2 border-b border-slate-200 last:border-b-0">
                  <p className="bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{label}</p>
                  <p className="px-3 py-2 text-sm text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No product details provided yet.</p>
          )}
        </article>

        {product.specifications && product.specifications.length > 0 ? (
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900">Technical Specifications</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-300">
              {product.specifications.map(([label, value], index) => (
                <div
                  key={`${product.id}-spec-${label}-${index}`}
                  className="grid grid-cols-2 border-b border-slate-200 last:border-b-0"
                >
                  <p className="bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{label}</p>
                  <p className="px-3 py-2 text-sm text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900">Other Products You May Like</h2>
          {product.categorySlug ? (
            <Link
              href={`/category/${encodeURIComponent(product.categorySlug)}`}
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              View all
            </Link>
          ) : null}
        </div>

        {relatedProducts.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {relatedProducts.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <Link href={item.href} className="block overflow-hidden rounded-lg border border-slate-100 bg-white">
                  <img src={item.image} alt={item.name} className="h-36 w-full bg-white p-1 object-contain" />
                </Link>
                <Link href={item.href} className="mt-2 block line-clamp-2 text-sm font-semibold text-slate-800 hover:text-blue-700">
                  {item.name}
                </Link>
                <p className="mt-1 text-xs text-slate-500">{item.sellerName}</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{item.priceText}</p>
                  {Number(item.oldPrice) > Number(item.price) ? (
                    <p className="text-xs text-slate-400 line-through">{item.oldPriceText}</p>
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
