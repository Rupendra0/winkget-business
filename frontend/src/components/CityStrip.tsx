"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchVendors } from "@/lib/catalogClient";
import { readSelectedCity, subscribeLocationCity } from "@/lib/locationStore";

type PartnerCard = {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  address: string;
  imageUrl: string;
  href: string;
  isNew: boolean;
};

const FALLBACK_VENDOR_IMAGES = [
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=60",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=60",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=60",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=60",
];

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const toObjectIdTimestamp = (id: string) => {
  const normalizedId = String(id || "").trim();
  if (!OBJECT_ID_REGEX.test(normalizedId)) {
    return 0;
  }

  const seconds = Number.parseInt(normalizedId.slice(0, 8), 16);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }

  return seconds * 1000;
};

const toInlineRatingWithReviews = (rating: number, reviews: number) => {
  const safeRating = Number.isFinite(rating) ? Math.max(0, rating) : 0;
  const safeReviews = Number.isFinite(reviews) ? Math.max(0, Math.round(reviews)) : 0;
  return `⭐ ${safeRating.toFixed(1)}/5(${safeReviews})`;
};

export default function CityStrip() {
  const [partners, setPartners] = useState<PartnerCard[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCity(readSelectedCity());
    return subscribeLocationCity((city) => {
      setSelectedCity(city);
    });
  }, []);

  useEffect(() => {
    let active = true;

    const loadPartners = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const cityFilter = String(selectedCity || "").trim();
        const liveVendors = await fetchVendors({ city: cityFilter || undefined });
        if (!active) return;

        if (liveVendors.length === 0) {
          setPartners([]);
          return;
        }

        const createdOrderVendors = [...liveVendors].sort((left, right) => {
          const leftCreatedAt = toObjectIdTimestamp(left.id);
          const rightCreatedAt = toObjectIdTimestamp(right.id);

          if (leftCreatedAt !== rightCreatedAt) {
            return rightCreatedAt - leftCreatedAt;
          }

          return String(left.businessName || left.name || "").localeCompare(
            String(right.businessName || right.name || "")
          );
        });

        const mappedPartners = createdOrderVendors.slice(0, 12).map((vendor, index) => {
          const category = vendor.subcategory || vendor.businessSubcategory?.name || vendor.businessCategory?.name || "Business service";
          const imageUrl =
            String(vendor.shopBannerImage || "").trim() ||
            String(vendor.imageUrl || "").trim() ||
            (Array.isArray(vendor.shopGallery) ? String(vendor.shopGallery[0] || "").trim() : "") ||
            FALLBACK_VENDOR_IMAGES[index % FALLBACK_VENDOR_IMAGES.length];

          return {
            id: vendor.id,
            name: vendor.businessName || vendor.name || "Business profile",
            category,
            rating: Number(vendor.rating || 0),
            reviews: Number(vendor.reviews || 0),
            address: vendor.address || vendor.businessDescription || "Address not available",
            imageUrl,
            href: `/listing/${vendor.id}`,
            isNew: index < 3,
          };
        });

        setPartners(mappedPartners);
      } catch {
        if (!active) return;
        setLoadError("Unable to load recent vendors right now.");
        setPartners([]);
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };

    void loadPartners();

    return () => {
      active = false;
    };
  }, [selectedCity]);

  const sectionSubtitle = useMemo(() => {
    const city = String(selectedCity || "").trim();
    if (!city) {
      return "Discover top-rated businesses across popular categories.";
    }
    return `Discover top-rated businesses in ${city}.`;
  }, [selectedCity]);

  if (isLoading) {
    return (
      <section className="px-0 py-0 sm:px-3 lg:px-3 xl:px-3">
        <div className="w-full animate-pulse rounded-2xl bg-white p-4 sm:p-5 lg:p-6">
          <div className="mb-3 h-7 w-40 rounded bg-slate-200/70" />
          <div className="mb-4 h-4 w-64 rounded bg-slate-200/70" />
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`city-partner-skeleton-${index}`}
                className="shrink-0 basis-[calc((100%-1rem)/2)] overflow-hidden rounded-xl border border-slate-200 bg-white sm:basis-[46%] md:basis-[31%] lg:basis-[calc((100%-6rem)/5)]"
              >
                <div className="h-32 w-full bg-slate-200/70" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-2/3 rounded bg-slate-200/70" />
                  <div className="h-3 w-1/2 rounded bg-slate-200/70" />
                  <div className="h-3 w-3/4 rounded bg-slate-200/70" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (loadError || partners.length === 0) {
    return null;
  }

  return (
    <section className="px-0 py-0 sm:px-3 lg:px-3 xl:px-3">
      <div className="w-full rounded-2xl bg-white p-4 sm:p-5 lg:p-6">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Our Partners</h2>
          <p className="mt-1 text-sm text-gray-600">{sectionSubtitle}</p>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {partners.map((partner) => (
            <Link
              key={partner.id}
              href={partner.href}
              className="relative shrink-0 basis-[calc((100%-1rem)/2)] sm:basis-[46%] md:basis-[31%] lg:basis-[calc((100%-6rem)/5)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(15,23,42,0.12)]"
            >
              {partner.isNew ? (
                <span className="absolute left-2 top-2 z-10 rounded bg-orange-500 px-2 py-1 text-xs text-white">New</span>
              ) : null}

              <img src={partner.imageUrl} alt={partner.name} className="h-32 w-full border-b border-slate-100 object-cover" loading="lazy" />

              <div className="p-3.5">
                <div className="block md:flex md:items-start md:justify-between md:gap-2">
                  <div className="min-w-0 text-sm font-semibold text-gray-900 md:line-clamp-1">{partner.name}</div>
                  <div className="mt-1 text-xs font-semibold text-amber-600 md:mt-0 md:shrink-0">{toInlineRatingWithReviews(partner.rating, partner.reviews)}</div>
                </div>
                <div className="mt-1 text-xs font-bold text-sky-700 line-clamp-1">{partner.category}</div>
                <div className="mt-1.5 text-xs text-gray-500 line-clamp-2">{partner.address}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
