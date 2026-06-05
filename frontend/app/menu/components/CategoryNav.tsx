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
}

export default function CategoryNav({
  categories,
  activeCategoryId,
  onCategoryClick,
  locale
}: CategoryNavProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll active tab into view horizontally
  useEffect(() => {
    if (!containerRef.current) return;
    const activeTab = containerRef.current.querySelector('[data-active="true"]');
    if (activeTab) {
      activeTab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
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
    <div className="sticky top-0 z-40 bg-[#1C1C28]/95 backdrop-blur-md border-b border-gray-800/40 py-3 -mx-4 px-4 overflow-hidden">
      <div 
        ref={containerRef}
        className="flex space-x-2 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeCategoryId;
          return (
            <button
              key={cat.id}
              data-active={isActive}
              onClick={() => onCategoryClick(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 text-white shadow-lg shadow-[#722F37]/20 scale-105'
                  : 'bg-[#2A2A3D]/50 text-gray-400 hover:text-white border border-transparent hover:border-gray-800'
              }`}
            >
              {getCategoryName(cat)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
