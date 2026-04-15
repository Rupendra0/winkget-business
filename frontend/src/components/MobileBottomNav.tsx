"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Briefcase, Home, LayoutGrid, ShoppingBag, UserRound } from "lucide-react";
import { buildAuthHref } from "@/lib/authRedirect";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type BottomTab = {
  key: string;
  label: string;
  href: string;
  isActive: boolean;
  Icon: typeof Home;
};

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash || "");

    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const syncAuth = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!active) return;
        setIsAuthenticated(response.ok);
      } catch {
        if (!active) return;
        setIsAuthenticated(false);
      }
    };

    void syncAuth();

    const authChangedHandler = () => {
      void syncAuth();
    };

    window.addEventListener("auth:changed", authChangedHandler);
    return () => {
      active = false;
      window.removeEventListener("auth:changed", authChangedHandler);
    };
  }, []);

  const accountHref = isAuthenticated ? "/profile" : buildAuthHref(pathname || "/");

  const tabs = useMemo<BottomTab[]>(() => {
    const onHome = pathname === "/";
    const onCategory = pathname.startsWith("/category");
    const onVendor = pathname.startsWith("/vendor");
    const onShop = pathname.startsWith("/store") || pathname.startsWith("/product") || pathname.startsWith("/listing");
    const onAccount =
      pathname.startsWith("/profile") ||
      pathname.startsWith("/orders") ||
      pathname.startsWith("/account-settings") ||
      pathname.startsWith("/auth");

    return [
      {
        key: "home",
        label: "Home",
        href: "/",
        isActive: onHome && hash !== "#mobile-home-categories" && hash !== "#mobile-home-shop",
        Icon: Home,
      },
      {
        key: "categories",
        label: "Categories",
        href: "/#mobile-home-categories",
        isActive: onCategory || (onHome && hash === "#mobile-home-categories"),
        Icon: LayoutGrid,
      },
      {
        key: "b2b",
        label: "B2B",
        href: "/vendor-register",
        isActive: onVendor,
        Icon: Briefcase,
      },
      {
        key: "shop",
        label: "Shop",
        href: "/#mobile-home-shop",
        isActive: onShop || (onHome && hash === "#mobile-home-shop"),
        Icon: ShoppingBag,
      },
      {
        key: "account",
        label: "Account",
        href: accountHref,
        isActive: onAccount,
        Icon: UserRound,
      },
    ];
  }, [accountHref, hash, pathname]);

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-slate-50/95 backdrop-blur-sm md:hidden"
    >
      <div className="mx-auto grid h-[74px] max-w-screen-sm grid-cols-5 items-center px-1 pb-[max(env(safe-area-inset-bottom),0px)]">
        {tabs.map((tab) => {
          const activeClasses = tab.isActive ? "text-slate-900" : "text-slate-500";

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex h-full flex-col items-center justify-center gap-1 ${activeClasses}`}
              aria-current={tab.isActive ? "page" : undefined}
            >
              <tab.Icon size={30} strokeWidth={tab.isActive ? 2.2 : 1.9} />
              <span className="text-[12px] font-semibold leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
