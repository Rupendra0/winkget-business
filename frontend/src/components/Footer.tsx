import React from 'react';
import { footerData } from '@/data/homeData';

export default function Footer() {
  return (
    <footer className="bg-white/60 border-t border-white/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-8 text-center lg:text-left">
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-3">Categories</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 text-sm text-gray-600">
              {footerData.categories.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 mb-3">Site Navigation</div>
            <div className="space-y-2 text-sm text-gray-600">
              {footerData.navigation.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 mb-3">Policies</div>
            <div className="space-y-2 text-sm text-gray-600">
              {footerData.policies.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/70 pt-8 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 text-center md:text-left">
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-3">Follow us on</div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              {footerData.social.map((item) => (
                <a
                  key={item.name}
                  href={item.url}
                  className="h-9 w-9 rounded-full bg-white shadow-sm border border-white/70 flex items-center justify-center text-xs font-semibold text-blue-900"
                >
                  {item.name.slice(0, 2).toUpperCase()}
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 mb-3">Quicklinks</div>
            <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-gray-600">
              {footerData.quickLinks.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/70 pt-6 flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-600">
          {footerData.bottomLinks.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>

        <div className="mt-6 text-xs text-gray-500">{footerData.copyright}</div>
      </div>
    </footer>
  );
}
