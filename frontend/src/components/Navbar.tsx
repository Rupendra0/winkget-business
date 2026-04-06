"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, ShoppingCart, LogIn, ChevronLeft, UserRound, LogOut, Package, Settings } from 'lucide-react';
import { readSelectedCity, writeSelectedCity } from '@/lib/locationStore';

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
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  const displayName = useMemo(() => {
    if (!user) return "";
    return user.name || user.email || user.phone || "Profile";
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
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
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/30 border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="min-w-0 flex items-center gap-2 sm:gap-3">
            {showBack ? (
              <button
                type="button"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full backdrop-blur-md bg-white/30 hover:bg-white/40 border border-white/40 text-blue-900 flex items-center justify-center btn-hover"
                onClick={() => router.back()}
                aria-label="Go back"
              >
                <ChevronLeft size={18} />
              </button>
            ) : null}
            <Link href="/" className="min-w-0 flex items-baseline gap-1 sm:gap-2">
              <span className="text-lg sm:text-2xl font-bold text-blue-900">Winkget</span>
              <span className="hidden sm:inline text-lg sm:text-xl font-semibold text-gray-800">Business</span>
            </Link>
          </div>

          {/* Center - Location and Search */}
          <div className="hidden md:flex flex-1 mx-8 items-center gap-4">
            {/* Location Selector */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 transition-all">
              <MapPin size={18} className="text-blue-800" />
              <select
                value={selectedCity}
                onChange={(event) => handleCityChange(event.target.value)}
                disabled={loadingCities || cityOptions.length === 0}
                className="bg-transparent text-sm font-medium text-gray-800 outline-none"
              >
                {loadingCities ? <option value="">Loading city...</option> : null}
                {!loadingCities && cityOptions.length === 0 ? <option value="">No cities</option> : null}
                {cityOptions.map((city) => (
                  <option key={city.id} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Bar */}
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md bg-white/30 border border-white/40 hover:bg-white/40 transition-all focus-within:bg-white/50">
                <Search size={20} className="text-blue-800" />
                <input
                  type="text"
                  placeholder="Search across 10 Lakh+ Business"
                  className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Right Navigation */}
          <div className="hidden md:flex items-center gap-3">
            <button className="px-5 py-2 rounded-lg backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 text-gray-800 font-medium text-sm transition-all btn-hover relative after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:bg-current after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100">
              Explore
            </button>
            <button className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-medium text-sm transition-all shadow-lg btn-hover relative after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:bg-current after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100">
              Winkget
            </button>
            <button className="p-2 rounded-lg backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 text-gray-800 transition-all btn-hover">
              <ShoppingCart size={18} />
            </button>
            {authLoading ? (
              <div className="h-10 w-28 rounded-lg bg-white/30 border border-white/30 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md bg-white/25 hover:bg-white/35 border border-white/30 text-gray-800 font-medium transition-all btn-hover"
                >
                  <UserRound size={18} />
                  <span className="text-sm max-w-[130px] truncate">{displayName}</span>
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-2xl p-4">
                    <div className="pb-3 border-b border-slate-100">
                      <div className="text-sm font-semibold text-slate-900 truncate">{displayName}</div>
                      <div className="text-xs text-slate-500 truncate">{user.email || user.phone || "Signed in user"}</div>
                    </div>

                    <div className="pt-3 space-y-2">
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 btn-hover"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push("/profile");
                        }}
                      >
                        <UserRound size={16} /> My Profile
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 btn-hover"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push("/orders");
                        }}
                      >
                        <Package size={16} /> My Orders
                      </button>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 btn-hover"
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
              <Link href="/auth" className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 text-gray-800 font-medium transition-all btn-hover relative after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:bg-current after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100">
                <LogIn size={18} />
                <span className="text-sm">Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden shrink-0 flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-1.5 py-1.5 rounded-lg backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 text-gray-800">
              <MapPin size={18} />
              <select
                value={selectedCity}
                onChange={(event) => handleCityChange(event.target.value)}
                disabled={loadingCities || cityOptions.length === 0}
                className="max-w-20 sm:max-w-24 bg-transparent text-xs text-gray-800 outline-none"
                aria-label="Current location"
              >
                {loadingCities ? <option value="">City...</option> : null}
                {!loadingCities && cityOptions.length === 0 ? <option value="">No city</option> : null}
                {cityOptions.map((city) => (
                  <option key={city.id} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="p-1.5 rounded-lg backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 text-gray-800 btn-hover"
              aria-label="Cart"
            >
              <ShoppingCart size={18} />
            </button>
            {authLoading ? (
              <div className="h-9 w-9 rounded-lg bg-white/30 border border-white/30 animate-pulse" />
            ) : user ? (
              <Link
                href="/profile"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-900 text-white font-semibold btn-hover px-2.5 sm:px-3"
                aria-label="Profile"
              >
                <UserRound size={16} />
                <span className="hidden sm:inline text-sm">Profile</span>
              </Link>
            ) : (
              <Link
                href="/auth"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-900 text-white font-semibold btn-hover px-2.5 sm:px-3"
                aria-label="Login"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline text-sm">Login</span>
              </Link>
            )}
          </div>
        </div>

        <div className="md:hidden pb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md bg-white/30 border border-white/40 focus-within:bg-white/50">
            <Search size={18} className="text-blue-800" />
            <input
              type="text"
              placeholder="Search businesses and services"
              className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-600"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
