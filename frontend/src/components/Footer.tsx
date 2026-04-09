import React from 'react';
import { footerData } from '@/data/homeData';

export default function Footer() {
  return (
    <footer className="bg-white/70 backdrop-blur-md border-t border-orange-100/80">
      <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-8 text-center lg:text-left">
          <div>
            <div className="text-sm font-semibold text-slate-800 mb-3">Categories</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 text-sm text-slate-600">
              {footerData.categories.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-800 mb-3">Site Navigation</div>
            <div className="space-y-2 text-sm text-slate-600">
              {footerData.navigation.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-800 mb-3">Policies</div>
            <div className="space-y-2 text-sm text-slate-600">
              {footerData.policies.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-orange-100/80 pt-6 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 text-center md:text-left">
          <div>
            <div className="text-sm font-semibold text-slate-800 mb-3">Follow us on</div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              {footerData.social.map((item) => (
                <a
                  key={item.name}
                  href={item.url}
                  className="h-9 w-9 rounded-full border border-gray-200 bg-white/90 shadow-sm flex items-center justify-center text-xs font-semibold text-orange-600"
                >
                  {item.name.slice(0, 2).toUpperCase()}
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-800 mb-3">Quicklinks</div>
            <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm text-slate-600">
              {footerData.quickLinks.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-orange-100/80 pt-5 flex flex-wrap justify-center md:justify-start gap-4 text-sm text-slate-600">
          {footerData.bottomLinks.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>

        <div className="mt-5 text-xs text-slate-500">{footerData.copyright}</div>
      </div>
    </footer>
  );
}
