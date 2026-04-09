"use client";

import { useEffect, useMemo, useState } from "react";

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
  { key: "leftImage", title: "Main Banner", className: "md:col-span-2 lg:col-span-4" },
  { key: "middleImage", title: "Secondary Banner", className: "lg:col-span-3" },
  { key: "rightImage", title: "Secondary Banner", className: "lg:col-span-3" },
];

const BANNER_HEIGHT_CLASS = "h-[170px] sm:h-[190px] lg:h-[200px]";

const normalizeImage = (value?: string) => String(value || "").trim();

export default function BannerSection() {
  const [placements, setPlacements] = useState({
    leftImage: "",
    middleImage: "",
    rightImage: "",
  });

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

  return (
    <section className="mt-4 px-3 py-3 sm:px-4 lg:px-6 xl:px-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-10">
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
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">
                  {tile.title}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
