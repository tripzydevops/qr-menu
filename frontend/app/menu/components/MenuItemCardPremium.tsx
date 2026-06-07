import React from 'react';
import { Leaf, Wheat } from 'lucide-react';
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

// Gold corner ornament SVG
const CornerOrnament = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M2 38V20C2 10.059 10.059 2 20 2H38" 
      stroke="#C9A84C" 
      strokeWidth="1" 
      strokeLinecap="round"
      opacity="0.4"
    />
    <path 
      d="M2 38V28C2 18.059 8.059 10 18 10H28" 
      stroke="#C9A84C" 
      strokeWidth="0.5" 
      strokeLinecap="round"
      opacity="0.25"
    />
    <circle cx="6" cy="6" r="1.5" fill="#C9A84C" opacity="0.3" />
  </svg>
);

const DIETARY_MAP: Record<string, { icon: React.ComponentType<any>; label: string }> = {
  halal: { icon: HalalIcon, label: 'Halal' },
  vegan: { icon: Leaf, label: 'Vegan' },
  'gluten-free': { icon: Wheat, label: 'Gluten-Free' }
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

  const defaultFoodImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=85';
  const isDark = theme === "dark";
  const gold = '#C9A84C';
  const goldLight = '#DFBA73';

  return (
    <div 
      onClick={() => onClick(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative rounded-2xl cursor-pointer
        transition-all duration-500 ease-out
        animate-fade-in-up
        ${isDark 
          ? 'premium-glass-card premium-border-glow' 
          : 'bg-[#FFFDF8] shadow-[0_8px_30px_rgba(201,168,76,0.08)]'
        }
      `}
      style={{
        border: isDark 
          ? undefined  // handled by premium-glass-card class
          : `1px solid ${isHovered ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.15)'}`,
        transform: isHovered ? 'translateY(-8px) scale(1.01)' : 'translateY(0) scale(1)',
        boxShadow: !isDark 
          ? isHovered 
            ? `0 20px 50px -10px rgba(201,168,76,0.2), 0 0 0 1px rgba(201,168,76,0.15)`
            : `0 8px 30px rgba(201,168,76,0.08)`
          : undefined,
      }}
    >
      {/* ── Corner Ornaments (Dark mode only) ── */}
      {isDark && (
        <>
          <div className="premium-ornament-tl"><CornerOrnament /></div>
          <div className="premium-ornament-tr"><CornerOrnament /></div>
          <div className="premium-ornament-bl"><CornerOrnament /></div>
          <div className="premium-ornament-br"><CornerOrnament /></div>
        </>
      )}

      {/* ── Cinematic Hero Image (16:9) ── */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl">
        <img 
          src={item.imageUrl || defaultFoodImage} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out"
          style={{
            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
          }}
          loading="eager"
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultFoodImage;
          }}
        />
        
        {/* Dramatic gradient overlay — fades image into card body */}
        <div className={`absolute inset-0 ${
          isDark 
            ? 'bg-gradient-to-t from-[#0D0F14] via-[#0D0F14]/40 to-transparent' 
            : 'bg-gradient-to-t from-[#FFFDF8] via-[#FFFDF8]/30 to-transparent'
        }`} />

        {/* Top vignette for depth */}
        <div className={`absolute inset-0 ${
          isDark
            ? 'bg-gradient-to-b from-black/30 via-transparent to-transparent'
            : 'bg-gradient-to-b from-black/10 via-transparent to-transparent'
        }`} />

        {/* Dietary labels — floating glass pills */}
        {item.dietaryLabels && item.dietaryLabels.length > 0 && (
          <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 z-20">
            {item.dietaryLabels.map((lbl) => {
              const config = DIETARY_MAP[lbl.key.toLowerCase()];
              if (!config) return null;
              const IconComponent = config.icon;
              return (
                <span 
                  key={lbl.key}
                  title={getDietaryLabel(lbl.key, locale)}
                  className="flex items-center gap-1 text-[8px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.12em]"
                  style={{
                    background: isDark ? 'rgba(13,15,20,0.8)' : 'rgba(255,253,248,0.9)',
                    backdropFilter: 'blur(12px)',
                    color: gold,
                    border: `1px solid ${gold}30`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <IconComponent className="h-2.5 w-2.5" />
                  <span>{getDietaryLabel(lbl.key, locale)}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Calories badge — top right */}
        {item.calories && (
          <div 
            className="absolute top-4 right-4 z-20 flex items-center gap-1 text-[8px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{
              background: isDark ? 'rgba(13,15,20,0.8)' : 'rgba(255,253,248,0.9)',
              backdropFilter: 'blur(12px)',
              color: isDark ? '#9CA3AF' : '#6B7280',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            {item.calories} kcal
          </div>
        )}

        {/* Floating Price Badge — overlaps image/body boundary */}
        <div 
          className="absolute bottom-0 right-5 translate-y-1/2 z-30 px-5 py-2.5 rounded-xl"
          style={{
            background: isDark 
              ? `linear-gradient(135deg, #DFBA73 0%, #Bfa35c 100%)`
              : `linear-gradient(135deg, #2D1216 0%, #5C1D24 100%)`,
            boxShadow: isDark 
              ? `0 6px 16px -4px rgba(201,168,76,0.2), 0 0 0 1px rgba(201,168,76,0.3)`
              : `0 8px 24px -4px rgba(92,29,36,0.3)`,
          }}
        >
          <span 
            className="font-serif text-lg md:text-xl font-bold tracking-wide"
            style={{ 
              color: isDark ? '#0A0B0E' : '#FFFFFF',
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            }}
          >
            {getCurrencySymbol(currency)}{formattedPrice}
          </span>
        </div>
      </div>

      {/* ── Content Body ── */}
      <div className="relative z-10 px-6 pt-8 pb-6 flex flex-col">
        {/* Gold decorative separator line */}
        <div 
          className="absolute top-0 left-6 right-6 h-px"
          style={{
            background: `linear-gradient(to right, transparent, ${gold}15, ${gold}30, ${gold}15, transparent)`,
          }}
        />

        {/* Title — Playfair Display serif, gold in dark / deep wine in light */}
        <h3 
          className="text-lg md:text-xl font-bold leading-tight tracking-wide mb-2.5 line-clamp-2"
          style={{ 
            color: isDark ? goldLight : '#1E1214',
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
          }}
        >
          {name}
        </h3>
        
        {/* Description — elegant light text with generous line height */}
        {description && (
          <p 
            className="text-xs md:text-[13px] leading-relaxed line-clamp-3 mb-5"
            style={{ 
              color: isDark ? '#9CA3AF' : '#78716C',
              fontWeight: 300,
              letterSpacing: '0.01em',
              lineHeight: '1.7',
            }}
          >
            {description}
          </p>
        )}

        {/* Allergens — small inline pills */}
        {item.allergens && item.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {item.allergens.map((allergen) => (
              <span 
                key={allergen}
                className="text-[8px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{
                  background: isDark ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.1)',
                  color: isDark ? `${gold}aa` : '#92400E',
                  border: `1px solid ${isDark ? `${gold}15` : 'rgba(201,168,76,0.2)'}`,
                }}
              >
                {allergen}
              </span>
            ))}
          </div>
        )}

        {/* Full-Width Gold CTA Button with shimmer */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onAddDirect) {
              onAddDirect(item);
            } else {
              onClick(item);
            }
          }}
          className="w-full py-3.5 rounded-xl text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300 premium-btn-shimmer"
          style={{
            background: isDark 
              ? `linear-gradient(135deg, #C9A84C 0%, #A38237 100%)`
              : `linear-gradient(135deg, #3D1519 0%, #5C1D24 100%)`,
            color: isDark ? '#0A0B0E' : '#FFFFFF',
            boxShadow: isHovered 
              ? isDark 
                ? `0 6px 16px -4px rgba(201,168,76,0.25)`
                : `0 8px 24px -4px rgba(92,29,36,0.3)`
              : isDark 
                ? `0 4px 10px -2px rgba(201,168,76,0.1)`
                : `0 4px 12px -2px rgba(92,29,36,0.1)`,
            transform: isHovered ? 'scale(1.015)' : 'scale(1)',
          }}
        >
          {locale === 'tr' ? 'Sepete Ekle' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
