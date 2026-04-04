"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cities as fallbackCities } from "@/data/homeData";
import { fetchCities } from "@/lib/catalogClient";
import { readSelectedCity, subscribeLocationCity, writeSelectedCity } from "@/lib/locationStore";

type CityStripItem = {
  name: string;
  imageUrl: string;
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=300&q=60",
  "https://images.unsplash.com/photo-1526481280695-3c469b9f0f79?auto=format&fit=crop&w=300&q=60",
  "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=300&q=60",
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=300&q=60",
];

const pickImage = (name: string, fallbackIndex: number) => {
  const fromFallbackData = fallbackCities.find((city) => city.name.toLowerCase() === name.toLowerCase())?.imageUrl;
  if (fromFallbackData) return fromFallbackData;
  return FALLBACK_IMAGES[fallbackIndex % FALLBACK_IMAGES.length];
};

export default function CityStrip() {
  const [cities, setCities] = useState<CityStripItem[]>([]);
  const [selectedCity, setSelectedCity] = useState(() => readSelectedCity());

  useEffect(() => {
    return subscribeLocationCity((city) => {
      setSelectedCity(city);
    });
  }, []);

  useEffect(() => {
    let active = true;

    const loadCities = async () => {
      const liveCities = await fetchCities();
      if (!active) return;

      if (liveCities.length === 0) {
        setCities(fallbackCities.map((city) => ({ name: city.name, imageUrl: city.imageUrl })));
        return;
      }

      setCities(
        liveCities.map((city, index) => ({
          name: city.name,
          imageUrl: pickImage(city.name, index),
        }))
      );
    };

    void loadCities();

    return () => {
      active = false;
    };
  }, []);

  const visibleCities = useMemo(
    () => (cities.length > 0 ? cities : fallbackCities.map((city) => ({ name: city.name, imageUrl: city.imageUrl }))),
    [cities]
  );

  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-sm font-semibold text-blue-900 mb-3">Discover major cities</div>
        <div className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:flex-wrap">
          {visibleCities.map((city) => (
            <button
              key={city.name}
              type="button"
              onClick={() => writeSelectedCity(city.name)}
              className="w-24 text-center snap-start"
            >
              <div
                className={`h-16 w-16 mx-auto rounded-2xl overflow-hidden border shadow-sm bg-white card-float card-hover ${
                  selectedCity === city.name ? "border-blue-400" : "border-white/70"
                }`}
              >
                <img
                  src={city.imageUrl}
                  alt={city.name}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                  loading="lazy"
                />
              </div>
              <div className={`text-xs font-medium mt-2 ${selectedCity === city.name ? "text-blue-800" : "text-gray-700"}`}>
                {city.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
