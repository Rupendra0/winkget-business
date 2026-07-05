"use client";

import { useEffect, useState } from "react";
import { writeSelectedCity } from "@/lib/locationStore";

type CityLocality = {
  id: string;
  name: string;
  slug: string;
};

type City = {
  id: string;
  name: string;
  slug: string;
  state?: string;
  image?: string;
  localities: CityLocality[];
};

type CitiesResponse = {
  ok: boolean;
  cities: City[];
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const HEADING = "Discover Major Cities";

const getFallbackCityImage = (cityName: string) => {
  const name = cityName.toLowerCase();
  if (name.includes("delhi")) {
    return "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("mumbai")) {
    return "https://images.unsplash.com/photo-1562979314-bee7453e911c?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("bangalore") || name.includes("bengaluru")) {
    return "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("kolkata")) {
    return "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("agra")) {
    return "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("hyderabad")) {
    return "https://images.unsplash.com/photo-1605007493699-af65834f8a00?auto=format&fit=crop&w=600&q=80";
  }
  if (name.includes("lucknow")) {
    return "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=600&q=80";
  }
  return "https://images.unsplash.com/photo-1506461883276-594a12b11cc3?auto=format&fit=crop&w=600&q=80";
};

export default function CitiesSection() {
  const [cities, setCities] = useState<City[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchCitiesData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/cities`, { cache: "no-store" });
        const payload = (await response.json()) as CitiesResponse;

        if (!active) return;

        if (response.ok && payload.ok) {
          setCities(payload.cities || []);
          setLoadError(null);
        } else {
          setLoadError("Failed to load cities");
        }
      } catch {
        if (!active) return;
        setLoadError("Failed to load cities");
      }
    };

    void fetchCitiesData();

    return () => {
      active = false;
    };
  }, []);

  const handleCityClick = (cityName: string) => {
    writeSelectedCity(cityName);
    // Smooth scroll to top of page to refresh categories view context
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loadError || cities.length === 0) {
    return null;
  }

  return (
    <section className="px-3 pt-1 pb-2 md:pt-2 md:pb-3 lg:pt-2 lg:pb-4">
      <div className="w-full rounded-xl bg-white px-0 py-0">
        <div className="mb-3 pl-1 md:pl-2.5">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">{HEADING}</h2>
        </div>

        {/* Scrollable horizontal cards strip */}
        <div className="flex w-full justify-start gap-4 overflow-x-auto pb-2 no-scrollbar">
          {cities.map((city) => (
            <div
              key={city.id}
              onClick={() => handleCityClick(city.name)}
              className="w-[45%] sm:w-[30%] md:w-[22%] lg:w-[18.4%] shrink-0 cursor-pointer group"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-200/60 shadow-sm transition hover:shadow-md">
                <img
                  src={city.image || getFallbackCityImage(city.name)}
                  alt={city.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute left-2.5 top-2.5 bg-white rounded px-1.5 py-0.5 flex items-center gap-1 shadow-sm">
                  <span className="text-amber-500 text-[11px] font-bold">★</span>
                  <span className="text-[11px] font-bold text-slate-700">4.5</span>
                </div>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-700 transition group-hover:text-blue-600">
                {city.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
