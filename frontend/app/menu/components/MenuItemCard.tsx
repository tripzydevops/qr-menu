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
      className="flex bg-[#16213E]/55 hover:bg-[#16213E]/80 border border-gray-800/35 rounded-2xl p-3.5 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:scale-98 shadow-sm hover:shadow-md"
      style={{
        borderColor: isHovered ? (brandColor || '#C9A84Ccc') : undefined,
        boxShadow: isHovered ? `0 4px 15px -3px ${brandColor || '#C9A84C'}22` : undefined
      }}
    >
      {/* Text Info */}
      <div className="flex-grow pr-4 flex flex-col justify-between">
        <div>
          {/* Diet badges */}
          {item.dietaryLabels && item.dietaryLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {item.dietaryLabels.map((lbl) => {
                const config = DIETARY_MAP[lbl.key.toLowerCase()];
                if (!config) return null;
                const IconComponent = config.icon;
                return (
                  <span 
                    key={lbl.key} 
                    title={getDietaryLabel(lbl.key, locale)}
                    className={`inline-flex items-center gap-1.5 text-[9px] font-bold border px-2 py-0.5 rounded-full capitalize transition-colors duration-300 ${config.colorClass}`}
                  >
                    <IconComponent className="h-2.5 w-2.5" />
                    <span>{getDietaryLabel(lbl.key, locale)}</span>
                  </span>
                );
              })}
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
          <span 
            className="font-mono text-[16px] font-semibold transition-colors duration-300"
            style={{ color: brandColor || '#C9A84C' }}
          >
            {getCurrencySymbol(currency)}{formattedPrice}
          </span>

          {/* Calories and allergens icons preview */}
          <div className="flex items-center space-x-2">
            {item.calories !== null && item.calories > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 font-medium">
                <Flame className="h-3 w-3 text-orange-500" />
                <span>{item.calories} kcal</span>
              </span>
            )}
            
            {item.allergens && item.allergens.length > 0 && (
              <div className="flex space-x-1" title="Allergens">
                {item.allergens.slice(0, 3).map((a) => {
                  const allergen = ALLERGEN_MAP[a.toLowerCase()];
                  return allergen ? (
                    <span key={a} className="text-xs" title={getAllergenLabel(a, locale)}>
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
