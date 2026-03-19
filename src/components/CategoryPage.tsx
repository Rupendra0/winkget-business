"use client";

import React, { useMemo, useState } from "react";
import { MapPin, SlidersHorizontal, Star } from "lucide-react";
import Footer from "@/components/Footer";
import type { CategoryPageData } from "@/data/categoryData";

const ratingLabel = (rating: number) => rating.toFixed(1);

export default function CategoryPage({ data }: { data: CategoryPageData }) {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("All");
  const [selectedSublocality, setSelectedSublocality] = useState<string>("All");

  const exploreTiles = [
    {
      label: "Cafes",
      imageUrl: "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=400&q=60",
    },
    {
      label: "Dinner",
      imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=60",
    },
    {
      label: "Chill",
      imageUrl: "https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=400&q=60",
    },
    {
      label: "Pubs",
      imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=60",
    },
    {
      label: "More",
      imageUrl: "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=400&q=60",
    },
  ];

  const filteredListings = useMemo(() => {
    return data.listings.filter((listing) => {
      const matchesSubcategory =
        selectedSubcategory === "All" || listing.subcategory === selectedSubcategory;
      const matchesSublocality =
        selectedSublocality === "All" || listing.sublocality === selectedSublocality;
      return matchesSubcategory && matchesSublocality;
    });
  }, [data.listings, selectedSubcategory, selectedSublocality]);

  const exploreInsertAfter = data.exploreInsertAfter || 6;
  const firstBatch = filteredListings.slice(0, exploreInsertAfter);
  const remainingBatch = filteredListings.slice(exploreInsertAfter);

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <section className="rounded-3xl overflow-hidden glass-panel grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
          <div className="p-8 sm:p-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/70 text-blue-900 text-xs font-semibold">
              <MapPin size={14} />
              {data.city}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-4">
              {data.banner.title}
            </h1>
            <p className="text-gray-600 mt-2 max-w-xl">{data.banner.subtitle}</p>
            <button className="mt-6 px-6 py-3 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800">
              {data.banner.cta}
            </button>
          </div>
          <div className="min-h-[220px] bg-white/40">
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
                className="w-full rounded-xl border border-blue-200 bg-white/70 px-4 py-2 text-sm"
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
                {["All", ...data.subcategories].map((subcategory) => (
                  <button
                    key={subcategory}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedSubcategory === subcategory
                        ? "bg-blue-900 text-white"
                        : "bg-white/60 text-gray-700 hover:bg-white"
                    }`}
                    onClick={() => setSelectedSubcategory(subcategory)}
                  >
                    {subcategory}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {["All", ...data.subcategories].map((subcategory) => (
                <button
                  key={subcategory}
                  type="button"
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    selectedSubcategory === subcategory
                      ? "bg-blue-900 text-white"
                      : "bg-white/70 text-gray-700 hover:bg-white"
                  }`}
                  onClick={() => setSelectedSubcategory(subcategory)}
                >
                  {subcategory}
                </button>
              ))}
            </div>

            {filteredListings.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  {firstBatch.map((listing) => (
                    <div
                      key={listing.id}
                      className="rounded-2xl bg-white/70 border border-white/80 shadow-md overflow-hidden card-float"
                    >
                      <div className="h-44 w-full overflow-hidden">
                        <img
                          src={listing.imageUrl}
                          alt={listing.name}
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{listing.name}</h3>
                          {listing.verified && (
                            <span className="text-xs font-semibold text-blue-900 bg-blue-100/70 px-2 py-1 rounded-full">
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          {ratingLabel(listing.rating)} ({listing.reviews})
                        </div>
                        <div className="text-xs text-gray-500">{listing.address}</div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-blue-900 font-semibold">
                            {listing.subcategory}
                          </span>
                          <button className="px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800">
                            Inquiry
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
                        className="rounded-2xl overflow-hidden shadow-md border border-white/70 bg-white/60 card-float"
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
                      className="rounded-2xl bg-white/70 border border-white/80 shadow-md overflow-hidden card-float"
                    >
                      <div className="h-44 w-full overflow-hidden">
                        <img
                          src={listing.imageUrl}
                          alt={listing.name}
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">{listing.name}</h3>
                          {listing.verified && (
                            <span className="text-xs font-semibold text-blue-900 bg-blue-100/70 px-2 py-1 rounded-full">
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          {ratingLabel(listing.rating)} ({listing.reviews})
                        </div>
                        <div className="text-xs text-gray-500">{listing.address}</div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-blue-900 font-semibold">
                            {listing.subcategory}
                          </span>
                          <button className="px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800">
                            Inquiry
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
