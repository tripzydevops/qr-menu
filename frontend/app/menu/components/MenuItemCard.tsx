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
  brandColor
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

  return (
    <div 
      onClick={() => onClick(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex flex-col bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:scale-98 shadow-sm hover:shadow-md h-full relative"
      style={{
        borderColor: isHovered ? (brandColor || '#DFBA73cc') : undefined,
        boxShadow: isHovered ? `0 4px 15px -3px ${brandColor || '#DFBA73'}22` : undefined
      }}
    >
      {/* Image Container on Top */}
      <div className="w-full aspect-square relative bg-[#1E293B]/40 border-b border-white/[0.03] overflow-hidden">
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
                  className="bg-[#0A0B0E]/85 text-[#DFBA73] border border-[#DFBA73]/20 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1"
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
            <h3 className="font-serif text-[13px] md:text-sm font-bold text-white leading-tight tracking-wide line-clamp-2 min-h-[32px]">
              {name}
            </h3>
            <span 
              className="font-mono text-xs font-semibold"
              style={{ color: brandColor || '#DFBA73' }}
            >
              {getCurrencySymbol(currency)}{formattedPrice}
            </span>
          </div>
          
          {description && (
            <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed font-light mb-3 min-h-[30px]">
              {description}
            </p>
          )}
        </div>

        {/* Rating and ADD Button Row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.03]">
          {/* Rating */}
          <div className="flex items-center space-x-0.5">
            <span className="text-[#DFBA73] text-[10px] font-bold font-mono">4.9</span>
            <span className="text-[#DFBA73] text-[9px]">★</span>
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
            className="px-3 py-1 rounded-lg bg-[#DFBA73] hover:bg-[#DFBA73]/85 text-[#0A0B0E] text-[10px] font-bold transition-all uppercase tracking-wider"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}
export type { MenuItem, DietaryLabel };
