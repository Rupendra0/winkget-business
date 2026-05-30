"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type HomePlacementsPayload = {
  ok: boolean;
  placements?: {
    leftImage?: string;
    middleImage?: string;
    rightImage?: string;
  };
};

type BannerTile = {
  key: "leftImage" | "middleImage" | "rightImage";
  title: string;
  className: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const BANNER_LAYOUT: BannerTile[] = [
  { key: "leftImage", title: "Main Banner", className: "md:col-span-2 lg:col-span-5" },
  { key: "middleImage", title: "Secondary Banner", className: "lg:col-span-3" },
  { key: "rightImage", title: "Secondary Banner", className: "lg:col-span-2" },
];

const BANNER_HEIGHT_CLASS = "h-[125px] sm:h-[145px] md:h-[200px] lg:h-[250px]";

const normalizeImage = (value?: string) => String(value || "").trim();

export default function BannerSection() {
  const [placements, setPlacements] = useState({
    leftImage: "",
    middleImage: "",
    rightImage: "",
  });
  const [mobileIndex, setMobileIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;

    const loadPlacements = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/home-placements`, { cache: "no-store" });
        const payload = (await response.json()) as HomePlacementsPayload;

        if (!active || !response.ok || !payload.ok || !payload.placements) {
          return;
        }

        setPlacements({
          leftImage: normalizeImage(payload.placements.leftImage),
          middleImage: normalizeImage(payload.placements.middleImage),
          rightImage: normalizeImage(payload.placements.rightImage),
        });
      } catch {
        if (!active) return;
      }
    };

    void loadPlacements();

    return () => {
      active = false;
    };
  }, []);

  const placementByKey = useMemo(
    () => ({
      leftImage: normalizeImage(placements.leftImage),
      middleImage: normalizeImage(placements.middleImage),
      rightImage: normalizeImage(placements.rightImage),
    }),
    [placements]
  );

  const mobileSlides = useMemo(
    () =>
      BANNER_LAYOUT.map((tile) => ({
        ...tile,
        imageUrl: placementByKey[tile.key],
      })),
    [placementByKey]
  );

  useEffect(() => {
    if (mobileSlides.length <= 1) return;

    const timer = window.setInterval(() => {
      setMobileIndex((previous) => (previous + 1) % mobileSlides.length);
    }, 3400);

    return () => window.clearInterval(timer);
  }, [mobileSlides.length]);

  const handleMobileTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleMobileTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (mobileSlides.length <= 1) {
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
      return;
    }

    if (deltaX < 0) {
      setMobileIndex((previous) => (previous + 1) % mobileSlides.length);
      return;
    }

    setMobileIndex((previous) => (previous - 1 + mobileSlides.length) % mobileSlides.length);
  };

  return (
    <section className="px-0 py-0 sm:px-3 lg:px-3 xl:px-3">
      <div className="md:hidden">
        <div
          className={`${BANNER_HEIGHT_CLASS} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm`}
          aria-label="Homepage banners carousel"
          onTouchStart={handleMobileTouchStart}
          onTouchEnd={handleMobileTouchEnd}
          onTouchCancel={() => {
            touchStartRef.current = null;
          }}
          style={{ touchAction: "pan-y" }}
        >
          <div
            className="flex h-full w-full transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${mobileIndex * 100}%)` }}
          >
            {mobileSlides.map((slide) => (
              <div key={slide.key} className="h-full w-full shrink-0">
                {slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="block h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full animate-pulse bg-slate-100" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>

        {mobileSlides.length > 1 ? (
          <div className="mt-1 flex items-center justify-center gap-1.5" aria-hidden="true">
            {mobileSlides.map((slide, index) => (
              <span
                key={`${slide.key}-dot`}
                className={`h-1.5 rounded-full transition-all ${
                  index === mobileIndex ? "w-5 bg-slate-700" : "w-2 bg-slate-300"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2 lg:grid-cols-10">
        {BANNER_LAYOUT.map((tile) => {
          const imageUrl = placementByKey[tile.key];

          return (
            <div
              key={tile.key}
              className={`${BANNER_HEIGHT_CLASS} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${tile.className}`}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={tile.title}
                  className="block h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full animate-pulse bg-slate-100" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
