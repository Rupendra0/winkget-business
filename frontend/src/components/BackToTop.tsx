"use client";

import React, { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="fixed bottom-[calc(10px+env(safe-area-inset-bottom))] right-4 z-50 flex items-center gap-1 rounded-full bg-blue-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg hover:bg-blue-800 btn-hover md:bottom-[calc(12px+env(safe-area-inset-bottom))] lg:bottom-[calc(12px+env(safe-area-inset-bottom))] lg:right-2"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
    >
      <ChevronUp size={14} />
      Top
    </button>
  );
}
