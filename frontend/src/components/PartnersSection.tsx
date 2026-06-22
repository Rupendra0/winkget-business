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
const SPONSOR_DEFAULT_HEADING = "Trusted by Leading Partners";
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
      <section className="px-3 pt-1 pb-24 md:pt-2 md:pb-32 lg:pt-2 lg:pb-40">
        <div className="w-full animate-pulse rounded-xl bg-white px-0 py-0">
          <div className="mb-5 h-8 w-56 rounded bg-slate-200/70" />
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: SPONSOR_LIMIT }).map((_, index) => (
              <div key={`sponsor-skeleton-${index}`} className="h-[110px] w-[110px] md:h-[130px] md:w-[130px] shrink-0 rounded-lg bg-slate-200/70" />
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

  const renderSponsorCard = (card: SponsorCard, className: string, nameElement?: React.ReactNode) => {
    const link = String(card.link || "").trim();
    const content = (
      <div className="flex flex-col items-center justify-center w-full">
        <div className={className}>
          <img
            src={card.image}
            alt={card.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
        {nameElement}
      </div>
    );

    if (!link) {
      return content;
    }

    const external = /^https?:\/\//i.test(link);
    return (
      <a
        href={link}
        className="block w-full"
        onClickCapture={handleLinkCapture}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
      >
        {content}
      </a>
    );
  };

  return (
    <section className="px-3 pt-1 pb-24 md:pt-2 md:pb-32 lg:pt-2 lg:pb-40">
      <div className="w-full">
        <div className="mb-6 pl-1 md:pl-2.5">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{heading}</h2>
        </div>

        {/* Infinite marquee ticker container */}
        <div className="relative flex w-full overflow-hidden bg-white animate-marquee-paused py-2">
          {/* Track Copy 1 */}
          <div className="flex gap-12 md:gap-16 pr-12 md:pr-16 shrink-0 animate-marquee">
            {cards.map((card, idx) => (
              <div
                key={`sponsor-c1-${card.cardId}-${idx}`}
                className="w-[120px] md:w-[140px] shrink-0 flex items-center justify-center py-6 md:py-8 transition-colors hover:bg-slate-50/50 rounded-lg"
              >
                {renderSponsorCard(
                  card,
                  "w-full h-14 md:h-16 lg:h-18 flex items-center justify-center",
                  <span className="mt-2 text-xs md:text-sm font-semibold text-slate-500 line-clamp-1 truncate max-w-full text-center">
                    {card.name}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Track Copy 2 */}
          <div className="flex gap-12 md:gap-16 pr-12 md:pr-16 shrink-0 animate-marquee" aria-hidden="true">
            {cards.map((card, idx) => (
              <div
                key={`sponsor-c2-${card.cardId}-${idx}`}
                className="w-[120px] md:w-[140px] shrink-0 flex items-center justify-center py-6 md:py-8 transition-colors hover:bg-slate-50/50 rounded-lg"
              >
                {renderSponsorCard(
                  card,
                  "w-full h-14 md:h-16 lg:h-18 flex items-center justify-center",
                  <span className="mt-2 text-xs md:text-sm font-semibold text-slate-500 line-clamp-1 truncate max-w-full text-center">
                    {card.name}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Track Copy 3 */}
          <div className="flex gap-12 md:gap-16 pr-12 md:pr-16 shrink-0 animate-marquee" aria-hidden="true">
            {cards.map((card, idx) => (
              <div
                key={`sponsor-c3-${card.cardId}-${idx}`}
                className="w-[120px] md:w-[140px] shrink-0 flex items-center justify-center py-6 md:py-8 transition-colors hover:bg-slate-50/50 rounded-lg"
              >
                {renderSponsorCard(
                  card,
                  "w-full h-14 md:h-16 lg:h-18 flex items-center justify-center",
                  <span className="mt-2 text-xs md:text-sm font-semibold text-slate-500 line-clamp-1 truncate max-w-full text-center">
                    {card.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
