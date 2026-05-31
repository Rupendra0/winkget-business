"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, ShoppingCart, LogIn, ChevronLeft, UserRound, LogOut, Package, Settings, ChevronDown, X, Menu } from 'lucide-react';
import { readSelectedCity, writeSelectedCity } from '@/lib/locationStore';
import { buildAuthHref } from '@/lib/authRedirect';
import { CART_UPDATED_EVENT, getCartCount } from '@/lib/shopStorage';
import { fetchSearchSuggestions, type SearchSuggestion } from '@/lib/searchClient';
import { buildProductSlug } from '@/data/productSlug';

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
const VENDOR_REGISTRATION_URL = `${(process.env.NEXT_PUBLIC_VENDOR_WEBSITE_URL || "http://localhost:3002").replace(/\/$/, "")}/register`;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [searchHasFocus, setSearchHasFocus] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const cityModalRef = useRef<HTMLDivElement | null>(null);
  const desktopSuggestRef = useRef<HTMLDivElement | null>(null);
  const mobileSuggestRef = useRef<HTMLDivElement | null>(null);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const blurTimeoutRef = useRef<number | null>(null);

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
      if (!cityModalRef.current?.contains(event.target as Node)) {
        setCityMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [cityMenuOpen]);

  useEffect(() => {
    if (!cityMenuOpen) return;
    setCitySearchQuery("");
  }, [cityMenuOpen]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!searchHasFocus) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideDesktop = desktopSuggestRef.current?.contains(target);
      const isInsideMobile = mobileSuggestRef.current?.contains(target);
      if (!isInsideDesktop && !isInsideMobile) {
        setSearchHasFocus(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [searchHasFocus]);

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

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || !selectedCity) {
      setSuggestions([]);
      setIsSuggestLoading(false);
      return;
    }

    setIsSuggestLoading(true);
    const handle = window.setTimeout(() => {
      fetchSearchSuggestions({ query, city: selectedCity })
        .then((items) => setSuggestions(items))
        .finally(() => setIsSuggestLoading(false));
    }, 250);

    return () => window.clearTimeout(handle);
  }, [searchQuery, selectedCity]);

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

  const handleSearchSubmit = (value: string) => {
    const query = String(value || "").trim();
    if (!query) return;
    const params = new URLSearchParams();
    params.set("q", query);
    if (selectedCity) {
      params.set("city", selectedCity);
    }
    setSearchHasFocus(false);
    router.push(`/search?${params.toString()}`);
  };

  const handleSearchFocus = () => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setSearchHasFocus(true);
  };

  const handleSearchBlur = () => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setSearchHasFocus(false);
    }, 150);
  };

  const suggestionLabel = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "product":
        return "Product";
      case "vendor":
        return "Vendor";
      case "category":
        return "Category";
      case "subcategory":
        return "Subcategory";
      default:
        return "Result";
    }
  };

  const getSuggestionHref = (item: SearchSuggestion) => {
    if (item.type === "vendor" && item.vendorId) {
      return `/listing/${encodeURIComponent(item.vendorId)}`;
    }

    if (item.type === "category" && item.categorySlug) {
      const params = new URLSearchParams();
      if (selectedCity) {
        params.set("city", selectedCity);
      }
      const query = params.toString();
      return `/category/${encodeURIComponent(item.categorySlug)}${query ? `?${query}` : ""}`;
    }

    if (item.type === "product" && item.productId && item.vendorId) {
      const slug = buildProductSlug({
        id: item.productId,
        name: item.label,
        storeId: item.vendorId,
      });
      return `/product/${encodeURIComponent(slug)}`;
    }

    return null;
  };

  const renderSuggestionRow = (item: SearchSuggestion, keySuffix: string) => {
    const imageSrc = item.productImage || item.vendorImage || "";
    const badge = suggestionLabel(item.type);
    const badgeInitial = badge.charAt(0);

    return (
      <button
        key={`${item.type}-${item.label}-${keySuffix}`}
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          const href = getSuggestionHref(item);
          if (href) {
            setSearchHasFocus(false);
            router.push(href);
            return;
          }

          setSearchQuery(item.label);
          handleSearchSubmit(item.label);
        }}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-100">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={item.label}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-500">
                {badgeInitial}
              </div>
            )}
          </div>
          <span className="truncate">{item.label}</span>
        </div>
        <span className="ml-3 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {badge}
        </span>
      </button>
    );
  };

  const shouldShowSuggestions =
    searchHasFocus && Boolean(searchQuery.trim()) && (isSuggestLoading || suggestions.length > 0);

  const filteredCityOptions = useMemo(() => {
    const query = citySearchQuery.trim().toLowerCase();
    if (!query) return cityOptions;
    return cityOptions.filter((city) => city.name.toLowerCase().includes(query));
  }, [cityOptions, citySearchQuery]);

  const cityModal = cityMenuOpen && isMounted
    ? createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/20 backdrop-blur-[1px] px-4 py-6">
          <div
            ref={cityModalRef}
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Select Your City</h2>
              <button
                type="button"
                onClick={() => setCityMenuOpen(false)}
                className="rounded-full p-1 text-slate-500 transition hover:text-slate-700"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative mt-4">
              <input
                type="text"
                value={citySearchQuery}
                onChange={(event) => setCitySearchQuery(event.target.value)}
                placeholder="Search for city..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
              {filteredCityOptions.length > 0 ? (
                filteredCityOptions.map((city) => {
                  const active = city.name === selectedCity;
                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => {
                        handleCityChange(city.name);
                        setCityMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${
                        active ? "bg-sky-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{city.name}</span>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">No cities found.</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/70 pt-[calc(env(safe-area-inset-top)+0.5rem)] font-medium backdrop-blur-md md:pt-0">
        <div className="w-full px-[10px]">
          <div
            className={`mx-0.5 flex items-center justify-between transition-[max-height,opacity,padding] duration-200 ease-out md:mx-0 ${
              isMobileSearchOnly
                ? "max-h-0 overflow-hidden py-0 opacity-0 md:max-h-28 md:overflow-visible md:py-4 md:opacity-100"
                : "max-h-20 pt-1 pb-1 opacity-100 md:max-h-28 md:py-4"
            }`}
          >
          {/* Logo */}
          <div className="min-w-0 flex items-center gap-2 sm:gap-3">
            {showBack ? (
              <button
                type="button"
                className="hidden h-8 w-8 items-center justify-center rounded-full bg-white text-orange-600 shadow-sm btn-hover md:flex sm:h-9 sm:w-9"
                onClick={() => router.back()}
                aria-label="Go back"
              >
                <ChevronLeft size={18} />
              </button>
            ) : null}
            <Link href="/" className="brand-wordmark flex min-w-0 flex-col items-start gap-0 leading-none md:flex-row md:items-baseline md:gap-2">
              <span className="text-[10px] font-bold tracking-[0.2px] text-slate-900 md:text-2xl md:tracking-[0.4px] md:text-orange-600">Winkget</span>
              <span className="text-lg font-bold tracking-[0.2px] text-orange-600 md:text-xl md:tracking-[0.3px] md:text-gray-800">Business</span>
            </Link>
            <button
              type="button"
              onClick={() => setCityMenuOpen((prev) => !prev)}
              disabled={loadingCities || cityOptions.length === 0}
              className="inline-flex h-8 w-[116px] items-center justify-center gap-1 rounded border border-slate-200 bg-white px-2 text-slate-700 shadow-sm transition hover:shadow-md disabled:opacity-60 md:hidden"
              aria-label="Current location"
            >
              <span className="min-w-0 truncate text-center text-[11px] font-bold text-blue-700">
                {loadingCities ? "Location" : selectedCity || "Location"}
              </span>
              <ChevronDown size={13} strokeWidth={2.6} className="shrink-0 text-blue-700" />
            </button>
          </div>

          {/* Center - Location and Search */}
          <div className="hidden md:flex flex-1 px-5 items-center gap-5">
            {/* Location Selector */}
            <div className="relative -ml-1">
              <button
                type="button"
                onClick={() => setCityMenuOpen((prev) => !prev)}
                disabled={loadingCities || cityOptions.length === 0}
                className="inline-flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-slate-700 shadow-sm transition hover:shadow-md disabled:opacity-60"
              >
                <MapPin size={18} className="text-orange-500" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[11px] font-semibold text-slate-500">Your Location</span>
                  <span className="max-w-[140px] truncate text-sm font-semibold text-blue-600">
                    {loadingCities ? "Loading city..." : selectedCity || "Select city"}
                  </span>
                </div>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${cityMenuOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="flex-1 relative" ref={desktopSuggestRef}>
              <div className="flex h-12 items-center gap-2 rounded-lg border border-slate-100 bg-white px-[15px] shadow-sm">
                {!searchQuery.trim() ? <Search size={20} className="text-orange-500" /> : null}
                <input
                  type="text"
                  placeholder="Search across 10 Lakh+ Business"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearchSubmit(searchQuery);
                    }
                  }}
                  className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500"
                />
                {searchQuery.trim() ? (
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit(searchQuery)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm"
                    aria-label="Search"
                  >
                    <Search size={16} strokeWidth={2.4} />
                  </button>
                ) : null}
              </div>

              {shouldShowSuggestions ? (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                  <div className="max-h-72 overflow-y-auto py-2">
                    {isSuggestLoading && suggestions.length === 0 ? (
                      <div className="px-4 py-2 text-xs text-slate-500">Searching...</div>
                    ) : null}
                    {suggestions.map((item) => renderSuggestionRow(item, "desktop"))}
                    {!isSuggestLoading && suggestions.length === 0 ? (
                      <div className="px-4 py-2 text-xs text-slate-500">No suggestions found.</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Navigation */}
          <div className="hidden md:flex items-center gap-[10px] px-[10px]">
            <a
              href={VENDOR_REGISTRATION_URL}
              className="inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 btn-hover shadow-sm"
            >
              Sell on Winkget
            </a>
            <button className="inline-flex h-11 items-center rounded-lg bg-orange-500 px-3 text-sm font-medium text-white hover:bg-orange-600 btn-hover shadow-sm">
              Winkget
            </button>
            <Link
              href="/cart"
              className="relative inline-flex h-11 items-center rounded-lg bg-white px-3 text-gray-800 hover:bg-orange-50 btn-hover shadow-sm"
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
              <div className="h-11 w-28 rounded-lg border border-orange-100 bg-white/70 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-gray-800 font-medium hover:bg-orange-50 btn-hover shadow-sm"
                >
                  <UserRound size={18} />
                  <span className="text-sm h-7 max-w-[130px] truncate">{displayName}</span>
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
                        className="w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 btn-hover"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push("/profile");
                        }}
                      >
                        <UserRound size={16} /> My Profile
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 btn-hover"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push("/orders");
                        }}
                      >
                        <Package size={16} /> My Orders
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 btn-hover"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push("/account-settings");
                        }}
                      >
                        <Settings size={16} /> Account Settings
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 btn-hover"
                        onClick={() => void handleLogout()}
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link href={buildAuthHref(currentPath)} className="flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-3 text-white font-medium hover:bg-blue-700 btn-hover shadow-sm">
                <LogIn size={18} className="text-white" />
                <span className="text-sm">Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden shrink-0 flex items-center gap-1.5">
            <Link
              href="/cart"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded border border-orange-100 bg-white text-orange-600 hover:bg-orange-50 btn-hover shadow-sm"
              aria-label="Cart"
            >
              <ShoppingCart size={18} strokeWidth={2.4} />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[14px] items-center justify-center rounded-full bg-orange-500 px-1 text-[8px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : null}
            </Link>
            <Link
              href={user ? "/profile" : buildAuthHref(currentPath)}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-orange-100 bg-white text-orange-600 hover:bg-orange-50 btn-hover shadow-sm"
              aria-label={user ? "Profile" : "Login"}
            >
              <Menu size={19} strokeWidth={2.4} />
            </Link>
          </div>
        </div>

        <div className={`mx-0.5 md:hidden transition-all duration-200 ${isMobileSearchOnly ? "pb-1 pt-1" : "pb-1"}`}>
          <div className="relative" ref={mobileSuggestRef}>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-100 bg-white px-4 shadow-sm">
              {!searchQuery.trim() ? <Search size={18} className="text-orange-500" /> : null}
              <input
                type="text"
                placeholder="Search businesses and services"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearchSubmit(searchQuery);
                  }
                }}
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500"
              />
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => handleSearchSubmit(searchQuery)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm"
                  aria-label="Search"
                >
                  <Search size={16} strokeWidth={2.4} />
                </button>
              ) : null}
            </div>

            {shouldShowSuggestions ? (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                <div className="max-h-72 overflow-y-auto py-2">
                  {isSuggestLoading && suggestions.length === 0 ? (
                    <div className="px-4 py-2 text-xs text-slate-500">Searching...</div>
                  ) : null}
                  {suggestions.map((item) => renderSuggestionRow(item, "mobile"))}
                  {!isSuggestLoading && suggestions.length === 0 ? (
                    <div className="px-4 py-2 text-xs text-slate-500">No suggestions found.</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        </div>
      </nav>
      {cityModal}
    </>
  );
}
