import React from 'react';
import { LayoutGrid, Wheat, Leaf, Milk, Sparkles, Egg } from 'lucide-react';
import { TranslateFn } from '../../../i18n/useLocale';

interface DietaryFilterProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  t: TranslateFn;
  brandColor?: string | null;
  theme?: "dark" | "light";
}

export default function DietaryFilter({
  activeFilter,
  onFilterChange,
  t,
  brandColor,
  theme = "dark"
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

  const isDark = theme === "dark";
  const accentColor = brandColor || (isDark ? '#DFBA73' : '#5C1D24');

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
                  ? 'scale-105'
                  : isDark 
                    ? 'bg-transparent text-gray-500 border-white/[0.08] group-hover:text-gray-300 group-hover:border-white/[0.15]'
                    : 'bg-transparent text-gray-500 border-black/[0.08] group-hover:text-gray-800 group-hover:border-black/[0.15]'
              }`}
              style={{
                borderColor: isActive ? accentColor : undefined,
                background: isActive ? `linear-gradient(to bottom, ${accentColor}22, transparent)` : undefined,
                color: isActive ? accentColor : undefined,
                boxShadow: isActive ? `0 0 15px ${accentColor}22` : undefined
              }}
            >
              <IconComponent className="h-5 w-5 stroke-[1.8]" />
            </div>
            
            {/* Label below */}
            <span
              className={`text-[10px] uppercase font-mono mt-1.5 tracking-wider font-bold transition-colors duration-300 ${
                isActive 
                  ? '' 
                  : isDark 
                    ? 'text-gray-500 group-hover:text-gray-300' 
                    : 'text-gray-500 group-hover:text-gray-800'
              }`}
              style={{
                color: isActive ? accentColor : undefined
              }}
            >
              {chip.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
