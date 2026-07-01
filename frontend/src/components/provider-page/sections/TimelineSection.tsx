import React from 'react';
import { ITimelineStep, IThemeColors } from '../types';

interface TimelineSectionProps {
  timeline: ITimelineStep[];
  themeColors: IThemeColors;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({ timeline, themeColors }) => {
  return (
    <section className="space-y-8">
      {/* SECTION HEADER */}
      <div className="max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3 flex items-center gap-2">
          <span className={`h-6.5 w-1 rounded-full bg-current ${themeColors.primary}`} />
          How We Work
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
          Our structured process ensures seamless execution, transparency, and top-tier results at every phase.
        </p>
      </div>

      {/* TIMELINE STEPS CONTAINER */}
      <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
        {timeline.map((step, idx) => {
          const isLast = idx === timeline.length - 1;
          return (
            <div key={step.id} className="relative flex flex-col group">
              {/* STEP CARD */}
              <div className="flex-1 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs relative z-10">
                <span className={`block text-xs font-black uppercase tracking-wider mb-3 ${themeColors.primary}`}>
                  Step 0{step.number || idx + 1}
                </span>
                <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 mb-2 tracking-tight group-hover:text-slate-900 dark:group-hover:text-white">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* CONNECTING ARROW (Desktop only) */}
              {!isLast && (
                <div className="hidden md:flex absolute top-1/2 -right-3.5 -translate-y-1/2 z-20 items-center justify-center text-slate-300 dark:text-slate-700 pointer-events-none transition-transform duration-300 group-hover:translate-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
export default TimelineSection;
