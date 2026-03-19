'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plane,
  UtensilsCrossed,
  Home,
  Wrench,
  ChefHat,
  Hammer,
  Smile,
  Stethoscope,
  BookOpen,
  Sparkles,
  Palette,
  MapPin,
  Hospital,
  Sofa,
  Gem,
  Dumbbell,
  Scale,
  PawPrint,
  Lightbulb,
  Code,
  Users,
  Monitor,
  ChevronRight,
  X,
} from 'lucide-react';
import { categories } from '@/data/homeData';

const iconMap = {
  Building2,
  Plane,
  UtensilsCrossed,
  Home,
  Wrench,
  ChefHat,
  Hammer,
  Smile,
  Stethoscope,
  BookOpen,
  Sparkles,
  Palette,
  MapPin,
  Hospital,
  Sofa,
  Gem,
  Dumbbell,
  Scale,
  PawPrint,
  Lightbulb,
  Code,
  Users,
  Monitor,
} as const;

interface CategoryCardProps {
  name: string;
  icon: React.ReactNode;
  color: string;
  imageUrl: string;
}

function CategoryCard({ name, icon, color, imageUrl }: CategoryCardProps) {
  return (
    <div className="group relative h-44 cursor-pointer">
      <div className="absolute inset-0 rounded-2xl bg-white/40 border border-white/60 shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl" />
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-15 bg-linear-to-br ${color} transition-opacity duration-300`} />

      <div className="relative h-full flex flex-col items-center justify-center px-4 py-5">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-lg border border-white/60 bg-white">
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
          </div>
          <div className={`absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-linear-to-br ${color} shadow-md flex items-center justify-center text-white`}
          >
            {icon}
          </div>
        </div>

        <h3 className="mt-4 text-sm font-semibold text-gray-800 text-center line-clamp-2 group-hover:text-gray-900 transition-colors">
          {name}
        </h3>

        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ChevronRight size={16} className="text-blue-900" />
        </div>
      </div>
    </div>
  );
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

export default function CategoryGrid() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const visibleCount = 11;
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    []
  );
  const homeCategories = useMemo(
    () => sortedCategories.filter((category) => category.showOnHome),
    [sortedCategories]
  );
  const visibleCategories = useMemo(
    () => homeCategories.slice(0, visibleCount),
    [homeCategories]
  );
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sortedCategories;
    }
    return sortedCategories.filter((category) => category.name.toLowerCase().includes(query));
  }, [searchQuery, sortedCategories]);

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Explore categories
          </h2>
          <p className="text-gray-600 text-lg">
            Popular services across your city
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
          {visibleCategories.map((category) => {
            const IconComponent = iconMap[category.iconKey as keyof typeof iconMap] || Building2;
            return (
              <Link key={category.name} href={`/category/${slugify(category.name)}`}>
                <CategoryCard
                  name={category.name}
                  icon={<IconComponent size={28} />}
                  color={category.color}
                  imageUrl={category.imageUrl}
                />
              </Link>
            );
          })}
          <button
            className="group relative h-40"
            onClick={() => setIsOpen(true)}
            type="button"
          >
            <div className="absolute inset-0 backdrop-blur-xl bg-blue-900/10 border border-blue-900/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:bg-blue-900/20 group-hover:border-blue-900/40 group-hover:-translate-y-1" />
            <div className="relative h-full flex flex-col items-center justify-center px-4 py-6">
              <div className="mb-3 p-3 rounded-xl bg-blue-900 text-white shadow-lg">
                <ChevronRight size={28} />
              </div>
              <h3 className="text-sm font-semibold text-blue-900 text-center">View All</h3>
            </div>
          </button>
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
                className="absolute right-4 top-4 p-2 rounded-lg bg-blue-900 text-white"
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredCategories.map((category) => {
                  const IconComponent = iconMap[category.iconKey as keyof typeof iconMap] || Building2;
                  return (
                    <Link key={category.name} href={`/category/${slugify(category.name)}`}>
                      <CategoryCard
                        name={category.name}
                        icon={<IconComponent size={24} />}
                        color={category.color}
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
