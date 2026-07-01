import React from 'react';
import { IService, IThemeColors } from '../types';

interface ServicesSectionProps {
  services: IService[];
  themeColors: IThemeColors;
}

// Icon Helper Mapper
const renderServiceIcon = (iconName: string) => {
  const baseClasses = "h-5 w-5";
  switch (iconName) {
    case 'document':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'shield':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'home':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'activity':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      );
    case 'pulse':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'heart':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    case 'plus-circle':
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

export const ServicesSection: React.FC<ServicesSectionProps> = ({ services, themeColors }) => {
  return (
    <section className="space-y-8">
      {/* SECTION HEADER */}
      <div className="max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3 flex items-center gap-2">
          <span className={`h-6.5 w-1 rounded-full bg-current ${themeColors.primary}`} />
          Services Offered
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
          Explore our range of dynamic solutions and services tailored to meet your strategic goals and requirements.
        </p>
      </div>

      {/* SERVICE CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service) => (
          <div
            key={service.id}
            className="flex flex-col sm:flex-row items-start gap-5 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs group"
          >
            {/* ICON CONTAINER */}
            <div className={`p-3.5 rounded-2xl border flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${themeColors.accentBg}`}>
              {renderServiceIcon(service.icon)}
            </div>

            {/* CONTENT */}
            <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-4">
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-850 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white tracking-tight leading-snug">
                  {service.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
                  {service.description}
                </p>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('cta-booking-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`text-xs font-bold flex items-center gap-1 w-fit group-hover:translate-x-0.5 transition-transform duration-150 ${themeColors.primary}`}
                aria-label={`Inquire about ${service.name}`}
              >
                Inquire Service
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
export default ServicesSection;
