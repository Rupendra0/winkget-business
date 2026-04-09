import React from 'react';
import { brandPartners } from '@/data/homeData';

export default function PartnersSection() {
  return (
    <section className="px-3 sm:px-4 lg:px-6 xl:px-8 py-6">
      <div className="w-full">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Brand Partners</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {brandPartners.map((partner) => (
            <div
              key={partner.name}
              className="flex items-center justify-center rounded-xl border border-gray-200 bg-white/70 backdrop-blur-md p-4 shadow-sm hover:shadow-sm transition"
            >
              <img
                src={partner.logoUrl}
                alt={partner.name}
                className="max-h-12 w-full object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
