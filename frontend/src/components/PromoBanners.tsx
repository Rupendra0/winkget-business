"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readSelectedCity, subscribeLocationCity } from "@/lib/locationStore";

type PromoCardPayload = {
  cardId?: string;
  categoryName?: string;
  categorySlug?: string;
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
  image: normalizeMedia(card.image),
  order: Number.isFinite(Number(card.order)) ? Number(card.order) : fallbackIndex + 1,
});

export default function PromoBanners() {
  const [selectedCity, setSelectedCity] = useState("");
  const [heading, setHeading] = useState(DEFAULT_HEADING);
  const [cards, setCards] = useState<PromoCard[]>([]);
  const [loadError, setLoadError] = useState(false);

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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-5">
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
                  <p className="line-clamp-1 text-sm font-semibold text-white">{card.categoryName || "Category"}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-500">
            {loadError ? "Promotional cards are not available right now." : "No promotional cards are configured yet."}
          </div>
        )}
      </div>
    </section>
  );
}
