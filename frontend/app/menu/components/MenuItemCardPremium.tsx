import React from 'react';
import { Leaf, Wheat, Flame } from 'lucide-react';
import { Locale } from '../../../i18n/config';
import { getReadableAccentColor, getContrastTextColor } from '@/lib/colors';

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

const ALLERGEN_MAP: Record<string, { icon: string; label: string }> = {
  gluten: { icon: '🌾', label: 'Gluten' },
  dairy: { icon: '🥛', label: 'Dairy' },
  nuts: { icon: '🥜', label: 'Nuts' },
  sesame: { icon: '🌱', label: 'Sesame' },
  eggs: { icon: '🍳', label: 'Eggs' },
  fish: { icon: '🐟', label: 'Fish' }
};

export default function MenuItemCardPremium({
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
  
  // Premium gold for dark, deep burgundy/gold for light
  const goldAccent = '#C9A84C';
  const accentColor = goldAccent;

  return (
    <div 
      onClick={() => onClick(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex flex-col rounded-2xl transition-all duration-500 cursor-pointer relative group p-3.5 ${
        isDark 
          ? "bg-gradient-to-b from-[#1E202C] to-[#0F1017] shadow-[0_4px_20px_rgba(0,0,0,0.5)]" 
          : "bg-[#FDFBF7] shadow-[0_6px_20px_rgba(201,168,76,0.06)]"
      }`}
      style={{
        border: isDark 
          ? `1px solid ${isHovered ? 'rgba(201,168,76,0.75)' : 'rgba(201,168,76,0.25)'}` 
          : `1px solid ${isHovered ? 'rgba(201,168,76,0.65)' : 'rgba(201,168,76,0.2)'}`,
        boxShadow: isHovered 
          ? isDark 
            ? `0 12px 36px -4px rgba(201,168,76,0.22), inset 0 1px 0 rgba(201,168,76,0.15)` 
            : `0 12px 28px -4px rgba(201,168,76,0.18)`
          : isDark 
            ? `0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(201,168,76,0.06)` 
            : `0 4px 12px rgba(201,168,76,0.04)`,
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      {/* Framed Image Container */}
      <div 
        className={`relative aspect-[4/3] rounded-xl overflow-hidden border ${
          isDark ? 'border-[#C9A84C]/35 bg-[#12141C]' : 'border-[#C9A84C]/25 bg-[#F9F6F0]'
        }`}
      >
        {/* Double Gold Frame Effect Inside Image */}
        {true && (
          <>
            <div 
              className="absolute inset-0 z-10 pointer-events-none rounded-xl" 
              style={{
                border: `1.5px solid ${goldAccent}35`,
                margin: '4px',
              }}
            />
            <div 
              className="absolute inset-0 z-10 pointer-events-none rounded-lg" 
              style={{
                border: `0.5px solid ${goldAccent}18`,
                margin: '8px',
              }}
            />
          </>
        )}
        
        <img 
          src={item.imageUrl || defaultFoodImage} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultFoodImage;
          }}
        />
        
        {/* Premium gradient overlay — fades image into card body */}
        <div className={`absolute inset-0 z-[5] ${
          isDark 
            ? "bg-gradient-to-t from-[#0F1017]/80 via-transparent to-transparent" 
            : "bg-gradient-to-t from-[#FDFBF7]/60 via-transparent to-transparent"
        }`} />
        
        {/* Diet labels overlay */}
        {item.dietaryLabels && item.dietaryLabels.length > 0 && (
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-20">
            {item.dietaryLabels.map((lbl) => {
              const config = DIETARY_MAP[lbl.key.toLowerCase()];
              if (!config) return null;
              const IconComponent = config.icon;
              return (
                <span 
                  key={lbl.key}
                  title={getDietaryLabel(lbl.key, locale)}
                  className="flex items-center space-x-1 text-[7px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.08em] backdrop-blur-md"
                  style={{
                    background: isDark ? 'rgba(15,16,23,0.85)' : 'rgba(253,251,247,0.9)',
                    color: accentColor,
                    border: `1px solid ${accentColor}40`,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
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

      {/* Info Container — premium typography section */}
      <div className="px-1.5 pt-3.5 pb-1 flex flex-col flex-grow justify-between relative">
        {/* Decorative gold line separator */}
        {true && (
          <div className="absolute top-0 left-0 right-0 h-px" style={{
            background: `linear-gradient(to right, transparent, ${goldAccent}40, transparent)`
          }} />
        )}
        
        <div className="space-y-1.5 mb-3">
          {/* Title — luxurious serif in gold (dark) or deep wine (light) */}
          <h3 
            className="font-serif text-sm md:text-base font-bold leading-snug tracking-wide line-clamp-2"
            style={{ 
              color: isDark ? '#F3F4F6' : '#1E1214',
              fontFamily: "Georgia, 'Times New Roman', serif"
            }}
          >
            {name}
          </h3>
          
          {/* Description — elegant light text */}
          {description && (
            <p className={`text-[11px] line-clamp-2 leading-relaxed ${
              isDark ? 'text-gray-400' : 'text-[#6B6462]'
            }`} style={{ fontWeight: 300 }}>
              {description}
            </p>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between pt-2.5 mt-auto">
          {/* Price — bold serif with gold emphasis */}
          <span 
            className="font-serif text-base md:text-lg font-bold tracking-wide"
            style={{ 
              color: goldAccent,
              fontFamily: "Georgia, 'Times New Roman', serif"
            }}
          >
            {getCurrencySymbol(currency)}{formattedPrice}
          </span>

          {/* Add to Cart — elegant gold gradient button matching mockup */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onAddDirect) {
                onAddDirect(item);
              } else {
                onClick(item);
              }
            }}
            className="text-[9px] md:text-[10px] font-bold tracking-[0.12em] uppercase transition-all duration-300 px-4 py-2 rounded-lg shadow-md"
            style={{
              background: `linear-gradient(135deg, #DFBA73 0%, #C9A84C 100%)`,
              color: '#0A0B0E',
              border: 'none',
              boxShadow: isHovered 
                ? `0 4px 12px rgba(201, 168, 76, 0.45)`
                : `0 2px 6px rgba(201, 168, 76, 0.15)`,
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

