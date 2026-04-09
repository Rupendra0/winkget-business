"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { readSelectedCity, subscribeLocationCity } from "@/lib/locationStore";

type PromoCardPayload = {
  cardId?: string;
  categoryName?: string;
  categorySlug?: string;
  title?: string;
  image?: string;
  order?: number;
};

type HomePromoSectionPayload = {
  ok: boolean;
  section?: {
    heading?: string;
    cards?: PromoCardPayload[];
  };
};

type PromoCard = {
  cardId: string;
  categoryName: string;
  categorySlug: string;
  title: string;
  image: string;
  order: number;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const DEFAULT_HEADING = "Featured Offers";

const normalizeMedia = (value?: string) => String(value || "").trim();

const normalizeCard = (card: PromoCardPayload, fallbackIndex: number): PromoCard => ({
  cardId: String(card.cardId || `card-${fallbackIndex + 1}`).trim(),
  categoryName: String(card.categoryName || "").trim(),
  categorySlug: String(card.categorySlug || "").trim(),
  title: String(card.title || "").trim(),
  image: normalizeMedia(card.image),
  order: Number.isFinite(Number(card.order)) ? Number(card.order) : fallbackIndex + 1,
});

export default function PromoBanners() {
  const [selectedCity, setSelectedCity] = useState("");
  const [heading, setHeading] = useState(DEFAULT_HEADING);
  const [cards, setCards] = useState<PromoCard[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressTapRef = useRef(false);

  useEffect(() => {
    setSelectedCity(readSelectedCity());
    return subscribeLocationCity((city) => setSelectedCity(city));
  }, []);

  useEffect(() => {
    let active = true;

    const loadSection = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/home-promo-cards`, { cache: "no-store" });
        const payload = (await response.json()) as HomePromoSectionPayload;

        if (!active || !response.ok || !payload.ok || !payload.section) {
          if (!active) return;
          setLoadError(true);
          setCards([]);
          return;
        }

        const normalizedHeading = String(payload.section.heading || "").trim() || DEFAULT_HEADING;
        const normalizedCards = (Array.isArray(payload.section.cards) ? payload.section.cards : [])
          .map((card, index) => normalizeCard(card, index))
          .filter((card) => card.image && card.categorySlug)
          .sort((left, right) => left.order - right.order);

        setHeading(normalizedHeading);
        setCards(normalizedCards);
        setLoadError(false);
      } catch {
        if (!active) return;
        setLoadError(true);
        setCards([]);
      }
    };

    void loadSection();

    return () => {
      active = false;
    };
  }, []);

  const visibleCards = useMemo(() => cards.slice(0, 5), [cards]);

  useEffect(() => {
    if (visibleCards.length <= 1) return;

    const timer = window.setInterval(() => {
      setMobileIndex((previous) => (previous + 1) % visibleCards.length);
    }, 3400);

    return () => window.clearInterval(timer);
  }, [visibleCards.length]);

  useEffect(() => {
    if (mobileIndex < visibleCards.length) return;
    setMobileIndex(0);
  }, [mobileIndex, visibleCards.length]);

  const handleMobileTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    suppressTapRef.current = false;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleMobileTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.touches[0];

    if (!start || !touch) return;

    const deltaX = Math.abs(touch.clientX - start.x);
    const deltaY = Math.abs(touch.clientY - start.y);

    if (deltaX > 12 && deltaX > deltaY) {
      suppressTapRef.current = true;
    }
  };

  const handleMobileTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (visibleCards.length <= 1) {
      touchStartRef.current = null;
      return;
    }

    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = event.changedTouches[0];

    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const swipeDistance = Math.abs(deltaX);

    if (swipeDistance < 44 || swipeDistance <= Math.abs(deltaY)) {
      suppressTapRef.current = false;
      return;
    }

    suppressTapRef.current = true;

    if (deltaX < 0) {
      setMobileIndex((previous) => (previous + 1) % visibleCards.length);
      return;
    }

    setMobileIndex((previous) => (previous - 1 + visibleCards.length) % visibleCards.length);
  };

  const buildCategoryHref = (categorySlug: string) => {
    const city = String(selectedCity || "").trim();
    if (!city) {
      return `/category/${categorySlug}`;
    }
    return `/category/${categorySlug}?city=${encodeURIComponent(city)}`;
  };

  return (
    <section className="px-3 py-4 sm:px-4 lg:px-6 xl:px-8">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">{heading}</h2>
        </div>

        {visibleCards.length > 0 ? (
          <>
            <div className="md:hidden">
              <div
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                aria-label="Featured offers carousel"
                onTouchStart={handleMobileTouchStart}
                onTouchMove={handleMobileTouchMove}
                onTouchEnd={handleMobileTouchEnd}
                onTouchCancel={() => {
                  touchStartRef.current = null;
                  suppressTapRef.current = false;
                }}
                style={{ touchAction: "pan-y" }}
              >
                <div
                  className="flex w-full transition-transform duration-700 ease-out"
                  style={{ transform: `translateX(-${mobileIndex * 100}%)` }}
                >
                  {visibleCards.map((card) => (
                    <Link
                      key={card.cardId}
                      href={buildCategoryHref(card.categorySlug)}
                      className="group relative w-full shrink-0 overflow-hidden"
                      onClickCapture={(event) => {
                        if (!suppressTapRef.current) return;
                        event.preventDefault();
                        event.stopPropagation();
                        suppressTapRef.current = false;
                      }}
                    >
                      <img
                        src={card.image}
                        alt={card.categoryName || "Promotion"}
                        className="h-[200px] w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                        <p className="line-clamp-1 text-sm font-semibold text-white">{card.title || card.categoryName || "Category"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {visibleCards.length > 1 ? (
                <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden="true">
                  {visibleCards.map((card, index) => (
                    <span
                      key={`${card.cardId}-dot`}
                      className={`h-1.5 rounded-full transition-all ${
                        index === mobileIndex ? "w-5 bg-slate-700" : "w-2 bg-slate-300"
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="hidden grid-cols-1 gap-5 md:grid md:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-5">
              {visibleCards.map((card) => (
                <Link
                  key={card.cardId}
                  href={buildCategoryHref(card.categorySlug)}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <img
                    src={card.image}
                    alt={card.categoryName || "Promotion"}
                    className="h-[200px] w-full object-cover transition duration-300 group-hover:scale-[1.03] sm:h-[215px]"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                    <p className="line-clamp-1 text-sm font-semibold text-white">{card.title || card.categoryName || "Category"}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-500">
            {loadError ? "Promotional cards are not available right now." : "No promotional cards are configured yet."}
          </div>
        )}
      </div>
    </section>
  );
}
