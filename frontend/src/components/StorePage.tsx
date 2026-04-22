"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Star,
  Filter,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Truck,
  Store,
  CheckCircle2,
  Sprout,
  Car,
  Wrench,
  Sparkles,
  MonitorSmartphone,
  Shirt,
  ShoppingBasket,
  Gift,
  Sofa,
  HeartPulse,
  Package,
} from "lucide-react";
import Footer from "@/components/Footer";
import { buildProductSlug } from "@/data/productSlug";
import type { StorePageData, StoreProduct } from "@/data/listingData";
import { getBusinessReviewAggregate, subscribeReviewUpdates } from "@/lib/reviewStore";
import { CART_UPDATED_EVENT, addToCart, makeStoreProduct, readCart, setBuyNowSelection } from "@/lib/shopStorage";

const ratingLabel = (rating: number) => rating.toFixed(1);

const buildProductMap = (products: StorePageData["products"]) => {
  return new Map(products.map((product) => [product.id, product]));
};

const CATEGORY_ICON_PALETTES = [
  "text-indigo-700",
  "text-fuchsia-600",
  "text-rose-600",
  "text-sky-700",
  "text-cyan-700",
  "text-violet-700",
];
const CATEGORY_ICON_URL_REGEX = /^https?:\/\/[^\s]+$/i;
const CATEGORY_ICON_IMAGE_DATA_URL_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/;

const toProductReviewBusinessKey = (productId: string) => {
  const normalizedProductId = String(productId || "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "-")
    .slice(0, 96);

  return `product:${normalizedProductId || "unknown"}`;
};

const toPriceValue = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const numeric = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatIndianCurrency = (value: number): string => {
  const amount = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
};

const formatIndianCompactCurrency = (value: number): string => {
  const amount = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

  if (amount >= 10_000_000) {
    const crores = amount / 10_000_000;
    const decimals = crores >= 100 ? 0 : crores >= 10 ? 1 : 2;

    return `₹${new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(crores)} Cr`;
  }

  return formatIndianCurrency(amount);
};

export default function StorePage({ data }: { data: StorePageData }) {
  const router = useRouter();
  const [reviewUpdateVersion, setReviewUpdateVersion] = useState(0);
  const [isReviewHydrated, setIsReviewHydrated] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [addedToCartProductIds, setAddedToCartProductIds] = useState<Record<string, boolean>>({});
  const categoryRailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsReviewHydrated(true);
    return subscribeReviewUpdates(() => {
      setReviewUpdateVersion((prev) => prev + 1);
    });
  }, []);

  useEffect(() => {
    const syncCartState = () => {
      const next: Record<string, boolean> = {};
      readCart().forEach((item) => {
        const productId = String(item?.product?.id || "").trim();
        if (productId) {
          next[productId] = true;
        }
      });

      setAddedToCartProductIds(next);
    };

    syncCartState();
    window.addEventListener(CART_UPDATED_EVENT, syncCartState as EventListener);
    window.addEventListener("storage", syncCartState);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCartState as EventListener);
      window.removeEventListener("storage", syncCartState);
    };
  }, []);

  const storeReviewStats = useMemo(
    () =>
      isReviewHydrated
        ? getBusinessReviewAggregate(data.id, data.rating, data.reviews)
        : { rating: data.rating, reviews: data.reviews },
    [data.id, data.rating, data.reviews, isReviewHydrated, reviewUpdateVersion]
  );

  const productMap = buildProductMap(data.products);

  const buildProductHref = useCallback(
    (product: StoreProduct) =>
      `/product/${encodeURIComponent(
        buildProductSlug({
          id: product.id,
          name: product.name,
          storeId: data.id,
          sellerName: data.storeName,
        })
      )}`,
    [data.id, data.storeName]
  );

  const handleAddToCart = useCallback(
    (product: StoreProduct) => {
      const alreadyInCart = readCart().some((item) => item.product.id === product.id);

      if (!alreadyInCart) {
        const href = buildProductHref(product);
        const storeProduct = makeStoreProduct(
          {
            ...product,
            storeId: data.id,
            sellerName: product.sellerName || data.storeName,
            image: product.imageUrl,
            oldPrice: product.oldPriceValue,
            categoryLabel: product.categoryLabel || product.category,
          },
          href
        );

        addToCart(storeProduct, 1);
      }

      setAddedToCartProductIds((previous) => ({
        ...previous,
        [product.id]: true,
      }));
    },
    [buildProductHref, data.id, data.storeName]
  );

  const handleBuyNow = useCallback(
    (product: StoreProduct) => {
      const href = buildProductHref(product);
      const storeProduct = makeStoreProduct(
        {
          ...product,
          storeId: data.id,
          sellerName: product.sellerName || data.storeName,
          image: product.imageUrl,
          oldPrice: product.oldPriceValue,
          categoryLabel: product.categoryLabel || product.category,
        },
        href
      );

      setBuyNowSelection(storeProduct, 1);
      router.push("/checkout?mode=buy-now");
    },
    [buildProductHref, data.id, data.storeName, router]
  );

  const featuredProducts = data.featured.productIds
    .map((id) => productMap.get(id))
    .filter(Boolean);
  const trendingProducts = data.trending.productIds
    .map((id) => productMap.get(id))
    .filter(Boolean);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(featuredProducts.length / pageSize));
  const [featuredPage, setFeaturedPage] = useState(0);
  const pagedFeatured = useMemo(() => {
    const start = featuredPage * pageSize;
    return featuredProducts.slice(start, start + pageSize);
  }, [featuredPage, featuredProducts]);
  const trendingTotalPages = Math.max(1, Math.ceil(trendingProducts.length / pageSize));
  const [trendingPage, setTrendingPage] = useState(0);
  const pagedTrending = useMemo(() => {
    const start = trendingPage * pageSize;
    return trendingProducts.slice(start, start + pageSize);
  }, [trendingPage, trendingProducts]);
  const ratingStars = Math.max(0, Math.min(5, Math.round(storeReviewStats.rating)));
  const ratingSummary = `${ratingLabel(storeReviewStats.rating)} (${storeReviewStats.reviews})`;
  const isStoreClosed = data.isStoreOpen === false;
  const availabilityLabel = isStoreClosed ? "Unavailable" : "Deliverable";
  const statusLabel = isStoreClosed ? "Closed" : "Open";
  const availabilityToneClass = isStoreClosed ? "text-rose-700" : "text-emerald-700";
  const statusToneClass = isStoreClosed ? "text-rose-700" : "text-emerald-700";
  const availabilityCardClass = "";
  const statusCardClass = "";
  const shippingLabel = useMemo(() => {
    const firstShippingLabel = data.products.find((product) => String(product.shippingLabel || "").trim())?.shippingLabel;
    const candidate = String(firstShippingLabel || data.deliveryFeeLabel || "").trim();

    if (!candidate) {
      return "Shipping Available";
    }

    if (/free/i.test(candidate)) {
      return "Free Shipping";
    }

    return candidate;
  }, [data.deliveryFeeLabel, data.products]);
  const shippingValue = useMemo(() => {
    const normalized = String(shippingLabel || "").trim();
    if (!normalized) {
      return "Available";
    }

    if (/^shipping\s+available$/i.test(normalized)) {
      return "Available";
    }

    const withoutShippingKeyword = normalized
      .replace(/^shipping\s*/i, "")
      .replace(/\s*shipping$/i, "")
      .trim();

    return withoutShippingKeyword || normalized;
  }, [shippingLabel]);
  const availabilityCompactValue = isStoreClosed ? "No" : "Yes";
  const shippingCompactValue = /free/i.test(shippingValue) ? "Free" : "Yes";
  const categoryItems = useMemo(() => {
    const fallbackItems = ["Appliances", "Agri Inputs", "Auto Components", "Beauty & Personal Care", "Electronics"];
    const sourceItems: Array<{ id: string; label: string; iconImage?: string }> =
      Array.isArray(data.categoryBarItems) && data.categoryBarItems.length > 0
        ? data.categoryBarItems
        : (data.categories.length > 0 ? data.categories : fallbackItems).map((label, index) => ({
            id: `category-pill-fallback-${index}`,
            label,
            iconImage: undefined,
          }));

    return sourceItems.map((categoryItemSource, index) => {
      const label = String(categoryItemSource.label || "").trim() || "Category";
      const normalized = label.toLowerCase();
      const rawIconImage = String(categoryItemSource.iconImage || "").trim();
      const iconImage =
        rawIconImage && (CATEGORY_ICON_URL_REGEX.test(rawIconImage) || CATEGORY_ICON_IMAGE_DATA_URL_REGEX.test(rawIconImage))
          ? rawIconImage
          : undefined;

      let IconComponent = Package;
      if (/agri|farm|seed|crop/.test(normalized)) IconComponent = Sprout;
      else if (/auto|car|vehicle|bike/.test(normalized)) IconComponent = Car;
      else if (/beauty|personal|care|cosmetic|makeup/.test(normalized)) IconComponent = Sparkles;
      else if (/electronic|mobile|laptop|computer|gadget/.test(normalized)) IconComponent = MonitorSmartphone;
      else if (/fashion|apparel|cloth|wear|dress/.test(normalized)) IconComponent = Shirt;
      else if (/grocery|food|basket/.test(normalized)) IconComponent = ShoppingBasket;
      else if (/gift|card/.test(normalized)) IconComponent = Gift;
      else if (/home|kitchen|furniture|decor/.test(normalized)) IconComponent = Sofa;
      else if (/health|wellness|medical/.test(normalized)) IconComponent = HeartPulse;
      else if (/tool|hardware|repair|service/.test(normalized)) IconComponent = Wrench;

      return {
        id: String(categoryItemSource.id || `category-pill-${index}-${label}`),
        label,
        iconImage,
        IconComponent,
        paletteClass: CATEGORY_ICON_PALETTES[index % CATEGORY_ICON_PALETTES.length],
      };
    });
  }, [data.categories, data.categoryBarItems]);
  const shouldCenterCategoryRail = categoryItems.length <= 3;

  const scrollCategoryRail = useCallback((direction: "left" | "right") => {
    const rail = categoryRailRef.current;
    if (!rail) return;

    const offset = Math.max(200, Math.round(rail.clientWidth * 0.74));
    rail.scrollBy({
      left: direction === "left" ? -offset : offset,
      behavior: "smooth",
    });
  }, []);

  const renderFlipkartStyleProductCard = (product: StoreProduct, imageHeightClass: string) => {
    const productHref = buildProductHref(product);
    const isProductInCart = Boolean(addedToCartProductIds[product.id]);
    const productReviewSummary = getBusinessReviewAggregate(
      toProductReviewBusinessKey(product.id),
      Number(product.rating || 0),
      Math.max(0, Number(product.reviews || 0))
    );
    const ratingValue = Number(productReviewSummary.rating || 0);
    const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;
    const reviewCountValue = Math.max(0, Math.round(Number(productReviewSummary.reviews || 0)));
    const hasReviewCount = Number.isFinite(reviewCountValue) && reviewCountValue > 0;
    const shouldShowRatingRow = hasRating && hasReviewCount;
    const ratingDisplay = hasRating ? ratingLabel(ratingValue) : "0.0";
    const reviewCountLabel = new Intl.NumberFormat("en-IN").format(reviewCountValue);

    const currentPriceValue = toPriceValue(product.price);
    const oldPriceValue = Number(product.oldPriceValue || 0);
    const hasComparablePrice = Number.isFinite(oldPriceValue) && oldPriceValue > currentPriceValue && currentPriceValue > 0;

    const discountPercent = hasComparablePrice
      ? Math.max(1, Math.round(((oldPriceValue - currentPriceValue) / oldPriceValue) * 100))
      : 0;

    const currentPriceLabel =
      currentPriceValue > 0
        ? formatIndianCompactCurrency(currentPriceValue)
        : String(product.price || "").trim() || "Price unavailable";

    return (
      <article
        key={product.id}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <Link href={productHref} className={`relative block ${imageHeightClass} overflow-hidden bg-slate-100`}>
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-contain p-3 transition-transform duration-200 group-hover:scale-[1.03]"
          />
        </Link>

        <div className="flex flex-1 flex-col p-3">
          <Link href={productHref} className="block truncate text-[15px] font-semibold leading-5 text-slate-800 hover:text-blue-700">
            {product.name}
          </Link>

          {shouldShowRatingRow ? (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded-[4px] bg-emerald-600 px-1.5 py-[2px] text-[11px] font-semibold leading-none text-white">
                {ratingDisplay}
                <Star size={10} className="fill-white text-white" />
              </span>
              <span className="text-[11px] font-medium text-slate-500">({reviewCountLabel} ratings)</span>
            </div>
          ) : null}

          {hasComparablePrice ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.04em] text-emerald-700">{discountPercent}% OFF</p>
          ) : null}

          <div className="mt-1 flex items-baseline gap-1.5">
            {hasComparablePrice ? (
              <span className="text-l font-medium text-slate-400 line-through">{formatIndianCurrency(oldPriceValue)}</span>
            ) : null}
            <span className="text-[clamp(0.95rem,1.5vw,1.2rem)] font-semibold text-slate-900">{currentPriceLabel}
            </span>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
            <button
              type="button"
              onClick={() => handleAddToCart(product)}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-semibold transition ${
                isProductInCart
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {isProductInCart ? "Added" : "Add to Cart"}
            </button>

            <button
              type="button"
              onClick={() => handleBuyNow(product)}
              className="h-9 rounded-lg bg-blue-600 px-2 text-[12px] font-semibold text-white transition hover:bg-blue-700"
            >
              Buy Now
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="px-3 sm:px-4 lg:px-6 pb-12">
      <div className="max-w-[1400px] mx-auto space-y-10">
        <section className="overflow-hidden bg-white/70 lg:relative lg:left-1/2 lg:w-[100dvw] lg:-translate-x-1/2">
          <div className="relative h-52 sm:h-60 lg:h-72">
            <img
              src={data.bannerImage}
              alt={data.storeName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-800/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent sm:hidden" />
            <div className="absolute bottom-3 left-6 right-3 flex items-end gap-3 sm:hidden">
              <div className="h-[120px] w-[120px] shrink-0 rounded-full overflow-hidden bg-white">
                <img src={data.logoImage} alt={`${data.storeName} logo`} className="h-full w-full object-cover" />
              </div>

              <div className="min-w-0 flex-1 pb-1 text-white">
                <div className="line-clamp-2 text-[28px] font-extrabold leading-[0.95] tracking-tight">{data.storeName}</div>
                {/* <div className="mt-0.5 truncate text-[14px] font-semibold text-white/90">{data.tagline}</div> */}
                <div className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-white/90">
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  {ratingLabel(storeReviewStats.rating)} ({storeReviewStats.reviews} reviews)
                </div>
              </div>
            </div>
            <div className="absolute bottom-10 left-25 hidden items-center gap-4 sm:flex">
              <div className="h-[108px] w-[108px] rounded-full overflow-hidden bg-white">
                <img src={data.logoImage} alt={`${data.storeName} logo`} className="h-full w-full object-cover" />
              </div>
              <div className="text-white">
                <div className="max-w-[780px] text-[2.45rem] font-extrabold leading-[0.95] tracking-tight">{data.storeName}</div>
                {/* <div className="mt-0.5 text-base font-semibold text-white/90">{data.tagline}</div> */}
                <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-white/90">
                  <Star size={13} className="fill-yellow-400 text-yellow-400" />
                  {ratingLabel(storeReviewStats.rating)} ({storeReviewStats.reviews} reviews)
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="-mt-10 rounded-2xl bg-white/90 p-2.5 sm:-mt-6 sm:p-3 lg:-mt-9 lg:relative lg:left-1/2 lg:w-[100dvw] lg:-translate-x-1/2">
          <div className="grid grid-cols-4 gap-2 sm:hidden">
            <article className="rounded-lg bg-amber-50/80 px-1.5 py-2 text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Rate</p>
              <div className="mt-1.5 inline-flex items-center gap-1 text-[14px] font-semibold text-slate-900">
                <Star size={11} className="fill-amber-400 text-amber-400" aria-hidden="true" />
                <span>{ratingLabel(storeReviewStats.rating)}</span>
              </div>
            </article>

            <article className={`rounded-lg px-1.5 py-2 text-center ${availabilityCardClass}`}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Avail</p>
              <div className={`mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold ${availabilityToneClass}`}>
                <Truck size={11} aria-hidden="true" />
                <span>{availabilityCompactValue}</span>
              </div>
            </article>

            <article className={`rounded-lg px-1.5 py-2 text-center ${statusCardClass}`}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
              <div className={`mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold ${statusToneClass}`}>
                <Store size={11} aria-hidden="true" />
                <span>{statusLabel}</span>
              </div>
            </article>

            <article className="rounded-lg px-1.5 py-2 text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Ship</p>
              <div className="mt-1.5 inline-flex items-center gap-1 text-[14px] font-semibold text-emerald-700">
                <CheckCircle2 size={11} aria-hidden="true" />
                <span>{shippingCompactValue}</span>
              </div>
            </article>
          </div>

          <div className="hidden gap-2.5 sm:grid sm:grid-cols-4">
            <article className="rounded-xl px-18 py-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Ratings</p>
              <p className="mt-1.5 text-base font-semibold leading-tight text-slate-900 sm:text-lg">{ratingSummary}</p>
              <div className="mt-1.5 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={`store-rating-star-${index}`}
                    size={15}
                    className={index < ratingStars ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </article>

            <article className={`rounded-xl px-4 py-3 ${availabilityCardClass}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Availability</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${availabilityToneClass}`}>
                  <Truck size={17} aria-hidden="true" />
                </span>
                <p className={`text-base font-semibold leading-tight sm:text-lg ${availabilityToneClass}`}>{availabilityLabel}</p>
              </div>
            </article>

            <article className={`rounded-xl px-4 py-3 ${statusCardClass}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${statusToneClass}`}>
                  <Store size={17} aria-hidden="true" />
                </span>
                <p className={`text-base font-semibold leading-tight sm:text-lg ${statusToneClass}`}>{statusLabel}</p>
              </div>
            </article>

            <article className="rounded-xl px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Shipping</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/85 text-emerald-700">
                  <CheckCircle2 size={17} aria-hidden="true" />
                </span>
                <p className="text-lg font-semibold leading-tight text-emerald-700 sm:text-xl">{shippingValue}</p>
              </div>
            </article>
          </div>
                  <div className="my-2 h-[1px] w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </section>

        <section className="sm:-mt-6 -lg:-mt-1">
          <section className="mt-0 bg-transparent p-0 sm:-mt-5 lg:mt-0">
            <div className="mt-1.5 flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => scrollCategoryRail("left")}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 transition hover:text-slate-800 sm:inline-flex"
                aria-label="Scroll categories left"
              >
                <ChevronLeft size={16} />
              </button>

              <div
                ref={categoryRailRef}
                className={`no-scrollbar flex flex-1 snap-x snap-mandatory items-start gap-1.5 overflow-x-auto scroll-smooth px-1 py-0.5 sm:gap-2 ${
                  shouldCenterCategoryRail ? "justify-center" : ""
                }`}
              >
                {categoryItems.map((categoryItem) => {
                  const IconComponent = categoryItem.IconComponent;
                  return (
                    <button
                      key={categoryItem.id}
                      type="button"
                      className="group min-w-[72px] shrink-0 snap-start text-center sm:min-w-[108px] lg:min-w-[128px]"
                    >
                      <span
                        className={`mx-auto inline-flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white transition-transform duration-200 group-hover:-translate-y-0.5 sm:h-[68px] sm:w-[68px] lg:h-[86px] lg:w-[86px] ${categoryItem.paletteClass}`}
                      >
                        {categoryItem.iconImage ? (
                          <span className="inline-flex h-[74%] w-[74%] items-center justify-center rounded-full bg-white p-1">
                            <img
                              src={categoryItem.iconImage}
                              alt={`${categoryItem.label} icon`}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          </span>
                        ) : (
                          <IconComponent className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.8} />
                        )}
                      </span>
                      <span className="mt-1.5 block line-clamp-2 text-[11px] font-semibold leading-tight text-slate-700 sm:mt-2 sm:text-[13px]">
                        {categoryItem.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollCategoryRail("right")}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 transition hover:text-slate-800 sm:inline-flex"
                aria-label="Scroll categories right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </section>

          <div className="mt-8 sm:mt-10 lg:mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
            <aside className="hidden rounded-2xl bg-white/80 p-5 space-y-6 h-fit lg:block lg:sticky lg:top-24">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Filter size={16} />
                Filters
              </div>

              {data.filters.map((group) => (
                <div key={group.label}>
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
                    {group.label}
                  </div>
                  <div className="space-y-2">
                    {group.options.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </aside>

            <div className="space-y-8">

            {featuredProducts.length > 0 ? (
            <section className="rounded-2xl bg-white/80 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{data.featured.title}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full text-slate-600 hover:text-blue-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed btn-hover"
                    onClick={() => setFeaturedPage((prev) => Math.max(0, prev - 1))}
                    aria-label="Previous items"
                    disabled={featuredPage === 0}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full text-slate-600 hover:text-blue-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed btn-hover"
                    onClick={() => setFeaturedPage((prev) => Math.min(totalPages - 1, prev + 1))}
                    aria-label="Next items"
                    disabled={featuredPage >= totalPages - 1}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">                {pagedFeatured.map((product) => {
                  if (!product) {
                    return null;
                  }

                  return renderFlipkartStyleProductCard(product, "h-44");
                })}
              </div>
            </section>
            ) : null}

            {trendingProducts.length > 0 ? (
            <section className="rounded-2xl bg-white/80 p-5">
                <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{data.trending.title}</div>
                </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="h-8 w-8 rounded-full text-slate-600 hover:text-blue-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed btn-hover"
                      onClick={() => setTrendingPage((prev) => Math.max(0, prev - 1))}
                      aria-label="Previous items"
                      disabled={trendingPage === 0}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="h-8 w-8 rounded-full text-slate-600 hover:text-blue-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed btn-hover"
                      onClick={() => setTrendingPage((prev) => Math.min(trendingTotalPages - 1, prev + 1))}
                      aria-label="Next items"
                      disabled={trendingPage >= trendingTotalPages - 1}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
              </div>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pagedTrending.map((product) => {
                  if (!product) {
                    return null;
                  }

                  return renderFlipkartStyleProductCard(product, "h-44");
                })}
              </div>
            </section>
            ) : null}

            <section className="rounded-2xl bg-white/80 p-5">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-900">All Products</div>
                <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <option>Sort by: Featured</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                </select>
              </div>
<div className="mt-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">  
                    {data.products.map((product) => renderFlipkartStyleProductCard(product, "h-48"))}
              </div>
            </section>

            <section className="rounded-2xl bg-white/80 p-5">
              <div className="text-lg font-semibold text-slate-900">{data.aboutTitle}</div>
              <div className="mt-3 text-sm text-slate-600">{data.aboutBody}</div>
            </section>
          </div>
          </div>
        </section>

        {!isMobileFiltersOpen ? (
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="fixed bottom-40 right-4 z-40 rounded-full bg-blue-600 px-4 py-2 text-white lg:hidden"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal size={16} />
              Filters
            </span>
          </button>
        ) : null}

        {isMobileFiltersOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/35"
              onClick={() => setIsMobileFiltersOpen(false)}
              aria-label="Close filters"
            />

            <section className="fixed bottom-0 left-0 max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Filters</h3>
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600"
                  aria-label="Close filter panel"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-5">
                {data.filters.map((group) => (
                  <div key={group.label}>
                    <div className="mb-2 text-xs font-semibold uppercase text-slate-500">{group.label}</div>
                    <div className="space-y-2">
                      {group.options.map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Apply Filters
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
      <Footer />
    </main>
  );
}
