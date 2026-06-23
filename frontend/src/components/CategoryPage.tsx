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

  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(data.selectedSubcategoryId || "all");
  const [selectedSublocality, setSelectedSublocality] = useState<string>("All");
  const [selectedCity, setSelectedCity] = useState<string>(data.selectedCity || data.city || "");

  const [reviewUpdateVersion, setReviewUpdateVersion] = useState(0);
  const [isReviewHydrated, setIsReviewHydrated] = useState(false);

  const [filterVerified, setFilterVerified] = useState(false);
  const [filterTopRated, setFilterTopRated] = useState(false);
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);

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

  const displayedFilterOptions = useMemo(() => {
    // Limit to All + first 5 subcategories to keep the toolbar compact and in a single row
    return filterOptions.slice(0, 6);
  }, [filterOptions]);

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

    const subcategoryFromQuery = String(searchParams.get("subcategoryId") || data.selectedSubcategoryId || "all").trim();
    if (subcategoryFromQuery && subcategoryFromQuery !== selectedSubcategory) {
      setSelectedSubcategory(subcategoryFromQuery);
    }

    const verifiedFromQuery = searchParams.get("verified") === "true";
    if (verifiedFromQuery !== filterVerified) {
      setFilterVerified(verifiedFromQuery);
    }

    const topRatedFromQuery = searchParams.get("topRated") === "true";
    if (topRatedFromQuery !== filterTopRated) {
      setFilterTopRated(topRatedFromQuery);
    }
  }, [
    data.city,
    data.selectedCity,
    data.selectedSublocality,
    data.selectedSubcategoryId,
    searchParams,
    selectedCity,
    selectedSublocality,
    selectedSubcategory,
    filterVerified,
    filterTopRated,
  ]);

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        const normalized = String(value || "").trim();
        if (!normalized || normalized === "All" || normalized === "all" || normalized === "false") {
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
    updateQuery({ subcategoryId: nextSubcategoryId === "all" ? null : nextSubcategoryId });
  };

  const handleVerifiedToggle = () => {
    const nextVerified = !filterVerified;
    setFilterVerified(nextVerified);
    updateQuery({ verified: nextVerified ? "true" : null });
  };

  const handleTopRatedToggle = () => {
    const nextTopRated = !filterTopRated;
    setFilterTopRated(nextTopRated);
    updateQuery({ topRated: nextTopRated ? "true" : null });
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

      const matchesVerified = !filterVerified || listing.vendorStatus === "approved" || listing.verified;
      const matchesTopRated = !filterTopRated || Number(listing.rating || 0) >= 4.0;

      return matchesCity && matchesSubcategory && matchesSublocality && matchesVerified && matchesTopRated;
    });
  }, [filterOptions, listingsWithReviewStats, selectedCity, selectedSubcategory, selectedSublocality, filterVerified, filterTopRated]);

  return (
    <main className="w-full overflow-x-hidden px-0 py-0 bg-slate-50/50">
      {/* Header Section */}
      <div className="w-full max-w-full px-4 md:px-12 pt-3 pb-2">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          {data.title} in {selectedCity}
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Explore verified businesses and Services
        </p>
      </div>

      {/* Horizontal Toolbar */}
      <div className="w-full max-w-full px-4 md:px-12 py-4 border-b border-slate-200 bg-white">
        <div className="flex flex-row items-center gap-3 flex-nowrap overflow-x-auto no-scrollbar">
          {/* Subcategory Pills */}
          <div className="flex flex-row items-center gap-2 shrink-0">
            {displayedFilterOptions.map((subcategory) => {
              const isActive = selectedSubcategory === subcategory.id;
              return (
                <button
                  key={subcategory.id}
                  type="button"
                  onClick={() => handleSubcategoryChange(subcategory.id)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {subcategory.label}
                </button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-slate-200 shrink-0 hidden md:block" />

          {/* Locality Dropdown */}
          <div className="relative shrink-0">
            <select
              className="appearance-none rounded-lg border border-slate-300 bg-white pl-4 pr-10 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 cursor-pointer"
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
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>

          {/* Verified Toggle */}
          <button
            type="button"
            onClick={handleVerifiedToggle}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border shrink-0 transition-all ${
              filterVerified
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Verified
          </button>

          {/* Top Rated Toggle */}
          <button
            type="button"
            onClick={handleTopRatedToggle}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border shrink-0 transition-all ${
              filterTopRated
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            Top Rated
          </button>

          {/* Budget Dropdown Placeholder */}
          <div className="relative shrink-0">
            <select
              className="appearance-none rounded-lg border border-slate-300 bg-white pl-4 pr-10 py-2 text-sm font-semibold text-slate-700 outline-none transition cursor-pointer"
              disabled
            >
              <option>Budget</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>

          {/* More Filters Button */}
          <button
            type="button"
            onClick={() => setIsMoreFiltersOpen(true)}
            className="px-4 py-2 text-sm font-semibold rounded-lg border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 flex items-center gap-2 shrink-0"
          >
            <SlidersHorizontal size={14} />
            More Filters
          </button>
        </div>
      </div>

      {/* Card Grid Layout */}
      <div className="w-full max-w-full px-4 md:px-12 py-8 min-h-[400px]">
        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((listing) => (
              <BusinessListingCard
                key={listing.id}
                listing={listing}
                categoryKey={listing.subcategoryId || listing.subcategory || data.categoryId || data.slug}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            No vendors found matching the filter criteria.
          </div>
        )}
      </div>

      <div className="w-full max-w-full px-4 md:px-12 mt-10">
        <Footer />
      </div>

      {/* More Filters Overlay Modal */}
      {isMoreFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMoreFiltersOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-100 z-10 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-blue-600" />
                More Filters
              </h3>
              <button
                type="button"
                onClick={() => setIsMoreFiltersOpen(false)}
                className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 transition"
                aria-label="Close filters"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 no-scrollbar">
              {/* Locality Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Sublocality / Area
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white pl-4 pr-10 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 cursor-pointer shadow-sm"
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
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Subcategories Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Subcategory
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {filterOptions.map((subcategory) => {
                    const isActive = selectedSubcategory === subcategory.id;
                    return (
                      <button
                        key={subcategory.id}
                        type="button"
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                          isActive
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70"
                        }`}
                        onClick={() => handleSubcategoryChange(subcategory.id)}
                      >
                        {subcategory.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMoreFiltersOpen(false)}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-md transition"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
