"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, MapPin, Menu, ShoppingCart, LogIn, ChevronLeft } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const showBack = pathname !== "/";

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/30 border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="shrink-0 flex items-center gap-3">
            {showBack ? (
              <button
                type="button"
                className="h-9 w-9 rounded-full backdrop-blur-md bg-white/30 hover:bg-white/40 border border-white/40 text-blue-900 flex items-center justify-center btn-hover"
                onClick={() => router.back()}
                aria-label="Go back"
              >
                <ChevronLeft size={18} />
              </button>
            ) : null}
            <Link href="/" className="flex items-baseline gap-1 sm:gap-2">
              <span className="text-xl sm:text-2xl font-bold text-blue-900">Winkget</span>
              <span className="text-lg sm:text-xl font-semibold text-gray-800">Business</span>
            </Link>
          </div>

          {/* Center - Location and Search */}
          <div className="hidden md:flex flex-1 mx-8 items-center gap-4">
            {/* Location Selector */}
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 transition-all btn-hover">
              <MapPin size={18} className="text-blue-800" />
              <span className="text-sm font-medium text-gray-800">Gorakhpur</span>
            </button>

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
            <Link href="/auth" className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 text-gray-800 font-medium transition-all btn-hover relative after:absolute after:left-3 after:right-3 after:-bottom-1 after:h-0.5 after:bg-current after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100">
              <LogIn size={18} />
              <span className="text-sm">Login</span>
            </Link>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <button className="p-2 rounded-lg backdrop-blur-md bg-white/20 hover:bg-white/30 border border-white/30 text-gray-800 btn-hover">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
