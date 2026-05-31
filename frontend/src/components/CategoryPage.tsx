"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import Footer from "@/components/Footer";
import BusinessListingCard from "@/components/BusinessListingCard";
import type { CategoryPageData } from "@/data/categoryData";
import { getBusinessReviewAggregate, subscribeReviewUpdates } from "@/lib/reviewStore";

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

const buildLocalitiesByCity = (data: CategoryPageData) => {
  if (data.localitiesByCity && Object.keys(data.localitiesByCity).length > 0) {
    return data.localitiesByCity;
  }

  return data.listings.reduce<Record<string, string[]>>((accumulator, listing) => {
    const cityName = String(listing.city || "").trim();
    const localityName = String(listing.sublocality || "").trim();
    if (!cityName || !localityName) {
      return accumulator;
    }

    const existing = accumulator[cityName] || [];
    if (!existing.includes(localityName)) {
      accumulator[cityName] = [...existing, localityName];
    }

    return accumulator;
  }, {});
};

export default function CategoryPage({ data }: { data: CategoryPageData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedSublocality, setSelectedSublocality] = useState<string>("All");
  const [selectedCity, setSelectedCity] = useState<string>(data.selectedCity || data.city || "");

  const [reviewUpdateVersion, setReviewUpdateVersion] = useState(0);
  const [isReviewHydrated, setIsReviewHydrated] = useState(false);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

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

  const cityOptions = useMemo(() => {
    if (Array.isArray(data.availableCities) && data.availableCities.length > 0) {
      return data.availableCities;
    }

    const derived = Array.from(new Set(data.listings.map((listing) => listing.city).filter(Boolean)));
    if (derived.length > 0) {
      return derived;
    }

    return data.city ? [data.city] : [];
  }, [data.availableCities, data.city, data.listings]);

  const localitiesByCity = useMemo(() => buildLocalitiesByCity(data), [data]);

  const localitiesForSelectedCity = useMemo(() => {
    const fromMap = localitiesByCity[selectedCity] || [];
    if (fromMap.length > 0) {
      return fromMap;
    }

    if (selectedCity === data.city && data.sublocalities.length > 0) {
      return data.sublocalities;
    }

    return [];
  }, [data.city, data.sublocalities, localitiesByCity, selectedCity]);

  useEffect(() => {
    const cityFromQuery = String(searchParams.get("city") || data.selectedCity || data.city || "").trim();
    if (cityFromQuery && cityFromQuery !== selectedCity) {
      setSelectedCity(cityFromQuery);
    }

    const sublocalityFromQuery = String(searchParams.get("sublocality") || data.selectedSublocality || "All").trim();
    if (sublocalityFromQuery && sublocalityFromQuery !== selectedSublocality) {
      setSelectedSublocality(sublocalityFromQuery);
    }

  }, [
    data.city,
    data.selectedCity,
    data.selectedSublocality,
    searchParams,
    selectedCity,
    selectedSublocality,
  ]);

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        const normalized = String(value || "").trim();
        if (!normalized || normalized === "All" || normalized === "all") {
          params.delete(key);
        } else {
          params.set(key, normalized);
        }
      });

      const query = params.toString();
      const target = query ? `${pathname}?${query}` : pathname;
      router.replace(target, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (!selectedCity && cityOptions.length > 0) {
      setSelectedCity(cityOptions[0]);
      return;
    }

    if (selectedCity && cityOptions.length > 0 && !cityOptions.includes(selectedCity)) {
      setSelectedCity(cityOptions[0]);
      setSelectedSublocality("All");
      updateQuery({ city: cityOptions[0], sublocality: null });
    }
  }, [cityOptions, selectedCity, updateQuery]);

  const handleSublocalityChange = (nextSublocality: string) => {
    setSelectedSublocality(nextSublocality);
    updateQuery({ sublocality: nextSublocality === "All" ? null : nextSublocality });
  };

  const handleSubcategoryChange = (nextSubcategoryId: string) => {
    setSelectedSubcategory(nextSubcategoryId);
  };

  const filteredListings = useMemo(() => {
    return listingsWithReviewStats.filter((listing) => {
      const matchesCity = !selectedCity || listing.city === selectedCity;
      const matchesSubcategory =
        selectedSubcategory === "all" ||
        listing.subcategoryId === selectedSubcategory ||
        listing.subcategory === selectedSubcategory ||
        String(listing.subcategory || "").trim().toLowerCase() ===
          (filterOptions.find((item) => item.id === selectedSubcategory)?.label || "").trim().toLowerCase();
      const matchesSublocality =
        selectedSublocality === "All" || listing.sublocality === selectedSublocality;
      return matchesCity && matchesSubcategory && matchesSublocality;
    });
  }, [filterOptions, listingsWithReviewStats, selectedCity, selectedSubcategory, selectedSublocality]);

  return (
    <main className="w-full overflow-x-hidden px-0 py-0">
      <div className="w-full space-y-6 pt-4">
        <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 min-w-0 px-4 sm:px-6 lg:px-8">
          <aside className="hidden md:block self-start glass-panel rounded-2xl p-5 space-y-6 h-fit md:sticky md:top-24">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <SlidersHorizontal size={16} className="text-blue-900" />
              Filters
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Sublocality</div>
              <select
                className="w-full appearance-none rounded-xl border border-[#cfd8ea] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.06)] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                value={selectedSublocality}
                onChange={(event) => handleSublocalityChange(event.target.value)}
              >
                <option value="All">All areas</option>
                {localitiesForSelectedCity.map((locality) => (
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
                    onClick={() => handleSubcategoryChange(subcategory.id)}
                  >
                    {subcategory.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-nowrap gap-2 overflow-x-auto whitespace-nowrap pb-2 no-scrollbar">
              {filterOptions.map((subcategory) => (
                <button
                  key={subcategory.id}
                  type="button"
                  className={`shrink-0 px-4 py-2 rounded-full text-sm transition-all btn-hover ${
                    selectedSubcategory === subcategory.id
                      ? "bg-blue-900 text-white"
                      : "bg-white/70 text-gray-700 hover:bg-white"
                  }`}
                  onClick={() => handleSubcategoryChange(subcategory.id)}
                >
                  {subcategory.label}
                </button>
              ))}
            </div>

            {filteredListings.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-2">
                  {filteredListings.map((listing) => (
                    <BusinessListingCard
                      key={listing.id}
                      listing={listing}
                      categoryKey={listing.subcategoryId || listing.subcategory || data.categoryId || data.slug}
                      className="card-float"
                    />
                  ))}
                </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-2">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="rounded-2xl bg-white/60 border border-white/70 shadow-md overflow-hidden animate-pulse"
                  >
                    <div className="h-32 w-full bg-slate-200/70 md:h-44" />
                    <div className="p-3 space-y-2 md:p-4 md:space-y-3">
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

      {!mobileFilterOpen ? (
        <button
          type="button"
          onClick={() => setMobileFilterOpen(true)}
          className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-40 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg md:hidden"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal size={16} />
            Filters
          </span>
        </button>
      ) : null}

      {mobileFilterOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            onClick={() => setMobileFilterOpen(false)}
            aria-label="Close filters"
          />

          <section className="fixed bottom-0 left-0 w-full bg-white rounded-t-2xl p-5 shadow-xl md:hidden max-h-[80vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Filters</h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600"
                aria-label="Close filter panel"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Sublocality</div>
                <select
                  className="w-full appearance-none rounded-xl border border-[#cfd8ea] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.06)] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  value={selectedSublocality}
                  onChange={(event) => handleSublocalityChange(event.target.value)}
                >
                  <option value="All">All areas</option>
                  {localitiesForSelectedCity.map((locality) => (
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
                          : "bg-slate-50 text-gray-700 hover:bg-slate-100"
                      }`}
                      onClick={() => handleSubcategoryChange(subcategory.id)}
                    >
                      {subcategory.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Apply Filters
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="mt-10 px-4 sm:px-6 lg:px-8">
        <Footer />
      </div>
    </main>
  );
}
