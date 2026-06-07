import React, { useEffect, useState } from 'react';
import { Flame, AlertTriangle, X, Share2, Leaf, Wheat } from 'lucide-react';
import { Locale } from '../../../i18n/config';
import { TranslateFn } from '../../../i18n/useLocale';
import { MenuItem } from './MenuItemCard';
import ShareCard from './ShareCard';
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

interface ItemDetailSheetProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  locale: Locale;
  currency: string;
  t: TranslateFn;
  brandColor?: string | null;
  venueName: string;
  onAddToOrder: (item: MenuItem, quantity: number, notes: string) => void;
  theme?: "dark" | "light";
  isPremium?: boolean;
}

const ALLERGEN_MAP: Record<string, { icon: string; labelKey: string }> = {
  gluten: { icon: '🌾', labelKey: 'menu.allergensList.gluten' },
  dairy: { icon: '🥛', labelKey: 'menu.allergensList.dairy' },
  nuts: { icon: '🥜', labelKey: 'menu.allergensList.nuts' },
  sesame: { icon: '🌱', labelKey: 'menu.allergensList.sesame' },
  eggs: { icon: '🍳', labelKey: 'menu.allergensList.eggs' },
  fish: { icon: '🐟', labelKey: 'menu.allergensList.fish' }
};

const getDietaryBadgeStyles = (key: string, isDark: boolean) => {
  switch (key.toLowerCase()) {
    case 'halal':
      return isDark 
        ? 'bg-emerald-950/65 text-emerald-400 border-emerald-900/30'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200/50';
    case 'vegan':
      return isDark 
        ? 'bg-green-950/65 text-green-400 border-green-900/30'
        : 'bg-green-50 text-green-700 border-green-200/50';
    case 'gluten-free':
      return isDark 
        ? 'bg-amber-950/65 text-amber-400 border-amber-900/30'
        : 'bg-amber-50 text-amber-700 border-amber-200/50';
    default:
      return isDark 
        ? 'bg-white/[0.02] text-white border-white/[0.05]'
        : 'bg-black/[0.02] text-[#1E1214] border-black/[0.05]';
  }
};

export default function ItemDetailSheet({
  isOpen,
  item,
  onClose,
  locale,
  currency,
  t,
  brandColor = '#722F37',
  venueName,
  onAddToOrder,
  theme = "dark",
  isPremium = false
}: ItemDetailSheetProps) {
  const [showShareCard, setShowShareCard] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      document.body.style.overflow = 'hidden';
      setQuantity(1);
      setNotes('');
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300);
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered || !item) return null;

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

  const defaultFoodImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80';
  const isDark = theme === "dark";
  const accentColor = isPremium ? (isDark ? '#DFBA73' : '#5C1D24') : getReadableAccentColor(brandColor, isDark);
  const gold = '#C9A84C';
  const goldLight = '#DFBA73';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className={`absolute inset-0 bg-[#0A0A0B]/80 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sheet Container */}
      <div 
        className={`relative w-full max-w-lg border-t rounded-t-[2.5rem] shadow-2xl overflow-y-auto no-scrollbar max-h-[92vh] transition-transform duration-300 transform ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } ${
          isPremium && isDark
            ? "premium-glass-card border-[#C9A84C]/20"
            : isPremium && !isDark
              ? "bg-[#FFFDF8] border-[#C9A84C]/15"
              : isDark 
                ? "bg-[#0A0B0E] border-white/[0.05]" 
                : "bg-[#FDFBF7] border-black/[0.05]"
        }`}
        style={{
          boxShadow: isPremium && isDark 
            ? '0 -10px 40px -5px rgba(201,168,76,0.15), 0 25px 50px -12px rgba(0,0,0,0.8)' 
            : undefined
        }}
      >
        {/* Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-gray-700/60 z-10" />

        {/* Full Bleed Image */}
        <div className="w-full h-72 relative bg-[#1E293B]/20">
          <img 
            src={item.imageUrl || defaultFoodImage} 
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultFoodImage;
            }}
          />
          <div className={`absolute inset-0 bg-gradient-to-t via-transparent to-transparent ${
            isDark ? 'from-[#0A0B0E] via-[#0A0B0E]/20' : 'from-[#FDFBF7] via-[#FDFBF7]/20'
          }`} />
          
          {/* Close button top right */}
          <button 
            onClick={onClose}
            className={`absolute top-5 right-5 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center border hover:scale-105 transition-all ${
              isDark 
                ? "bg-[#0A0B0E]/60 text-white border-white/[0.05] hover:bg-[#0A0B0E]" 
                : "bg-[#FDFBF7]/60 text-[#1E1214] border-black/[0.05] hover:bg-[#FDFBF7]"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contents */}
        <div className="p-6 pt-2">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              {/* Dietary Labels */}
              {item.dietaryLabels && item.dietaryLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {item.dietaryLabels.map((lbl) => {
                    const config = DIETARY_MAP[lbl.key.toLowerCase()];
                    if (!config) return null;
                    const IconComponent = config.icon;
                    return (
                      <span 
                        key={lbl.key}
                        className={`inline-flex items-center gap-1.5 text-xs border px-2.5 py-0.5 rounded-full capitalize font-semibold transition-colors duration-300 ${
                          getDietaryBadgeStyles(lbl.key, isDark)
                        }`}
                      >
                        <IconComponent className="h-3 w-3" />
                        <span>{config.label}</span>
                      </span>
                    );
                  })}
                </div>
              )}
              <h2 
                className={`font-serif text-2xl font-bold leading-tight ${isDark ? 'text-white' : 'text-[#1E1214]'}`}
                style={isPremium ? {
                  color: isDark ? goldLight : '#1E1214',
                  fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  textShadow: isDark ? '0 0 20px rgba(201,168,76,0.15)' : 'none',
                } : undefined}
              >
                {name}
              </h2>
            </div>
            <span 
              className={`text-xl font-bold ml-4 px-3 py-1.5 rounded-xl`}
              style={isPremium ? {
                background: isDark 
                  ? `linear-gradient(135deg, ${goldLight} 0%, ${gold} 100%)` 
                  : `linear-gradient(135deg, #2D1216 0%, #5C1D24 100%)`,
                color: isDark ? '#0A0B0E' : '#FFFFFF',
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                boxShadow: isDark 
                  ? `0 4px 12px -2px rgba(201,168,76,0.3)` 
                  : `0 4px 12px -2px rgba(92,29,36,0.2)`,
              } : {
                color: accentColor,
                backgroundColor: `${accentColor}11`,
                border: `1px solid ${accentColor}22`,
                fontFamily: 'var(--font-dm-sans), monospace',
              }}
            >
              {getCurrencySymbol(currency)}{formattedPrice}
            </span>
          </div>

          {/* Calories Banner */}
          {item.calories !== null && item.calories > 0 && (
            <div className={`flex items-center space-x-2 border px-3 py-2 rounded-xl text-xs w-fit mb-4 ${
              isDark 
                ? "bg-white/[0.02] border-white/[0.04] text-gray-300" 
                : "bg-black/[0.02] border-black/[0.04] text-[#5C5552]"
            }`}>
              <Flame className="h-4 w-4 text-orange-500" />
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#1E1214]'}`}>{item.calories}</span>
              <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('menu.calories')}</span>
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="mb-6">
              <p className={`text-[14px] leading-relaxed font-light ${isDark ? 'text-gray-300' : 'text-[#5C5552]'}`}>
                {description}
              </p>
            </div>
          )}

          {/* Allergens */}
          {item.allergens && item.allergens.length > 0 && (
            <div className={`mb-6 border p-4 rounded-2xl ${
              isDark ? 'bg-white/[0.01] border-white/[0.04]' : 'bg-black/[0.01] border-black/[0.04]'
            }`}>
              <h4 
                className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase mb-3"
                style={{ color: accentColor }}
              >
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>{t('menu.allergens')}</span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {item.allergens.map((a) => {
                  const allergen = ALLERGEN_MAP[a.toLowerCase()];
                  return allergen ? (
                    <div 
                      key={a} 
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs border ${
                        isDark 
                          ? "bg-white/[0.02] text-white border-white/[0.04]" 
                          : "bg-black/[0.02] text-[#1E1214] border-black/[0.04]"
                      }`}
                    >
                      <span className="text-sm">{allergen.icon}</span>
                      <span>{t(allergen.labelKey)}</span>
                    </div>
                  ) : (
                    <div 
                      key={a} 
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs border ${
                        isDark 
                          ? "bg-white/[0.02] text-white border-white/[0.04]" 
                          : "bg-black/[0.02] text-[#1E1214] border-black/[0.04]"
                      }`}
                    >
                      <span>🍽️</span>
                      <span className="capitalize">{a}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes Input */}
          <div className="mb-6">
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {locale === 'en' ? 'Special Instructions' : 'Özel Notlar'}
            </label>
            <input 
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={locale === 'en' ? 'E.g., no onions, extra sauce...' : 'Örn: soğan istemiyorum, az tereyağlı...'}
              className={`w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-colors border ${
                isDark 
                  ? "bg-white/[0.01] border-white/[0.08] text-white focus:border-white/[0.2]" 
                  : "bg-black/[0.01] border-black/[0.08] text-[#1E1214] focus:border-black/[0.2]"
              }`}
              style={{
                borderColor: notes ? accentColor : undefined
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-3 mt-4">
            <div className={`flex items-center justify-between border p-2 rounded-2xl ${
              isDark ? 'bg-white/[0.01] border-white/[0.04]' : 'bg-black/[0.01] border-black/[0.04]'
            }`}>
              <span className={`text-xs font-semibold ml-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {locale === 'en' ? 'Quantity' : 'Adet'}
              </span>
              <div className="flex items-center space-x-3.5 mr-1">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold border transition-colors ${
                    isDark 
                      ? "bg-white/[0.02] text-white border-white/[0.05] hover:bg-white/[0.06]" 
                      : "bg-black/[0.02] text-[#1E1214] border-black/[0.05] hover:bg-black/[0.06]"
                  }`}
                >
                  -
                </button>
                <span className={`font-mono text-sm font-bold w-4 text-center ${isDark ? 'text-white' : 'text-[#1E1214]'}`}>
                  {quantity}
                </span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold border transition-colors ${
                    isDark 
                      ? "bg-white/[0.02] text-white border-white/[0.05] hover:bg-white/[0.06]" 
                      : "bg-black/[0.02] text-[#1E1214] border-black/[0.05] hover:bg-black/[0.06]"
                  }`}
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={() => {
                  onAddToOrder(item, quantity, notes);
                  onClose();
                }}
                className={`flex-grow py-4 rounded-2xl font-bold transition-colors duration-300 text-[14px] shadow-lg ${isPremium ? 'premium-btn-shimmer' : ''}`}
                style={isPremium ? {
                  background: isDark 
                    ? `linear-gradient(135deg, ${goldLight} 0%, ${gold} 50%, #B8963F 100%)` 
                    : `linear-gradient(135deg, #3D1519 0%, #5C1D24 100%)`,
                  color: isDark ? '#0A0B0E' : '#FFFFFF',
                  boxShadow: isDark 
                    ? `0 10px 20px -3px rgba(201,168,76,0.3)` 
                    : `0 10px 20px -3px rgba(92,29,36,0.2)`,
                  fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  letterSpacing: '0.05em',
                } : {
                  backgroundColor: accentColor,
                  color: getContrastTextColor(accentColor),
                  boxShadow: `0 10px 15px -3px ${accentColor}25`
                }}
              >
                {locale === 'en' ? 'Add to Order' : 'Siparişe Ekle'} • {getCurrencySymbol(currency)}{(Number(item.price) * quantity).toFixed(2)}
              </button>
              
              <button 
                onClick={() => setShowShareCard(true)}
                className={`p-4 rounded-2xl font-semibold transition-all duration-300 border hover:bg-opacity-5`}
                style={{
                  borderColor: `${accentColor}55`,
                  color: accentColor
                }}
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Share canvas modal popup */}
        {showShareCard && (
          <ShareCard 
            item={item} 
            locale={locale} 
            venueName={venueName} 
            currencySymbol={getCurrencySymbol(currency)}
            onClose={() => setShowShareCard(false)} 
            t={t}
            brandColor={brandColor}
          />
        )}
      </div>
    </div>
  );
}
