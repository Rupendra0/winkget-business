"use client";

import React, { memo, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import type { CategoryListing } from "@/data/categoryData";
import {
  getBusinessOpenStatus,
  getListingCardAccent,
  normalizePhoneDigits,
} from "@/lib/listingCardTheme";

const DEFAULT_VENDOR_IMAGE =
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=60";

type BusinessListingCardProps = {
  listing: CategoryListing;
  categoryKey?: string;
  className?: string;
};

function BusinessListingCardComponent({
  listing,
  categoryKey,
  className,
}: BusinessListingCardProps) {
  const router = useRouter();

  const detailsHref = `/listing/${listing.id}`;
  const displayName =
    String(listing.businessName || "").trim() ||
    String(listing.name || "").trim() ||
    "Business Profile";
  const isVerified = listing.vendorStatus === "approved" || listing.verified;

  const accent = useMemo(
    () => getListingCardAccent(categoryKey || listing.subcategoryId || listing.subcategory || displayName),
    [categoryKey, displayName, listing.subcategory, listing.subcategoryId]
  );

  const openStatus = useMemo(
    () => getBusinessOpenStatus(listing.shopOpeningTime, listing.shopClosingTime),
    [listing.shopClosingTime, listing.shopOpeningTime]
  );

  const callDigits = useMemo(() => normalizePhoneDigits(listing.businessPhone), [listing.businessPhone]);
  const callHref = callDigits ? `tel:${callDigits}` : "";
  const whatsappHref = callDigits ? `https://wa.me/${callDigits}` : "";

  const locationLabel = useMemo(
    () =>
      [String(listing.sublocality || "").trim(), String(listing.city || "").trim()]
        .filter(Boolean)
        .join(", "),
    [listing.city, listing.sublocality]
  );

  const highlights = useMemo(() => {
    const fromTags = Array.isArray(listing.tags)
      ? listing.tags
          .map((tag) => String(tag || "").trim())
          .filter(Boolean)
      : [];

    if (fromTags.length > 0) {
      return fromTags.slice(0, 3);
    }

    const fallback = String(listing.subcategory || "").trim();
    return fallback ? [fallback] : [];
  }, [listing.subcategory, listing.tags]);

  const ratingText = Number(listing.rating || 0) > 0 ? Number(listing.rating || 0).toFixed(1) : "";
  const reviewText = Number(listing.reviews || 0) > 0 ? `(${Number(listing.reviews)})` : "";

  const stopCardNavigation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const handleWishlistClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
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
      className={`group min-w-0 rounded-2xl border border-gray-100 bg-white p-3 md:p-4 shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${accent.focusRingClass} ${
        className || ""
      }`}
      aria-label={`Open listing for ${displayName}`}
    >
      <div className="relative h-32 w-full overflow-hidden rounded-xl bg-gray-100 md:h-40">
        <img
          src={listing.imageUrl || DEFAULT_VENDOR_IMAGE}
          alt={displayName}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute left-3 right-3 top-3 z-20 flex items-start justify-between gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
              openStatus.isOpen === true
                ? "bg-emerald-500 text-white"
                : openStatus.isOpen === false
                  ? "bg-rose-500 text-white"
                  : "bg-gray-800 text-white"
            }`}
          >
            {openStatus.label}
          </span>

          <button
            type="button"
            onClick={handleWishlistClick}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow-sm transition hover:bg-white"
            aria-label={`Save ${displayName}`}
          >
            <Heart size={15} />
          </button>
        </div>
      </div>

      <div className="mt-2 space-y-1 md:mt-4 md:space-y-3">
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <Link
            href={detailsHref}
            onClick={stopCardNavigation}
            className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 transition-colors hover:text-gray-900 md:text-lg"
          >
            {displayName}
          </Link>

          {isVerified ? (
            <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-600">
              Verified
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {highlights.map((tag) => (
            <span
              key={`${listing.id}-${tag}`}
              className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium md:px-3 md:text-xs ${accent.tagClass}`}
            >
              {tag}
            </span>
          ))}

          {ratingText ? (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Star size={12} className="fill-amber-400 text-amber-500" />
              {ratingText} {reviewText}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500 md:text-sm">
          <MapPin size={14} className={accent.iconClass} />
          <span className="truncate">{locationLabel || "Location unavailable"}</span>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
          <span className={openStatus.schedule ? accent.subtleTextClass : "text-gray-400"}>
            {openStatus.schedule || "Hours unavailable"}
          </span>
          {listing.establishmentYear ? (
            <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
              Since {listing.establishmentYear}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex gap-2 md:mt-3">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={stopCardNavigation}
              className={`inline-flex w-full flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium text-white transition md:py-2.5 md:text-sm ${accent.primaryButtonClass}`}
              aria-label={`Message ${displayName} on WhatsApp`}
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex w-full flex-1 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 py-2 text-xs font-medium text-gray-400 md:py-2.5 md:text-sm"
              aria-label={`WhatsApp unavailable for ${displayName}`}
            >
              WhatsApp
            </button>
          )}

          {callHref ? (
            <a
              href={callHref}
              onClick={stopCardNavigation}
              className={`inline-flex w-full flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition md:py-2.5 md:text-sm ${accent.secondaryButtonClass}`}
              aria-label={`Call ${displayName}`}
            >
              <Phone size={14} />
              Call
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex w-full flex-1 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 py-2 text-xs font-medium text-gray-400 md:py-2.5 md:text-sm"
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
