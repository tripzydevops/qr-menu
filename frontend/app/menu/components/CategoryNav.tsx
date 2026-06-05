import React, { useRef, useEffect } from 'react';
import { Locale } from '../../../i18n/config';

interface Category {
  id: string;
  nameTr: string;
  nameEn: string;
  iconName?: string | null;
  translations?: Array<{ locale: string; name: string }>;
}

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string;
  onCategoryClick: (id: string) => void;
  locale: Locale;
  brandColor?: string | null;
}

export default function CategoryNav({
  categories,
  activeCategoryId,
  onCategoryClick,
  locale,
  brandColor
}: CategoryNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll active tab into view horizontally without vertical scrolling
  useEffect(() => {
    if (!containerRef.current) return;
    const activeTab = containerRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (activeTab) {
      const container = containerRef.current;
      const scrollLeft = activeTab.offsetLeft - container.offsetWidth / 2 + activeTab.offsetWidth / 2;
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }, [activeCategoryId]);

  const getCategoryName = (cat: Category) => {
    if (cat.translations) {
      const trans = cat.translations.find(t => t.locale === locale);
      if (trans) return trans.name;
    }
    return locale === 'en' ? cat.nameEn : cat.nameTr;
  };

  return (
    <div className="sticky top-0 z-40 bg-[#0A0B0E]/90 backdrop-blur-md border-b border-white/[0.04] py-3 px-4 overflow-hidden">
      <div 
        ref={containerRef}
        className="flex space-x-2 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeCategoryId;
          return (
            <button
              key={cat.id}
              data-active={isActive}
              onClick={() => onCategoryClick(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 snap-center ${
                isActive
                  ? 'text-white scale-105'
                  : 'bg-white/[0.02] text-gray-400 hover:text-white border border-white/[0.04]'
              }`}
              style={isActive ? {
                backgroundImage: `linear-gradient(to right, ${brandColor || '#5C1D24'}, #DFBA73cc)`,
                boxShadow: `0 10px 15px -3px ${brandColor || '#5C1D24'}33`
              } : undefined}
            >
              {getCategoryName(cat)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
