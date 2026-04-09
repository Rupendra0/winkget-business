"use client";

import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { brandPartners } from "@/data/homeData";

type SponsorCardPayload = {
  cardId?: string;
  title?: string;
  image?: string;
  link?: string;
  order?: number;
};

type HomeSponsorPayload = {
  ok: boolean;
  section?: {
    heading?: string;
    cards?: SponsorCardPayload[];
  };
};

type SponsorCard = {
  cardId: string;
  image: string;
  link: string;
  order: number;
  name: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const SPONSOR_DEFAULT_HEADING = "Brand Partners";
const SPONSOR_LIMIT = 7;

const normalizeMedia = (value?: string) => String(value || "").trim();

const normalizeSponsorCard = (card: SponsorCardPayload, fallbackIndex: number): SponsorCard => ({
  cardId: String(card.cardId || `card-${fallbackIndex + 1}`).trim(),
  image: normalizeMedia(card.image),
  link: String(card.link || "").trim(),
  order: Number.isFinite(Number(card.order)) ? Number(card.order) : fallbackIndex + 1,
  name: String(card.title || `Sponsor ${fallbackIndex + 1}`).trim() || `Sponsor ${fallbackIndex + 1}`,
});

const toFallbackCards = (): SponsorCard[] =>
  brandPartners
    .map((partner, index) => ({
      cardId: `fallback-${index + 1}`,
      image: normalizeMedia(partner.logoUrl),
      link: "",
      order: index + 1,
      name: String(partner.name || `Sponsor ${index + 1}`).trim() || `Sponsor ${index + 1}`,
    }))
    .filter((card) => card.image)
    .slice(0, SPONSOR_LIMIT);

export default function PartnersSection() {
  const [heading, setHeading] = useState(SPONSOR_DEFAULT_HEADING);
  const [cards, setCards] = useState<SponsorCard[]>(toFallbackCards());
  const [mobileIndex, setMobileIndex] = useState(0);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressTapRef = useRef(false);

  useEffect(() => {
    let active = true;

    const loadSponsors = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/home-sponsor-cards`, { cache: "no-store" });
        const payload = (await response.json()) as HomeSponsorPayload;

        if (!active) return;

        if (!response.ok || !payload.ok) {
          return;
        }

        const nextHeading = String(payload.section?.heading || "").trim() || SPONSOR_DEFAULT_HEADING;
        const nextCards = (Array.isArray(payload.section?.cards) ? payload.section?.cards : [])
          .map((card, index) => normalizeSponsorCard(card, index))
          .filter((card) => card.image)
          .sort((left, right) => left.order - right.order)
          .slice(0, SPONSOR_LIMIT);

        if (nextCards.length > 0) {
          setHeading(nextHeading);
          setCards(nextCards);
        }
      } catch {
        // Keep fallback cards on fetch failures.
      }
    };

    void loadSponsors();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (cards.length <= 1) return;

    const timer = window.setInterval(() => {
      setMobileIndex((previous) => (previous + 1) % cards.length);
    }, 3400);

    return () => window.clearInterval(timer);
  }, [cards.length]);

  useEffect(() => {
    if (mobileIndex < cards.length) return;
    setMobileIndex(0);
  }, [cards.length, mobileIndex]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    suppressTapRef.current = false;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.touches[0];

    if (!start || !touch) return;

    const deltaX = Math.abs(touch.clientX - start.x);
    const deltaY = Math.abs(touch.clientY - start.y);

    if (deltaX > 12 && deltaX > deltaY) {
      suppressTapRef.current = true;
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (cards.length <= 1) {
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
      setMobileIndex((previous) => (previous + 1) % cards.length);
      return;
    }

    setMobileIndex((previous) => (previous - 1 + cards.length) % cards.length);
  };

  const handleLinkCapture = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!suppressTapRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressTapRef.current = false;
  };

  const renderSponsorCard = (card: SponsorCard, className: string) => {
    const link = String(card.link || "").trim();
    const content = (
      <div className={className}>
        <img
          src={card.image}
          alt={card.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );

    if (!link) {
      return content;
    }

    const external = /^https?:\/\//i.test(link);
    return (
      <a
        href={link}
        className="block"
        onClickCapture={handleLinkCapture}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
      >
        {content}
      </a>
    );
  };

  return (
    <section className="px-3 py-6 sm:px-4 lg:px-6 xl:px-8">
      <div className="w-full">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">{heading}</h2>
        </div>

        <div className="md:hidden">
          <div
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            aria-label="Brand sponsors carousel"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
              {cards.map((card) => (
                <div key={`sponsor-mobile-${card.cardId}`} className="w-full shrink-0 p-3">
                  {renderSponsorCard(
                    card,
                    "mx-auto h-[112px] w-[112px] overflow-hidden rounded-full border border-gray-200 bg-white/90 shadow-sm"
                  )}
                </div>
              ))}
            </div>
          </div>

          {cards.length > 1 ? (
            <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden="true">
              {cards.map((card, index) => (
                <span
                  key={`sponsor-dot-${card.cardId}`}
                  className={`h-1.5 rounded-full transition-all ${
                    index === mobileIndex ? "w-5 bg-slate-700" : "w-2 bg-slate-300"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="hidden grid-cols-2 gap-3 sm:gap-4 md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
          {cards.map((card) => (
            <div key={`sponsor-desktop-${card.cardId}`}>
              {renderSponsorCard(
                card,
                "mx-auto h-[112px] w-[112px] overflow-hidden rounded-full border border-gray-200 bg-white/80 shadow-sm transition hover:shadow-md"
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
