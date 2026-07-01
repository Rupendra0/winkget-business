import React from 'react';
import { IAbout, IThemeColors } from '../types';

interface AboutSectionProps {
  about: IAbout;
  experienceYears: number;
  rating: number;
  themeColors: IThemeColors;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  about,
  experienceYears,
  rating,
  themeColors
}) => {
  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* LEFT COLUMN: Mission and Statistics Panel */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          <div className={`rounded-2xl p-6 border ${themeColors.accentBg}`}>
            <h3 className="text-xs font-black uppercase tracking-wider mb-2.5">Our Mission</h3>
            <p className="text-sm md:text-base leading-relaxed font-semibold">
              "{about.mission}"
            </p>
          </div>

          {/* Core Stat Boxes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl text-center">
              <span className={`block text-3xl sm:text-4xl font-black ${themeColors.primary}`}>
                {experienceYears}+
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-1.5">
                Years of Experience
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl text-center">
              <span className={`block text-3xl sm:text-4xl font-black ${themeColors.primary}`}>
                {rating}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-1.5">
                Average Rating
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Detailed Story */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-4 flex items-center gap-2">
            <span className={`h-6 w-1 rounded-full bg-current ${themeColors.primary}`} />
            Professional Profile
          </h2>
          
          <div className="space-y-4 text-sm sm:text-base leading-relaxed text-slate-650 dark:text-slate-350">
            <p className="font-medium text-slate-700 dark:text-slate-200">
              {about.intro}
            </p>
            <p>
              {about.experience}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
export default AboutSection;
