"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Heart,
  ShoppingCart,
  Share2,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
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
  const [isAboutOpen, setIsAboutOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isSpecsOpen, setIsSpecsOpen] = useState(true);

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
  const reviewCount = Number(product.reviews || 0);
  const ratingValue = Number(product.rating || 0);

  const hasSpecifications = Array.isArray(product.specifications) && product.specifications.length > 0;
  const hasKeyAttributes = Array.isArray(product.keyAttributes) && product.keyAttributes.length > 0;
  const hasHighlights = Array.isArray(product.highlights) && product.highlights.length > 0;

  const mergedFacts = useMemo(() => {
    const next: Array<[string, string]> = [];
    if (Array.isArray(product.keyAttributes)) {
      next.push(...product.keyAttributes);
    }
    if (Array.isArray(product.specifications)) {
      next.push(...product.specifications);
    }
    return next;
  }, [product.keyAttributes, product.specifications]);

  const readFact = (patterns: RegExp[]) => {
    for (const [label, value] of mergedFacts) {
      const key = String(label || "");
      if (patterns.some((pattern) => pattern.test(key))) {
        const normalized = String(value || "").trim();
        if (normalized) {
          return normalized;
        }
      }
    }
    return "";
  };

  const selectedVariant = readFact([/variant/i, /storage/i, /ram/i, /size/i]);
  const selectedColor = readFact([/colou?r/i]);

  const activeImageIndex = useMemo(() => {
    const index = galleryImages.findIndex((image) => image === activeImage);
    return index >= 0 ? index : 0;
  }, [activeImage, galleryImages]);

  const showPrevImage = () => {
    if (galleryImages.length <= 1) {
      return;
    }

    const nextIndex = (activeImageIndex - 1 + galleryImages.length) % galleryImages.length;
    setActiveImage(galleryImages[nextIndex]);
  };

  const showNextImage = () => {
    if (galleryImages.length <= 1) {
      return;
    }

    const nextIndex = (activeImageIndex + 1) % galleryImages.length;
    setActiveImage(galleryImages[nextIndex]);
  };

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

  const onShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : productHref;
    const browserNavigator = typeof window !== "undefined" ? window.navigator : undefined;

    try {
      if (browserNavigator?.share) {
        await browserNavigator.share({
          title: product.name,
          text: product.name,
          url: shareUrl,
        });
        return;
      }

      if (browserNavigator?.clipboard?.writeText) {
        await browserNavigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Ignore browser share failures.
    }
  };

  return (
    <div className="w-full space-y-4 px-3 pb-36 pt-3 sm:px-4 sm:pb-10 lg:px-6 xl:px-6">
      <nav className="hidden bg-white px-4 py-2 text-sm text-slate-600 md:block">
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

      <section className="xl:hidden space-y-3">
        <article className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-white">
          <div className="relative overflow-hidden">
            <div className="grid h-[500px] place-items-center px-3 py-4 sm:h-[560px]">
              <img src={activeImage} alt={product.name} className="h-full w-full object-contain" loading="lazy" />
            </div>

            {discountText ? (
              <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                {discountText}
              </span>
            ) : null}

            <button
              type="button"
              onClick={onSaveForLater}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border bg-white/95 shadow ${
                wishlisted ? "text-[#d41158]" : "text-slate-600"
              }`}
            >
              <Heart className="h-4.5 w-4.5" aria-hidden="true" />
            </button>

            {galleryImages.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={showPrevImage}
                  className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow"
                  aria-label="Show previous image"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow"
                  aria-label="Show next image"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            ) : null}

            {galleryImages.length > 1 ? (
              <div className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 shadow-sm">
                {galleryImages.map((image, index) => (
                  <button
                    key={`hero-dot-${index}`}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      activeImage === image ? "bg-slate-800" : "bg-slate-300"
                    }`}
                    aria-label={`Show image ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </article>

        <article className="rounded-xl bg-white p-3">
          <div className="mt-1 flex items-start justify-between gap-2">
            <h1 className="text-[1.75rem] font-bold leading-tight text-slate-900">{product.name}</h1>
            <button
              type="button"
              onClick={() => void onShare()}
              className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700"
              aria-label="Share product"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {reviewCount > 0 ? `${ratingValue.toFixed(1)} / 5 (${reviewCount} reviews)` : "No reviews yet"}
          </p>

          <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
            <div>
              <p className="text-xs text-slate-500 py-1.5">{quantity} unit</p>
              <p className="text-3xl font-extrabold leading-none text-slate-900">{hasPrice ? product.priceText : "Price on request"}</p>
              <div className="mt-1 flex items-center gap-2">
                {oldPrice > currentPrice ? <p className="text-base text-slate-400 line-through">{product.oldPriceText}</p> : null}
                {discountText ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{discountText}</span>
                ) : null}
              </div>
            </div>

            <div className="inline-flex h-11 min-w-[112px] items-center rounded-full border border-slate-300 bg-white px-2">
              <button
                type="button"
                onClick={() => setQuantity((previous) => Math.max(1, previous - 1))}
                className="grid h-8 w-8 place-items-center rounded-full text-lg text-slate-700 transition hover:bg-slate-100"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="flex-1 text-center text-sm font-semibold text-slate-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((previous) => previous + 1)}
                className="grid h-8 w-8 place-items-center rounded-full text-lg text-slate-700 transition hover:bg-slate-100"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        </article>

        <article className="rounded-xl bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-sm font-bold text-indigo-700">
              {String(product.sellerName || "S").slice(0, 1).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-600">
                Sold By: <span className="font-semibold text-slate-800">{product.sellerName}</span>
              </p>
              {product.vendorSource ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  Vendor Source: <span className="font-medium text-blue-700">{product.vendorSource}</span>
                </p>
              ) : null}
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                {ratingValue.toFixed(1)} / 5 ({reviewCount} reviews)
              </p>
            </div>

            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          </div>
        </article>

        {(selectedColor || selectedVariant) ? (
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                <p className="text-[11px] text-slate-500">Selected Color</p>
                <p className="text-sm font-semibold text-slate-900">{selectedColor || "Default"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                <p className="text-[11px] text-slate-500">Variant</p>
                <p className="text-sm font-semibold text-slate-900">{selectedVariant || "Standard"}</p>
              </div>
            </div>
          </article>
        ) : null}
      </section>

      <section className="hidden rounded-2xl bg-white p-3 sm:p-4 xl:block">
        <div className="grid gap-4 xl:grid-cols-[430px_minmax(0,1fr)_330px]">
          <article className="space-y-3">
            <div className="relative overflow-hidden rounded-xl bg-slate-50">
              <div className="h-[420px] w-full sm:h-[500px]">
                <img src={activeImage} alt={product.name} className="h-full w-full object-contain" loading="lazy" />
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
                  aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                  className={`grid h-9 w-9 place-items-center rounded-full border shadow-sm ${
                    wishlisted
                      ? "border-[#d41158]/30 bg-[#f2ece4] text-[#d41158]"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <Heart className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void onShare()}
                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
                  aria-label="Share product"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {galleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={showPrevImage}
                    className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow"
                    aria-label="Show previous image"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={showNextImage}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow"
                    aria-label="Show next image"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>

            {galleryImages.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${product.id}-desktop-thumb-${index}`}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className={`shrink-0 overflow-hidden rounded-lg border bg-white p-0.5 ${
                      activeImage === image ? "border-blue-700 ring-1 ring-blue-300" : "border-slate-200"
                    }`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} className="h-[72px] w-[72px] object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </article>

          <article className="space-y-4">
            <div className="space-y-2 border-b border-slate-200 pb-3">
              <p className="text-sm text-blue-700 underline-offset-2 hover:underline">Visit the {product.sellerName} Store</p>
              <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{product.name}</h1>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                {reviewCount > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      {ratingValue.toFixed(1)}
                    </span>
                    <span className="text-slate-500">{reviewCount} ratings</span>
                  </>
                ) : (
                  <span className="text-slate-500">No reviews yet</span>
                )}
              </div>
            </div>

            <div className="p-3">
              <p className="text-sm leading-6 text-slate-700">
                {product.description ? (showFullDescription ? product.description : shortDescription) : "Description not provided by seller yet."}
                {String(product.description || "").length > 250 ? (
                  <button
                    type="button"
                    onClick={() => setShowFullDescription((previous) => !previous)}
                    className="ml-2 font-semibold text-blue-700"
                  >
                    {showFullDescription ? "Read Less" : "Read More"}
                  </button>
                ) : null}
              </p>
            </div>

            {hasKeyAttributes ? (
              <div className="rounded-xl">
                <div className="px-3 py-2 text-base font-semibold text-slate-900">Key Attributes</div>
                <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
                  {product.keyAttributes.slice(0, 6).map(([label, value], index) => (
                    <div key={`${label}-${index}`} className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="mt-0.5 break-words text-sm text-slate-600">{value}</p>
                    </div>
                  ))}
                </div>

                {product.keyAttributes.length > 6 ? (
                  <a href="#product-details" className="inline-flex px-3 pb-3 text-sm font-semibold text-blue-700 hover:underline">
                    View all attributes
                  </a>
                ) : null}
              </div>
            ) : null}
          </article>

          <aside>
            <div className="space-y-3 rounded-2xl bg- p-3 xl:sticky xl:top-24">
              <div className="space-y-2">
                <div className="flex flex-wrap items-end gap-2">
                  <p className="text-3xl font-extrabold leading-none text-slate-900">
                    {hasPrice ? product.priceText : "Price on request"}
                  </p>
                  {oldPrice > currentPrice ? (
                    <p className="pb-0.5 text-base text-slate-400 line-through">{product.oldPriceText}</p>
                  ) : null}
                  {discountText ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{discountText}</span>
                  ) : null}
                </div>

                <p className="text-xs text-slate-500">{quantity} unit</p>
              </div>

              <div className="rounded-lg px-3 py-2 text-sm text-slate-700">
                <div className="inline-flex items-center gap-1.5 text-blue-700">
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  <span className="font-medium">{product.shippingLabel || "Shipping details not provided"}</span>
                </div>

                {product.deliveryByText ? (
                  <p className="mt-1 text-slate-700">
                    Delivery by <span className="font-semibold">{product.deliveryByText}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex h-11 min-w-[112px] items-center rounded-full border border-slate-300 bg-white px-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((previous) => Math.max(1, previous - 1))}
                    className="grid h-8 w-8 place-items-center rounded-full text-lg text-slate-700 transition hover:bg-slate-100"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-sm font-semibold text-slate-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((previous) => previous + 1)}
                    className="grid h-8 w-8 place-items-center rounded-full text-lg text-slate-700 transition hover:bg-slate-100"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onAddToCart}
                  disabled={!hasPrice}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-indigo-800 px-4 text-sm font-bold text-white transition hover:bg-indigo-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ADD TO CART
                </button>
              </div>

              <button
                type="button"
                onClick={onBuyNow}
                disabled={!hasPrice}
                className={`w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
                  hasPrice
                    ? "bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.35)]"
                    : "cursor-not-allowed bg-slate-200 text-slate-500"
                }`}
              >
                BUY NOW
              </button>

              <div className="rounded-lg px-3 py-2 text-xs text-slate-700">
                <p>
                  {hasPrice ? (
                    <>
                      Total: <span className="font-semibold text-slate-900">Rs. {totalPrice.toLocaleString("en-IN")}</span>
                    </>
                  ) : (
                    <span className="font-semibold text-slate-700">Contact seller for pricing</span>
                  )}
                </p>
              </div>

              <div className="rounded-lg  bg-white p-3 text-xs text-slate-700 sm:text-sm">
                <p className="font-semibold text-slate-900">Seller Details</p>
                <div className="mt-2 space-y-1">
                  <p>
                    Sold By: <span className="font-semibold text-[#d41158]">{product.sellerName}</span>
                  </p>
                    <p className="mt-1">
                      Vendor Source: <span className="text-blue-700">Winkget Business</span>
                    </p>
                  <p className="mt-1 inline-flex items-center gap-1 font-medium text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    {ratingValue.toFixed(1)} / 5 ({reviewCount} reviews)
                  </p>
                </div>
              </div>

              <div className="inline-flex w-full items-start gap-2 px-3 py-2 text-xs text-slate-700 sm:text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
                <div>
                  <p className="font-medium">
                    {typeof product.isCancellable === "boolean"
                      ? product.isCancellable
                        ? "Cancellable"
                        : "Not Cancellable"
                      : "Cancellation policy not specified"}
                  </p>
                  <p className="font-medium">
                    {typeof product.isReturnable === "boolean"
                      ? product.isReturnable
                        ? "Returnable (7 days)"
                        : "Not Returnable"
                      : "Return policy not specified"}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="space-y-3">
        <article className="bg-white p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setIsAboutOpen((previous) => !previous)}
            className="flex w-full items-center justify-between gap-2"
            aria-expanded={isAboutOpen}
          >
            <h2 className="text-left text-base font-bold text-slate-900 sm:text-lg">Product Highlights</h2>
            {isAboutOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
          </button>

          {isAboutOpen ? (
            <>
              {hasHighlights ? (
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {product.highlights.map((item, index) => (
                    <li key={`${product.id}-h-${index}`} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : product.description ? (
                <p className="mt-3 text-sm leading-6 text-slate-700">{product.description}</p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">Description not provided by seller yet.</p>
              )}
            </>
          ) : null}
        </article>

        {hasKeyAttributes ? (
          <article id="product-details" className="bg-white p-3 sm:p-4">
            <button
              type="button"
              onClick={() => setIsDetailsOpen((previous) => !previous)}
              className="flex w-full items-center justify-between gap-2"
              aria-expanded={isDetailsOpen}
            >
              <h2 className="text-left text-base font-bold text-slate-900 sm:text-lg">All Details</h2>
              {isDetailsOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </button>

            {isDetailsOpen ? (
              <div className="mt-3 overflow-hidden">
                {product.keyAttributes.map(([label, value], index) => (
                  <div
                    key={`${product.id}-${label}-${index}`}
                    className={`grid last:border-b-0 sm:grid-cols-[240px_minmax(0,1fr)] ${
                      index % 2 === 0 ? "bg-slate-100/80" : "bg-white"
                    }`}
                  >
                    <p className="px-3 py-2 text-sm font-semibold text-slate-800">{label}</p>
                    <p className="px-3 py-2 text-sm text-slate-700">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ) : null}

        {hasSpecifications ? (
          <article className=" bg-white p-3 sm:p-4">
            <button
              type="button"
              onClick={() => setIsSpecsOpen((previous) => !previous)}
              className="flex w-full items-center justify-between gap-2"
              aria-expanded={isSpecsOpen}
            >
              <h2 className="text-left text-base font-bold text-slate-900 sm:text-lg">Specifications</h2>
              {isSpecsOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </button>

            {isSpecsOpen ? (
              <div className="mt-3 overflow-hidden">
                {product.specifications.map(([label, value], index) => (
                  <div
                    key={`${product.id}-spec-${label}-${index}`}
                    className={`grid border-b border-slate-200 last:border-b-0 sm:grid-cols-[240px_minmax(0,1fr)] ${
                      index % 2 === 0 ? "bg-slate-50/80" : "bg-white"
                    }`}
                  >
                    <p className="px-3 py-2 text-sm font-semibold text-slate-800">{label}</p>
                    <p className="px-3 py-2 text-sm text-slate-700">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ) : null}

        <article className="bg-white p-3 sm:p-4">
          <h2 className="text-left text-base font-bold text-slate-900 sm:text-lg">Product Description</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
            {product.description || "Description not provided by seller yet."}
          </p>
        </article>
      </section>

      <section className=" bg-white p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-slate-900 sm:text-lg">Other Products You May Like</h2>
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

      <section className="fixed inset-x-0 bottom-[64px] z-40 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-[0_-6px_18px_rgba(15,23,42,0.12)] backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-[640px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold leading-none text-slate-900">{hasPrice ? product.priceText : "Price on request"}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {oldPrice > currentPrice ? <span className="text-xs text-slate-400 line-through">{product.oldPriceText}</span> : null}
              {discountText ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{discountText}</span> : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onAddToCart}
              disabled={!hasPrice}
              aria-label="Add to cart"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-fuchsia-600 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onBuyNow}
              disabled={!hasPrice}
              className="inline-flex h-10 min-w-[108px] items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 px-3 text-sm font-bold text-white transition hover:from-blue-800 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Buy Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
