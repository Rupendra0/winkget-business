"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { fetchCities, type CatalogCity } from "@/lib/catalogClient";
import { readSelectedCity, subscribeLocationCity, writeSelectedCity } from "@/lib/locationStore";
import {
  fetchSearchResults,
  type SearchHit,
  type SearchResponse,
} from "@/lib/searchClient";
const DEFAULT_LIMIT = 10;

const formatSlugLabel = (value: string) =>
  value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());


export default function SearchPage() {
  const [cities, setCities] = useState<CatalogCity[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"vendors" | "products" | "categories">("vendors");
  const [filters, setFilters] = useState({
    openNow: false,
    minRating: 0,
    category: "",
    subcategory: "",
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [tabOffsets, setTabOffsets] = useState({ vendors: DEFAULT_LIMIT, products: DEFAULT_LIMIT });
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const data = await fetchCities();
      if (!active) return;
      setCities(data);
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedCity(readSelectedCity());
    return subscribeLocationCity((city) => setSelectedCity(city));
  }, []);

  useEffect(() => {
    if (!selectedCity && cities.length > 0) {
      setSelectedCity(cities[0].name);
      writeSelectedCity(cities[0].name);
    }
  }, [cities, selectedCity]);

  useEffect(() => {
    const nextQuery = String(searchParams.get("q") || "").trim();
    if (nextQuery !== query) {
      setQuery(nextQuery);
      if (!nextQuery) {
        setDebouncedQuery("");
      }
    }

    const nextCity = String(searchParams.get("city") || "").trim();
    if (nextCity && nextCity !== selectedCity) {
      setSelectedCity(nextCity);
      writeSelectedCity(nextCity);
    }
  }, [searchParams, query, selectedCity]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery || !selectedCity) {
      setResults(null);
      return;
    }

    let active = true;
    setIsLoading(true);

    fetchSearchResults({
      query: debouncedQuery,
      city: selectedCity,
      limit: DEFAULT_LIMIT,
      openNow: filters.openNow,
      minRating: filters.minRating,
      category: filters.category,
      subcategory: filters.subcategory,
    })
      .then((payload) => {
        if (!active) return;
        setResults(payload);
        setTabOffsets({ vendors: DEFAULT_LIMIT, products: DEFAULT_LIMIT });
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, selectedCity, filters]);

  const categoryOptions = useMemo(() => {
    if (!results?.facets?.categorySlug) return [] as string[];
    return Object.keys(results.facets.categorySlug).sort();
  }, [results]);

  const subcategoryOptions = useMemo(() => {
    if (!results?.facets?.subcategorySlug) return [] as string[];
    return Object.keys(results.facets.subcategorySlug).sort();
  }, [results]);

  const sections = results?.sections;
  const vendorHits = sections?.vendors?.hits || [];
  const productHits = sections?.products?.hits || [];
  const categoryHits = sections?.categories?.hits || [];
  const subcategoryHits = sections?.subcategories?.hits || [];

  const queryLabel = query.trim();
  const hasQuery = Boolean(queryLabel);
  const vendorTotal = sections?.vendors?.total || 0;
  const productTotal = sections?.products?.total || 0;
  const categoryTotal = (sections?.categories?.total || 0) + (sections?.subcategories?.total || 0);
  const summaryText = (() => {
    if (!hasQuery) return "Search results will appear here.";
    if (isLoading) {
      return selectedCity ? `Searching in ${selectedCity}...` : "Searching...";
    }

    const parts = [] as string[];
    if (vendorTotal) parts.push(`${vendorTotal} vendors`);
    if (productTotal) parts.push(`${productTotal} products`);
    if (categoryTotal) parts.push(`${categoryTotal} categories`);
    if (parts.length === 0) return "No results found for this search.";
    return selectedCity ? `${parts.join(" • ")} in ${selectedCity}` : parts.join(" • ");
  })();

  const filterContent = (
    <div className="mt-4 space-y-4">
      <label className="flex items-center justify-between text-sm text-slate-600">
        <span>Open now</span>
        <input
          type="checkbox"
          checked={filters.openNow}
          onChange={(event) => setFilters((prev) => ({ ...prev, openNow: event.target.checked }))}
          className="h-4 w-4 accent-orange-500"
        />
      </label>

      <div>
        <div className="text-xs font-semibold text-slate-500">Minimum rating</div>
        <select
          value={filters.minRating}
          onChange={(event) => setFilters((prev) => ({ ...prev, minRating: Number(event.target.value) }))}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value={0}>Any rating</option>
          <option value={3}>3+ stars</option>
          <option value={4}>4+ stars</option>
          <option value={4.5}>4.5+ stars</option>
        </select>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500">Category</div>
        <select
          value={filters.category}
          onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {formatSlugLabel(option)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-500">Subcategory</div>
        <select
          value={filters.subcategory}
          onChange={(event) => setFilters((prev) => ({ ...prev, subcategory: event.target.value }))}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">All subcategories</option>
          {subcategoryOptions.map((option) => (
            <option key={option} value={option}>
              {formatSlugLabel(option)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );


  const handleLoadMore = async () => {
    if (!debouncedQuery || !selectedCity) return;
    const type = activeTab === "products" ? "product" : "vendor";
    const offset = activeTab === "products" ? tabOffsets.products : tabOffsets.vendors;

    setIsLoadingMore(true);
    const response = await fetchSearchResults({
      query: debouncedQuery,
      city: selectedCity,
      type,
      limit: DEFAULT_LIMIT,
      offset,
      openNow: filters.openNow,
      minRating: filters.minRating,
      category: filters.category,
      subcategory: filters.subcategory,
    });

    const responseHits = Array.isArray(response?.hits) ? response.hits : [];
    if (responseHits.length > 0 && results?.sections) {
      setResults((prev) => {
        if (!prev?.sections) return prev;
        const key = activeTab === "products" ? "products" : "vendors";
        const existing = prev.sections[key].hits;
        const nextHits = [...existing, ...responseHits];
        return {
          ...prev,
          sections: {
            ...prev.sections,
            [key]: {
              hits: nextHits,
              total: response?.total || nextHits.length,
            },
          },
        };
      });

      setTabOffsets((prev) => ({
        ...prev,
        [activeTab === "products" ? "products" : "vendors"]: offset + DEFAULT_LIMIT,
      }));
    }

    setIsLoadingMore(false);
  };

  const renderStatusBadge = (hit: SearchHit) => {
    if (hit.isStoreOpen === true) {
      return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Open now</span>;
    }
    if (hit.isStoreOpen === false) {
      return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">Closed</span>;
    }
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Hours vary</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-slate-50">
      <section className="border-b border-slate-100 bg-gradient-to-br from-orange-50 via-white to-sky-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              {hasQuery ? `Results for "${queryLabel}"` : "Search results"}
            </h1>
            <p className="mt-2 text-base text-slate-600">{summaryText}</p>
          </div>

        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <SlidersHorizontal size={16} className="text-orange-500" />
                Filters
              </div>
              {filterContent}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-orange-50 via-white to-sky-50 p-4">
              <div className="text-sm font-semibold text-slate-700">Need ideas?</div>
              <p className="mt-2 text-xs text-slate-500">
                Try searching for services like "dentist", "spa", or "electronics shop".
              </p>
            </div>
          </aside>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                <SlidersHorizontal size={16} className="text-orange-500" />
                Filters
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {([
                { key: "vendors", label: "Vendors" },
                { key: "products", label: "Products" },
                { key: "categories", label: "Categories" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="h-40 rounded-2xl border border-slate-100 bg-slate-100/70 animate-pulse" />
                ))}
              </div>
            ) : null}

            {!isLoading && debouncedQuery && results && activeTab === "vendors" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {vendorHits.length > 0 ? (
                  vendorHits.map((hit) => (
                    <div key={hit.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex gap-4">
                        <div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100">
                          {hit.vendorImage ? (
                            <img src={hit.vendorImage} alt={hit.vendorName || "Vendor"} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-base font-semibold text-slate-900">{hit.vendorName}</h3>
                              <p className="text-xs text-slate-500">
                                {hit.categoryName || ""}
                                {hit.subcategoryName ? ` • ${hit.subcategoryName}` : ""}
                              </p>
                              <p className="text-xs text-slate-500">{hit.city}</p>
                            </div>
                            {renderStatusBadge(hit)}
                          </div>

                          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1 text-amber-600">
                              <Star size={14} /> {Number(hit.rating || 0).toFixed(1)} ({hit.reviews || 0})
                            </span>
                            {hit.products && hit.products.length > 0 ? (
                              <span className="text-slate-500">Popular: {hit.products.slice(0, 2).join(", ")}</span>
                            ) : null}
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Link
                              href={`/listing/${hit.vendorId}`}
                              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              View details
                            </Link>
                            <button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                              Get quote
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
                    No vendors found for this search. Try adjusting filters.
                  </div>
                )}
              </div>
            ) : null}

            {!isLoading && debouncedQuery && results && activeTab === "products" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {productHits.length > 0 ? (
                  productHits.map((hit) => (
                    <div key={hit.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex gap-4">
                        <div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100">
                          {hit.productImage ? (
                            <img src={hit.productImage} alt={hit.productName || "Product"} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-slate-900">{hit.productName}</h3>
                          <p className="text-xs text-slate-500">{hit.vendorName}</p>
                          <p className="text-xs text-slate-500">{hit.categoryName}</p>
                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <span>{hit.city}</span>
                            {hit.price ? <span className="font-semibold text-slate-700">Rs {hit.price}</span> : null}
                            {renderStatusBadge(hit)}
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Link
                              href={`/listing/${hit.vendorId}`}
                              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              View vendor
                            </Link>
                            <button className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                              Ask price
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
                    No products found. Try a different keyword.
                  </div>
                )}
              </div>
            ) : null}

            {!isLoading && debouncedQuery && results && activeTab === "categories" ? (
              <div className="grid gap-4 md:grid-cols-2">
                {categoryHits.length === 0 && subcategoryHits.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
                    No categories found for this search.
                  </div>
                ) : (
                  [
                    ...subcategoryHits.map((hit) => ({
                      ...hit,
                      label: hit.subcategoryName,
                      meta: hit.categoryName,
                      href: hit.categorySlug
                        ? `/category/${hit.categorySlug}?subcategoryId=${hit.subcategoryId || ""}&city=${encodeURIComponent(selectedCity)}`
                        : undefined,
                    })),
                    ...categoryHits.map((hit) => ({
                      ...hit,
                      label: hit.categoryName,
                      meta: "Popular category",
                      href: hit.categorySlug
                        ? `/category/${hit.categorySlug}?city=${encodeURIComponent(selectedCity)}`
                        : undefined,
                    })),
                  ].map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                          <Clock size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">{item.label}</h3>
                          <p className="text-xs text-slate-500">{item.meta}</p>
                        </div>
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            Explore
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {results && activeTab !== "categories" && !isLoading ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {isLoadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            ) : null}

            {!debouncedQuery && !isLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Start typing to discover businesses, services, and offers in your city.
              </div>
            ) : null}
          </div>
        </div>
      </section>
      {isFilterOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/30 px-4 py-6 lg:hidden"
          onClick={() => setIsFilterOpen(false)}
        >
          <div
            className="w-full rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <SlidersHorizontal size={16} className="text-orange-500" />
                Filters
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="rounded-full p-1 text-slate-500 transition hover:text-slate-700"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
            {filterContent}
          </div>
        </div>
      ) : null}
    </div>
  );
}
