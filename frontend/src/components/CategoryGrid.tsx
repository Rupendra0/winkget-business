'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  X,
} from 'lucide-react';
import { readSelectedCity, subscribeLocationCity } from '@/lib/locationStore';

type LiveCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder?: number;
  image?: string;
  icon?: string;
};

type CategoryApiResponse = {
  ok: boolean;
  categories?: LiveCategory[];
};

type DisplayCategory = {
  id: string;
  name: string;
  mediaUrl?: string;
  order: number;
  slug: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const MOBILE_COLUMNS = 4;
const MOBILE_ROWS = 4;
const MOBILE_TILE_COUNT = MOBILE_COLUMNS * MOBILE_ROWS;
const MOBILE_CATEGORY_COUNT = MOBILE_TILE_COUNT - 1;
const DESKTOP_COLUMNS = 9;
const DESKTOP_ROWS = 3;
const DESKTOP_TILE_COUNT = DESKTOP_COLUMNS * DESKTOP_ROWS;
const DESKTOP_CATEGORY_COUNT = DESKTOP_TILE_COUNT - 1;

interface CategoryCardProps {
  name: string;
  mediaUrl?: string;
  className?: string;
}

function CategoryCard({ name, mediaUrl, className = "bg-white" }: CategoryCardProps) {
  return (
    <div className={`w-full rounded-2xl p-[2px] md:p-[5px] ${className}`}>
      <div
        className="flex h-[13vw] min-h-[44px] max-h-[56px] w-full items-center justify-center overflow-hidden rounded-2xl border border-[#e7e7e7] bg-[#f0f0f0] md:h-[10vw] md:max-h-none lg:h-[6.2vw]"
      >
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={name}
            className="h-full w-full rounded-2xl object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-orange-50 text-orange-500">
            <span className="text-lg font-bold">{name.slice(0, 1).toUpperCase()}</span>
          </div>
        )}
      </div>
      <h3 className="mt-[3px] text-center text-[11px] font-medium leading-[1.05] text-gray-700 line-clamp-2 md:mt-[5px] md:text-[13px] md:leading-tight">{name}</h3>
    </div>
  );
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const normalizeMedia = (value?: string) => {
  const media = String(value || '').trim();
  return media || undefined;
};

export default function CategoryGrid() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveCategories, setLiveCategories] = useState<DisplayCategory[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadLiveCategories = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/categories`, { cache: 'no-store' });
        const payload = (await response.json()) as CategoryApiResponse;

        if (!active) return;
        if (!response.ok || !payload.ok || !Array.isArray(payload.categories)) {
          throw new Error('Failed to load categories');
        }

        const mapped = payload.categories
          .map((item, index) => ({
            id: String(item.id || `${index}`),
            name: item.name,
            slug: String(item.slug || '').trim() || slugify(item.name),
            order: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
            mediaUrl: normalizeMedia(item.icon) || normalizeMedia(item.image),
          }))
          .sort((a, b) => a.order - b.order);

        setLiveCategories(mapped);
        setLoadError(null);
      } catch {
        if (!active) return;
        setLiveCategories([]);
        setLoadError('Categories are not available right now.');
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };

    void loadLiveCategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedCity(readSelectedCity());
    return subscribeLocationCity((city) => {
      setSelectedCity(city);
    });
  }, []);

  const buildCategoryHref = (slug: string) => {
    const cleanSlug = String(slug || '').trim();
    const city = String(selectedCity || '').trim();
    if (!city) {
      return `/category/${cleanSlug}`;
    }

    return `/category/${cleanSlug}?city=${encodeURIComponent(city)}`;
  };

  const sortedCategories = useMemo(
    () => [...liveCategories].sort((a, b) => a.order - b.order),
    [liveCategories]
  );
  const mobileVisibleCategories = useMemo(
    () => sortedCategories.slice(0, MOBILE_CATEGORY_COUNT),
    [sortedCategories]
  );
  const desktopExtraCategories = useMemo(
    () => sortedCategories.slice(MOBILE_CATEGORY_COUNT, DESKTOP_CATEGORY_COUNT),
    [sortedCategories]
  );
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sortedCategories;
    }
    return sortedCategories.filter((category) => category.name.toLowerCase().includes(query));
  }, [searchQuery, sortedCategories]);

  return (
    <section className="px-3 pt-4 pb-0 md:pt-2 lg:px-3 xl:px-3">
      <div className="w-full">
        {/* Category Grid */}
        <div className="pb-0 md:pb-2">
          {isLoading ? (
            <p className="px-2 text-sm text-slate-500"></p>
          ) : null}

          {!isLoading && loadError && sortedCategories.length === 0 ? (
            <p className="px-2 text-sm text-slate-500">{loadError}</p>
          ) : null}

          {!isLoading && sortedCategories.length === 0 ? (
            <p className="px-2 text-sm text-slate-500">No categories available yet.</p>
          ) : null}

          {sortedCategories.length > 0 ? (
          <div className="flex flex-wrap gap-x-[2%] gap-y-3 px-0 pt-1 pb-0 sm:px-0 sm:py-5">
            {mobileVisibleCategories.map((category, index) => {
              return (
                <Link
                  key={category.id}
                  href={buildCategoryHref(category.slug || slugify(category.name))}
                  className="my-[1px] w-[23.5%] rounded-2xl md:my-[5px] md:w-[18.4%] lg:w-[9.33%]"
                >
                  <CategoryCard
                    name={category.name}
                    mediaUrl={category.mediaUrl}
                  />
                </Link>
              );
            })}

            {desktopExtraCategories.map((category, index) => {
              return (
                <Link
                  key={`desktop-${category.id}`}
                  href={buildCategoryHref(category.slug || slugify(category.name))}
                  className="my-[5px] hidden w-[9.33%] rounded-2xl lg:block"
                >
                  <CategoryCard
                    name={category.name}
                    mediaUrl={category.mediaUrl}
                  />
                </Link>
              );
            })}

            <button
              className="my-[1px] w-[23.5%] rounded-2xl p-[2px] md:my-[5px] md:w-[18.4%] md:p-[5px] lg:w-[9.33%]"
              onClick={() => setIsOpen(true)}
              type="button"
            >
              <div className="flex h-[13vw] min-h-[44px] max-h-[56px] w-full items-center justify-center rounded-2xl border border-[#e7e7e7] bg-white text-blue-600 md:h-[10vw] md:max-h-none lg:h-[6.2vw]">
                <ChevronRight size={20} />
              </div>
              <h3 className="mt-[3px] text-center text-[11px] font-medium leading-[1.05] text-gray-700 line-clamp-2 md:mt-[5px] md:text-[13px] md:leading-tight">View All</h3>
            </button>
          </div>
          ) : null}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="w-full max-w-6xl rounded-2xl border border-white/40 bg-white/80 p-6 shadow-md relative max-h-[80vh] overflow-y-auto backdrop-blur-md">
              <button
                className="absolute right-4 top-4 rounded-xl border border-orange-500 bg-orange-500 p-2 text-white btn-hover"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
              <h3 className="text-xl font-bold text-gray-900 mb-4">All categories</h3>
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search categories"
                  className="w-full rounded-xl border border-orange-100 bg-white px-4 py-2 text-sm text-gray-800 outline-none focus:border-orange-300"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9">
                {filteredCategories.map((category) => {
                  return (
                    <Link
                      key={category.id}
                      href={buildCategoryHref(category.slug || slugify(category.name))}
                      onClick={() => setIsOpen(false)}
                      className="rounded-xl transition hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <CategoryCard name={category.name} mediaUrl={category.mediaUrl} className="bg-transparent" />
                    </Link>
                  );
                })}

                {filteredCategories.length === 0 ? (
                  <div className="col-span-full rounded-xl border border-gray-200 bg-white/80 px-3 py-3 text-sm text-gray-500">
                    No categories found.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
