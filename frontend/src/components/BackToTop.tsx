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
      className="fixed bottom-[calc(136px+env(safe-area-inset-bottom))] right-4 z-50 flex items-center gap-2 rounded-full bg-blue-900 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-blue-800 btn-hover md:bottom-6 lg:bottom-[calc(104px+env(safe-area-inset-bottom))]"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
    >
      <ChevronUp size={14} />
      Back to top
    </button>
  );
}
