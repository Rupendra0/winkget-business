import React, { useState } from 'react';
import { IFAQ } from '../types';

interface AccordionProps {
  items: IFAQ[];
  themeColorClass?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ items, themeColorClass = 'text-indigo-600' }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3.5">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={item.id}
            className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
          >
            <button
              onClick={() => toggleAccordion(idx)}
              className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white transition-colors duration-150 focus:outline-hidden"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${item.id}`}
            >
              <span className="text-base tracking-tight leading-relaxed">{item.question}</span>
              <span className={`flex-shrink-0 ml-4 p-1 rounded-lg bg-slate-50 dark:bg-slate-850 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4.5 w-4.5 text-slate-500 dark:text-slate-400 ${isOpen ? themeColorClass : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            <div
              id={`faq-answer-${item.id}`}
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isOpen ? 'max-h-96 opacity-100 border-t border-slate-100 dark:border-slate-850' : 'max-h-0 opacity-0'
              }`}
              role="region"
            >
              <div className="p-5 text-sm md:text-base leading-relaxed text-slate-600 dark:text-slate-350 bg-slate-50/50 dark:bg-slate-950/20">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default Accordion;
