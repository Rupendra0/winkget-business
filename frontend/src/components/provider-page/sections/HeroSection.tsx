import React from 'react';
import { IHero, IThemeColors } from '../types';
import RatingStars from '../components/RatingStars';

interface HeroSectionProps {
  hero: IHero;
  themeColors: IThemeColors;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ hero, themeColors }) => {
  return (
    <section className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
      {/* COVER IMAGE */}
      <div className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={hero.coverImage}
          alt={`${hero.name} Cover`}
          className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-103"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
      </div>

      {/* DETAILED INFO CONTAINER */}
      <div className="relative px-6 pb-6 pt-20 sm:pt-6 sm:px-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        {/* OVERLAPPING PROFILE IMAGE */}
        <div className="absolute -top-16 sm:-top-20 left-6 sm:left-8 h-28 w-28 sm:h-36 sm:w-36 rounded-2xl border-4 border-white dark:border-slate-900 overflow-hidden shadow-md bg-slate-50 flex-shrink-0">
          <img
            src={hero.profileImage}
            alt={hero.name}
            className="h-full w-full object-cover object-center"
          />
        </div>

        {/* DETAILS BLOCK */}
        <div className="flex-1 min-w-0 sm:pl-40 md:pl-44">
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {hero.name}
            </h1>
            {hero.isVerified && (
              <span
                className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/50 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs select-none"
                title="Verified Professional"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2.167 2.2a.75.75 0 00-.596.89l.375 1.5A3 3 0 004.897 7h10.206a3 3 0 002.951-2.41l.375-1.5a.75.75 0 00-.596-.89H2.167zM18 9.5a.75.75 0 00-.75-.75h-14.5a.75.75 0 000 1.5h14.5A.75.75 0 0018 9.5zM17.25 13a.75.75 0 01.75.75v1.5a3 3 0 01-3 3H5a3 3 0 01-3-3v-1.5a.75.75 0 011.5 0v1.5a1.5 1.5 0 001.5 1.5h10a1.5 1.5 0 001.5-1.5v-1.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                  <path d="M6.22 11.22a.75.75 0 111.06 1.06l-1.5 1.5a.75.75 0 01-1.06 0l-.75-.75a.75.75 0 111.06-1.06l.22.22.97-.97z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4.13-5.69z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
          </div>

          <p className="text-sm sm:text-base font-bold text-slate-550 dark:text-slate-400 mb-3 leading-tight">
            {hero.title}
          </p>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 mb-4 max-w-2xl leading-relaxed">
            {hero.shortIntro}
          </p>

          {/* META METRICS CAPULES */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <RatingStars rating={hero.rating} />
              <span className="font-bold text-slate-800 dark:text-slate-100">{hero.rating}</span>
              <span>({hero.reviewCount} Reviews)</span>
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700 hidden sm:inline" />
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-800 dark:text-slate-100">{hero.experienceYears} Years</span>
              <span>Exp</span>
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700 hidden sm:inline" />
            <div className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{hero.location}</span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 flex-shrink-0">
          <a
            href={`tel:${hero.phone}`}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition shadow-2xs text-center"
            aria-label="Call Provider"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call Now
          </a>
          <a
            href={`https://wa.me/${hero.whatsapp.replace('+', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold text-sm rounded-xl transition shadow-2xs text-center"
            aria-label="Message on WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-emerald-500 stroke-none" viewBox="0 0 24 24">
              <path d="M12.012 2c-5.506 0-9.988 4.479-9.988 9.985 0 2.106.654 4.062 1.774 5.679L2 22l4.479-1.745c1.554.912 3.35 1.43 5.271 1.43 5.508 0 9.988-4.479 9.988-9.985C22 6.479 17.52 2 12.012 2zm5.728 14.397c-.247.697-1.229 1.285-1.729 1.341-.476.054-.954.082-1.428-.054-.3-.086-.68-.225-1.164-.422-2.062-.843-3.39-2.92-3.493-3.056-.1-.137-.822-1.094-.822-2.086 0-.993.52-1.48.704-1.683.184-.203.402-.254.536-.254.135 0 .269.002.384.007.123.005.289-.046.452.348.167.406.574 1.4.624 1.503.05.103.084.223.016.357-.068.134-.103.218-.206.335-.103.117-.216.26-.309.349-.103.103-.21.215-.09.421.12.203.535.882 1.147 1.428.789.702 1.453.92 1.657 1.02.204.103.322.086.442-.054.12-.14.52-.607.658-.813.137-.206.275-.172.464-.103.189.069 1.202.567 1.408.67.206.103.344.155.396.244.052.09.052.52-.195 1.217z"/>
            </svg>
            WhatsApp
          </a>
          <button
            onClick={() => {
              const el = document.getElementById('cta-booking-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-5 py-2.5 font-bold text-sm rounded-xl transition shadow-xs flex items-center justify-center text-center ${themeColors.buttonBg}`}
          >
            Book Appointment
          </button>
        </div>
      </div>
    </section>
  );
};
export default HeroSection;
