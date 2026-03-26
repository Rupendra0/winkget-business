'use client';

import React from 'react';
import { Zap, Smile, Clock, Award } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Instant Booking',
    description: 'Book services in seconds with instant confirmation',
  },
  {
    icon: Smile,
    title: 'Trusted Providers',
    description: 'Verified local businesses with customer reviews',
  },
  {
    icon: Clock,
    title: 'Quick Service',
    description: 'Same-day service available for most categories',
  },
  {
    icon: Award,
    title: 'Best Prices',
    description: 'Compare prices and get the best deals in town',
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-white/50 to-slate-100/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto">
        {/* Grid of Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="p-6 rounded-2xl backdrop-blur-xl bg-white/30 border border-white/40 hover:bg-white/40 hover:border-white/60 transition-all duration-300 group text-center card-hover"
              >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-xl bg-linear-to-br from-orange-400 to-orange-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Icon className="text-white" size={32} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
