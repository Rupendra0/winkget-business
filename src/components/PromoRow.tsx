import React from 'react';
import { heroBanners, promoCards } from '@/data/homeData';

export default function PromoRow() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 sm:gap-8">
        <div className="rounded-2xl shadow-xl overflow-hidden bg-white/40 border border-white/50 p-4">
          <div className="relative min-h-55 fade-carousel">
            {heroBanners.slice(0, 3).map((banner, index) => (
              <div
                key={banner.title}
                className={`fade-slide fade-delay-${index + 1} rounded-2xl p-6 text-white bg-linear-to-r ${banner.tone} relative overflow-hidden shadow-lg`}
              >
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-55"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/25" />
                <div className="relative">
                  <div className="text-sm font-semibold uppercase tracking-wide opacity-90">Seasonal offers</div>
                  <div className="text-2xl sm:text-3xl font-bold mt-2">{banner.title}</div>
                  <p className="text-sm opacity-90 mt-2 max-w-sm">{banner.subtitle}</p>
                  <button className="mt-5 px-4 py-2 rounded-lg bg-white/20 border border-white/30 hover:bg-white/30 text-sm font-semibold btn-hover">
                    {banner.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {promoCards.map((card) => (
            <div
              key={card.title}
              className={`rounded-2xl p-4 text-white shadow-lg bg-linear-to-br ${card.tone} min-h-27.5 relative overflow-hidden card-hover`}
            >
              <img
                src={card.imageUrl}
                alt={card.title}
                className="absolute inset-0 h-full w-full object-cover opacity-45"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative">
                <div className="text-xs uppercase tracking-wide opacity-90">{card.title}</div>
                <div className="text-sm font-semibold mt-2">{card.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
