import React, { useState } from 'react';
import { ICTA, IThemeColors } from '../types';

interface CtaSectionProps {
  cta: ICTA;
  themeColors: IThemeColors;
  providerName: string;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ cta, themeColors, providerName }) => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', note: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({ name: '', email: '', phone: '', note: '' });
    }, 1200);
  };

  return (
    <section
      id="cta-booking-section"
      className="bg-slate-900 dark:bg-slate-950 text-white rounded-3xl p-6 sm:p-8 md:p-12 shadow-xl relative overflow-hidden"
    >
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-slate-800/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-800/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT COLUMN: Invitation */}
        <div className="lg:col-span-6 space-y-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
            {cta.title}
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-medium">
            {cta.description}
          </p>
        </div>

        {/* RIGHT COLUMN: Inquiry Form */}
        <div className="lg:col-span-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-3xl p-6 sm:p-8 shadow-lg">
            {isSubmitted ? (
              <div className="text-center py-8 space-y-4 animate-fade-in">
                {/* SVG Checked Circle */}
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/50 flex items-center justify-center shadow-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black tracking-tight">Inquiry Sent Successfully!</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                    Thank you for reaching out to {providerName}. Our consultants will call you back within 24 hours.
                  </p>
                </div>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className={`px-4.5 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition`}
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-base sm:text-lg font-black tracking-tight border-b border-slate-100 dark:border-slate-850 pb-3">
                  Request Free Callback
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="cta-name" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Full Name *</label>
                    <input
                      type="text"
                      id="cta-name"
                      required
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl transition-all focus:bg-white dark:focus:bg-slate-900 ${themeColors.borderFocus}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="cta-phone" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Phone Number *</label>
                    <input
                      type="tel"
                      id="cta-phone"
                      required
                      placeholder="e.g. +91 99999 88888"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl transition-all focus:bg-white dark:focus:bg-slate-900 ${themeColors.borderFocus}`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="cta-email" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Email Address</label>
                  <input
                    type="email"
                    id="cta-email"
                    placeholder="e.g. john@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl transition-all focus:bg-white dark:focus:bg-slate-900 ${themeColors.borderFocus}`}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cta-note" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Brief Message / Requirement</label>
                  <textarea
                    id="cta-note"
                    rows={3}
                    placeholder="Describe your legal issue, clinical symptoms, or design goals..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl transition-all focus:bg-white dark:focus:bg-slate-900 ${themeColors.borderFocus}`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2.5 font-bold text-sm rounded-xl transition shadow-xs text-center flex items-center justify-center gap-2 ${themeColors.buttonBg}`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending Request...
                    </>
                  ) : (
                    cta.buttonText
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
export default CtaSection;
