"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, ShoppingCart, LogIn, ChevronLeft, UserRound, LogOut, Package, Settings, ChevronDown, Check } from 'lucide-react';
import { readSelectedCity, writeSelectedCity } from '@/lib/locationStore';
import { buildAuthHref } from '@/lib/authRedirect';
import { CART_UPDATED_EVENT, getCartCount } from '@/lib/shopStorage';

type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  role: "admin" | "vendor" | "customer";
};

type CityOption = {
  id: string;
  name: string;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const showBack = pathname !== "/";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [loadingCities, setLoadingCities] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [isMobileSearchOnly, setIsMobileSearchOnly] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const desktopCityMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileCityMenuRef = useRef<HTMLDivElement | null>(null);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);

  const currentPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const syncSession = async () => {
      setAuthLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const payload = await response.json();
        setUser(payload.user || null);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    void syncSession();
    const handler = () => {
      void syncSession();
    };
    window.addEventListener("auth:changed", handler);
    return () => window.removeEventListener("auth:changed", handler);
  }, []);

  useEffect(() => {
    let active = true;

    const loadCities = async () => {
      setLoadingCities(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/cities`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!active) return;

        if (!response.ok || !payload.ok || !Array.isArray(payload.cities)) {
          setCityOptions([]);
          return;
        }

        const options = payload.cities
          .map((city: { id?: string; name?: string }) => ({
            id: String(city.id || ""),
            name: String(city.name || "").trim(),
          }))
          .filter((city: CityOption) => Boolean(city.id && city.name));

        setCityOptions(options);
      } catch {
        if (!active) return;
        setCityOptions([]);
      } finally {
        if (!active) return;
        setLoadingCities(false);
      }
    };

    void loadCities();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const syncCartCount = () => {
      setCartCount(getCartCount());
    };

    syncCartCount();

    window.addEventListener(CART_UPDATED_EVENT, syncCartCount as EventListener);
    window.addEventListener("storage", syncCartCount);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount as EventListener);
      window.removeEventListener("storage", syncCartCount);
    };
  }, []);

  useEffect(() => {
    const cityFromQuery = String(searchParams.get("city") || "").trim();
    if (cityFromQuery) {
      if (selectedCity !== cityFromQuery) {
        setSelectedCity(cityFromQuery);
      }
      if (readSelectedCity() !== cityFromQuery) {
        writeSelectedCity(cityFromQuery);
      }
      return;
    }

    const persistedCity = readSelectedCity();
    if (persistedCity && cityOptions.some((city) => city.name === persistedCity)) {
      setSelectedCity(persistedCity);
      return;
    }

    if (!selectedCity && cityOptions.length > 0) {
      setSelectedCity(cityOptions[0].name);
    }
  }, [cityOptions, searchParams, selectedCity]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!cityMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideDesktop = desktopCityMenuRef.current?.contains(target);
      const clickedInsideMobile = mobileCityMenuRef.current?.contains(target);
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setCityMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [cityMenuOpen]);

  useEffect(() => {
    const updateMobileSearchOnlyState = () => {
      const isMobileViewport = window.innerWidth < 768;
      if (!isMobileViewport) {
        setIsMobileSearchOnly(false);
        return;
      }

      setIsMobileSearchOnly(window.scrollY > 56);
    };

    updateMobileSearchOnlyState();
    window.addEventListener("scroll", updateMobileSearchOnlyState, { passive: true });
    window.addEventListener("resize", updateMobileSearchOnlyState);

    return () => {
      window.removeEventListener("scroll", updateMobileSearchOnlyState);
      window.removeEventListener("resize", updateMobileSearchOnlyState);
    };
  }, []);

  const displayName = useMemo(() => {
    if (!user) return "";
    return user.name || user.email || user.phone || "Profile";
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ authContext: "customer" }),
      });
    } catch {
      // Ignore logout API failure on UI; local state will still reset.
    }

    setUser(null);
    setMenuOpen(false);
    window.dispatchEvent(new Event("auth:changed"));
    router.push("/");
    router.refresh();
  };

  const handleCityChange = (nextCity: string) => {
    const cityName = String(nextCity || "").trim();
    setSelectedCity(cityName);
    writeSelectedCity(cityName);

    const params = new URLSearchParams(searchParams.toString());
    if (cityName) {
      params.set("city", cityName);
    } else {
      params.delete("city");
    }

    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    router.replace(target, { scroll: false });
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-orange-100/80 shadow-sm font-medium">
      <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8">
        <div
          className={`flex items-center justify-between transition-[max-height,opacity,padding] duration-200 ease-out ${
            isMobileSearchOnly
              ? "max-h-0 overflow-hidden py-0 opacity-0 md:max-h-24 md:overflow-visible md:py-3 md:opacity-100"
              : "max-h-24 py-3 opacity-100"
          }`}
        >
          {/* Logo */}
          <div className="min-w-0 flex items-center gap-2 sm:gap-3">
            {showBack ? (
              <button
                type="button"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white border border-orange-100 text-orange-600 flex items-center justify-center btn-hover"
                onClick={() => router.back()}
                aria-label="Go back"
              >
                <ChevronLeft size={18} />
              </button>
            ) : null}
            <Link href="/" className="min-w-0 flex items-baseline gap-1 sm:gap-2">
              <span className="brand-wordmark text-lg sm:text-2xl font-bold tracking-[0.4px] text-orange-600">Winkget</span>
              <span className="brand-wordmark hidden sm:inline text-lg sm:text-xl font-bold tracking-[0.3px] text-gray-800">Business</span>
            </Link>
          </div>

          {/* Center - Location and Search */}
          <div className="hidden md:flex flex-1 mx-6 items-center gap-4">
            {/* Location Selector */}
            <div ref={desktopCityMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setCityMenuOpen((prev) => !prev)}
                disabled={loadingCities || cityOptions.length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-orange-100 bg-white/80 px-4 py-2 shadow-sm transition hover:bg-white disabled:opacity-60"
              >
                <MapPin size={18} className="text-orange-500" />
                <span className="max-w-[120px] truncate text-sm font-medium text-slate-700">
                  {loadingCities ? "Loading city..." : selectedCity || "Select city"}
                </span>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${cityMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {cityMenuOpen ? (
                <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-orange-100 bg-white shadow-xl">
                  <div className="max-h-72 overflow-y-auto py-1.5">
                    {cityOptions.map((city) => {
                      const active = city.name === selectedCity;
                      return (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => {
                            handleCityChange(city.name);
                            setCityMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                            active ? "bg-orange-50 text-orange-700" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{city.name}</span>
                          {active ? <Check size={14} className="text-orange-600" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Search Bar */}
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 rounded-full border border-orange-100 bg-white px-5 py-2 shadow-sm">
                <Search size={20} className="text-orange-500" />
                <input
                  type="text"
                  placeholder="Search across 10 Lakh+ Business"
                  className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Right Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <button className="rounded-md border border-orange-100 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-orange-50 btn-hover shadow-sm">
              Explore
            </button>
            <button className="rounded-md border border-orange-500 bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 btn-hover shadow-sm">
              Winkget
            </button>
            <Link
              href="/cart"
              className="relative rounded-md border border-orange-100 bg-white p-2 text-gray-800 hover:bg-orange-50 btn-hover shadow-sm"
              aria-label="Cart"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </Link>
            {authLoading ? (
              <div className="h-10 w-28 rounded-md border border-orange-100 bg-white/70 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-md border border-orange-100 bg-white px-4 py-2 text-gray-800 font-medium hover:bg-orange-50 btn-hover shadow-sm"
                >
                  <UserRound size={18} />
                  <span className="text-sm max-w-[130px] truncate">{displayName}</span>
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl border border-orange-100 bg-white/95 backdrop-blur-md shadow-md p-4">
                    <div className="pb-3 border-b border-slate-100">
                      <div className="text-sm font-semibold text-slate-900 truncate">{displayName}</div>
                      <div className="text-xs text-slate-500 truncate">{user.email || user.phone || "Signed in user"}</div>
                    </div>

                    <div className="pt-3 space-y-2">
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 btn-hover"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push("/profile");
                        }}
                      >
                        <UserRound size={16} /> My Profile
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 btn-hover"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push("/orders");
                        }}
                      >
                        <Package size={16} /> My Orders
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 btn-hover"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push("/account-settings");
                        }}
                      >
                        <Settings size={16} /> Account Settings
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 btn-hover"
                        onClick={() => void handleLogout()}
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link href={buildAuthHref(currentPath)} className="flex items-center gap-2 rounded-md border border-orange-100 bg-white px-4 py-2 text-gray-800 font-medium hover:bg-orange-50 btn-hover shadow-sm">
                <LogIn size={18} />
                <span className="text-sm">Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden shrink-0 flex items-center gap-1.5">
            <div ref={mobileCityMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setCityMenuOpen((prev) => !prev)}
                disabled={loadingCities || cityOptions.length === 0}
                className="inline-flex items-center gap-1 rounded-md border border-orange-100 bg-white px-1.5 py-1.5 text-gray-800 shadow-sm disabled:opacity-60"
                aria-label="Current location"
              >
                <MapPin size={18} className="text-orange-500" />
                <span className="max-w-20 truncate text-xs text-slate-700">
                  {loadingCities ? "City..." : selectedCity || "Select"}
                </span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${cityMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {cityMenuOpen ? (
                <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-44 overflow-hidden rounded-xl border border-orange-100 bg-white shadow-xl">
                  <div className="max-h-60 overflow-y-auto py-1.5">
                    {cityOptions.map((city) => {
                      const active = city.name === selectedCity;
                      return (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => {
                            handleCityChange(city.name);
                            setCityMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${
                            active ? "bg-orange-50 text-orange-700" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{city.name}</span>
                          {active ? <Check size={12} className="text-orange-600" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <Link
              href="/cart"
              className="relative rounded-md border border-orange-100 bg-white p-1.5 text-gray-800 hover:bg-orange-50 btn-hover shadow-sm"
              aria-label="Cart"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : null}
            </Link>
            {authLoading ? (
              <div className="h-9 w-9 rounded-md border border-orange-100 bg-white/70 animate-pulse" />
            ) : user ? (
              <Link
                href="/profile"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-orange-500 bg-orange-500 px-2.5 sm:px-3 text-white font-semibold hover:bg-orange-600 btn-hover"
                aria-label="Profile"
              >
                <UserRound size={16} />
                <span className="hidden sm:inline text-sm">Profile</span>
              </Link>
            ) : (
              <Link
                href={buildAuthHref(currentPath)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-orange-500 bg-orange-500 px-2.5 sm:px-3 text-white font-semibold hover:bg-orange-600 btn-hover"
                aria-label="Login"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline text-sm">Login</span>
              </Link>
            )}
          </div>
        </div>

        <div className={`md:hidden transition-all duration-200 ${isMobileSearchOnly ? "pb-2 pt-2" : "pb-3"}`}>
          <div className="flex items-center gap-2 rounded-full border border-orange-100 bg-white px-5 py-2 shadow-sm">
            <Search size={18} className="text-orange-500" />
            <input
              type="text"
              placeholder="Search businesses and services"
              className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
