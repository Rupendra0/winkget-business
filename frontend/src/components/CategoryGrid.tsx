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
const DESKTOP_COLUMNS = 10;
const DESKTOP_ROWS = 2;
const DESKTOP_TILE_COUNT = DESKTOP_COLUMNS * DESKTOP_ROWS;
const DESKTOP_CATEGORY_COUNT = DESKTOP_TILE_COUNT - 1;

interface CategoryCardProps {
  name: string;
  mediaUrl?: string;
}

function CategoryCard({ name, mediaUrl }: CategoryCardProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-white md:h-16 md:w-16 lg:h-[4.5rem] lg:w-[4.5rem]"
      >
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={name}
            className="h-12 w-12 object-contain scale-110 md:h-[3.25rem] md:w-[3.25rem] lg:h-16 lg:w-16"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-orange-50 text-orange-500">
            <span className="text-lg font-bold">{name.slice(0, 1).toUpperCase()}</span>
          </div>
        )}
      </div>
      <h3 className="mt-2 max-w-[88px] text-center text-xs font-bold leading-tight text-gray-700 line-clamp-2 md:max-w-[96px] lg:max-w-[110px]">{name}</h3>
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
    <section className="px-0 pt-1 pb-3 md:px-4 md:pt-2 md:pb-4 lg:px-6 lg:pt-2 lg:pb-6 xl:px-8">
      <div className="w-full">
        {/* Category Grid */}
        <div className="pb-2">
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
          <div className="grid grid-cols-4 justify-items-center gap-4 md:grid-cols-5 lg:grid-cols-10 lg:gap-x-8 lg:gap-y-7">
            {mobileVisibleCategories.map((category, index) => {
              return (
                <Link
                  key={category.id}
                  href={buildCategoryHref(category.slug || slugify(category.name))}
                  className="flex flex-col items-center justify-center"
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
                  className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center"
                >
                  <CategoryCard
                    name={category.name}
                    mediaUrl={category.mediaUrl}
                  />
                </Link>
              );
            })}

            <button
              className="flex flex-col items-center justify-center"
              onClick={() => setIsOpen(true)}
              type="button"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-300 bg-white text-blue-600 md:h-16 md:w-16 lg:h-[4.5rem] lg:w-[4.5rem]">
                <ChevronRight size={20} />
              </div>
              <h3 className="mt-2 max-w-[88px] text-center text-xs font-bold leading-tight text-gray-700 line-clamp-2 md:max-w-[96px] lg:max-w-[110px]">View All</h3>
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
            <div className="w-full max-w-4xl rounded-xl border border-white/40 bg-white/80 p-6 shadow-md relative max-h-[80vh] overflow-y-auto backdrop-blur-md">
              <button
                className="absolute right-4 top-4 rounded-md border border-orange-500 bg-orange-500 p-2 text-white btn-hover"
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
                  className="w-full rounded-full border border-orange-100 bg-white px-4 py-2 text-sm text-gray-800 outline-none focus:border-orange-300"
                />
              </div>
              <div className="space-y-2">
                {filteredCategories.map((category) => {
                  return (
                    <Link
                      key={category.id}
                      href={buildCategoryHref(category.slug || slugify(category.name))}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white/80 px-3 py-2 hover:bg-white"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
                        {category.mediaUrl ? (
                          <img
                            src={category.mediaUrl}
                            alt={category.name}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-orange-50 text-orange-500">
                            <span className="text-sm font-bold">{category.name.slice(0, 1).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{category.name}</span>
                    </Link>
                  );
                })}

                {filteredCategories.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-white/80 px-3 py-3 text-sm text-gray-500">
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
