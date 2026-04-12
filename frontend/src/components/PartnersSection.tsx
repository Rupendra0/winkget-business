"use client";

import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";

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

export default function PartnersSection() {
  const [heading, setHeading] = useState("");
  const [cards, setCards] = useState<SponsorCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileIndex, setMobileIndex] = useState(0);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressTapRef = useRef(false);

  useEffect(() => {
    let active = true;

    const loadSponsors = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/home-sponsor-cards`, { cache: "no-store" });
        const payload = (await response.json()) as HomeSponsorPayload;

        if (!active) return;

        if (!response.ok || !payload.ok) {
          setHeading("");
          setCards([]);
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
        } else {
          setHeading("");
          setCards([]);
        }
      } catch {
        if (!active) return;
        setHeading("");
        setCards([]);
      } finally {
        if (!active) return;
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <section className="px-3 py-6 sm:px-4 lg:px-6 xl:px-8">
        <div className="w-full animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="mb-4 h-7 w-44 rounded bg-slate-200/70" />
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: SPONSOR_LIMIT }).map((_, index) => (
              <div key={`sponsor-skeleton-${index}`} className="h-[112px] w-[112px] shrink-0 rounded-full bg-slate-200/70" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (cards.length === 0) {
    return null;
  }

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

        {/* Mobile: Scrollable carousel showing 3 cards */}
        <div className="flex md:hidden gap-4 overflow-x-auto pb-2 no-scrollbar">
          {cards.map((card) => (
            <div key={`sponsor-mobile-${card.cardId}`} className="shrink-0 basis-[calc((100%-2rem)/3)]">
              {renderSponsorCard(
                card,
                "mx-auto h-[112px] w-[112px] overflow-hidden rounded-full border border-gray-200 bg-white/90 shadow-sm"
              )}
            </div>
          ))}
        </div>

        {/* Desktop: Grid layout */}
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
