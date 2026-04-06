"use client";

import React, { memo, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, MapPin, MessageSquareText, Phone, Star } from "lucide-react";
import type { CategoryListing } from "@/data/categoryData";
import { getBusinessOpenStatus, normalizePhoneDigits } from "@/lib/listingCardTheme";

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

  const openStatus = useMemo(
    () => getBusinessOpenStatus(listing.shopOpeningTime, listing.shopClosingTime),
    [listing.shopClosingTime, listing.shopOpeningTime]
  );

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
    const tags = Array.isArray(listing.tags)
      ? listing.tags
          .map((tag) => String(tag || "").trim())
          .filter(Boolean)
      : [];

    if (tags.length > 0) {
      return tags.slice(0, 3);
    }

    const fallback = String(listing.subcategory || "").trim();
    return fallback ? [fallback] : [];
  }, [listing.subcategory, listing.tags]);

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

  const handleCardClick = useCallback(() => {
    router.push(detailsHref);
  }, [detailsHref, router]);

  const handleCardKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        router.push(detailsHref);
      }
    },
    [detailsHref, router]
  );

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`group min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
        className || ""
      }`}
      aria-label={`Open listing for ${displayName}`}
    >
      <div className="h-12 bg-white" />

      <div className="px-4 pb-4">
        <div className="-mt-8 flex min-w-0 items-start gap-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm">
            <img
              src={listing.imageUrl || DEFAULT_VENDOR_IMAGE}
              alt={displayName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-2 pt-1.5">
            <div className="flex items-start gap-2">
              <Link
                href={detailsHref}
                onClick={stopCardNavigation}
                className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 hover:text-blue-700"
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

            <p className="inline-flex max-w-full flex-wrap items-center gap-1.5 text-sm text-gray-900">
              <Star size={13} className="fill-amber-400 text-amber-500" />
              <span className="font-semibold">{ratingText}</span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500">{reviewText}</span>
            </p>

            <p className="inline-flex max-w-full items-center gap-1.5 text-xs text-gray-500">
              <MapPin size={12} className="text-gray-500" />
              <span className="truncate">{locationLabel || "Location unavailable"}</span>
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {isVerified || establishmentYearText || distanceText ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {establishmentYearText ? (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <CalendarDays size={11} className="text-gray-400" />
                  {establishmentYearText}
                </span>
              ) : null}
              {establishmentYearText && (isVerified || distanceText) ? <span className="text-gray-300">|</span> : null}
              {isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-600">
                  <CheckCircle2 size={11} />
                  Verified
                </span>
              ) : null}
              {isVerified && distanceText ? <span className="text-gray-300">|</span> : null}
              {distanceText ? <span>{distanceText}</span> : null}
            </div>
          ) : null}

          {serviceChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {serviceChips.slice(0, 3).map((chip) => (
                <span
                  key={`${listing.id}-${chip}`}
                  className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          {responseTimeText || startsFromText ? (
            <p className="text-xs text-gray-500">
              {[responseTimeText, startsFromText].filter(Boolean).join(" | ")}
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2">
          <Link
            href={inquiryHref}
            onClick={stopCardNavigation}
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
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-100"
              aria-label={`Call ${displayName}`}
            >
              <Phone size={14} />
              Call
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-400"
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
