import React from 'react';
import { brandPartners, localPartners } from '@/data/homeData';

export default function PartnersSection() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-16">
      <div className="max-w-7xl mx-auto text-center relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-10">
        <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-linear-to-br from-blue-200/60 to-teal-200/30 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-linear-to-br from-cyan-200/60 to-blue-200/30 blur-3xl" />

        <div className="relative">
          <div className="text-lg font-bold text-gray-900">Our Partners</div>
          <p className="text-sm text-gray-600 mt-1">Trusted brands and local favorites</p>

          <div className="mt-8">
            <div className="text-sm font-semibold text-gray-800 mb-4">Local partners</div>
            <div className="flex flex-wrap justify-center gap-5">
              {localPartners.map((partner) => (
                <div
                  key={partner.name}
                  className="group h-20 w-20 rounded-2xl overflow-hidden bg-white/70 border border-white/80 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all card-hover"
                >
                  <img
                    src={partner.logoUrl}
                    alt={partner.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <div className="text-sm font-semibold text-gray-800 mb-4">Brand partners</div>
            <div className="flex flex-wrap justify-center gap-5">
              {brandPartners.map((partner) => (
                <div
                  key={partner.name}
                  className="group h-20 w-20 rounded-full bg-white/80 border border-blue-200 shadow-md flex items-center justify-center hover:shadow-xl hover:-translate-y-1 transition-all card-hover"
                >
                  <img
                    src={partner.logoUrl}
                    alt={partner.name}
                    className="h-10 w-12 object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
