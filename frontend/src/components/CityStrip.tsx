"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { localPartners } from "@/data/homeData";
import { fetchVendors } from "@/lib/catalogClient";
import { readSelectedCity, subscribeLocationCity } from "@/lib/locationStore";

type PartnerCard = {
  id: string;
  name: string;
  category: string;
  city: string;
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
          if (cityFilter) {
            setPartners([]);
            setIsLoading(false);
            return;
          }

          setPartners(
            localPartners.map((partner, index) => ({
              id: `fallback-${index}`,
              name: partner.name,
              category: "Recently joined",
              city: "Any city",
              rating: 4.5,
              reviews: 0,
              address: "Verified partner on Winkget",
              imageUrl: partner.logoUrl,
              href: "#",
              isNew: index < 3,
            }))
          );
          setIsLoading(false);
          return;
        }

        const mappedPartners = liveVendors.slice(0, 12).map((vendor, index) => {
          const category = vendor.subcategory || vendor.businessSubcategory?.name || vendor.businessCategory?.name || "Business service";
          const city = String(vendor.city || "").trim() || "Unknown city";
          const imageUrl =
            String(vendor.shopBannerImage || "").trim() ||
            String(vendor.imageUrl || "").trim() ||
            (Array.isArray(vendor.shopGallery) ? String(vendor.shopGallery[0] || "").trim() : "") ||
            FALLBACK_VENDOR_IMAGES[index % FALLBACK_VENDOR_IMAGES.length];

          return {
            id: vendor.id,
            name: vendor.businessName || vendor.name || "Business profile",
            category,
            city,
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
      return "Recently registered vendors, regardless of category";
    }
    return `Recently added vendors in ${city}`;
  }, [selectedCity]);

  const visiblePartners = useMemo(
    () =>
      partners.length > 0
        ? partners
        : selectedCity
          ? []
          : localPartners.map((partner, index) => ({
            id: `fallback-initial-${index}`,
            name: partner.name,
            category: "Recently joined",
            city: "Any city",
            rating: 4.5,
            reviews: 0,
            address: "Verified partner on Winkget",
            imageUrl: partner.logoUrl,
            href: "#",
            isNew: index < 3,
          })),
    [partners, selectedCity]
  );

  const formatRating = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    if (safe <= 0) return "New";
    return `${safe.toFixed(1)} / 5`;
  };

  return (
    <section className="px-3 py-4 sm:px-4 lg:px-6 xl:px-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Our Partners</h2>
          <p className="mt-1 text-sm text-gray-600">{sectionSubtitle}</p>
        </div>

        {isLoading ? <p className="text-sm text-gray-500">Loading recent vendors...</p> : null}
        {!isLoading && loadError ? <p className="text-sm text-gray-500">{loadError}</p> : null}
        {!isLoading && !loadError && visiblePartners.length === 0 ? (
          <p className="text-sm text-gray-500">No recent vendors found for the selected city yet.</p>
        ) : null}

        <div className="flex gap-6 overflow-x-auto pb-2 no-scrollbar">
          {visiblePartners.map((partner) => (
            <Link
              key={partner.id}
              href={partner.href}
              className="relative shrink-0 basis-[76%] sm:basis-[46%] md:basis-[31%] lg:basis-[calc((100%-6rem)/5)] overflow-hidden rounded-xl border border-gray-200 bg-white/70 backdrop-blur-md shadow-sm hover:shadow-md transition"
            >
              {partner.isNew ? (
                <span className="absolute left-2 top-2 z-10 rounded bg-orange-500 px-2 py-1 text-xs text-white">New</span>
              ) : null}

              <img src={partner.imageUrl} alt={partner.name} className="h-32 w-full object-cover" loading="lazy" />

              <div className="p-3">
                <div className="text-sm font-semibold text-gray-900 line-clamp-1">{partner.name}</div>
                <div className="mt-1 text-xs text-gray-500 line-clamp-1">{partner.category}</div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                  <span className="line-clamp-1">{partner.city}</span>
                  <span className="shrink-0 font-semibold text-amber-600">{formatRating(partner.rating)}</span>
                </div>
                <div className="mt-1 text-[11px] text-gray-500">{partner.reviews > 0 ? `${partner.reviews} reviews` : "No reviews yet"}</div>
                <div className="mt-1 text-xs text-gray-500 line-clamp-2">{partner.address}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
