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
  const [heading, setHeading] = useState("");
  const [cards, setCards] = useState<PromoCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/home-promo-cards`, { cache: "no-store" });
        const payload = (await response.json()) as HomePromoSectionPayload;

        if (!active || !response.ok || !payload.ok || !payload.section) {
          if (!active) return;
          setLoadError(true);
          setHeading("");
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
        setHeading("");
        setCards([]);
      } finally {
        if (!active) return;
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <section className="px-3 py-3 md:py-4 lg:py-6">
        <div className="w-full animate-pulse rounded-xl bg-white px-0 py-0">
          <div className="mb-4 h-7 w-44 rounded bg-slate-200/70" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`promo-skeleton-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="h-[200px] w-full bg-slate-200/70 sm:h-[215px]" />
                <div className="p-3">
                  <div className="h-4 w-2/3 rounded bg-slate-200/70" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (loadError || visibleCards.length === 0) {
    return null;
  }

  return (
    <section className="px-3 py-3 md:py-4 lg:py-6">
      <div className="w-full rounded-xl bg-white px-0 py-0">
        <div className="mb-3">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">{heading}</h2>
        </div>

        <div className="flex w-full justify-start gap-[2%] overflow-x-auto overflow-y-hidden whitespace-nowrap pb-2 md:justify-center no-scrollbar">
          {visibleCards.map((card) => (
            <Link
              key={card.cardId}
              href={buildCategoryHref(card.categorySlug)}
              className="relative inline-block h-[42vw] min-h-[150px] w-[46%] shrink-0 overflow-hidden rounded-xl bg-white shadow-[0_8px_300px_rgba(205,205,205,0.24)] transition md:h-[18vw] md:w-[18.4%] md:min-w-0"
            >
              <img
                src={card.image}
                alt={card.categoryName || "Promotion"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
