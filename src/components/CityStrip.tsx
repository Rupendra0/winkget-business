import React from 'react';
import { cities } from '@/data/homeData';

export default function CityStrip() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-sm font-semibold text-blue-900 mb-3">Discover major cities</div>
        <div className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:flex-wrap">
          {cities.map((city) => (
            <div
              key={city.name}
              className="w-24 text-center snap-start"
            >
              <div className="h-16 w-16 mx-auto rounded-2xl overflow-hidden border border-white/70 shadow-sm bg-white card-float">
                <img
                  src={city.imageUrl}
                  alt={city.name}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                  loading="lazy"
                />
              </div>
              <div className="text-xs font-medium text-gray-700 mt-2">{city.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
