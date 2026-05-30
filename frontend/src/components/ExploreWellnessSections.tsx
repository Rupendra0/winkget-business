"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { readSelectedCity, subscribeLocationCity } from "@/lib/locationStore";

type SectionCardPayload = {
  cardId?: string;
  categoryName?: string;
  categorySlug?: string;
  title?: string;
  image?: string;
  order?: number;
};

type HomeSectionPayload = {
  ok: boolean;
  section?: {
    heading?: string;
    cards?: SectionCardPayload[];
  };
};

type SectionCard = {
  cardId: string;
  categoryName: string;
  categorySlug: string;
  title: string;
  image: string;
  order: number;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const EXPLORE_DEFAULT_HEADING = "Explore";
const WELLNESS_DEFAULT_HEADING = "Health & Wellness";
const CARD_LIMIT = 5;

const normalizeMedia = (value?: string) => String(value || "").trim();

const normalizeCard = (card: SectionCardPayload, fallbackIndex: number): SectionCard => ({
  cardId: String(card.cardId || `card-${fallbackIndex + 1}`).trim(),
  categoryName: String(card.categoryName || "").trim(),
  categorySlug: String(card.categorySlug || "").trim(),
  title: String(card.title || "").trim(),
  image: normalizeMedia(card.image),
  order: Number.isFinite(Number(card.order)) ? Number(card.order) : fallbackIndex + 1,
});

type SwipeRefs = {
  touchStartRef: React.MutableRefObject<{ x: number; y: number } | null>;
  suppressTapRef: React.MutableRefObject<boolean>;
};

function useSwipeRefs(): SwipeRefs {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressTapRef = useRef(false);
  return { touchStartRef, suppressTapRef };
}

export default function ExploreWellnessSections() {
  const [selectedCity, setSelectedCity] = useState("");

  const [exploreHeading, setExploreHeading] = useState(EXPLORE_DEFAULT_HEADING);
  const [wellnessHeading, setWellnessHeading] = useState(WELLNESS_DEFAULT_HEADING);
  const [exploreCards, setExploreCards] = useState<SectionCard[]>([]);
  const [wellnessCards, setWellnessCards] = useState<SectionCard[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [exploreMobileIndex, setExploreMobileIndex] = useState(0);
  const [wellnessMobileIndex, setWellnessMobileIndex] = useState(0);

  const exploreSwipeRefs = useSwipeRefs();
  const wellnessSwipeRefs = useSwipeRefs();

  useEffect(() => {
    setSelectedCity(readSelectedCity());
    return subscribeLocationCity((city) => setSelectedCity(city));
  }, []);

  useEffect(() => {
    let active = true;

    const loadSections = async () => {
      try {
        const [exploreResponse, wellnessResponse] = await Promise.all([
          fetch(`${BACKEND_URL}/api/home-explore-cards`, { cache: "no-store" }),
          fetch(`${BACKEND_URL}/api/home-wellness-cards`, { cache: "no-store" }),
        ]);

        const explorePayload = (await exploreResponse.json()) as HomeSectionPayload;
        const wellnessPayload = (await wellnessResponse.json()) as HomeSectionPayload;

        if (!active) return;

        if (!exploreResponse.ok || !wellnessResponse.ok || !explorePayload.ok || !wellnessPayload.ok) {
          setLoadError("Explore and wellness cards are not available right now.");
          setExploreCards([]);
          setWellnessCards([]);
          return;
        }

        const normalizedExploreHeading = String(explorePayload.section?.heading || "").trim() || EXPLORE_DEFAULT_HEADING;
        const normalizedWellnessHeading = String(wellnessPayload.section?.heading || "").trim() || WELLNESS_DEFAULT_HEADING;

        const normalizedExploreCards = (Array.isArray(explorePayload.section?.cards) ? explorePayload.section?.cards : [])
          .map((card, index) => normalizeCard(card, index))
          .filter((card) => card.image && card.categorySlug)
          .sort((left, right) => left.order - right.order)
          .slice(0, CARD_LIMIT);

        const normalizedWellnessCards = (Array.isArray(wellnessPayload.section?.cards) ? wellnessPayload.section?.cards : [])
          .map((card, index) => normalizeCard(card, index))
          .filter((card) => card.image && card.categorySlug)
          .sort((left, right) => left.order - right.order)
          .slice(0, CARD_LIMIT);

        setExploreHeading(normalizedExploreHeading);
        setWellnessHeading(normalizedWellnessHeading);
        setExploreCards(normalizedExploreCards);
        setWellnessCards(normalizedWellnessCards);
        setLoadError(null);
      } catch {
        if (!active) return;
        setLoadError("Explore and wellness cards are not available right now.");
        setExploreCards([]);
        setWellnessCards([]);
      }
    };

    void loadSections();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (exploreCards.length <= 1) return;

    const timer = window.setInterval(() => {
      setExploreMobileIndex((previous) => (previous + 1) % exploreCards.length);
    }, 3400);

    return () => window.clearInterval(timer);
  }, [exploreCards.length]);

  useEffect(() => {
    if (wellnessCards.length <= 1) return;

    const timer = window.setInterval(() => {
      setWellnessMobileIndex((previous) => (previous + 1) % wellnessCards.length);
    }, 3400);

    return () => window.clearInterval(timer);
  }, [wellnessCards.length]);

  useEffect(() => {
    if (exploreMobileIndex < exploreCards.length) return;
    setExploreMobileIndex(0);
  }, [exploreCards.length, exploreMobileIndex]);

  useEffect(() => {
    if (wellnessMobileIndex < wellnessCards.length) return;
    setWellnessMobileIndex(0);
  }, [wellnessCards.length, wellnessMobileIndex]);

  const buildCategoryHref = (categorySlug: string) => {
    const city = String(selectedCity || "").trim();
    if (!city) {
      return `/category/${categorySlug}`;
    }
    return `/category/${categorySlug}?city=${encodeURIComponent(city)}`;
  };

  const handleTouchStart = (
    event: React.TouchEvent<HTMLDivElement>,
    refs: SwipeRefs
  ) => {
    const touch = event.touches[0];
    if (!touch) return;

    refs.suppressTapRef.current = false;
    refs.touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleTouchMove = (
    event: React.TouchEvent<HTMLDivElement>,
    refs: SwipeRefs
  ) => {
    const start = refs.touchStartRef.current;
    const touch = event.touches[0];

    if (!start || !touch) return;

    const deltaX = Math.abs(touch.clientX - start.x);
    const deltaY = Math.abs(touch.clientY - start.y);

    if (deltaX > 12 && deltaX > deltaY) {
      refs.suppressTapRef.current = true;
    }
  };

  const handleTouchEnd = (
    event: React.TouchEvent<HTMLDivElement>,
    refs: SwipeRefs,
    cardLength: number,
    setIndex: React.Dispatch<React.SetStateAction<number>>
  ) => {
    if (cardLength <= 1) {
      refs.touchStartRef.current = null;
      return;
    }

    const start = refs.touchStartRef.current;
    refs.touchStartRef.current = null;
    const touch = event.changedTouches[0];

    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const swipeDistance = Math.abs(deltaX);

    if (swipeDistance < 44 || swipeDistance <= Math.abs(deltaY)) {
      refs.suppressTapRef.current = false;
      return;
    }

    refs.suppressTapRef.current = true;

    if (deltaX < 0) {
      setIndex((previous) => (previous + 1) % cardLength);
      return;
    }

    setIndex((previous) => (previous - 1 + cardLength) % cardLength);
  };

  const createLinkClickCapture = (refs: SwipeRefs) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!refs.suppressTapRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    refs.suppressTapRef.current = false;
  };

  const showSection = exploreCards.length > 0 || wellnessCards.length > 0 || Boolean(loadError);

  if (!showSection) {
    return null;
  }

  return (
    <section className="space-y-2 px-3 py-0">
      {exploreCards.length > 0 ? (
        <div className="w-full rounded-2xl bg-white px-0 py-3 sm:py-4 lg:py-4">
          <div className="mb-3">
            <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">{exploreHeading}</h2>
          </div>

          {/* Mobile: Scrollable carousel showing 2 cards */}
          <div className="flex md:hidden gap-4 overflow-x-auto pb-2 no-scrollbar">
            {exploreCards.map((card) => (
              <Link
                key={`explore-mobile-${card.cardId}`}
                href={buildCategoryHref(card.categorySlug)}
                className="relative shrink-0 basis-[calc((100%-1rem)/2)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                onClickCapture={createLinkClickCapture(exploreSwipeRefs)}
              >
                <img
                  src={card.image}
                  alt={card.categoryName || "Explore"}
                  className="h-[150px] w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{card.categoryName || "Category"}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: Grid layout */}
          <div className="hidden grid-cols-1 gap-5 md:grid md:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-5">
            {exploreCards.map((card) => (
              <Link
                key={`explore-desktop-${card.cardId}`}
                href={buildCategoryHref(card.categorySlug)}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <img
                  src={card.image}
                  alt={card.categoryName || "Explore"}
                  className="h-[150px] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{card.categoryName || "Category"}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {wellnessCards.length > 0 ? (
        <div className="w-full rounded-2xl bg-white px-0 py-3 sm:py-4 lg:py-4">
          <div className="mb-3">
            <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">{wellnessHeading}</h2>
          </div>

          {/* Mobile: Scrollable carousel showing 3 cards */}
          <div className="flex md:hidden gap-4 overflow-x-auto pb-2 no-scrollbar">
            {wellnessCards.map((card) => (
              <Link
                key={`wellness-mobile-${card.cardId}`}
                href={buildCategoryHref(card.categorySlug)}
                className="relative shrink-0 basis-[calc((100%-2rem)/3)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                onClickCapture={createLinkClickCapture(wellnessSwipeRefs)}
              >
                <img
                  src={card.image}
                  alt={card.categoryName || "Health and wellness"}
                  className="h-[46vw] min-h-[170px] w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{card.title || card.categoryName || "Category"}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: Strip layout */}
          <div className="hidden w-full justify-start gap-[2%] overflow-x-auto overflow-y-hidden whitespace-nowrap p-0 md:flex no-scrollbar">
            {wellnessCards.map((card) => (
              <Link
                key={`wellness-desktop-${card.cardId}`}
                href={buildCategoryHref(card.categorySlug)}
                className="group relative h-[23vw] w-[18.4%] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_300px_rgba(205,205,205,0.24)] transition hover:shadow-md"
              >
                <img
                  src={card.image}
                  alt={card.categoryName || "Health and wellness"}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{card.title || card.categoryName || "Category"}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {loadError && exploreCards.length === 0 && wellnessCards.length === 0 ? (
        <div className="rounded-2xl bg-white/80 p-4 text-sm text-slate-500">{loadError}</div>
      ) : null}
    </section>
  );
}
