import React from "react";

export default function StoreLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Banner Skeleton */}
      <div className="relative h-48 sm:h-64 w-full bg-slate-200 animate-pulse rounded-3xl overflow-hidden">
        {/* Banner inner graphic shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
      </div>

      {/* Header Info Skeleton */}
      <div className="flex flex-col sm:flex-row items-center gap-6 px-4">
        {/* Logo Avatar */}
        <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-slate-300 animate-pulse shrink-0 border-4 border-white shadow-md" />
        
        {/* Title and details */}
        <div className="space-y-3 w-full max-w-md text-center sm:text-left">
          <div className="h-7 w-3/4 bg-slate-300 animate-pulse rounded-lg mx-auto sm:mx-0" />
          <div className="h-4 w-1/2 bg-slate-200 animate-pulse rounded-md mx-auto sm:mx-0" />
          <div className="flex gap-2 justify-center sm:justify-start pt-1">
            <div className="h-5 w-20 bg-slate-200 animate-pulse rounded-full" />
            <div className="h-5 w-24 bg-slate-200 animate-pulse rounded-full" />
          </div>
        </div>
      </div>

      {/* Content Layout (Sidebar + Main Grid) */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Filters Skeleton */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-slate-100 rounded-3xl p-6 space-y-6 hidden lg:block shadow-sm">
          <div className="h-5 w-1/3 bg-slate-300 animate-pulse rounded-md" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-4 bg-slate-200 animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-slate-200 animate-pulse rounded-md" />
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-6 space-y-3">
            <div className="h-5 w-1/2 bg-slate-300 animate-pulse rounded-md" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-full bg-slate-200 animate-pulse rounded-md" />
            ))}
          </div>
        </aside>

        {/* Main Grid Skeleton */}
        <div className="flex-1 w-full space-y-6">
          {/* Subcategory bar skeleton */}
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 w-24 bg-slate-200 animate-pulse rounded-full shrink-0" />
            ))}
          </div>

          {/* Grid of Product Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-3xl p-3 space-y-3 shadow-sm flex flex-col">
                {/* Product Image Area */}
                <div className="aspect-square w-full bg-slate-100 animate-pulse rounded-2xl" />
                
                {/* Title & brand */}
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-1/3 bg-slate-200 animate-pulse rounded-md" />
                  <div className="h-4 w-5/6 bg-slate-300 animate-pulse rounded-md" />
                  <div className="h-4 w-1/2 bg-slate-300 animate-pulse rounded-md" />
                </div>
                
                {/* Pricing and Action button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="space-y-1">
                    <div className="h-4 w-16 bg-slate-300 animate-pulse rounded-md" />
                    <div className="h-3 w-10 bg-slate-200 animate-pulse rounded-md" />
                  </div>
                  <div className="h-8 w-8 bg-blue-100 animate-pulse rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
