"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { promoBanners } from '@/data/homeData';

export default function PromoBanners() {
  const perSlide = 2;
  const slides = useMemo(() => {
    const groups = [] as typeof promoBanners[];
    for (let i = 0; i < promoBanners.length; i += perSlide) {
      groups.push(promoBanners.slice(i, i + perSlide));
    }
    return groups;
  }, []);

  const extendedSlides = useMemo(() => {
    if (slides.length === 0) {
      return [] as typeof slides;
    }
    return [...slides, slides[0]];
  }, [slides]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (isPaused || slides.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setIsAnimating(true);
      setActiveIndex((prev) => prev + 1);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [isPaused, slides.length]);

  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-14">
      <div className="max-w-7xl mx-auto">
        <div
          className="relative overflow-hidden rounded-3xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className={`flex ${isAnimating ? "transition-transform duration-900 ease-[cubic-bezier(0.22,1,0.36,1)]" : ""}`}
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            onTransitionEnd={() => {
              if (activeIndex >= slides.length && slides.length > 0) {
                setIsAnimating(false);
                setActiveIndex(0);
                requestAnimationFrame(() => setIsAnimating(true));
              }
            }}
          >
            {extendedSlides.map((group, slideIndex) => (
              <div
                key={`slide-${slideIndex}`}
                className="min-w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch"
              >
                {group.map((item) => (
                  <div
                    key={item.title}
                    className="promo-enter rounded-2xl overflow-hidden bg-white/65 border border-white/70 shadow-lg grid grid-cols-[1.1fr_1fr] h-44 card-hover"
                  >
                    <div className="p-6 h-full flex flex-col justify-center">
                      <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{item.title}</div>
                      <div className="text-sm text-slate-600 mt-1.5">{item.subtitle}</div>
                      <button className="mt-4 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 btn-hover w-fit">
                        {item.button}
                      </button>
                    </div>
                    <div className="relative h-full">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover promo-image-drift"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/85 shadow-md border border-white/70 flex items-center justify-center btn-hover"
                onClick={() => {
                  setIsAnimating(true);
                  setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
                }}
                aria-label="Previous"
              >
                <ChevronLeft size={18} className="text-blue-900" />
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/85 shadow-md border border-white/70 flex items-center justify-center btn-hover"
                onClick={() => {
                  setIsAnimating(true);
                  setActiveIndex((prev) => (prev + 1) % slides.length);
                }}
                aria-label="Next"
              >
                <ChevronRight size={18} className="text-blue-900" />
              </button>
            </>
          )}
        </div>

        {slides.length > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={`dot-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 w-2.5 rounded-full btn-hover ${
                  index === activeIndex ? "bg-blue-900" : "bg-blue-200"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
