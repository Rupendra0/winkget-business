import React from 'react';
import { IFAQ, IThemeColors } from '../types';
import Accordion from '../components/Accordion';

interface FaqSectionProps {
  faqs: IFAQ[];
  themeColors: IThemeColors;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ faqs, themeColors }) => {
  return (
    <section className="space-y-8">
      {/* SECTION HEADER */}
      <div className="max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3 flex items-center gap-2">
          <span className={`h-6.5 w-1 rounded-full bg-current ${themeColors.primary}`} />
          Frequently Asked Questions
        </h2>
        <p className="text-sm sm:text-base text-slate-650 dark:text-slate-350 leading-relaxed font-medium">
          Have questions? Find quick answers related to our consulting processes, appointments, billing rates, and more.
        </p>
      </div>

      {/* ACCORDION */}
      <div className="max-w-4xl">
        <Accordion items={faqs} themeColorClass={themeColors.primary} />
      </div>
    </section>
  );
};
export default FaqSection;
