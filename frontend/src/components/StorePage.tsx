"use client";

import Link from "next/link";
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
import { CART_UPDATED_EVENT, addToCart, makeStoreProduct, readCart, setCartItemQuantity } from "@/lib/shopStorage";

const ratingLabel = (rating: number) => rating.toFixed(1);

const buildProductMap = (products: StorePageData["products"]) => {
  return new Map(products.map((product) => [product.id, product]));
};

const productRailRowClass =
  "no-scrollbar grid w-full min-w-0 grid-flow-col auto-cols-[calc((100%_-_0.5rem)/2)] gap-2 overflow-x-auto overflow-y-hidden pb-2 sm:auto-cols-[calc((100%_-_0.75rem)/2)] sm:gap-3 lg:auto-cols-[calc((100%_-_3rem)/4)] lg:gap-4";

const splitProductsForTwoRowRail = <T,>(items: T[], columnsPerView: number) => {
  const pageSize = columnsPerView * 2;
  const rows: [T[], T[]] = [[], []];

  for (let pageStart = 0; pageStart < items.length; pageStart += pageSize) {
    const pageItems = items.slice(pageStart, pageStart + pageSize);

    for (let columnIndex = 0; columnIndex < columnsPerView; columnIndex += 1) {
      if (columnIndex < pageItems.length) {
        rows[0].push(pageItems[columnIndex]);
      }

      if (columnIndex + columnsPerView < pageItems.length) {
        rows[1].push(pageItems[columnIndex + columnsPerView]);
      }
    }
  }

  return rows;
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

const normalizeFilterToken = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase();

export default function StorePage({ data }: { data: StorePageData }) {
  const [reviewUpdateVersion, setReviewUpdateVersion] = useState(0);
  const [isReviewHydrated, setIsReviewHydrated] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [selectedCategoryBarItemId, setSelectedCategoryBarItemId] = useState("");
  const categoryRailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => setIsReviewHydrated(true), 0);
    const unsubscribe = subscribeReviewUpdates(() => {
      setReviewUpdateVersion((prev) => prev + 1);
    });

    return () => {
      window.clearTimeout(hydrationTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncCartState = () => {
      const next: Record<string, number> = {};
      readCart().forEach((item) => {
        const productId = String(item?.product?.id || "").trim();
        if (productId) {
          next[productId] = Math.max(1, Number(item.quantity || 1));
        }
      });

      setCartQuantities(next);
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
    },
    [buildProductHref, data.id, data.storeName]
  );

  const updateProductCartQuantity = useCallback((productId: string, nextQuantity: number) => {
    setCartItemQuantity(productId, nextQuantity);
  }, []);

  const allProducts = data.products;
  const rawFeaturedProducts = data.featured.productIds
    .map((id) => productMap.get(id))
    .filter(Boolean);
  const rawTrendingProducts = data.trending.productIds
    .map((id) => productMap.get(id))
    .filter(Boolean);

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
  const joinedLabel = useMemo(() => {
    const createdAtValue = String(data.createdAt || "").trim();
    if (createdAtValue) {
      const parsedDate = new Date(createdAtValue);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        });
      }
    }

    if (Number.isFinite(Number(data.establishmentYear)) && Number(data.establishmentYear) > 0) {
      return `Since ${Number(data.establishmentYear)}`;
    }

    return "Recently Added";
  }, [data.createdAt, data.establishmentYear]);
  const locationLabel = useMemo(() => {
    const locality = String(data.sublocality || "").trim();
    const city = String(data.city || "").trim();
    const address = String(data.address || "").trim();

    return locality || city || address || "Location unavailable";
  }, [data.address, data.city, data.sublocality]);
  const categoryItems = useMemo(() => {
    const fallbackItems = ["Appliances", "Agri Inputs", "Auto Components", "Beauty & Personal Care", "Electronics"];
    const sourceItems: Array<{ id: string; label: string; iconImage?: string; filterLabels?: string[] }> =
      Array.isArray(data.categoryBarItems) && data.categoryBarItems.length > 0
        ? data.categoryBarItems
        : (data.categories.length > 0 ? data.categories : fallbackItems).map((label, index) => ({
            id: `category-pill-fallback-${index}`,
            label,
            iconImage: undefined,
            filterLabels: [label],
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
        filterLabels: Array.from(
          new Set(
            [label, ...(Array.isArray(categoryItemSource.filterLabels) ? categoryItemSource.filterLabels : [])]
              .map((value) => String(value || "").trim())
              .filter(Boolean)
          )
        ),
        IconComponent,
        paletteClass: CATEGORY_ICON_PALETTES[index % CATEGORY_ICON_PALETTES.length],
      };
    });
  }, [data.categories, data.categoryBarItems]);
  const shouldCenterCategoryRail = categoryItems.length <= 3;
  const selectedCategoryBarItem = useMemo(
    () => categoryItems.find((categoryItem) => categoryItem.id === selectedCategoryBarItemId),
    [categoryItems, selectedCategoryBarItemId]
  );
  const selectedCategoryFilterLabels = useMemo(
    () =>
      new Set(
        (selectedCategoryBarItem?.filterLabels?.length
          ? selectedCategoryBarItem.filterLabels
          : [selectedCategoryBarItem?.label]
        )
          .map(normalizeFilterToken)
          .filter(Boolean)
      ),
    [selectedCategoryBarItem]
  );
  const matchesSelectedCategoryFilter = useCallback(
    (product: StoreProduct | undefined) => {
      if (!product) return false;
      if (selectedCategoryFilterLabels.size === 0) return true;

      return [
        product.subcategoryName,
        product.categoryLabel,
        product.category,
        product.categorySlug,
        ...(Array.isArray(product.tags) ? product.tags : []),
      ].some((value) => selectedCategoryFilterLabels.has(normalizeFilterToken(value)));
    },
    [selectedCategoryFilterLabels]
  );
  const featuredProducts = useMemo(
    () => rawFeaturedProducts.filter(matchesSelectedCategoryFilter),
    [matchesSelectedCategoryFilter, rawFeaturedProducts]
  );
  const trendingProducts = useMemo(
    () => rawTrendingProducts.filter(matchesSelectedCategoryFilter),
    [matchesSelectedCategoryFilter, rawTrendingProducts]
  );
  const visibleProducts = useMemo(
    () => allProducts.filter(matchesSelectedCategoryFilter),
    [allProducts, matchesSelectedCategoryFilter]
  );

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
    const productCartQuantity = Math.max(0, Number(cartQuantities[product.id] || 0));
    const productReviewSummary = isReviewHydrated
      ? getBusinessReviewAggregate(
          toProductReviewBusinessKey(product.id),
          Number(product.rating || 0),
          Math.max(0, Number(product.reviews || 0))
        )
      : {
          rating: Number(product.rating || 0),
          reviews: Math.max(0, Number(product.reviews || 0)),
        };
    const ratingValue = Number(productReviewSummary.rating || 0);
    const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;
    const reviewCountValue = Math.max(0, Math.round(Number(productReviewSummary.reviews || 0)));
    const hasReviewCount = Number.isFinite(reviewCountValue) && reviewCountValue > 0;
    const shouldShowRatingRow = hasRating && hasReviewCount;
    const ratingDisplay = hasRating ? ratingLabel(ratingValue) : "0.0";

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
        className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <Link href={productHref} className={`relative block ${imageHeightClass} overflow-hidden bg-white`}>
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-contain p-3 transition-transform duration-200 group-hover:scale-[1.03]"
          />
          {hasComparablePrice ? (
            <span className="absolute left-2 top-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white shadow-sm sm:text-[11px]">
              {discountPercent}% OFF
            </span>
          ) : null}
          {shouldShowRatingRow ? (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-0.5 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-amber-950 shadow-sm sm:text-[11px]">
              {ratingDisplay}
              <Star size={9} className="fill-amber-950 text-amber-950 sm:h-2.5 sm:w-2.5" />
            </span>
          ) : null}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col p-2 sm:p-3">
          <Link href={productHref} className="line-clamp-2 min-h-8 text-[13px] font-semibold leading-4 text-slate-800 hover:text-blue-700 sm:min-h-10 sm:text-[15px] sm:leading-5">
            {product.name}
          </Link>

          {hasComparablePrice ? (
            <div className="mt-1 min-w-0">
              <span className="block truncate text-[11px] font-medium text-slate-400 line-through sm:text-sm">{formatIndianCurrency(oldPriceValue)}</span>
            </div>
          ) : null}

          <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2.5 sm:gap-2 sm:pt-3">
            <div className="flex h-8 min-w-0 items-center sm:h-9">
              <span className="truncate text-[15px] font-extrabold leading-none text-slate-900 sm:text-lg">{currentPriceLabel}</span>
            </div>

            {productCartQuantity > 0 ? (
              <div className="inline-grid h-8 min-w-0 grid-cols-3 overflow-hidden rounded-lg border border-[#2f9e44] bg-[#2f9e44] text-white shadow-[0_8px_18px_rgba(47,158,68,0.18)] sm:h-9">
                <button
                  type="button"
                  onClick={() => updateProductCartQuantity(product.id, productCartQuantity - 1)}
                  className="grid min-w-0 place-items-center text-sm font-bold leading-none transition hover:bg-[#27873a] sm:text-lg"
                  aria-label={`Decrease quantity for ${product.name}`}
                >
                  -
                </button>
                <div className="grid min-w-0 place-items-center bg-[#2f9e44] px-0.5 text-[10px] font-extrabold text-white sm:px-1 sm:text-[12px]">
                  {productCartQuantity}
                </div>
                <button
                  type="button"
                  onClick={() => updateProductCartQuantity(product.id, productCartQuantity + 1)}
                  className="grid min-w-0 place-items-center text-sm font-bold leading-none transition hover:bg-[#27873a] sm:text-lg"
                  aria-label={`Increase quantity for ${product.name}`}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleAddToCart(product)}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-blue-600 px-1 text-[10px] font-semibold text-white transition hover:bg-blue-700 sm:h-9 sm:gap-1.5 sm:px-2 sm:text-[12px]"
              >
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  const renderProductRail = (products: Array<StoreProduct | undefined>, imageHeightClass: string) => {
    const validProducts = products.filter(Boolean) as StoreProduct[];
    const mobileRows = splitProductsForTwoRowRail(validProducts, 2);
    const desktopRows = splitProductsForTwoRowRail(validProducts, 4);

    const renderRailRows = (rows: StoreProduct[][]) => (
      <div className="space-y-5">
        {rows
          .filter((row) => row.length > 0)
          .map((row, rowIndex) => (
            <div key={`product-rail-row-${rowIndex}`} className={productRailRowClass}>
              {row.map((product) => (
                <div key={product.id}>
                  {renderFlipkartStyleProductCard(product, imageHeightClass)}
                </div>
              ))}
            </div>
          ))}
      </div>
    );

    return (
      <div className="mt-5">
        <div className="md:hidden">{renderRailRows(mobileRows)}</div>
        <div className="hidden md:block">{renderRailRows(desktopRows)}</div>
      </div>
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
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/82 via-slate-900/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent sm:hidden" />
            <div className="absolute bottom-3 left-6 right-3 flex items-end gap-3 sm:hidden">
              <div className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_12px_26px_rgba(15,23,42,0.35)]">
                <img src={data.logoImage} alt={`${data.storeName} logo`} className="h-full w-full object-cover" />
              </div>

              <div className="min-w-0 flex-1 pb-1 text-white [text-shadow:0_3px_14px_rgba(15,23,42,0.75)]">
                <div className="line-clamp-2 text-[28px] font-extrabold leading-[0.95] tracking-tight">{data.storeName}</div>
                {/* <div className="mt-0.5 truncate text-[14px] font-semibold text-white/90">{data.tagline}</div> */}
                <div className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-white/90">
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  {ratingLabel(storeReviewStats.rating)} ({storeReviewStats.reviews} reviews)
                </div>
              </div>
            </div>
            <div className="absolute bottom-8 left-16 hidden items-end gap-5 sm:flex">
              <div className="h-[108px] w-[108px] overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_14px_32px_rgba(15,23,42,0.38)]">
                <img src={data.logoImage} alt={`${data.storeName} logo`} className="h-full w-full object-cover" />
              </div>
              <div className="pb-1 text-white [text-shadow:0_4px_16px_rgba(15,23,42,0.82)]">
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
            <article className="rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Ratings</p>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={`store-rating-star-${index}`}
                      size={15}
                      className={index < ratingStars ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold leading-none text-slate-900">{ratingLabel(storeReviewStats.rating)}</p>
                  <p className="mt-1 text-[11px] font-medium leading-none text-slate-500">{storeReviewStats.reviews} reviews</p>
                </div>
              </div>
            </article>

            <article className={`rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${availabilityCardClass}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Availability</p>
              <div className="mt-2 flex items-center gap-2.5">
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-emerald-50 ${availabilityToneClass}`}>
                  <Truck size={17} aria-hidden="true" />
                </span>
                <p className={`text-base font-semibold leading-tight sm:text-lg ${availabilityToneClass}`}>{availabilityLabel}</p>
              </div>
            </article>

            <article className={`rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${statusCardClass}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Status</p>
              <div className="mt-2 flex items-center gap-2.5">
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-emerald-50 ${statusToneClass}`}>
                  <Store size={17} aria-hidden="true" />
                </span>
                <p className={`text-base font-semibold leading-tight sm:text-lg ${statusToneClass}`}>{statusLabel}</p>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Shipping</p>
              <div className="mt-2 flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={17} aria-hidden="true" />
                </span>
                <p className="text-base font-semibold leading-tight text-emerald-700 sm:text-lg">{shippingValue}</p>
              </div>
            </article>
          </div>
                  <div className="mt-1 mb-0 h-[1px] w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent sm:my-2"></div>
        </section>

        <section className="-mt-6 sm:-mt-6 lg:mt-0">
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
                  const isSelected = selectedCategoryBarItemId === categoryItem.id;
                  return (
                    <button
                      key={categoryItem.id}
                      type="button"
                      onClick={() =>
                        setSelectedCategoryBarItemId((current) => (current === categoryItem.id ? "" : categoryItem.id))
                      }
                      className="group min-w-[72px] shrink-0 snap-start text-center sm:min-w-[108px] lg:min-w-[128px]"
                      aria-pressed={isSelected}
                    >
                      <span
                        className={`mx-auto inline-flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full border transition duration-200 group-hover:-translate-y-0.5 sm:h-[68px] sm:w-[68px] lg:h-[86px] lg:w-[86px] ${
                          isSelected
                            ? "border-pink-200 bg-pink-50 shadow-[0_8px_18px_rgba(236,72,153,0.16)]"
                            : "border-slate-200 bg-white"
                        } ${categoryItem.paletteClass}`}
                      >
                        {categoryItem.iconImage ? (
                          <span className={`inline-flex h-[74%] w-[74%] items-center justify-center rounded-full p-1 ${isSelected ? "bg-pink-50" : "bg-white"}`}>
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
                      <span className={`mt-1.5 block line-clamp-2 text-[11px] font-semibold leading-tight sm:mt-2 sm:text-[13px] ${isSelected ? "text-pink-700" : "text-slate-700"}`}>
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

          <div className="mt-8 sm:mt-10 lg:mt-12 grid grid-cols-1 gap-6 lg:min-w-0 lg:grid-cols-[240px_minmax(0,1fr)]">
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

            <div className="space-y-8 lg:min-w-0">

            {selectedCategoryBarItem && visibleProducts.length === 0 ? (
            <section className="rounded-2xl bg-white/80 p-2.5 sm:p-5 lg:min-w-0">
              <p className="text-sm font-semibold text-slate-700">
                No products found for {selectedCategoryBarItem.label}.
              </p>
            </section>
            ) : null}

            {featuredProducts.length > 0 ? (
            <section className="rounded-2xl bg-white/80 p-2.5 sm:p-5 lg:min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{data.featured.title}</div>
                </div>
              </div>
              {renderProductRail(featuredProducts, "h-32 sm:h-44")}
            </section>
            ) : null}

            {trendingProducts.length > 0 ? (
            <section className="rounded-2xl bg-white/80 p-2.5 sm:p-5 lg:min-w-0">
                <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{data.trending.title}</div>
                </div>
              </div>
              {renderProductRail(trendingProducts, "h-32 sm:h-44")}
            </section>
            ) : null}

            <section className="rounded-2xl bg-white/80 p-2.5 sm:p-5 lg:min-w-0">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-900">All Products</div>
                <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <option>Sort by: Featured</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                </select>
              </div>
              {renderProductRail(visibleProducts, "h-36 sm:h-48")}
            </section>

            
          </div>
          </div>

          <section className="mt-8 rounded-[26px] border border-[#d9e2f1] bg-white px-5 py-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)] sm:px-6">
              <div>
                <h2 className="text-[22px] font-semibold leading-none text-[#344054] sm:text-[24px]">{data.aboutTitle}</h2>
                <div className="mt-3 h-[3px] w-[56px] rounded-full bg-[#5b7cff]" />
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-[200px_200px_minmax(0,1fr)] xl:grid-rows-2">
                <div className="rounded-[18px] bg-[#f6f8fc] px-4 py-4 xl:min-h-[180px]">
                  <p className="text-[15px] font-medium leading-none text-[#6f84a3] sm:text-[16px]">Rating</p>
                  <div className="mt-7">
                    <div className="flex items-center gap-1 text-[18px] leading-none text-[#ffcc00] sm:text-[20px]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span key={`about-rating-star-${index}`}>{index < Math.round(data.rating) ? "★" : "☆"}</span>
                      ))}
                    </div>
                    <p className="mt-4 text-[18px] font-semibold text-[#344054]">{ratingLabel(storeReviewStats.rating)}</p>
                  </div>
                </div>

                <div className="rounded-[18px] bg-[#f6f8fc] px-4 py-4 xl:min-h-[180px]">
                  <p className="text-[15px] font-medium leading-none text-[#6f84a3] sm:text-[16px]">Reviews</p>
                  <p className="mt-10 text-[20px] font-semibold leading-none text-[#344054] sm:text-[22px]">
                    {new Intl.NumberFormat("en-IN").format(Math.max(0, Number(storeReviewStats.reviews || 0)))}
                  </p>
                </div>

                <div className="rounded-[18px] bg-[#f6f8fc] px-4 py-4 xl:min-h-[180px]">
                  <p className="text-[15px] font-medium leading-none text-[#6f84a3] sm:text-[16px]">Joined</p>
                  <p className="mt-10 text-[19px] font-semibold leading-tight text-[#344054] sm:text-[20px]">{joinedLabel}</p>
                </div>

                <div className="rounded-[18px] bg-[#f6f8fc] px-4 py-4 xl:min-h-[180px]">
                  <p className="text-[15px] font-medium leading-none text-[#6f84a3] sm:text-[16px]">Location</p>
                  <p className="mt-10 text-[19px] font-semibold leading-tight text-[#344054] sm:text-[20px]">{locationLabel}</p>
                </div>

                <div className="col-span-2 rounded-[18px] bg-[#f6f8fc] px-5 py-5 xl:col-span-1 xl:col-start-3 xl:row-span-2 xl:row-start-1 xl:min-h-[380px]">
                  <h3 className="text-[22px] font-semibold leading-none text-[#344054] sm:text-[24px]">Our Story</h3>
                  <div className="mt-5 text-[15px] font-normal leading-8 text-[#7084a3] sm:text-[16px]">
                    {data.aboutBody}
                  </div>
                  <div className="mt-8">
                    {data.contactPhone ? (
                      <a
                        href={`tel:${data.contactPhone}`}
                        className="inline-flex h-[50px] items-center justify-center rounded-[14px] border border-[#5b7cff] px-6 text-[15px] font-medium text-[#4a63ff] transition hover:bg-[#f5f8ff]"
                      >
                        Contact Seller
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex h-[50px] items-center justify-center rounded-[14px] border border-[#5b7cff] px-6 text-[15px] font-medium text-[#4a63ff]"
                      >
                        Contact Seller
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
        </section>

        {!isMobileFiltersOpen ? (
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="fixed bottom-[76px] right-4 z-40 rounded-full bg-blue-600 px-4 py-2 text-white lg:hidden"
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
