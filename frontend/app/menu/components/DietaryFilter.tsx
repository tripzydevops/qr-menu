import React from 'react';
import { TranslateFn } from '../../../i18n/useLocale';

interface DietaryFilterProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  t: TranslateFn;
}

export default function DietaryFilter({
  activeFilter,
  onFilterChange,
  t
}: DietaryFilterProps) {
  const dietaryChips = [
    { key: 'all', label: t('menu.all'), icon: '🍽️' },
    { key: 'halal', label: t('menu.halal'), icon: '☪' },
    { key: 'vegan', label: t('menu.vegan'), icon: '🌱' },
    { key: 'gluten-free', label: t('menu.glutenFree'), icon: '🌾' }
  ];

  return (
    <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1 mb-6">
      {dietaryChips.map((chip) => {
        const isActive = chip.key === activeFilter;
        return (
          <button
            key={chip.key}
            onClick={() => onFilterChange(chip.key)}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
              isActive
                ? 'bg-[#C9A84C] text-[#1C1C28] border-[#C9A84C] shadow-md shadow-[#C9A84C]/10 scale-105'
                : 'bg-[#1C1C28] text-gray-400 border-gray-800/80 hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            <span>{chip.icon}</span>
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}
