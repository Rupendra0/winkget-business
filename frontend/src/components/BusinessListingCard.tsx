"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import type { CategoryListing } from "@/data/categoryData";
import { getBusinessOpenStatus, normalizePhoneDigits } from "@/lib/listingCardTheme";
import { subscribeVendorStoreStatus, type VendorStoreStatusSocketPayload } from "@/lib/storeStatusRealtime";

const DEFAULT_VENDOR_IMAGE =
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=60";

type BusinessListingCardProps = {
  listing: CategoryListing;
  categoryKey?: string;
  className?: string;
};

function BusinessListingCardComponent({
  listing,
  className,
}: BusinessListingCardProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [liveStoreStatus, setLiveStoreStatus] = useState<VendorStoreStatusSocketPayload | null>(null);
  const hasPrefetchedRef = useRef(false);

  const detailsHref = `/listing/${listing.id}`;
  const displayName =
    String(listing.businessName || "").trim() ||
    String(listing.name || "").trim() ||
    "Business Profile";

  useEffect(() => {
    return subscribeVendorStoreStatus(listing.id, (payload) => {
      setLiveStoreStatus(payload);
    });
  }, [listing.id]);

  const openStatus = useMemo(() => {
    const effectiveIsStoreOpen =
      typeof liveStoreStatus?.isStoreOpen === "boolean"
        ? liveStoreStatus.isStoreOpen
        : typeof listing.isStoreOpen === "boolean"
          ? listing.isStoreOpen
          : null;

    if (typeof effectiveIsStoreOpen === "boolean") {
      const scheduleStatus = getBusinessOpenStatus(listing.shopOpeningTime, listing.shopClosingTime);
      return {
        ...scheduleStatus,
        isOpen: effectiveIsStoreOpen,
        label: effectiveIsStoreOpen ? "Open Now" : "Closed",
      };
    }

    return getBusinessOpenStatus(listing.shopOpeningTime, listing.shopClosingTime);
  }, [listing.shopClosingTime, listing.shopOpeningTime, listing.isStoreOpen, liveStoreStatus?.isStoreOpen]);

  const callDigits = useMemo(() => normalizePhoneDigits(listing.businessPhone), [listing.businessPhone]);
  const callHref = callDigits ? `tel:${callDigits}` : "";

  const enquiriesCount = useMemo(() => {
    const reviews = Number(listing.reviews || 0);
    const base = reviews * 1.5 + 5;
    if (base >= 1000) {
      return `${(base / 1000).toFixed(1)}k Enquiries`;
    }
    return `${Math.round(base)} Enquiries`;
  }, [listing.reviews]);

  const stopCardNavigation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const prefetchDetails = useCallback(() => {
    if (hasPrefetchedRef.current) {
      return;
    }

    hasPrefetchedRef.current = true;
    router.prefetch(detailsHref);
  }, [detailsHref, router]);

  const beginNavigation = useCallback(
    (href: string) => {
      setIsNavigating(true);
      router.push(href);
    },
    [router]
  );

  const handleCardClick = useCallback(() => {
    beginNavigation(detailsHref);
  }, [beginNavigation, detailsHref]);

  const handleCardKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        beginNavigation(detailsHref);
      }
    },
    [beginNavigation, detailsHref]
  );

  const handleDetailsLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      stopCardNavigation(event);
      setIsNavigating(true);
    },
    [stopCardNavigation]
  );

  useEffect(() => {
    setIsNavigating(false);
  }, [listing.id]);

  const isOpen = openStatus.isOpen === true;

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={prefetchDetails}
      onTouchStart={prefetchDetails}
      onFocus={prefetchDetails}
      className={`group relative flex h-full min-w-0 flex-col p-4 pb-7 overflow-hidden rounded-2xl bg-white border border-slate-200 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
        isNavigating ? "pointer-events-none" : ""
      } ${
        className || ""
      }`}
      aria-label={`Open listing for ${displayName}`}
      aria-busy={isNavigating}
    >
      {isNavigating ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
              aria-hidden="true"
            />
            Opening profile...
          </span>
        </div>
      ) : null}

      <div className="relative w-full h-52 overflow-hidden rounded-xl">
        <img
          src={listing.imageUrl || DEFAULT_VENDOR_IMAGE}
          alt={displayName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <span
          className={`absolute left-3 top-3 bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
            isOpen ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {isOpen ? "Open" : "Closed"}
        </span>
      </div>

      <div className="flex flex-1 flex-col pt-3 pb-1 px-0.5">
        {/* Title */}
        <Link
          href={detailsHref}
          onClick={handleDetailsLinkClick}
          className="text-lg md:text-[20px] font-bold text-slate-900 hover:text-blue-700 leading-snug line-clamp-1"
        >
          {displayName}
        </Link>

        {/* Rating Stars Row */}
        <div className="flex items-center gap-1 mt-1.5">
          {[...Array(5)].map((_, i) => {
            const ratingValue = i + 1;
            const rating = Number(listing.rating || 0);
            const isFilled = ratingValue <= Math.round(rating);
            return (
              <Star
                key={i}
                size={14}
                className={isFilled ? "fill-amber-400 text-amber-500" : "text-slate-200"}
              />
            );
          })}
          <span className="text-slate-500 text-xs md:text-sm font-medium ml-1.5">
            ({listing.reviews || 0} Reviews)
          </span>
        </div>

        {/* Address Block */}
        <div className="mt-2 space-y-0.5">
          <p className="text-xs md:text-sm text-slate-500 font-normal truncate">
            {listing.sublocality || "Area"}
          </p>
          <p className="text-xs md:text-sm text-slate-400 font-normal truncate">
            {listing.address || "Address"}
          </p>
        </div>

        {/* Metrics & Action Row */}
        <div className="mt-auto pt-3 border-t border-slate-100/50 flex items-center justify-between">
          <span className="text-xs md:text-sm text-slate-500 font-medium">
            {enquiriesCount}
          </span>
          <div className="flex items-center gap-2" onClick={stopCardNavigation}>
            <Link
              href={detailsHref}
              onClick={handleDetailsLinkClick}
              className="border border-blue-600 text-blue-600 hover:bg-blue-50/50 rounded-lg px-4 py-1.5 text-xs font-semibold transition"
            >
              View Details
            </Link>
            {callHref ? (
              <a
                href={callHref}
                onClick={stopCardNavigation}
                className="border border-slate-300 text-slate-700 hover:bg-slate-50/50 rounded-lg px-4 py-1.5 text-xs font-semibold transition"
              >
                Call
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="border border-slate-200 text-slate-400 rounded-lg px-4 py-1.5 text-xs font-semibold bg-slate-50 cursor-not-allowed"
              >
                Call
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

const BusinessListingCard = memo(BusinessListingCardComponent);

export default BusinessListingCard;
