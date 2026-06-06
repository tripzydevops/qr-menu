import React from 'react';
import { Leaf, Wheat, Flame } from 'lucide-react';
import { Locale } from '../../../i18n/config';

// Custom SVG crescent moon and star for Halal matching Lucide's style
const HalalIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    <polygon points="16 6 16.5 7.5 18 7.7 17 8.7 17.2 10.2 16 9.5 14.8 10.2 15 8.7 14 7.7 15.5 7.5 16 6" fill="currentColor" stroke="none" />
  </svg>
);

const DIETARY_MAP: Record<string, { icon: React.ComponentType<any>; label: string; colorClass: string }> = {
  halal: { icon: HalalIcon, label: 'Halal', colorClass: 'bg-emerald-950/65 text-emerald-400 border-emerald-900/30' },
  vegan: { icon: Leaf, label: 'Vegan', colorClass: 'bg-green-950/65 text-green-400 border-green-900/30' },
  'gluten-free': { icon: Wheat, label: 'Gluten-Free', colorClass: 'bg-amber-950/65 text-amber-400 border-amber-900/30' }
};

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
  onAddDirect?: (item: MenuItem) => void;
  locale: Locale;
  currency: string;
  brandColor?: string | null;
  theme?: "dark" | "light";
}

const getDietaryLabel = (key: string, locale: Locale) => {
  const isTr = locale === 'tr';
  switch (key.toLowerCase()) {
    case 'halal': return isTr ? 'Helal' : 'Halal';
    case 'vegan': return isTr ? 'Vegan' : 'Vegan';
    case 'gluten-free': return isTr ? 'Glutensiz' : 'Gluten-Free';
    default: return key;
  }
};

const getAllergenLabel = (key: string, locale: Locale) => {
  const isTr = locale === 'tr';
  switch (key.toLowerCase()) {
    case 'gluten': return isTr ? 'Gluten' : 'Gluten';
    case 'dairy': return isTr ? 'Süt Ürünü' : 'Dairy';
    case 'nuts': return isTr ? 'Kuruyemiş' : 'Nuts';
    case 'sesame': return isTr ? 'Susam' : 'Sesame';
    case 'eggs': return isTr ? 'Yumurta' : 'Eggs';
    case 'fish': return isTr ? 'Balık' : 'Fish';
    default: return key;
  }
};

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
  onAddDirect,
  locale,
  currency,
  brandColor,
  theme = "dark"
}: MenuItemCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

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
  const isDark = theme === "dark";
  const accentColor = brandColor || (isDark ? '#DFBA73' : '#5C1D24');

  return (
    <div 
      onClick={() => onClick(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex flex-col border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:scale-98 shadow-sm hover:shadow-md relative ${
        isDark 
          ? "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05]" 
          : "bg-[#F9F6F0] hover:bg-[#F3EFE6] border-black/[0.05] shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
      }`}
      style={{
        borderColor: isHovered ? `${accentColor}cc` : undefined,
        boxShadow: isHovered ? `0 4px 15px -3px ${accentColor}22` : undefined
      }}
    >
      {/* Image Container on Top */}
      <div className={`w-full aspect-square relative bg-[#1E293B]/40 overflow-hidden border-b ${isDark ? 'border-white/[0.03]' : 'border-black/[0.03]'}`}>
        <img 
          src={item.imageUrl || defaultFoodImage} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultFoodImage;
          }}
        />
        
        {/* Diet labels overlay */}
        {item.dietaryLabels && item.dietaryLabels.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {item.dietaryLabels.map((lbl) => {
              const config = DIETARY_MAP[lbl.key.toLowerCase()];
              if (!config) return null;
              const IconComponent = config.icon;
              return (
                <span 
                  key={lbl.key}
                  title={getDietaryLabel(lbl.key, locale)}
                  className={`border text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1 ${
                    isDark 
                      ? "bg-[#0A0B0E]/85 border-[#DFBA73]/20" 
                      : "bg-[#FDFBF7]/95 border-[#5C1D24]/20 shadow-sm"
                  }`}
                  style={{
                    color: accentColor,
                    borderColor: `${accentColor}33`
                  }}
                >
                  <IconComponent className="h-2 w-2" />
                  <span>{getDietaryLabel(lbl.key, locale)}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Container at Bottom */}
      <div className="p-3 flex flex-col flex-grow justify-between">
        <div>
          <div className="flex flex-col gap-0.5 mb-1.5">
            <h3 className={`font-serif text-[13px] md:text-sm font-bold leading-tight tracking-wide line-clamp-2 min-h-[32px] ${
              isDark ? 'text-white' : 'text-[#1E1214]'
            }`}>
              {name}
            </h3>
            <span 
              className="font-mono text-xs font-semibold"
              style={{ color: accentColor }}
            >
              {getCurrencySymbol(currency)}{formattedPrice}
            </span>
          </div>
          
          {description && (
            <p className={`text-[10px] line-clamp-2 leading-relaxed font-light mb-3 min-h-[30px] ${
              isDark ? 'text-gray-400' : 'text-[#5C5552]'
            }`}>
              {description}
            </p>
          )}
        </div>

        {/* Rating and ADD Button Row */}
        <div className={`flex items-center justify-between mt-auto pt-2 border-t ${
          isDark ? 'border-white/[0.03]' : 'border-black/[0.03]'
        }`}>
          {/* Rating */}
          <div className="flex items-center space-x-0.5">
            <span className="text-[10px] font-bold font-mono" style={{ color: accentColor }}>4.9</span>
            <span className="text-[9px]" style={{ color: accentColor }}>★</span>
          </div>

          {/* ADD Button */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // prevent opening details sheet
              if (onAddDirect) {
                onAddDirect(item);
              } else {
                onClick(item);
              }
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider ${
              isDark 
                ? "bg-[#DFBA73] hover:bg-[#DFBA73]/85 text-[#0A0B0E]" 
                : "bg-[#5C1D24] hover:bg-[#5C1D24]/85 text-white"
            }`}
            style={{
              backgroundColor: brandColor ? accentColor : undefined,
              color: brandColor ? (isDark ? '#0A0B0E' : '#FFFFFF') : undefined
            }}
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}
export type { MenuItem, DietaryLabel };
