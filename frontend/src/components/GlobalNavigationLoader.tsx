"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MIN_VISIBLE_MS = 220;
const FAILSAFE_HIDE_MS = 12000;

const IGNORE_SCHEMES = ["mailto:", "tel:", "javascript:"];

const isPrimaryClick = (event: MouseEvent) => event.button === 0;
const hasModifierKey = (event: MouseEvent) => event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

const isInternalNavigationTarget = (anchor: HTMLAnchorElement) => {
  const hrefAttr = String(anchor.getAttribute("href") || "").trim();
  if (!hrefAttr || hrefAttr === "#") {
    return false;
  }

  const lowerHref = hrefAttr.toLowerCase();
  if (IGNORE_SCHEMES.some((scheme) => lowerHref.startsWith(scheme))) {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  const target = String(anchor.getAttribute("target") || "").trim().toLowerCase();
  if (target && target !== "_self") {
    return false;
  }

  const current = new URL(window.location.href);
  const next = new URL(anchor.href, current.href);

  if (next.origin !== current.origin) {
    return false;
  }

  const currentKey = `${current.pathname}${current.search}`;
  const nextKey = `${next.pathname}${next.search}`;
  if (nextKey === currentKey) {
    return false;
  }

  return true;
};

export default function GlobalNavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [isVisible, setIsVisible] = useState(false);
  const startTimestampRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);
  const failsafeTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (failsafeTimerRef.current) {
      window.clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
  }, []);

  const startLoader = useCallback(() => {
    if (isVisible) {
      return;
    }

    clearTimers();
    startTimestampRef.current = Date.now();
    setIsVisible(true);
    failsafeTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      failsafeTimerRef.current = null;
    }, FAILSAFE_HIDE_MS);
  }, [clearTimers, isVisible]);

  const stopLoader = useCallback(() => {
    if (!isVisible) {
      return;
    }

    if (failsafeTimerRef.current) {
      window.clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }

    const elapsed = Date.now() - startTimestampRef.current;
    const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      hideTimerRef.current = null;
    }, delay);
  }, [isVisible]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    stopLoader();
  }, [routeKey, stopLoader]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !isPrimaryClick(event) || hasModifierKey(event)) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (!isInternalNavigationTarget(anchor)) {
        return;
      }

      startLoader();
    };

    const handlePopState = () => {
      startLoader();
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      clearTimers();
    };
  }, [clearTimers, startLoader]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 origin-left overflow-hidden transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="h-full w-full bg-gradient-to-r from-cyan-400 via-blue-600 to-emerald-400">
        <div className="h-full w-1/3 animate-[global-route-progress_1.15s_ease-in-out_infinite] rounded-r-full bg-white/60" />
      </div>
    </div>
  );
}
