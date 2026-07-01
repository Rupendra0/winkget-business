import React, { useState } from 'react';
import { IGalleryItem, IThemeColors } from '../types';

interface GallerySectionProps {
  gallery: IGalleryItem[];
  themeColors: IThemeColors;
}

export const GallerySection: React.FC<GallerySectionProps> = ({ gallery, themeColors }) => {
  const tags: Array<'All' | IGalleryItem['tag']> = ['All', 'Office', 'Projects', 'Certificates', 'Team', 'Work'];
  const [activeTag, setActiveTag] = useState<'All' | IGalleryItem['tag']>('All');

  // Filter gallery items
  const filteredGallery = activeTag === 'All'
    ? gallery
    : gallery.filter(item => item.tag === activeTag);

  return (
    <section className="space-y-8">
      {/* SECTION HEADER & TABS FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3 flex items-center gap-2">
            <span className={`h-6.5 w-1 rounded-full bg-current ${themeColors.primary}`} />
            Gallery & Portfolio
          </h2>
          <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed font-medium">
            Take a look inside our workplace, preview completed case projects, and verify accreditation credentials.
          </p>
        </div>

        {/* TABS CONTAINER */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-850 rounded-2xl w-fit">
          {tags.map(tag => {
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* GALLERY GRID */}
      {filteredGallery.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredGallery.map((item) => (
            <div
              key={item.id}
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between"
            >
              {/* IMAGE WRAPPER */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-50">
                <img
                  src={item.url}
                  alt={item.caption}
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-103"
                  loading="lazy"
                />
                <span className="absolute top-3 left-3 bg-slate-900/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg">
                  {item.tag}
                </span>
              </div>

              {/* CAPTION */}
              <div className="p-4 flex items-center justify-between">
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-2">
                  {item.caption}
                </p>
                <div className={`p-1 rounded-lg border ${themeColors.accentBg}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <p className="text-sm font-bold text-slate-400">No items available under this category tag.</p>
        </div>
      )}
    </section>
  );
};
export default GallerySection;
