"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, ShoppingCart, LogIn, ChevronLeft, UserRound, LogOut, Package, Settings, ChevronDown, X, Menu, Heart, ChevronRight } from 'lucide-react';
import { readSelectedCity, writeSelectedCity } from '@/lib/locationStore';
import { buildAuthHref } from '@/lib/authRedirect';
import { CART_UPDATED_EVENT, getCartCount, readWishlist } from '@/lib/shopStorage';
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

const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  lucknow: { lat: 26.8467, lon: 80.9462 },
  noida: { lat: 28.5355, lon: 77.3910 },
  delhi: { lat: 28.7041, lon: 77.1025 },
  "new delhi": { lat: 28.6139, lon: 77.2090 },
  gurugram: { lat: 28.4595, lon: 77.0266 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  mumbai: { lat: 19.0760, lon: 72.8777 },
  pune: { lat: 18.5204, lon: 73.8567 },
};

const getFullLocationString = (city: string) => {
  if (!city) return "Select Location";
  const cityLower = city.toLowerCase();
  if (cityLower === "lucknow" || cityLower === "bisalpur") {
    return `${city}, Uttar Pradesh`;
  }
  if (cityLower === "noida") {
    return `${city}, Uttar Pradesh`;
  }
  if (cityLower === "delhi" || cityLower === "new delhi") {
    return `${city}, Delhi`;
  }
  if (cityLower === "gurugram" || cityLower === "gurgaon") {
    return `${city}, Haryana`;
  }
  if (cityLower === "bengaluru" || cityLower === "bangalore") {
    return `${city}, Karnataka`;
  }
  if (cityLower === "mumbai") {
    return `${city}, Maharashtra`;
  }
  if (cityLower === "pune") {
    return `${city}, Maharashtra`;
  }
  return city;
};

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
  const [wishlistCount, setWishlistCount] = useState(0);
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

  const [isLocating, setIsLocating] = useState(false);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // 1. Try reverse geocoding via OpenStreetMap Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          if (response.ok) {
            const data = await response.json();
            const address = data.address || {};
            const cityName = address.city || address.town || address.village || address.suburb || address.state_district || "";
            if (cityName) {
              const matchedCity = cityOptions.find(
                (c) =>
                  c.name.toLowerCase().includes(cityName.toLowerCase()) ||
                  cityName.toLowerCase().includes(c.name.toLowerCase())
              );
              if (matchedCity) {
                handleCityChange(matchedCity.name);
                setCityMenuOpen(false);
                return;
              }
            }
          }

          // 2. Offline fallback using closest coordinates mapping
          let closestCity = "";
          let minDistance = Infinity;
          cityOptions.forEach((city) => {
            const cityLower = city.name.toLowerCase();
            const coords = CITY_COORDINATES[cityLower];
            if (coords) {
              const distance = Math.pow(latitude - coords.lat, 2) + Math.pow(longitude - coords.lon, 2);
              if (distance < minDistance) {
                minDistance = distance;
                closestCity = city.name;
              }
            }
          });

          if (closestCity) {
            handleCityChange(closestCity);
          } else if (cityOptions.length > 0) {
            handleCityChange(cityOptions[0].name);
          }
          setCityMenuOpen(false);
        } catch (error) {
          console.error("Error matching location:", error);
          // Fallback to coordinates matching directly if API call failed
          let closestCity = "";
          let minDistance = Infinity;
          cityOptions.forEach((city) => {
            const cityLower = city.name.toLowerCase();
            const coords = CITY_COORDINATES[cityLower];
            if (coords) {
              const distance = Math.pow(latitude - coords.lat, 2) + Math.pow(longitude - coords.lon, 2);
              if (distance < minDistance) {
                minDistance = distance;
                closestCity = city.name;
              }
            }
          });

          if (closestCity) {
            handleCityChange(closestCity);
          } else if (cityOptions.length > 0) {
            handleCityChange(cityOptions[0].name);
          }
          setCityMenuOpen(false);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Error getting geolocation coords:", error);
        alert("Unable to retrieve your location");
        setIsLocating(false);
      }
    );
  };

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
    const syncWishlistCount = () => {
      try {
        setWishlistCount(readWishlist().length);
      } catch {
        setWishlistCount(0);
      }
    };

    syncWishlistCount();

    window.addEventListener("shop:wishlist-updated", syncWishlistCount as EventListener);
    window.addEventListener("storage", syncWishlistCount);

    return () => {
      window.removeEventListener("shop:wishlist-updated", syncWishlistCount as EventListener);
      window.removeEventListener("storage", syncWishlistCount);
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

      const currentScroll = window.scrollY;
      setIsMobileSearchOnly((prev) => {
        const thresholdCollapse = 90;
        const thresholdExpand = 20;
        if (!prev && currentScroll > thresholdCollapse) {
          return true;
        }
        if (prev && currentScroll < thresholdExpand) {
          return false;
        }
        return prev;
      });
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
                className={`h-full w-full ${item.type === "product" ? "object-contain p-0.5" : "object-cover"}`}
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 backdrop-blur-sm px-4 py-6">
          <div
            ref={cityModalRef}
            className="w-full max-w-[560px] rounded-[32px] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Title & Close */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1e293b] tracking-tight">Select a location</h2>
              <button
                type="button"
                onClick={() => setCityMenuOpen(false)}
                className="rounded-full bg-[#f1f3ff] px-6 py-2.5 text-[15px] font-semibold text-[#5a6cf6] transition hover:bg-[#e4e7ff] focus:outline-none"
              >
                Close
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-5">
              <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={citySearchQuery}
                onChange={(event) => setCitySearchQuery(event.target.value)}
                placeholder="Search for your location"
                className="w-full rounded-[18px] border border-slate-200 bg-white px-5 py-4 pl-12 text-[15px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#5a6cf6]"
              />
            </div>

            {/* Use my current location button */}
            <div className="mt-4 flex items-center">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7056ff] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(112,86,255,0.25)] hover:bg-[#5f44eb] transition disabled:opacity-70 focus:outline-none"
              >
                {isLocating ? "Locating..." : "Use my current location"}
              </button>
            </div>

            {/* Cities List */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Popular Cities</p>
              <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1 no-scrollbar">
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
                        className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left text-[14px] font-medium transition ${
                          active
                            ? "bg-[#f1f3ff] text-[#5a6cf6] border border-[#dce0ff]"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-transparent"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#5a6cf6]" : "bg-slate-400"}`} />
                        <span>{city.name}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-2 py-4 text-center text-sm text-slate-500">No cities found.</div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  const isNavbarHiddenOnMobile =
    pathname === "/checkout" ||
    pathname === "/checkout/payment" ||
    pathname === "/orders" ||
    pathname?.startsWith("/orders/") ||
    pathname === "/profile" ||
    pathname === "/wishlist";

  return (
    <>
      <nav className={`sticky top-0 z-50 bg-white/70 pt-[env(safe-area-inset-top)] font-medium backdrop-blur-md md:pt-0 ${
        isNavbarHiddenOnMobile ? "hidden md:block" : ""
      }`}>
        <div className="w-full px-[10px]">
          <div
            className={`mx-0.5 flex items-center justify-between transition-[max-height,opacity,padding] duration-200 ease-out md:mx-0 ${
              isMobileSearchOnly
                ? "max-h-0 overflow-hidden py-0 opacity-0 md:max-h-16 md:overflow-visible md:py-2 md:opacity-100"
                : "max-h-24 pt-2.5 pb-2.5 opacity-100 md:max-h-16 md:py-2"
            }`}
          >
          {/* Logo */}
          <div className="min-w-0 flex items-center gap-2 sm:gap-3 shrink-0 pl-2 sm:pl-4">
            <Link href="/" className="brand-wordmark flex min-w-0 flex-col items-start gap-0 leading-none">
              <span className="text-[13px] sm:text-[15px] font-bold tracking-[0.2px] text-slate-900 leading-none">Winkget</span>
              <span className="text-[22px] sm:text-[26px] font-bold tracking-[0.2px] text-orange-600 leading-none mt-0.5">Business</span>
            </Link>
          </div>

          {/* Location Selector (Desktop) */}
          <div className="hidden md:block relative ml-8 shrink-0">
            <button
              type="button"
              onClick={() => setCityMenuOpen((prev) => !prev)}
              disabled={loadingCities || cityOptions.length === 0}
              className="inline-flex items-center gap-2 bg-transparent text-left outline-none focus:outline-none disabled:opacity-60"
            >
              <MapPin size={18} className="text-blue-600 shrink-0" />
              <span className="max-w-[200px] truncate text-[15px] font-normal text-slate-800">
                {loadingCities ? "Loading..." : getFullLocationString(selectedCity)}
              </span>
              <ChevronRight size={15} className="text-slate-400 shrink-0" />
            </button>
          </div>

          {/* Search Bar (stretches to fill empty space) */}
          <div className="hidden md:block flex-1 max-w-[600px] mx-4 lg:mx-6 relative" ref={desktopSuggestRef}>
            <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200/60 bg-white px-[15px] shadow-none">
              {!searchQuery.trim() ? <Search size={18} className="text-orange-500" /> : null}
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white shadow-none"
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

          {/* Right Navigation */}
          <div className="hidden md:flex items-center gap-2 lg:gap-2.5 shrink-0">
            {/* Sell on Winkget Button */}
            <a
              href={VENDOR_REGISTRATION_URL}
              className="inline-flex h-10 items-center rounded-lg px-2.5 text-xs lg:text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 border-0 shadow-none shrink-0"
            >
              Sell on Winkget
            </a>
            
            {/* Wishlist Button */}
            <Link
              href="/wishlist"
              className="relative inline-flex h-10 items-center gap-1 rounded-lg bg-white px-2 text-gray-800 hover:bg-orange-50 border-0 shadow-none shrink-0"
              aria-label="Wishlist"
            >
              <Heart size={17} className="text-gray-700" />
              <span className="text-xs lg:text-sm mr-1">Wishlist</span>
              <span className="absolute right-0.5 top-0.5 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold text-white">
                {wishlistCount}
              </span>
            </Link>

            {/* Cart Button */}
            <Link
              href="/cart"
              className="relative inline-flex h-10 items-center gap-1 rounded-lg bg-white px-2 text-gray-800 hover:bg-orange-50 border-0 shadow-none shrink-0"
              aria-label="Cart"
            >
              <ShoppingCart size={17} className="text-gray-700" />
              <span className="text-xs lg:text-sm mr-1">Cart</span>
              <span className="absolute right-0.5 top-0.5 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold text-white">
                {cartCount}
              </span>
            </Link>

            {/* Login Button / Status */}
            {authLoading ? (
              <div className="h-10 w-24 rounded-lg border border-orange-100 bg-white/70 animate-pulse shrink-0" />
            ) : user ? (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-white font-medium hover:bg-blue-700 border-0 shadow-none"
                >
                  <UserRound size={17} className="text-white" />
                  <span className="text-xs lg:text-sm h-6 max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown size={13} className="text-white/80" />
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
              <Link
                href={buildAuthHref(currentPath)}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-white font-medium hover:bg-blue-700 border-0 shadow-none shrink-0"
              >
                <UserRound size={17} className="text-white" />
                <span className="text-xs lg:text-sm">Login</span>
              </Link>
            )}
          </div>

          <div className="md:hidden shrink-0 flex items-center gap-2">
            <Link
              href="/wishlist"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded border border-orange-100 bg-white text-orange-600 hover:bg-orange-50 btn-hover shadow-sm"
              aria-label="Wishlist"
            >
              <Heart size={19} strokeWidth={2.4} />
              <span className="absolute -right-1 -top-1 inline-flex min-w-[14px] h-[14px] items-center justify-center rounded-full bg-blue-600 px-1 text-[8px] font-bold text-white">
                {wishlistCount}
              </span>
            </Link>
            <Link
              href="/cart"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded border border-orange-100 bg-white text-orange-600 hover:bg-orange-50 btn-hover shadow-sm"
              aria-label="Cart"
            >
              <ShoppingCart size={20} strokeWidth={2.4} />
              <span className="absolute -right-1 -top-1 inline-flex min-w-[14px] h-[14px] items-center justify-center rounded-full bg-blue-600 px-1 text-[8px] font-bold text-white">
                {cartCount}
              </span>
            </Link>
            <Link
              href={user ? "/profile" : buildAuthHref(currentPath)}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-orange-100 bg-white text-orange-600 hover:bg-orange-50 btn-hover shadow-sm"
              aria-label={user ? "Profile" : "Login"}
            >
              <Menu size={20} strokeWidth={2.4} />
            </Link>
          </div>
        </div>

        {/* Mobile Location Selector Row */}
        <div
          className={`mx-0.5 md:hidden transition-all duration-200 overflow-hidden ${
            isMobileSearchOnly
              ? "max-h-0 opacity-0 pb-0 pt-0"
              : "max-h-14 opacity-100 pb-2.5 pt-1"
          }`}
        >
          <button
            type="button"
            onClick={() => setCityMenuOpen((prev) => !prev)}
            disabled={loadingCities || cityOptions.length === 0}
            className="flex w-full items-center justify-between bg-transparent text-left outline-none focus:outline-none disabled:opacity-60"
            aria-label="Current location"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={17} className="text-blue-600 shrink-0" />
              <span className="text-[14px] font-medium leading-tight text-slate-800 truncate">
                {loadingCities ? "Locating..." : getFullLocationString(selectedCity)}
              </span>
            </div>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
          </button>
        </div>

        <div className={`mx-0.5 md:hidden transition-all duration-200 ${isMobileSearchOnly ? "pb-2 pt-2" : "pb-3.5"}`}>
          <div className="relative" ref={mobileSuggestRef}>
            <div className="flex h-12 items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-4 shadow-none">
              {!searchQuery.trim() ? <Search size={20} className="text-orange-500" /> : null}
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
                className="flex-1 bg-transparent outline-none text-[14.5px] text-gray-700 placeholder-gray-500"
              />
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => handleSearchSubmit(searchQuery)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-white shadow-none"
                  aria-label="Search"
                >
                  <Search size={18} strokeWidth={2.4} />
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
