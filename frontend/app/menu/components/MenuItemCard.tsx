import React from 'react';
import { Locale } from '../../../i18n/config';

interface DietaryLabel {
  key: string;
  icon: string | null;
}

interface MenuItem {
  id: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string | null;
  descriptionEn: string | null;
  price: string | number;
  imageUrl: string | null;
  allergens: string[];
  isAvailable: boolean;
  calories: number | null;
  dietaryLabels: DietaryLabel[];
  translations?: Array<{ locale: string; name: string; description: string | null }>;
}

interface MenuItemCardProps {
  item: MenuItem;
  onClick: (item: MenuItem) => void;
  locale: Locale;
  currency: string;
}

const ALLERGEN_MAP: Record<string, { icon: string; label: string }> = {
  gluten: { icon: '🌾', label: 'Gluten' },
  dairy: { icon: '🥛', label: 'Dairy' },
  nuts: { icon: '🥜', label: 'Nuts' },
  sesame: { icon: '🌱', label: 'Sesame' },
  eggs: { icon: '🍳', label: 'Eggs' },
  fish: { icon: '🐟', label: 'Fish' }
};

export default function MenuItemCard({
  item,
  onClick,
  locale,
  currency
}: MenuItemCardProps) {
  const getItemDetails = () => {
    if (item.translations) {
      const trans = item.translations.find(t => t.locale === locale);
      if (trans) return { name: trans.name, description: trans.description };
    }
    return {
      name: locale === 'en' ? item.nameEn : item.nameTr,
      description: locale === 'en' ? item.descriptionEn : item.descriptionTr
    };
  };

  const { name, description } = getItemDetails();

  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'TRY':
      default: return '₺';
    }
  };

  const formattedPrice = Number(item.price).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  const defaultFoodImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80';

  return (
    <div 
      onClick={() => onClick(item)}
      className="flex bg-[#16213E]/55 hover:bg-[#16213E]/80 border border-gray-800/35 hover:border-[#C9A84C]/20 rounded-2xl p-3.5 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:scale-98 shadow-sm hover:shadow-md"
    >
      {/* Text Info */}
      <div className="flex-grow pr-4 flex flex-col justify-between">
        <div>
          {/* Diet badges */}
          {item.dietaryLabels && item.dietaryLabels.length > 0 && (
            <div className="flex space-x-1 mb-1.5">
              {item.dietaryLabels.map((lbl) => (
                <span 
                  key={lbl.key} 
                  title={lbl.key}
                  className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded"
                >
                  {lbl.icon} {lbl.key}
                </span>
              ))}
            </div>
          )}
          
          <h3 className="font-serif text-[17px] font-bold text-white leading-tight tracking-wide mb-1">
            {name}
          </h3>
          
          {description && (
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          {/* Price */}
          <span className="font-mono text-[16px] font-semibold text-[#C9A84C]">
            {getCurrencySymbol(currency)}{formattedPrice}
          </span>

          {/* Calories and allergens icons preview */}
          <div className="flex items-center space-x-2">
            {item.calories !== null && item.calories > 0 && (
              <span className="text-[10px] text-gray-500 font-medium">
                🔥 {item.calories} kcal
              </span>
            )}
            
            {item.allergens && item.allergens.length > 0 && (
              <div className="flex space-x-1" title="Allergens">
                {item.allergens.slice(0, 3).map((a) => {
                  const allergen = ALLERGEN_MAP[a.toLowerCase()];
                  return allergen ? (
                    <span key={a} className="text-xs" title={allergen.label}>
                      {allergen.icon}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image container */}
      <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative bg-[#1E293B]/40 border border-gray-800/40">
        <img 
          src={item.imageUrl || defaultFoodImage} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultFoodImage;
          }}
        />
      </div>
    </div>
  );
}
export type { MenuItem, DietaryLabel };
