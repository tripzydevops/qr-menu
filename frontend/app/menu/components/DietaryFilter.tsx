import React from 'react';
import { LayoutGrid, Wheat, Leaf, Milk, Sparkles, Egg } from 'lucide-react';
import { TranslateFn } from '../../../i18n/useLocale';

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
  // Mockup aligned dietary filter options
  const dietaryChips = [
    { key: 'all', label: 'All', icon: LayoutGrid },
    { key: 'gluten-free', label: 'GF', icon: Wheat },
    { key: 'vegetarian', label: 'Vegetarian', icon: Leaf },
    { key: 'vegan', label: 'V', icon: Leaf },
    { key: 'dairy-free', label: 'DF', icon: Milk },
    { key: 'nut-free', label: 'NS', icon: Sparkles }
  ];

  return (
    <div className="flex space-x-5 overflow-x-auto no-scrollbar py-3 mb-6 px-2 justify-start md:justify-center w-full">
      {dietaryChips.map((chip) => {
        const isActive = chip.key === activeFilter;
        const IconComponent = chip.icon;
        return (
          <button
            key={chip.key}
            onClick={() => onFilterChange(chip.key)}
            className="flex flex-col items-center group shrink-0 focus:outline-none"
          >
            {/* Circular Wrapper */}
            <div
              className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all duration-300 ${
                isActive
                  ? 'border-[#DFBA73] bg-gradient-to-b from-[#DFBA73]/15 to-transparent text-[#DFBA73] shadow-[0_0_15px_rgba(223,186,115,0.15)] scale-105'
                  : 'bg-transparent text-gray-500 border-white/[0.08] group-hover:text-gray-300 group-hover:border-white/[0.15]'
              }`}
              style={isActive && brandColor ? {
                borderColor: brandColor,
                background: `linear-gradient(to bottom, ${brandColor}22, transparent)`,
                color: brandColor,
                boxShadow: `0 0 15px ${brandColor}22`
              } : undefined}
            >
              <IconComponent className="h-5 w-5 stroke-[1.8]" />
            </div>
            
            {/* Label below */}
            <span
              className={`text-[10px] uppercase font-mono mt-1.5 tracking-wider font-bold transition-colors duration-300 ${
                isActive ? 'text-[#DFBA73]' : 'text-gray-500 group-hover:text-gray-300'
              }`}
              style={isActive && brandColor ? { color: brandColor } : undefined}
            >
              {chip.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
