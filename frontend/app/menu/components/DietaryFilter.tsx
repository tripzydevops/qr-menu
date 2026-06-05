import React from 'react';
import { Utensils, Leaf, Wheat } from 'lucide-react';
import { TranslateFn } from '../../../i18n/useLocale';

// Custom SVG crescent moon and star for Halal matching Lucide's stroke and style
const HalalIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    {/* Crescent Moon */}
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    {/* Star inside the crescent cradle */}
    <polygon points="16 6 16.5 7.5 18 7.7 17 8.7 17.2 10.2 16 9.5 14.8 10.2 15 8.7 14 7.7 15.5 7.5 16 6" fill="currentColor" stroke="none" />
  </svg>
);

interface DietaryFilterProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  t: TranslateFn;
  brandColor?: string | null;
}

export default function DietaryFilter({
  activeFilter,
  onFilterChange,
  t,
  brandColor
}: DietaryFilterProps) {
  const dietaryChips = [
    { key: 'all', label: t('menu.all'), icon: Utensils },
    { key: 'halal', label: t('menu.halal'), icon: HalalIcon },
    { key: 'vegan', label: t('menu.vegan'), icon: Leaf },
    { key: 'gluten-free', label: t('menu.glutenFree'), icon: Wheat }
  ];

  return (
    <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1 mb-6">
      {dietaryChips.map((chip) => {
        const isActive = chip.key === activeFilter;
        const IconComponent = chip.icon;
        return (
          <button
            key={chip.key}
            onClick={() => onFilterChange(chip.key)}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
              isActive
                ? 'text-[#0A0B0E] shadow-md scale-105'
                : 'bg-[#0A0B0E] text-gray-400 border-white/[0.04] hover:text-gray-300 hover:border-white/[0.08]'
            }`}
            style={isActive ? {
              backgroundColor: brandColor || '#DFBA73',
              borderColor: brandColor || '#DFBA73',
              boxShadow: `0 4px 12px -2px ${brandColor || '#DFBA73'}44`
            } : undefined}
          >
            <IconComponent className="h-3.5 w-3.5" />
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}
