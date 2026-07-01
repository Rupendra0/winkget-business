import React from 'react';
import { ITestimonial, IThemeColors } from '../types';
import RatingStars from '../components/RatingStars';

interface TestimonialsSectionProps {
  testimonials: ITestimonial[];
  themeColors: IThemeColors;
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ testimonials, themeColors }) => {
  return (
    <section className="space-y-8">
      {/* SECTION HEADER */}
      <div className="max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3 flex items-center gap-2">
          <span className={`h-6.5 w-1 rounded-full bg-current ${themeColors.primary}`} />
          Client Testimonials
        </h2>
        <p className="text-sm sm:text-base text-slate-650 dark:text-slate-350 leading-relaxed font-medium">
          Here is what our clients and partners say about our expertise, prompt responses, and overall service delivery.
        </p>
      </div>

      {/* TESTIMONIAL CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testimonials.map((test) => {
          // Initials helper
          const initials = test.customerName
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

          return (
            <div
              key={test.id}
              className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs relative flex flex-col justify-between"
            >
              {/* QUOTE BLOCK */}
              <div className="space-y-4">
                {/* SVG Quote Icon */}
                <span className={`block opacity-20 ${themeColors.primary}`}>
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.748-9.762 9-10.961l.653 1.414c-4.016 1.157-6.262 4.119-6.262 7.747h6.262v9.2c0 .4-.22.8-.59 1.18-.38.38-.81.62-1.28.62h-7.783zm-12 0v-7.391c0-5.704 3.748-9.762 9-10.961l.653 1.414c-4.016 1.157-6.262 4.119-6.262 7.747h6.262v9.2c0 .4-.22.8-.59 1.18-.38.38-.81.62-1.28.62H2.017z" />
                  </svg>
                </span>
                
                <p className="text-sm sm:text-base leading-relaxed text-slate-650 dark:text-slate-300 font-medium italic">
                  "{test.reviewText}"
                </p>
              </div>

              {/* USER PROFILE INFO */}
              <div className="flex items-center gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-850">
                {/* AVATAR OR INITIALS */}
                {test.customerImage ? (
                  <img
                    src={test.customerImage}
                    alt={test.customerName}
                    className="h-11 w-11 rounded-full object-cover border border-slate-150 dark:border-slate-800"
                    loading="lazy"
                  />
                ) : (
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center text-xs font-black border ${themeColors.accentBg}`}>
                    {initials}
                  </div>
                )}

                {/* NAME & RATING */}
                <div>
                  <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 leading-tight">
                    {test.customerName}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <RatingStars rating={test.rating} className="h-3 w-3" />
                    {test.date && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {test.date}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
export default TestimonialsSection;
