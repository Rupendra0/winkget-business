import React from 'react';
import { IContact, IThemeColors } from '../types';

interface ContactSectionProps {
  contact: IContact;
  themeColors: IThemeColors;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ contact, themeColors }) => {
  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* LEFT COLUMN: Contact Details & Working Hours */}
        <div className="lg:col-span-6 space-y-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3 flex items-center gap-2">
              <span className={`h-6.5 w-1 rounded-full bg-current ${themeColors.primary}`} />
              Get In Touch
            </h2>
            <p className="text-xs sm:text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
              Have a project in mind or need assistance? Reach out via our direct channels or visit our offices during operating hours.
            </p>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Office Address</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-normal">{contact.address}</p>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Direct Contacts</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none mb-1.5">{contact.phone}</p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-none">{contact.email}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Web Portal</span>
              <a
                href={`https://${contact.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-bold block hover:underline leading-none ${themeColors.primary}`}
              >
                {contact.website}
              </a>
            </div>
          </div>

          {/* Working Hours Table */}
          <div className="border-t border-slate-100 dark:border-slate-850 pt-6">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-3">Operating Hours</span>
            <div className="divide-y divide-slate-100 dark:divide-slate-850 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden px-4.5">
              {contact.workingHours.map((wh, idx) => (
                <div key={idx} className="flex justify-between py-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-350">
                  <span>{wh.day}</span>
                  <span className="text-slate-500 dark:text-slate-400">{wh.hours}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Styled Map Mock Placeholder */}
        <div className="lg:col-span-6 flex flex-col">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-3">Office Location Map</span>
          <div className="flex-1 min-h-72 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-sky-50 dark:bg-slate-950 relative flex items-center justify-center shadow-inner group">
            {/* GRID PATTERN / Vector Map Mock */}
            <div className="absolute inset-0 opacity-20 dark:opacity-10 bg-[radial-gradient(#0ea5e9_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            
            {/* MOCK STREETS */}
            <div className="absolute top-1/3 left-0 w-full h-4 bg-slate-200 dark:bg-slate-850 transform -rotate-6 shadow-2xs" />
            <div className="absolute top-0 left-1/2 w-4 h-full bg-slate-200 dark:bg-slate-850 transform rotate-12 shadow-2xs" />
            <div className="absolute top-2/3 left-0 w-full h-5 bg-slate-200 dark:bg-slate-850 transform rotate-3 shadow-2xs" />

            {/* MAP PIN CONTAINER */}
            <div className="relative z-10 flex flex-col items-center gap-2 group-hover:scale-105 transition-transform duration-300">
              {/* Dynamic Map Pin Glow */}
              <div className="absolute h-10 w-10 bg-rose-500/30 dark:bg-rose-500/20 rounded-full animate-ping pointer-events-none" />
              
              {/* SVG Map Pin */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-rose-500 fill-rose-500 filter drop-shadow-md" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              
              {/* Location Label Capsule */}
              <div className="bg-slate-900/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-lg border border-slate-700/50 backdrop-blur-md max-w-xs text-center leading-relaxed">
                {contact.mapPlaceholder}
              </div>
            </div>
            
            {/* BOTTOM GOOGLE MAP BUTTON */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-black text-slate-800 dark:text-slate-100 rounded-lg shadow-sm transition-all duration-150 flex items-center gap-1.5 z-20"
              aria-label="Open in Google Maps"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Google Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
export default ContactSection;
