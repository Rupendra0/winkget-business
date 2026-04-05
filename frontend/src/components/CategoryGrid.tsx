'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  X,
} from 'lucide-react';
import { categories } from '@/data/homeData';
import { readSelectedCity, subscribeLocationCity } from '@/lib/locationStore';

type LiveCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder?: number;
};

type CategoryApiResponse = {
  ok: boolean;
  categories?: LiveCategory[];
};

type DisplayCategory = {
  name: string;
  imageUrl: string;
  order: number;
  slug?: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=240&q=60',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=240&q=60',
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=240&q=60',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=240&q=60',
];

interface CategoryCardProps {
  name: string;
  imageUrl: string;
}

function CategoryCard({ name, imageUrl }: CategoryCardProps) {
  return (
    <div className="group cursor-pointer">
      <div className="h-16 sm:h-18 w-full rounded-xl overflow-hidden border border-slate-200/70 shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <h3 className="mt-1.5 text-[11px] sm:text-xs font-medium text-slate-700 text-center leading-tight line-clamp-2 group-hover:text-slate-900 transition-colors">
        {name}
      </h3>
    </div>
  );
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const pickFallbackImage = (name: string) => {
  const key = name
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return FALLBACK_IMAGES[key % FALLBACK_IMAGES.length];
};

export default function CategoryGrid() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveCategories, setLiveCategories] = useState<DisplayCategory[] | null>(null);
  const [selectedCity, setSelectedCity] = useState('');
  const visibleCount = 19;

  const staticDisplayCategories = useMemo<DisplayCategory[]>(
    () => categories.map((item) => ({ name: item.name, imageUrl: item.imageUrl, order: item.order })),
    []
  );

  const staticImageByName = useMemo(
    () => new Map(categories.map((item) => [item.name.toLowerCase(), item.imageUrl])),
    []
  );

  useEffect(() => {
    let active = true;

    const loadLiveCategories = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/categories`, { cache: 'no-store' });
        const payload = (await response.json()) as CategoryApiResponse;

        if (!active) return;
        if (!response.ok || !payload.ok || !Array.isArray(payload.categories)) return;

        const mapped = payload.categories
          .map((item, index) => ({
            name: item.name,
            slug: item.slug,
            order: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
            imageUrl: staticImageByName.get(item.name.toLowerCase()) || pickFallbackImage(item.name),
          }))
          .sort((a, b) => a.order - b.order);

        setLiveCategories(mapped.length > 0 ? mapped : null);
      } catch {
        if (!active) return;
      }
    };

    void loadLiveCategories();

    return () => {
      active = false;
    };
  }, [staticImageByName]);

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
    () =>
      liveCategories && liveCategories.length > 0
        ? [...liveCategories].sort((a, b) => a.order - b.order)
        : [...staticDisplayCategories].sort((a, b) => a.order - b.order),
    [liveCategories, staticDisplayCategories]
  );
  const visibleCategories = useMemo(
    () => sortedCategories.slice(0, visibleCount),
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
    <section className="pt-6 sm:pt-8 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Explore categories
          </h2>
          <p className="text-gray-600 text-base sm:text-lg">
            Popular services across your city
          </p>
        </div>

        {/* Category Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-flow-col auto-cols-[76px] sm:auto-cols-[84px] gap-x-6 gap-y-6 sm:gap-x-7 sm:gap-y-7 lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-[repeat(10,84px)] lg:gap-x-9 lg:gap-y-11 xl:gap-y-12 lg:justify-center min-w-max lg:min-w-0">
          {visibleCategories.map((category) => {
            return (
              <Link key={category.name} href={buildCategoryHref(category.slug || slugify(category.name))}>
                <CategoryCard
                  name={category.name}
                  imageUrl={category.imageUrl}
                />
              </Link>
            );
          })}
          <button
            className="group btn-hover"
            onClick={() => setIsOpen(true)}
            type="button"
          >
            <div className="h-16 sm:h-18 w-full rounded-xl border border-blue-200 bg-blue-50 flex items-center justify-center shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <ChevronRight size={20} className="text-blue-800" />
            </div>
            <h3 className="mt-1.5 text-[11px] sm:text-xs font-medium text-blue-800 text-center">View All</h3>
          </button>
        </div>
        </div>

        {/* View All Button */}
        <div className="mt-10" />
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="w-full max-w-4xl rounded-2xl glass-panel p-6 relative max-h-[80vh] overflow-y-auto">
              <button
                className="absolute right-4 top-4 p-2 rounded-lg bg-blue-900 text-white btn-hover"
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
                  className="w-full rounded-xl border border-blue-200 bg-white/70 px-4 py-2 text-sm text-gray-800 outline-none focus:border-blue-400"
                />
              </div>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-7 sm:gap-x-7 sm:gap-y-8 lg:gap-x-9 lg:gap-y-10">
                {filteredCategories.map((category) => {
                  return (
                    <Link
                      key={category.name}
                      href={buildCategoryHref(category.slug || slugify(category.name))}
                      className="w-19 sm:w-21"
                    >
                      <CategoryCard
                        name={category.name}
                        imageUrl={category.imageUrl}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
