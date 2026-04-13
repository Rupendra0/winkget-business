"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Star, Filter, ShoppingCart, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import Footer from "@/components/Footer";
import { buildProductSlug } from "@/data/productSlug";
import type { StorePageData, StoreProduct } from "@/data/listingData";
import { getBusinessReviewAggregate, subscribeReviewUpdates } from "@/lib/reviewStore";
import { addToCart, makeStoreProduct } from "@/lib/shopStorage";

const ratingLabel = (rating: number) => rating.toFixed(1);

const buildProductMap = (products: StorePageData["products"]) => {
  return new Map(products.map((product) => [product.id, product]));
};

export default function StorePage({ data }: { data: StorePageData }) {
  const [reviewUpdateVersion, setReviewUpdateVersion] = useState(0);
  const [isReviewHydrated, setIsReviewHydrated] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setIsReviewHydrated(true);
    return subscribeReviewUpdates(() => {
      setReviewUpdateVersion((prev) => prev + 1);
    });
  }, []);

  const storeReviewStats = useMemo(
    () =>
      isReviewHydrated
        ? getBusinessReviewAggregate(data.id, data.rating, data.reviews)
        : { rating: data.rating, reviews: data.reviews },
    [data.id, data.rating, data.reviews, isReviewHydrated, reviewUpdateVersion]
  );

  const productMap = buildProductMap(data.products);

  const buildProductHref = useCallback(
    (product: StoreProduct) =>
      `/product/${encodeURIComponent(
        buildProductSlug({
          id: product.id,
          name: product.name,
          storeId: data.id,
          sellerName: data.storeName,
        })
      )}`,
    [data.id, data.storeName]
  );

  const handleAddToCart = useCallback(
    (product: StoreProduct) => {
      const href = buildProductHref(product);
      const storeProduct = makeStoreProduct(
        {
          ...product,
          storeId: data.id,
          sellerName: product.sellerName || data.storeName,
          image: product.imageUrl,
          oldPrice: product.oldPriceValue,
          categoryLabel: product.categoryLabel || product.category,
        },
        href
      );

      addToCart(storeProduct, 1);
    },
    [buildProductHref, data.id, data.storeName]
  );

  const featuredProducts = data.featured.productIds
    .map((id) => productMap.get(id))
    .filter(Boolean);
  const trendingProducts = data.trending.productIds
    .map((id) => productMap.get(id))
    .filter(Boolean);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(featuredProducts.length / pageSize));
  const [featuredPage, setFeaturedPage] = useState(0);
  const pagedFeatured = useMemo(() => {
    const start = featuredPage * pageSize;
    return featuredProducts.slice(start, start + pageSize);
  }, [featuredPage, featuredProducts]);
  const trendingTotalPages = Math.max(1, Math.ceil(trendingProducts.length / pageSize));
  const [trendingPage, setTrendingPage] = useState(0);
  const pagedTrending = useMemo(() => {
    const start = trendingPage * pageSize;
    return trendingProducts.slice(start, start + pageSize);
  }, [trendingPage, trendingProducts]);

  return (
    <main className="px-3 sm:px-4 lg:px-6 pb-12">
      <div className="max-w-[1400px] mx-auto space-y-10">
        <section className="rounded-3xl overflow-hidden bg-white/70 border border-white/80 shadow-lg">
          <div className="relative h-44 sm:h-52">
            <img
              src={data.bannerImage}
              alt={data.storeName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-800/30 to-transparent" />
            <div className="absolute inset-0 p-3 sm:hidden">
              <div className="flex h-full flex-col justify-between">
                <div className="min-w-0 text-white">
                  <div className="truncate text-[31px] font-extrabold leading-[0.95] tracking-tight">{data.storeName}</div>
                  <div className="mt-0.5 truncate text-[14px] font-semibold text-white/90">{data.tagline}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-white/90">
                    <Star size={12} className="fill-yellow-400 text-yellow-400" />
                    {ratingLabel(storeReviewStats.rating)} ({storeReviewStats.reviews} reviews)
                  </div>
                </div>

                <div className="h-[78px] w-[78px] rounded-full border-2 border-white overflow-hidden shadow-lg bg-white">
                  <img src={data.logoImage} alt={`${data.storeName} logo`} className="h-full w-full object-cover" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-5 left-5 hidden items-center gap-4 sm:flex">
              <div className="h-[82px] w-[82px] rounded-full border-2 border-white overflow-hidden shadow-lg bg-white">
                <img src={data.logoImage} alt={`${data.storeName} logo`} className="h-full w-full object-cover" />
              </div>
              <div className="text-white">
                <div className="max-w-[780px] text-[2.45rem] font-extrabold leading-[0.95] tracking-tight">{data.storeName}</div>
                <div className="mt-0.5 text-base font-semibold text-white/90">{data.tagline}</div>
                <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-white/90">
                  <Star size={13} className="fill-yellow-400 text-yellow-400" />
                  {ratingLabel(storeReviewStats.rating)} ({storeReviewStats.reviews} reviews)
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <aside className="hidden rounded-2xl bg-white/80 border border-white/80 shadow-lg p-5 space-y-6 h-fit lg:block lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter size={16} />
              Filters
            </div>

            {data.filters.map((group) => (
              <div key={group.label}>
                <div className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  {group.label}
                </div>
                <div className="space-y-2">
                  {group.options.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          <div className="space-y-8">
            <section className="rounded-2xl bg-white/80 border border-white/80 shadow-lg p-5 card-hover">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-900">Shop by Category</div>
                <div className="text-xs text-slate-500">{data.address}</div>
              </div>
              <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar">
                {data.categories.map((category) => (
                  <button
                    key={category}
                    className="whitespace-nowrap rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 bg-white btn-hover"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </section>

            {featuredProducts.length > 0 ? (
            <section className="rounded-2xl bg-white/80 border border-white/80 shadow-lg p-5 card-hover">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{data.featured.title}</div>
                  {data.featured.subtitle && (
                    <div className="text-sm text-slate-500">{data.featured.subtitle}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full border border-slate-200 text-slate-600 hover:text-blue-900 hover:border-blue-200 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed btn-hover"
                    onClick={() => setFeaturedPage((prev) => Math.max(0, prev - 1))}
                    aria-label="Previous items"
                    disabled={featuredPage === 0}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full border border-slate-200 text-slate-600 hover:text-blue-900 hover:border-blue-200 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed btn-hover"
                    onClick={() => setFeaturedPage((prev) => Math.min(totalPages - 1, prev + 1))}
                    aria-label="Next items"
                    disabled={featuredPage >= totalPages - 1}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {pagedFeatured.map((product) => {
                  if (!product) {
                    return null;
                  }

                  const productHref = buildProductHref(product);

                  return (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex h-full flex-col card-hover"
                    >
                      <Link href={productHref} className="h-32 bg-slate-50 shrink-0 block">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-contain p-3"
                        />
                      </Link>
                      <div className="p-3 flex flex-1 flex-col gap-2">
                        <Link href={productHref} className="text-sm font-semibold text-slate-800 line-clamp-2 hover:text-blue-700">
                          {product.name}
                        </Link>
                        <div className="text-sm font-semibold text-blue-700">{product.price}</div>
                        <div className="text-xs text-slate-500">{product.category}</div>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          className="mt-auto h-10 w-full rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-2 btn-hover"
                        >
                          <ShoppingCart size={14} />
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            ) : null}

            {trendingProducts.length > 0 ? (
            <section className="rounded-2xl bg-white/80 border border-white/80 shadow-lg p-5 card-hover">
                <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{data.trending.title}</div>
                  {data.trending.subtitle && (
                    <div className="text-sm text-slate-500">{data.trending.subtitle}</div>
                  )}
                </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="h-8 w-8 rounded-full border border-slate-200 text-slate-600 hover:text-blue-900 hover:border-blue-200 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed btn-hover"
                      onClick={() => setTrendingPage((prev) => Math.max(0, prev - 1))}
                      aria-label="Previous items"
                      disabled={trendingPage === 0}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="h-8 w-8 rounded-full border border-slate-200 text-slate-600 hover:text-blue-900 hover:border-blue-200 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed btn-hover"
                      onClick={() => setTrendingPage((prev) => Math.min(trendingTotalPages - 1, prev + 1))}
                      aria-label="Next items"
                      disabled={trendingPage >= trendingTotalPages - 1}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
              </div>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {pagedTrending.map((product) => {
                  if (!product) {
                    return null;
                  }

                  const productHref = buildProductHref(product);

                  return (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex h-full flex-col card-hover"
                    >
                      <Link href={productHref} className="h-32 bg-slate-50 shrink-0 block">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-contain p-3"
                        />
                      </Link>
                      <div className="p-3 flex flex-1 flex-col gap-2">
                        <Link href={productHref} className="text-sm font-semibold text-slate-800 line-clamp-2 hover:text-blue-700">
                          {product.name}
                        </Link>
                        <div className="text-sm font-semibold text-blue-700">{product.price}</div>
                        <div className="text-xs text-slate-500">{product.category}</div>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          className="mt-auto h-10 w-full rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-2 btn-hover"
                        >
                          <ShoppingCart size={14} />
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            ) : null}

            <section className="rounded-2xl bg-white/80 border border-white/80 shadow-lg p-5 card-hover">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-900">All Products</div>
                <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <option>Sort by: Featured</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                </select>
              </div>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {data.products.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex h-full flex-col card-hover"
                  >
                    <Link href={buildProductHref(product)} className="h-40 bg-slate-50 shrink-0 block">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain p-4"
                      />
                    </Link>
                    <div className="p-4 flex flex-1 flex-col gap-2">
                      <Link href={buildProductHref(product)} className="text-sm font-semibold text-slate-800 line-clamp-2 hover:text-blue-700">
                        {product.name}
                      </Link>
                      <div className="text-sm font-semibold text-blue-700">{product.price}</div>
                      <div className="text-xs text-slate-500">{product.category}</div>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        className="mt-auto h-10 w-full rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 btn-hover"
                      >
                        <ShoppingCart size={14} />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white/80 border border-white/80 shadow-lg p-5 card-hover">
              <div className="text-lg font-semibold text-slate-900">{data.aboutTitle}</div>
              <div className="mt-3 text-sm text-slate-600">{data.aboutBody}</div>
            </section>
          </div>
        </section>

        {!isMobileFiltersOpen ? (
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            className="fixed bottom-40 right-4 z-40 rounded-full bg-blue-600 px-4 py-2 text-white shadow-lg lg:hidden"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal size={16} />
              Filters
            </span>
          </button>
        ) : null}

        {isMobileFiltersOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/35"
              onClick={() => setIsMobileFiltersOpen(false)}
              aria-label="Close filters"
            />

            <section className="fixed bottom-0 left-0 max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Filters</h3>
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600"
                  aria-label="Close filter panel"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-5">
                {data.filters.map((group) => (
                  <div key={group.label}>
                    <div className="mb-2 text-xs font-semibold uppercase text-slate-500">{group.label}</div>
                    <div className="space-y-2">
                      {group.options.map((option) => (
                        <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Apply Filters
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
      <Footer />
    </main>
  );
}
