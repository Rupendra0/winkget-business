"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapPin, SlidersHorizontal, X } from "lucide-react";
import Footer from "@/components/Footer";
import BusinessListingCard from "@/components/BusinessListingCard";
import type { CategoryListing, CategoryPageData } from "@/data/categoryData";
import { fetchVendors, type CatalogVendorSummary } from "@/lib/catalogClient";
import { getBusinessReviewAggregate, subscribeReviewUpdates } from "@/lib/reviewStore";

type SubcategoryOption = {
  id: string;
  label: string;
};

type ExploreCard = {
  id: string;
  label: string;
  imageUrl: string;
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

  const [exploreModalOpen, setExploreModalOpen] = useState(false);
  const [activeExploreCard, setActiveExploreCard] = useState<ExploreCard | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [exploreVendors, setExploreVendors] = useState<CatalogVendorSummary[]>([]);
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

    const subcategoryFromQuery = String(searchParams.get("subcategoryId") || "all").trim();
    const validSubcategory = filterOptions.some((item) => item.id === subcategoryFromQuery)
      ? subcategoryFromQuery
      : "all";

    if (validSubcategory !== selectedSubcategory) {
      setSelectedSubcategory(validSubcategory);
    }
  }, [
    data.city,
    data.selectedCity,
    data.selectedSublocality,
    filterOptions,
    searchParams,
    selectedCity,
    selectedSublocality,
    selectedSubcategory,
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
    updateQuery({ subcategoryId: nextSubcategoryId === "all" ? null : nextSubcategoryId });
  };

  const filteredListings = useMemo(() => {
    if (data.categoryId) {
      return listingsWithReviewStats;
    }

    return listingsWithReviewStats.filter((listing) => {
      const matchesCity = !selectedCity || listing.city === selectedCity;
      const matchesSubcategory =
        selectedSubcategory === "all" ||
        listing.subcategoryId === selectedSubcategory ||
        listing.subcategory === selectedSubcategory;
      const matchesSublocality =
        selectedSublocality === "All" || listing.sublocality === selectedSublocality;
      return matchesCity && matchesSubcategory && matchesSublocality;
    });
  }, [data.categoryId, listingsWithReviewStats, selectedCity, selectedSubcategory, selectedSublocality]);

  const exploreCards = useMemo<ExploreCard[]>(() => {
    if (subcategoryOptions.length > 0) {
      return subcategoryOptions.slice(0, 6).map((option, index) => ({
        id: option.id,
        label: option.label,
        imageUrl: data.exploreTiles[index % data.exploreTiles.length]?.imageUrl || data.exploreTiles[0]?.imageUrl || "",
      }));
    }

    return data.exploreTiles.map((tile) => ({
      id: `name:${tile.label}`,
      label: tile.label,
      imageUrl: tile.imageUrl,
    }));
  }, [data.exploreTiles, subcategoryOptions]);

  const staticExploreListings = useMemo(() => {
    if (!activeExploreCard) return [];

    return listingsWithReviewStats.filter((listing) => {
      const matchesCategory =
        listing.subcategoryId === activeExploreCard.id ||
        listing.subcategory === activeExploreCard.label;
      const matchesCity = !selectedCity || listing.city === selectedCity;
      const matchesSublocality =
        selectedSublocality === "All" || listing.sublocality === selectedSublocality;
      return matchesCategory && matchesCity && matchesSublocality;
    });
  }, [activeExploreCard, listingsWithReviewStats, selectedCity, selectedSublocality]);

  const exploreModalListings = useMemo<CategoryListing[]>(() => {
    if (!data.categoryId) {
      return staticExploreListings;
    }

    return exploreVendors.map((vendor) => {
      const subcategoryLabel = String(
        vendor.subcategory || vendor.businessSubcategory?.name || vendor.businessCategory?.name || ""
      ).trim();

      return {
        id: vendor.id,
        name: String(vendor.businessName || vendor.name || "Vendor").trim() || "Vendor",
        businessName: vendor.businessName,
        rating: Number(vendor.rating || 0),
        reviews: Number(vendor.reviews || 0),
        verified: Boolean(vendor.verified),
        vendorStatus: vendor.verified ? "approved" : undefined,
        address: vendor.address || "Address unavailable",
        city: vendor.city || selectedCity || "",
        sublocality: vendor.sublocality || "",
        subcategory: subcategoryLabel || "Business",
        subcategoryId:
          vendor.businessSubcategory?.id || (subcategoryLabel ? `name:${subcategoryLabel}` : undefined),
        businessDescription: vendor.businessDescription,
        businessPhone: vendor.businessPhone,
        shopOpeningTime: vendor.shopOpeningTime,
        shopClosingTime: vendor.shopClosingTime,
        establishmentYear: vendor.establishmentYear,
        imageUrl: vendor.imageUrl || "",
        ctaLabel: vendor.ctaLabel || "Inquiry",
        badges: Array.isArray(vendor.badges) ? vendor.badges : [],
        priceRange: vendor.priceRange,
        tags: Array.isArray(vendor.tags)
          ? vendor.tags
          : Array.isArray(vendor.serviceTags)
            ? vendor.serviceTags
            : [],
      };
    });
  }, [data.categoryId, exploreVendors, selectedCity, staticExploreListings]);

  useEffect(() => {
    if (!exploreModalOpen || !activeExploreCard || !data.categoryId) {
      return;
    }

    let active = true;

    const loadExploreVendors = async () => {
      setExploreLoading(true);
      setExploreError(null);

      try {
        const vendors = await fetchVendors({
          categoryId: data.categoryId,
          subcategoryId: activeExploreCard.id.startsWith("name:") ? undefined : activeExploreCard.id,
          city: selectedCity || undefined,
          sublocality: selectedSublocality === "All" ? undefined : selectedSublocality,
        });

        if (!active) return;
        setExploreVendors(vendors);
      } catch {
        if (!active) return;
        setExploreError("Unable to load vendors for this subcategory");
        setExploreVendors([]);
      } finally {
        if (!active) return;
        setExploreLoading(false);
      }
    };

    void loadExploreVendors();

    return () => {
      active = false;
    };
  }, [activeExploreCard, data.categoryId, exploreModalOpen, selectedCity, selectedSublocality]);

  const openExploreModal = (card: ExploreCard) => {
    setActiveExploreCard(card);
    setExploreError(null);
    setExploreVendors([]);
    setExploreModalOpen(true);
  };

  const exploreInsertAfter = data.exploreInsertAfter || 6;
  const firstBatch = filteredListings.slice(0, exploreInsertAfter);
  const remainingBatch = filteredListings.slice(exploreInsertAfter);

  return (
    <main className="w-full overflow-x-hidden px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        <section className="w-full rounded-3xl overflow-hidden glass-panel grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
          <div className="p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/70 text-blue-900 text-xs font-semibold">
              <MapPin size={14} />
              {selectedCity || data.city}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
              {data.title} in {selectedCity || data.city}
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

        <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 min-w-0">
          <aside className="hidden md:block glass-panel rounded-2xl p-5 space-y-6 h-fit lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <SlidersHorizontal size={16} className="text-blue-900" />
              Filters
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Sublocality</div>
              <select
                className="w-full rounded-xl border border-blue-200 bg-white/90 px-4 py-2 text-sm text-slate-700"
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
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar md:flex-wrap md:overflow-visible md:pb-0">
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
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {firstBatch.map((listing) => (
                    <BusinessListingCard
                      key={listing.id}
                      listing={listing}
                      categoryKey={listing.subcategoryId || listing.subcategory || data.categoryId || data.slug}
                      className="card-float"
                    />
                  ))}
                </div>

                <section className="space-y-4">
                  <div className="text-lg font-bold text-gray-900">{data.exploreTitle}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {exploreCards.map((tile) => (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => openExploreModal(tile)}
                        className="rounded-2xl overflow-hidden shadow-md border border-white/70 bg-white/60 card-float card-hover text-left"
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
                      </button>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {remainingBatch.map((listing) => (
                    <BusinessListingCard
                      key={listing.id}
                      listing={listing}
                      categoryKey={listing.subcategoryId || listing.subcategory || data.categoryId || data.slug}
                      className="card-float"
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
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
          className="fixed bottom-20 right-4 z-40 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg md:hidden"
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
                  className="w-full rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm text-slate-700"
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

      {exploreModalOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/35" onClick={() => setExploreModalOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center px-4 py-6">
            <section className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl max-h-[84vh] overflow-y-auto">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {activeExploreCard?.label || "Explore"} in {selectedCity}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Showing vendors by selected first-level subcategory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExploreModalOpen(false)}
                  className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {exploreLoading ? <p className="text-sm text-slate-500">Loading vendors...</p> : null}
              {exploreError ? <p className="text-sm text-rose-600">{exploreError}</p> : null}

              {!exploreLoading ? (
                exploreModalListings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exploreModalListings.map((listing) => (
                      <BusinessListingCard
                        key={`explore-${listing.id}`}
                        listing={listing}
                        categoryKey={listing.subcategoryId || listing.subcategory || data.categoryId || data.slug}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No listings found for this subcategory.</p>
                )
              ) : null}
            </section>
          </div>
        </div>
      ) : null}

      <div className="mt-12">
        <Footer />
      </div>
    </main>
  );
}
