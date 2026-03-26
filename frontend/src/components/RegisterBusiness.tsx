import React from 'react';
import { registerCta } from '@/data/homeData';

export default function RegisterBusiness() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-16">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-2xl overflow-hidden backdrop-blur-xl bg-white/60 border border-white/70 shadow-lg grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] card-hover">
          <div className="p-6 sm:p-8 text-center md:text-left">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {registerCta.title}
            </div>
            <p className="text-gray-600 mt-2">{registerCta.subtitle}</p>
            <button className="mt-5 px-6 py-3 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800 btn-hover">
              {registerCta.button}
            </button>
          </div>
          <div className="min-h-50 bg-white/30">
            <img
              src={registerCta.imageUrl}
              alt="Register business"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
