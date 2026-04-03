"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, SlidersHorizontal, Star } from "lucide-react";
import Footer from "@/components/Footer";
import type { CategoryPageData } from "@/data/categoryData";
import { getBusinessReviewAggregate, subscribeReviewUpdates } from "@/lib/reviewStore";

const ratingLabel = (rating: number) => rating.toFixed(1);

type SubcategoryOption = {
  id: string;
  label: string;
};

const normalizeSubcategoryOptions = (subcategories: CategoryPageData["subcategories"]) => {
  const seen = new Set<string>();
  const normalized: SubcategoryOption[] = [];

  for (const subcategory of subcategories) {
    if (typeof subcategory === "string") {
      const trimmed = subcategory.trim();
      if (!trimmed || seen.has(trimmed)) {
        continue;
      }
      seen.add(trimmed);
      normalized.push({ id: trimmed, label: trimmed });
      continue;
    }

    const id = String(subcategory.id || "").trim();
    const label = String(subcategory.label || "").trim();
    if (!id || !label || seen.has(id)) {
      continue;
    }
    seen.add(id);
    normalized.push({ id, label });
  }

  return normalized;
};

export default function CategoryPage({ data }: { data: CategoryPageData }) {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedSublocality, setSelectedSublocality] = useState<string>("All");
  const [reviewUpdateVersion, setReviewUpdateVersion] = useState(0);
  const [isReviewHydrated, setIsReviewHydrated] = useState(false);

  useEffect(() => {
    setIsReviewHydrated(true);
    return subscribeReviewUpdates(() => {
      setReviewUpdateVersion((prev) => prev + 1);
    });
  }, []);

  const listingsWithReviewStats = useMemo(
    () =>
      data.listings.map((listing) => {
        if (!isReviewHydrated) {
          return listing;
        }

        const aggregate = getBusinessReviewAggregate(listing.id, listing.rating, listing.reviews);
        return {
          ...listing,
          rating: aggregate.rating,
          reviews: aggregate.reviews,
        };
      }),
    [data.listings, isReviewHydrated, reviewUpdateVersion]
  );

  const subcategoryOptions = useMemo(() => normalizeSubcategoryOptions(data.subcategories), [data.subcategories]);
  const filterOptions: SubcategoryOption[] = useMemo(
    () => [{ id: "all", label: "All" }, ...subcategoryOptions],
    [subcategoryOptions]
  );

  const filteredListings = useMemo(() => {
    return listingsWithReviewStats.filter((listing) => {
      const matchesSubcategory =
        selectedSubcategory === "all" || (listing.subcategoryId || listing.subcategory) === selectedSubcategory;
      const matchesSublocality =
        selectedSublocality === "All" || listing.sublocality === selectedSublocality;
      return matchesSubcategory && matchesSublocality;
    });
  }, [listingsWithReviewStats, selectedSubcategory, selectedSublocality]);

  const exploreInsertAfter = data.exploreInsertAfter || 6;
  const firstBatch = filteredListings.slice(0, exploreInsertAfter);
  const remainingBatch = filteredListings.slice(exploreInsertAfter);

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <section className="rounded-3xl overflow-hidden glass-panel grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
          <div className="p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/70 text-blue-900 text-xs font-semibold">
              <MapPin size={14} />
              {data.city}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
              {data.banner.title}
            </h1>
            <p className="text-gray-600 mt-1 max-w-xl text-sm">
              {data.banner.subtitle}
            </p>
            <button className="mt-3 px-4 py-2 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 btn-hover">
              {data.banner.cta}
            </button>
          </div>
          <div className="h-[140px] sm:h-[160px] lg:h-[180px] bg-white/40">
            <img
              src={data.banner.imageUrl}
              alt={data.banner.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          <aside className="glass-panel rounded-2xl p-5 space-y-6 h-fit lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <SlidersHorizontal size={16} className="text-blue-900" />
              Filters
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Sublocality</div>
              <select
                className="w-full rounded-xl border border-blue-200 bg-white/90 px-4 py-2 text-sm text-slate-700"
                value={selectedSublocality}
                onChange={(event) => setSelectedSublocality(event.target.value)}
              >
                <option value="All">All areas</option>
                {data.sublocalities.map((locality) => (
                  <option key={locality} value={locality}>
                    {locality}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Subcategory</div>
              <div className="space-y-2">
                {filterOptions.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all btn-hover ${
                      selectedSubcategory === subcategory.id
                        ? "bg-blue-900 text-white"
                        : "bg-white/60 text-gray-700 hover:bg-white"
                    }`}
                    onClick={() => setSelectedSubcategory(subcategory.id)}
                  >
                    {subcategory.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((subcategory) => (
                <button
                  key={subcategory.id}
                  type="button"
                  className={`px-4 py-2 rounded-full text-sm transition-all btn-hover ${
                    selectedSubcategory === subcategory.id
                      ? "bg-blue-900 text-white"
                      : "bg-white/70 text-gray-700 hover:bg-white"
                  }`}
                  onClick={() => setSelectedSubcategory(subcategory.id)}
                >
                  {subcategory.label}
                </button>
              ))}
            </div>

            {filteredListings.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  {firstBatch.map((listing) => (
                    <div
                      key={listing.id}
                      className="rounded-2xl bg-gradient-to-br from-white/90 via-blue-50/70 to-teal-50/60 border border-blue-100/60 shadow-md overflow-hidden card-float card-hover"
                    >
                      <Link href={`/listing/${listing.id}`} className="block">
                        <div className="h-44 w-full overflow-hidden">
                          <img
                            src={listing.imageUrl}
                            alt={listing.name}
                            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      </Link>
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <Link href={`/listing/${listing.id}`} className="font-semibold text-gray-900">
                            {listing.name}
                          </Link>
                          {listing.verified && (
                            <span className="text-xs font-semibold text-blue-900 bg-blue-100/70 px-2 py-1 rounded-full">
                              Verified
                            </span>
                          )}
                        </div>
                        {listing.badges && listing.badges.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {listing.badges.slice(0, 2).map((badge) => (
                              <span
                                key={`${listing.id}-${badge}`}
                                className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-100 text-amber-900"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                        {listing.rating > 0 || listing.reviews > 0 ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Star size={14} className="text-yellow-500 fill-yellow-500" />
                            {ratingLabel(listing.rating)} ({listing.reviews})
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-slate-500">New listing</div>
                        )}
                        {(listing.priceRange || listing.tags?.length) && (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            {listing.priceRange && (
                              <span className="font-semibold text-gray-700">
                                {listing.priceRange}
                              </span>
                            )}
                            {listing.tags?.slice(0, 2).map((tag) => (
                              <span key={`${listing.id}-${tag}`} className="px-2 py-1 rounded-full bg-white/80">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">{listing.address}</div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-blue-900 font-semibold">
                            {listing.subcategory || "Business"}
                          </span>
                          <button className="px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 btn-hover">
                            {listing.ctaLabel ?? "Inquiry"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <section className="space-y-4">
                  <div className="text-lg font-bold text-gray-900">{data.exploreTitle}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {data.exploreTiles.map((tile) => (
                      <div
                        key={tile.label}
                        className="rounded-2xl overflow-hidden shadow-md border border-white/70 bg-white/60 card-float card-hover"
                      >
                        <div className="h-20 w-full overflow-hidden">
                          <img
                            src={tile.imageUrl}
                            alt={tile.label}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-800">
                          {tile.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  {remainingBatch.map((listing) => (
                    <div
                      key={listing.id}
                      className="rounded-2xl bg-gradient-to-br from-white/90 via-blue-50/70 to-teal-50/60 border border-blue-100/60 shadow-md overflow-hidden card-float card-hover"
                    >
                      <Link href={`/listing/${listing.id}`} className="block">
                        <div className="h-44 w-full overflow-hidden">
                          <img
                            src={listing.imageUrl}
                            alt={listing.name}
                            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      </Link>
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <Link href={`/listing/${listing.id}`} className="font-semibold text-gray-900">
                            {listing.name}
                          </Link>
                          {listing.verified && (
                            <span className="text-xs font-semibold text-blue-900 bg-blue-100/70 px-2 py-1 rounded-full">
                              Verified
                            </span>
                          )}
                        </div>
                        {listing.badges && listing.badges.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {listing.badges.slice(0, 2).map((badge) => (
                              <span
                                key={`${listing.id}-${badge}`}
                                className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-100 text-amber-900"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                        {listing.rating > 0 || listing.reviews > 0 ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Star size={14} className="text-yellow-500 fill-yellow-500" />
                            {ratingLabel(listing.rating)} ({listing.reviews})
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-slate-500">New listing</div>
                        )}
                        {(listing.priceRange || listing.tags?.length) && (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            {listing.priceRange && (
                              <span className="font-semibold text-gray-700">
                                {listing.priceRange}
                              </span>
                            )}
                            {listing.tags?.slice(0, 2).map((tag) => (
                              <span key={`${listing.id}-${tag}`} className="px-2 py-1 rounded-full bg-white/80">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">{listing.address}</div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-blue-900 font-semibold">
                            {listing.subcategory || "Business"}
                          </span>
                          <button className="px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 btn-hover">
                            {listing.ctaLabel ?? "Inquiry"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="rounded-2xl bg-white/60 border border-white/70 shadow-md overflow-hidden animate-pulse"
                  >
                    <div className="h-44 w-full bg-slate-200/70" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 w-3/4 rounded bg-slate-200/70" />
                      <div className="h-3 w-1/2 rounded bg-slate-200/70" />
                      <div className="h-3 w-2/3 rounded bg-slate-200/70" />
                      <div className="h-8 w-full rounded bg-slate-200/70" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-12">
        <Footer />
      </div>
    </main>
  );
}
