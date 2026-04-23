"use client";

import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, MapPin, MessageSquareText, Phone, Star } from "lucide-react";
import type { CategoryListing } from "@/data/categoryData";
import { getBusinessOpenStatus, normalizePhoneDigits } from "@/lib/listingCardTheme";
import { subscribeVendorStoreStatus, type VendorStoreStatusSocketPayload } from "@/lib/storeStatusRealtime";

const DEFAULT_VENDOR_IMAGE =
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=60";

const normalizeLocationPart = (value: string) =>
  value
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

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
  const [visibleServiceChipCount, setVisibleServiceChipCount] = useState<number | null>(null);
  const hasPrefetchedRef = useRef(false);
  const serviceChipMeasureRowRef = useRef<HTMLDivElement | null>(null);
  const extendedListing = listing as CategoryListing & {
    distance?: string;
    distanceKm?: number | string;
    responseTime?: string;
    responseMinutes?: number;
    startsFrom?: string;
    startingPrice?: string;
  };

  const detailsHref = `/listing/${listing.id}`;
  const inquiryHref = `${detailsHref}?inquiry=true`;
  const displayName =
    String(listing.businessName || "").trim() ||
    String(listing.name || "").trim() ||
    "Business Profile";
  const isVerified = listing.vendorStatus === "approved" || listing.verified;

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

  const locationLabel = useMemo(() => {
    const baseParts = [String(listing.sublocality || "").trim(), String(listing.city || "").trim()];
    const addressParts = String(listing.address || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const uniqueParts: string[] = [];
    const seen = new Set<string>();

    for (const part of [...baseParts, ...addressParts]) {
      if (!part) {
        continue;
      }

      const normalized = normalizeLocationPart(part);
      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      uniqueParts.push(part);
    }

    return uniqueParts.join(", ");
  }, [listing.address, listing.city, listing.sublocality]);

  const ratingText = Number(listing.rating || 0) > 0 ? Number(listing.rating || 0).toFixed(1) : "New";
  const reviewText = Number(listing.reviews || 0) > 0 ? `${Number(listing.reviews)} reviews` : "No reviews";

  const distanceText = useMemo(() => {
    const explicitDistance = String(extendedListing.distance || "").trim();
    if (explicitDistance) {
      return explicitDistance;
    }

    const rawDistance = extendedListing.distanceKm;
    if (typeof rawDistance === "number" && Number.isFinite(rawDistance)) {
      return `${rawDistance.toFixed(rawDistance < 10 ? 1 : 0)} km`;
    }

    const normalizedDistance = String(rawDistance || "").trim();
    if (!normalizedDistance) {
      return "";
    }

    return /km/i.test(normalizedDistance) ? normalizedDistance : `${normalizedDistance} km`;
  }, [extendedListing.distance, extendedListing.distanceKm]);

  const serviceChips = useMemo(() => {
    if (!Array.isArray(listing.tags)) {
      return [];
    }

    const seen = new Set<string>();
    return listing.tags
      .map((tag) => String(tag || "").trim())
      .filter((tag) => {
        if (!tag) return false;
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [listing.tags]);

  useLayoutEffect(() => {
    if (serviceChips.length === 0) {
      setVisibleServiceChipCount(null);
      return;
    }

    const measureRow = serviceChipMeasureRowRef.current;
    if (!measureRow) {
      return;
    }

    const calculateVisibleChipCount = () => {
      const availableWidth = measureRow.clientWidth;
      if (availableWidth <= 0) {
        return;
      }

      const chipElements = Array.from(measureRow.querySelectorAll<HTMLElement>("[data-service-chip='true']"));
      if (chipElements.length === 0) {
        setVisibleServiceChipCount(null);
        return;
      }

      let fitCount = 0;
      for (const chipElement of chipElements) {
        if (chipElement.offsetLeft + chipElement.offsetWidth <= availableWidth + 0.5) {
          fitCount += 1;
        } else {
          break;
        }
      }

      const nextCount = fitCount >= chipElements.length ? null : Math.max(1, fitCount);
      setVisibleServiceChipCount((current) => (current === nextCount ? current : nextCount));
    };

    calculateVisibleChipCount();

    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleChipCount();
    });
    resizeObserver.observe(measureRow);

    return () => {
      resizeObserver.disconnect();
    };
  }, [serviceChips]);

  const visibleServiceChips =
    visibleServiceChipCount === null ? serviceChips : serviceChips.slice(0, visibleServiceChipCount);

  const responseTimeText = useMemo(() => {
    const explicit = String(extendedListing.responseTime || "").trim();
    if (explicit) {
      return explicit;
    }

    if (
      typeof extendedListing.responseMinutes === "number" &&
      Number.isFinite(extendedListing.responseMinutes)
    ) {
      return `Replies in ${Math.max(1, Math.round(extendedListing.responseMinutes))} min`;
    }

    return "";
  }, [extendedListing.responseMinutes, extendedListing.responseTime]);

  const startsFromText = useMemo(() => {
    const raw = String(
      extendedListing.startsFrom || extendedListing.startingPrice || listing.priceRange || ""
    ).trim();
    if (!raw) {
      return "";
    }

    return /^starts/i.test(raw) ? raw : `Starts ${raw}`;
  }, [extendedListing.startsFrom, extendedListing.startingPrice, listing.priceRange]);

  const statusLabel =
    openStatus.isOpen === true
      ? "Open"
      : openStatus.isOpen === false
        ? "Closed"
        : "Hours unavailable";

  const statusBadgeClass =
    openStatus.isOpen === true
      ? "bg-emerald-700 text-emerald-50"
      : openStatus.isOpen === false
        ? "bg-red-700 text-red-50"
        : "bg-slate-600 text-slate-50";

  const statusDotClass =
    openStatus.isOpen === true
      ? "bg-emerald-200"
      : openStatus.isOpen === false
        ? "bg-red-200"
        : "bg-slate-300";

  const statusAnimationClass =
    openStatus.isOpen === true || openStatus.isOpen === false ? "animate-pulse" : "";

  const establishmentYearText = listing.establishmentYear
    ? `Establishment Year ${listing.establishmentYear}`
    : "";

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

  const handleInquiryLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      stopCardNavigation(event);
      setIsNavigating(true);
    },
    [stopCardNavigation]
  );

  useEffect(() => {
    setIsNavigating(false);
  }, [listing.id]);

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={prefetchDetails}
      onTouchStart={prefetchDetails}
      onFocus={prefetchDetails}
      className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
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

      <div className="h-12 bg-white" />

      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-9 flex min-w-0 items-start gap-3.5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm">
            <img
              src={listing.imageUrl || DEFAULT_VENDOR_IMAGE}
              alt={displayName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-2.5 pt-2">
            <div className="flex items-start gap-2.5">
              <Link
                href={detailsHref}
                onClick={handleDetailsLinkClick}
                className="min-w-0 flex-1 truncate text-lg font-semibold text-gray-900 hover:text-blue-700"
              >
                {displayName}
              </Link>

              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${statusBadgeClass} ${statusAnimationClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`} aria-hidden="true" />
                {statusLabel}
              </span>
            </div>

            <p className="inline-flex max-w-full flex-wrap items-center gap-1.5 text-base text-gray-900">
              <Star size={13} className="fill-amber-400 text-amber-500" />
              <span className="font-semibold">{ratingText}</span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-500">{reviewText}</span>
            </p>

            <p className="flex max-w-full items-center gap-1.5 text-sm text-gray-600">
              <MapPin size={12} className="text-gray-500" />
              <span className="truncate font-semibold">{locationLabel || "Location unavailable"}</span>
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-3.5">
          {isVerified || establishmentYearText || distanceText ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              {establishmentYearText ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600">
                  <CalendarDays size={11} className="text-gray-400" />
                  {establishmentYearText}
                </span>
              ) : null}
              {establishmentYearText && (isVerified || distanceText) ? <span className="text-gray-300">|</span> : null}
              {isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-sm font-medium text-green-600">
                  <CheckCircle2 size={11} />
                  Verified
                </span>
              ) : null}
              {isVerified && distanceText ? <span className="text-gray-300">|</span> : null}
              {distanceText ? <span>{distanceText}</span> : null}
            </div>
          ) : null}

          {serviceChips.length > 0 ? (
            <div className="relative">
              <div className="-mx-1 flex flex-nowrap gap-1 overflow-hidden whitespace-nowrap px-1">
                {visibleServiceChips.map((chip) => (
                  <span
                    key={`${listing.id}-${chip}`}
                    className="inline-flex shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-700"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div
                ref={serviceChipMeasureRowRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-hidden whitespace-nowrap opacity-0"
              >
                <div className="-mx-1 flex flex-nowrap gap-1 px-1">
                  {serviceChips.map((chip) => (
                    <span
                      key={`measure-${listing.id}-${chip}`}
                      data-service-chip="true"
                      className="inline-flex shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-700"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {responseTimeText || startsFromText ? (
            <p className="text-sm text-gray-500">
              {[responseTimeText, startsFromText].filter(Boolean).join(" | ")}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex gap-2.5 pt-4">
          <Link
            href={inquiryHref}
            onClick={handleInquiryLinkClick}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700"
            aria-label={`Send inquiry to ${displayName}`}
          >
            <MessageSquareText size={14} />
            Inquiry
          </Link>

          {callHref ? (
            <a
              href={callHref}
              onClick={stopCardNavigation}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#e6fbef] px-3 py-2 text-sm font-medium text-[#15803d] transition-colors duration-200 hover:bg-[#dff3e6] border border-transparent"
              aria-label={`Call ${displayName}`}
            >
              <Phone size={14} className="text-[#15803d]" />
              Call
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[#dff3e6] bg-[#f4faf6] px-3 py-2 text-sm font-medium text-[#9ccfb3]"
              aria-label={`Call unavailable for ${displayName}`}
            >
              Call
            </button>
          )}
          </div>
        </div>
    </article>
  );
}

const BusinessListingCard = memo(BusinessListingCardComponent);

export default BusinessListingCard;
