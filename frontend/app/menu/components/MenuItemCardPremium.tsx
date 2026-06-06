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
  // Premium gold for dark, deep burgundy for light
  const goldAccent = '#C9A84C';
  const accentColor = isDark ? goldAccent : (brandColor || '#5C1D24');

  return (
    <div 
      onClick={() => onClick(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex flex-col rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer relative group ${
        isDark 
          ? "bg-gradient-to-b from-[#1A1D2B] to-[#10121A]" 
          : "bg-[#F9F6F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
      }`}
      style={{
        border: isDark 
          ? `1px solid ${isHovered ? goldAccent + '60' : 'rgba(201,168,76,0.12)'}` 
          : `1px solid ${isHovered ? accentColor + '40' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: isHovered 
          ? isDark 
            ? `0 8px 32px -4px rgba(201,168,76,0.15), inset 0 1px 0 rgba(201,168,76,0.08)` 
            : `0 8px 24px -4px rgba(92,29,36,0.12)`
          : isDark 
            ? `0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(201,168,76,0.04)` 
            : undefined,
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      {/* Image Container with Gold Frame Effect */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {/* Gold border frame inside image */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none rounded-t-2xl" 
          style={{
            border: isDark ? `2px solid ${goldAccent}18` : 'none',
            margin: isDark ? '6px' : '0',
            borderRadius: isDark ? '14px' : '0',
          }}
        />
        {/* Inner fine gold line */}
        {isDark && (
          <div 
            className="absolute inset-0 z-10 pointer-events-none" 
            style={{
              border: `1px solid ${goldAccent}10`,
              margin: '10px',
              borderRadius: '12px',
            }}
          />
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
        
        {/* Premium gradient overlay — fades image into dark card body */}
        <div className={`absolute inset-0 z-[5] ${
          isDark 
            ? "bg-gradient-to-t from-[#10121A] via-[#10121A]/30 to-transparent" 
            : "bg-gradient-to-t from-[#F9F6F0] via-transparent to-transparent opacity-60"
        }`} />

        {/* Subtle vignette on edges */}
        {isDark && (
          <div className="absolute inset-0 z-[4]" style={{
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(16,18,26,0.4) 100%)'
          }} />
        )}
        
        {/* Diet labels overlay */}
        {item.dietaryLabels && item.dietaryLabels.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-20">
            {item.dietaryLabels.map((lbl) => {
              const config = DIETARY_MAP[lbl.key.toLowerCase()];
              if (!config) return null;
              const IconComponent = config.icon;
              return (
                <span 
                  key={lbl.key}
                  title={getDietaryLabel(lbl.key, locale)}
                  className="flex items-center space-x-1 text-[7px] font-bold px-2 py-1 rounded-full uppercase tracking-[0.08em] backdrop-blur-md"
                  style={{
                    background: isDark ? 'rgba(10,11,14,0.75)' : 'rgba(253,251,247,0.9)',
                    color: accentColor,
                    border: `1px solid ${accentColor}30`,
                    boxShadow: isDark ? `0 2px 8px rgba(0,0,0,0.3)` : `0 1px 4px rgba(0,0,0,0.06)`,
                  }}
                >
                  <IconComponent className="h-2.5 w-2.5" />
                  <span>{getDietaryLabel(lbl.key, locale)}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Container — premium typography section */}
      <div className="px-3.5 pt-3 pb-3.5 flex flex-col flex-grow justify-between relative">
        {/* Decorative gold line separator */}
        {isDark && (
          <div className="absolute top-0 left-3 right-3 h-px" style={{
            background: `linear-gradient(to right, transparent, ${goldAccent}25, transparent)`
          }} />
        )}
        
        <div>
          {/* Title — luxurious serif in gold (dark) or deep wine (light) */}
          <h3 
            className="font-serif text-sm md:text-[15px] font-bold leading-snug tracking-wide line-clamp-2 mb-1"
            style={{ color: isDark ? goldAccent : '#1E1214' }}
          >
            {name}
          </h3>
          
          {/* Description — elegant light text */}
          {description && (
            <p className={`text-[10px] line-clamp-2 leading-relaxed mb-2.5 ${
              isDark ? 'text-gray-400/90' : 'text-[#6B6462]'
            }`} style={{ fontWeight: 300 }}>
              {description}
            </p>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="flex items-end justify-between mt-auto">
          {/* Price — bold serif with gold emphasis */}
          <span 
            className="font-serif text-base md:text-lg font-bold tracking-wide"
            style={{ color: isDark ? goldAccent : accentColor }}
          >
            {getCurrencySymbol(currency)}{formattedPrice}
          </span>

          {/* Add to Cart — elegant outlined button matching mockup */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onAddDirect) {
                onAddDirect(item);
              } else {
                onClick(item);
              }
            }}
            className="text-[9px] font-semibold tracking-[0.12em] uppercase transition-all duration-300 px-3 py-1.5 rounded-lg"
            style={{
              color: isDark ? goldAccent : '#FFFFFF',
              border: isDark ? `1px solid ${goldAccent}50` : 'none',
              background: isDark 
                ? (isHovered ? `${goldAccent}18` : 'transparent') 
                : accentColor,
              boxShadow: isDark 
                ? (isHovered ? `0 0 12px ${goldAccent}15` : 'none')
                : `0 2px 8px ${accentColor}30`,
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

