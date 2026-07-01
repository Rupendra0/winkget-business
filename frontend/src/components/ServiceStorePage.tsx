"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Heart,
  MapPin,
  MessageCircle,
  PhoneCall,
  Star,
} from "lucide-react";
import Footer from "@/components/Footer";
import { buildProductSlug } from "@/data/productSlug";
import type { StorePageData, StoreProduct } from "@/data/listingData";
import { getBusinessReviewAggregate, subscribeReviewUpdates } from "@/lib/reviewStore";
import {
  CART_UPDATED_EVENT,
  addToCart,
  makeStoreProduct,
  readCart,
  readWishlist,
  setCartItemQuantity,
  toggleWishlist,
} from "@/lib/shopStorage";

const ratingLabel = (rating: number) => rating.toFixed(1);

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
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
};

const normalizePhoneDigits = (value?: string) => String(value || "").replace(/\D/g, "");

export default function ServiceStorePage({ data }: { data: StorePageData }) {
  const [isReviewHydrated, setIsReviewHydrated] = useState(false);
  const [, setReviewUpdateVersion] = useState(0);
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [wishlistProductIds, setWishlistProductIds] = useState<Set<string>>(() => new Set());

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

  useEffect(() => {
    const syncWishlistState = () => {
      setWishlistProductIds(new Set(readWishlist().map((item) => item.id)));
    };

    syncWishlistState();
    window.addEventListener("shop:wishlist-updated", syncWishlistState as EventListener);
    window.addEventListener("storage", syncWishlistState);

    return () => {
      window.removeEventListener("shop:wishlist-updated", syncWishlistState as EventListener);
      window.removeEventListener("storage", syncWishlistState);
    };
  }, []);

  const storeReviewStats = isReviewHydrated
    ? getBusinessReviewAggregate(data.id, data.rating, data.reviews)
    : { rating: data.rating, reviews: data.reviews };

  const services = useMemo(() => data.products, [data.products]);
  const phoneDigits = normalizePhoneDigits(data.contactPhone);
  const whatsappDigits = normalizePhoneDigits(data.whatsappPhone || data.contactPhone);
  const contactHref = phoneDigits ? `tel:${phoneDigits}` : undefined;
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined;

  const locationLabel = useMemo(() => {
    const locality = String(data.sublocality || "").trim();
    const city = String(data.city || "").trim();
    const address = String(data.address || "").trim();

    return locality || city || address || "Location unavailable";
  }, [data.address, data.city, data.sublocality]);

  const joinedLabel = useMemo(() => {
    const createdAtValue = String(data.createdAt || "").trim();
    if (createdAtValue) {
      const parsedDate = new Date(createdAtValue);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      }
    }

    if (Number.isFinite(Number(data.establishmentYear)) && Number(data.establishmentYear) > 0) {
      return `Since ${Number(data.establishmentYear)}`;
    }

    return "Recently added";
  }, [data.createdAt, data.establishmentYear]);

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

      if (alreadyInCart) {
        return;
      }

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
    },
    [buildProductHref, data.id, data.storeName]
  );

  const handleToggleWishlist = useCallback(
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

      toggleWishlist(storeProduct);
    },
    [buildProductHref, data.id, data.storeName]
  );

  const updateServiceCartQuantity = useCallback((productId: string, nextQuantity: number) => {
    setCartItemQuantity(productId, nextQuantity);
  }, []);

  const renderServiceCard = (service: StoreProduct) => {
    const serviceHref = buildProductHref(service);
    const serviceCartQuantity = Math.max(0, Number(cartQuantities[service.id] || 0));
    const reviewSummary = isReviewHydrated
      ? getBusinessReviewAggregate(
          toProductReviewBusinessKey(service.id),
          Number(service.rating || 0),
          Math.max(0, Number(service.reviews || 0))
        )
      : {
          rating: Number(service.rating || 0),
          reviews: Math.max(0, Number(service.reviews || 0)),
        };
    const ratingValue = Number(reviewSummary.rating || 0);
    const reviewCountValue = Math.max(0, Math.round(Number(reviewSummary.reviews || 0)));
    const currentPriceValue = toPriceValue(service.price);
    const oldPriceValue = Number(service.oldPriceValue || 0);
    const hasComparablePrice = Number.isFinite(oldPriceValue) && oldPriceValue > currentPriceValue && currentPriceValue > 0;
    const currentPriceLabel =
      currentPriceValue > 0
        ? formatIndianCurrency(currentPriceValue)
        : String(service.price || "").trim() || "Price unavailable";
    const imageUrl = String(service.imageUrl || data.logoImage || "").trim();

    return (
      <article
        key={service.id}
        className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-white transition hover:-translate-y-0.5"
      >
        <Link href={serviceHref} className="relative block aspect-video w-full overflow-hidden bg-slate-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={service.name}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
              Service
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => handleToggleWishlist(service)}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-400 transition hover:text-rose-500"
          aria-label={`${wishlistProductIds.has(service.id) ? "Remove from" : "Add to"} wishlist`}
        >
          <Heart
            size={18}
            className={wishlistProductIds.has(service.id) ? "fill-rose-500 text-rose-500" : ""}
            strokeWidth={1.8}
          />
        </button>

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <Link href={serviceHref} className="line-clamp-2 min-h-[2.7rem] text-[15px] font-bold leading-5 text-slate-900 hover:text-blue-700">
            {service.name}
          </Link>

          <p className="mt-1 truncate text-sm font-medium text-slate-500">
            {service.sellerName || data.storeName}
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span className="font-extrabold text-amber-600">{ratingLabel(ratingValue)}</span>
            <div className="flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  size={13}
                  className={index < Math.round(ratingValue) ? "fill-amber-500 text-amber-500" : "text-slate-300"}
                />
              ))}
            </div>
            <span className="text-slate-400">({reviewCountValue})</span>
          </div>

          {service.shortDescription || service.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
              {service.shortDescription || service.description}
            </p>
          ) : null}

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-slate-950">{currentPriceLabel}</span>
            {hasComparablePrice ? (
              <span className="text-sm text-slate-400 line-through">
                {formatIndianCurrency(oldPriceValue)}
              </span>
            ) : null}
          </div>

          <div className="mt-auto pt-4">
            {serviceCartQuantity > 0 ? (
              <div className="grid h-10 w-full min-w-0 grid-cols-3 overflow-hidden rounded-lg bg-[#2f9e44] text-white">
                <button
                  type="button"
                  onClick={() => updateServiceCartQuantity(service.id, serviceCartQuantity - 1)}
                  className="grid min-w-0 place-items-center text-lg font-bold leading-none transition hover:bg-[#27873a]"
                  aria-label={`Decrease quantity for ${service.name}`}
                >
                  -
                </button>
                <div className="grid min-w-0 place-items-center bg-[#2f9e44] px-1 text-sm font-extrabold text-white">
                  {serviceCartQuantity}
                </div>
                <button
                  type="button"
                  onClick={() => updateServiceCartQuantity(service.id, serviceCartQuantity + 1)}
                  className="grid min-w-0 place-items-center text-lg font-bold leading-none transition hover:bg-[#27873a]"
                  aria-label={`Increase quantity for ${service.name}`}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleAddToCart(service)}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Book Now
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="min-h-screen bg-white">
      <section className="w-full px-4 pb-12 pt-6 sm:px-8 lg:px-16">
        <section className="overflow-visible px-0 pb-5 pt-4">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div className="-mt-1 h-24 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100 sm:-mt-6 sm:h-32 sm:w-32">
              <img
                src={data.logoImage}
                alt={`${data.storeName} logo`}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
                      {data.storeName}
                    </h1>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={14} />
                      Verified
                    </span>
                  </div>

                  <p className="mt-2 text-base font-semibold text-slate-600">
                    {data.tagline || data.storeCategory || "Professional Services"}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Star size={16} className="fill-amber-400 text-amber-400" />
                      {ratingLabel(storeReviewStats.rating)} ({storeReviewStats.reviews} reviews)
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin size={16} className="shrink-0 text-slate-400" />
                      <span className="truncate">{locationLabel}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={16} className="text-slate-400" />
                      {joinedLabel}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {contactHref ? (
                    <a
                      href={contactHref}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                      <PhoneCall size={16} />
                      Call
                    </a>
                  ) : null}
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle size={16} />
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
          <div className="min-w-0">
            <article>
              <h2 className="text-2xl font-extrabold text-slate-950">{data.aboutTitle || "Business Details"}</h2>
              <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-slate-600">
                {data.aboutBody || "Business details will be available soon."}
              </p>
            </article>

            <section className="mt-16">
              <h2 className="text-2xl font-extrabold text-slate-950">Services</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {services.length} {services.length === 1 ? "service" : "services"} available
              </p>

              {services.length > 0 ? (
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {services.map((service) => renderServiceCard(service))}
                </div>
              ) : (
                <p className="mt-5 px-5 py-10 text-center text-sm font-semibold text-slate-600">
                  No services available yet.
                </p>
              )}
            </section>
          </div>

          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <section>
              <h2 className="text-xl font-extrabold text-slate-950">Contact Details</h2>
              <div className="mt-4 space-y-4 text-sm font-semibold text-slate-700">
                <p className="flex items-start gap-3">
                  <PhoneCall size={17} className="mt-0.5 shrink-0 text-blue-600" />
                  <span>{data.contactPhone || "Phone unavailable"}</span>
                </p>
                <p className="flex items-start gap-3">
                  <MapPin size={17} className="mt-0.5 shrink-0 text-blue-600" />
                  <span>{data.address || locationLabel}</span>
                </p>
                <p className="flex items-start gap-3">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{data.isStoreOpen === false ? "Currently closed" : "Available for enquiries"}</span>
                </p>
              </div>
            </section>
          </aside>
        </section>
      </section>
      <Footer />
    </main>
  );
}
