import React from 'react';
import { IProviderData } from './types';
import HeroSection from './sections/HeroSection';
import AboutSection from './sections/AboutSection';
import WhyChooseUsSection from './sections/WhyChooseUsSection';
import ServicesSection from './sections/ServicesSection';
import TimelineSection from './sections/TimelineSection';
import GallerySection from './sections/GallerySection';
import TestimonialsSection from './sections/TestimonialsSection';
import FaqSection from './sections/FaqSection';
import ContactSection from './sections/ContactSection';
import CtaSection from './sections/CtaSection';

interface ProviderPageProps {
  providerData: IProviderData;
  isDarkMode: boolean;
}

export const ProviderPage: React.FC<ProviderPageProps> = ({ providerData, isDarkMode }) => {
  const { themeColors, hero, about, whyChooseUs, services, timeline, gallery, testimonials, faqs, contact, cta } = providerData;

  // Smooth scroll handler
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans">
        
        {/* PROVIDER BRAND HEADER */}
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-850 select-none transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo/Name */}
            <div className="flex items-center gap-2">
              <span className={`h-6 w-1 rounded-full bg-current ${themeColors.primary}`} />
              <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base truncate max-w-44 sm:max-w-xs">
                {hero.name}
              </span>
            </div>

            {/* Navigation links (Desktop) */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-500 dark:text-slate-400">
              <a href="#about" onClick={(e) => handleNavClick(e, 'about-section')} className="hover:text-slate-800 dark:hover:text-white transition">About</a>
              <a href="#services" onClick={(e) => handleNavClick(e, 'services-section')} className="hover:text-slate-800 dark:hover:text-white transition">Services</a>
              <a href="#gallery" onClick={(e) => handleNavClick(e, 'gallery-section')} className="hover:text-slate-800 dark:hover:text-white transition">Portfolio</a>
              <a href="#testimonials" onClick={(e) => handleNavClick(e, 'testimonials-section')} className="hover:text-slate-800 dark:hover:text-white transition">Reviews</a>
              <a href="#contact" onClick={(e) => handleNavClick(e, 'contact-section')} className="hover:text-slate-800 dark:hover:text-white transition">Contact</a>
            </nav>

            {/* Quick Contact Button */}
            <button
              onClick={() => {
                const el = document.getElementById('cta-booking-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-4 py-2 font-bold text-xs rounded-xl transition shadow-2xs ${themeColors.buttonBg}`}
            >
              Inquire Now
            </button>
          </div>
        </header>

        {/* MAIN BODY LAYOUT */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16 md:space-y-24">
          
          {/* HERO CONTAINER */}
          <HeroSection hero={hero} themeColors={themeColors} />

          {/* ABOUT CONTAINER */}
          <div id="about-section" className="scroll-mt-20">
            <AboutSection
              about={about}
              experienceYears={hero.experienceYears}
              rating={hero.rating}
              themeColors={themeColors}
            />
          </div>

          {/* WHY CHOOSE US CONTAINER */}
          <WhyChooseUsSection
            whyChooseIntro={about.whyChooseIntro}
            items={whyChooseUs}
            themeColors={themeColors}
          />

          {/* SERVICES CONTAINER */}
          <div id="services-section" className="scroll-mt-20">
            <ServicesSection services={services} themeColors={themeColors} />
          </div>

          {/* TIMELINE WORKFLOW CONTAINER */}
          <TimelineSection timeline={timeline} themeColors={themeColors} />

          {/* GALLERY CONTAINER */}
          <div id="gallery-section" className="scroll-mt-20">
            <GallerySection gallery={gallery} themeColors={themeColors} />
          </div>

          {/* TESTIMONIALS CONTAINER */}
          <div id="testimonials-section" className="scroll-mt-20">
            <TestimonialsSection testimonials={testimonials} themeColors={themeColors} />
          </div>

          {/* FAQS ACCORDION CONTAINER */}
          <FaqSection faqs={faqs} themeColors={themeColors} />

          {/* CONTACT INFO CONTAINER */}
          <div id="contact-section" className="scroll-mt-20">
            <ContactSection contact={contact} themeColors={themeColors} />
          </div>

          {/* BOTTOM CTA FORM CONTAINER */}
          <CtaSection cta={cta} themeColors={themeColors} providerName={hero.name} />

        </main>

        {/* PROVIDER BRAND FOOTER */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 py-12 transition-colors duration-300 mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="flex items-center gap-2">
                <span className={`h-6 w-1 rounded-full bg-current ${themeColors.primary}`} />
                <span className="font-extrabold text-slate-900 dark:text-white tracking-tight">{hero.name}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-3">
                {providerData.category} Landing Page
              </span>
            </div>

            <p className="text-xs font-medium text-slate-400 text-center md:text-right">
              &copy; {new Date().getFullYear()} {hero.name}. Powered by Winkget Services Platform. All rights reserved.
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
};
export default ProviderPage;
