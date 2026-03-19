'use client';

import React from 'react';
import { Clock, Star, MapPin } from 'lucide-react';

interface ServiceCardProps {
  service: string;
  provider: string;
  time: string;
  rating: number;
  image: string;
}

function ServiceCard({ service, provider, time, rating, image }: ServiceCardProps) {
  return (
    <div className="group relative rounded-2xl overflow-hidden backdrop-blur-xl bg-white/20 border border-white/30 hover:border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
      {/* Image */}
      <div className="relative h-48 bg-linear-to-br from-slate-200 to-slate-300 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/20" />
        <div className="w-full h-full flex items-center justify-center text-6xl">
          {image}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Service name */}
        <h3 className="font-bold text-gray-900 line-clamp-1">{service}</h3>

        {/* Provider */}
        <p className="text-sm text-gray-600 line-clamp-1">{provider}</p>

        {/* Rating and Time */}
        <div className="flex items-center justify-between pt-2 border-t border-white/20">
          <div className="flex items-center gap-1">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-semibold text-gray-800">{rating}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-600 font-medium text-sm">
            <Clock size={16} />
            <span>{time}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeaturedServices() {
  const services = [
    { service: 'Women\'s Salon & Spa', provider: 'BeautyHub Salon', time: '48 mins', rating: 4.8, image: '💅' },
    { service: 'Men\'s Salon & Massage', provider: 'RelaxSpa Center', time: '52 mins', rating: 4.7, image: '💆' },
    { service: 'Hair Styling', provider: 'Hair Studio Premium', time: '45 mins', rating: 4.9, image: '💇' },
    { service: 'Deep Cleaning', provider: 'CleanPro Services', time: '2 hours', rating: 4.6, image: '🧹' },
    { service: 'Plumbing Repair', provider: 'Expert Plumbers', time: '35 mins', rating: 4.8, image: '🔧' },
    { service: 'AC Repair', provider: 'Cool Air Services', time: '40 mins', rating: 4.7, image: '❄️' },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Popular Services Near You
          </h2>
          <p className="text-gray-600 text-lg">
            Most booked services in your area this week
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <ServiceCard
              key={index}
              service={service.service}
              provider={service.provider}
              time={service.time}
              rating={service.rating}
              image={service.image}
            />
          ))}
        </div>

        {/* View More */}
        <div className="mt-12 text-center">
          <button className="px-8 py-3 rounded-xl backdrop-blur-md bg-white/20 border border-white/40 hover:bg-white/30 hover:border-white/60 text-gray-800 font-semibold transition-all shadow-lg hover:shadow-xl">
            Browse All Services
          </button>
        </div>
      </div>
    </section>
  );
}
