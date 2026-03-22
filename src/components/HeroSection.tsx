import React from 'react';
import Link from 'next/link';
import { Search, MapPin, Sparkles } from 'lucide-react';
import { heroMosaicImages, heroQuickTiles } from '@/data/homeData';

export default function HeroSection() {
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  return (
    <section className="relative pt-8 sm:pt-10 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-blue-200 to-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-linear-to-tr from-teal-200 to-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000" />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-linear-to-br from-cyan-200 to-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-4000" />
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 sm:gap-12 items-center">
        <div className="text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md bg-white/50 border border-white/70 text-blue-900 text-xs font-semibold mb-4 shadow-sm">
            <Sparkles size={14} />
            Verified businesses near you
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-3 leading-tight">
            Discover trusted local businesses in minutes
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mb-6 max-w-xl">
            Compare reviews, prices, and availability across your city. Book instantly or call vendors directly.
          </p>
          <div className="mb-6 sm:mb-7" />

          <div className="rounded-2xl glass-panel p-5">
            <div className="text-sm font-semibold text-gray-800 mb-3">Trending near you</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {heroQuickTiles.map((service) => (
                <Link
                  key={service.label}
                  href={`/category/${slugify(service.label)}`}
                  className="group rounded-xl backdrop-blur-md bg-white/60 border border-white/70 hover:bg-white/80 text-left p-3 transition-all hover:-translate-y-0.5 hover:shadow-md card-hover"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-9 w-9 rounded-lg overflow-hidden border border-white/70 shadow-sm bg-white">
                      <img
                        src={service.imageUrl}
                        alt={service.label}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="text-[11px] font-semibold text-blue-900">{service.badge}</div>
                  </div>
                  <div className="text-xs font-semibold text-gray-800 leading-tight group-hover:text-blue-900">
                    {service.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {heroMosaicImages.map((imageUrl) => (
            <div
              key={imageUrl}
              className="rounded-2xl h-36 sm:h-56 lg:h-64 overflow-hidden border border-white/60 shadow-lg backdrop-blur-xl bg-white/50 card-hover"
            >
              <img
                src={imageUrl}
                alt="Service"
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
