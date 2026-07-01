import React from 'react';
import { IWhyChooseItem, IThemeColors } from '../types';

interface WhyChooseUsSectionProps {
  whyChooseIntro: string;
  items: IWhyChooseItem[];
  themeColors: IThemeColors;
}

// Icon Helper Mapper
const renderWcIcon = (iconName: string) => {
  const baseClasses = "h-6 w-6";
  switch (iconName) {
    case 'award':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      );
    case 'shield':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'scale':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0l-3-9m3 1c-.67 0-1.33.17-1.93.5l1.93-.5zm0 0c.67 0 1.33.17 1.93.5L12 7zm0 0l3-1m0 0l-3 9a5.002 5.002 0 006.001 0l-3-9m3 1c-.67 0-1.33.17-1.93.5L15 7zm-3-1v12m-9 0h18" />
        </svg>
      );
    case 'clock':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'user':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'check-circle':
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={baseClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

export const WhyChooseUsSection: React.FC<WhyChooseUsSectionProps> = ({
  whyChooseIntro,
  items,
  themeColors
}) => {
  return (
    <section className="space-y-8">
      {/* SECTION HEADER */}
      <div className="max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3 flex items-center gap-2">
          <span className={`h-6.5 w-1 rounded-full bg-current ${themeColors.primary}`} />
          Why Choose Us
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
          {whyChooseIntro}
        </p>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs group"
          >
            {/* ICON CONTAINER */}
            <div className={`p-3 rounded-2xl w-fit mb-5 transition-transform duration-300 group-hover:scale-105 border ${themeColors.accentBg}`}>
              {renderWcIcon(item.icon)}
            </div>
            <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 mb-2 tracking-tight group-hover:text-slate-900 dark:group-hover:text-white">
              {item.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
export default WhyChooseUsSection;
