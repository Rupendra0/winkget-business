import React from 'react';
import { heroBanners, promoCards } from '@/data/homeData';

export default function PromoRow() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-6 sm:gap-8 items-stretch">
        <div className="rounded-2xl shadow-xl overflow-hidden bg-white/40 border border-white/50 p-4">
          <div className="relative min-h-55 fade-carousel">
            {heroBanners.slice(0, 3).map((banner, index) => (
              <div
                key={banner.title}
                className={`fade-slide fade-delay-${index + 1} rounded-2xl p-6 text-white relative overflow-hidden shadow-lg`}
              >
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-80"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/35" />
                <div className="relative">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/90">Seasonal offers</div>
                  <div className="text-2xl sm:text-3xl font-bold mt-2 leading-tight">{banner.title}</div>
                  <p className="text-sm text-white/90 mt-2 max-w-sm">{banner.subtitle}</p>
                  <button className="mt-5 px-4 py-2 rounded-lg bg-white/18 border border-white/35 hover:bg-white/28 text-sm font-semibold btn-hover">
                    {banner.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {promoCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl text-white shadow-lg min-h-30 relative overflow-hidden border border-white/45 card-hover"
            >
              <img
                src={card.imageUrl}
                alt={card.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/72 via-black/28 to-transparent" />
              <div className="relative h-full flex flex-col justify-end p-3.5">
                <div className="text-base sm:text-lg uppercase tracking-wide font-extrabold leading-tight drop-shadow-sm">{card.title}</div>
                <div className="mt-1 text-sm sm:text-base font-semibold text-white/90 leading-snug">{card.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
