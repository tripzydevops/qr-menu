import React, { useRef, useState, useEffect } from 'react';
import { Locale } from '../../../i18n/config';
import { TranslateFn } from '../../../i18n/useLocale';
import { MenuItem } from './MenuItemCard';

interface ShareCardProps {
  item: MenuItem;
  locale: Locale;
  venueName: string;
  currencySymbol: string;
  onClose: () => void;
  t: TranslateFn;
  brandColor: string;
}

export default function ShareCard({
  item,
  locale,
  venueName,
  currencySymbol,
  onClose,
  t,
  brandColor
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const getItemName = () => {
    if (item.translations) {
      const trans = item.translations.find(t => t.locale === locale);
      if (trans) return trans.name;
    }
    return locale === 'en' ? item.nameEn : item.nameTr;
  };

  const name = getItemName();
  const formattedPrice = Number(item.price).toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  const handleShare = async () => {
    setIsSharing(true);
    
    // Fallback: If Web Share API is available with files, we would generate a blob.
    // For now, let's trigger a standard web share for link, or alert user we are downloading.
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${name} @ ${venueName}`,
          text: `Check out ${name} at ${venueName}!`,
          url: window.location.href
        });
      } else {
        // Fallback: Download action
        triggerDownload();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      triggerDownload();
    } finally {
      setIsSharing(false);
    }
  };

  const triggerDownload = () => {
    // Generate a simple simulated download or draw a quick canvas file.
    // Let's draw it using canvas.
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient (Garnet to Deep Charcoal)
    const grad = ctx.createLinearGradient(0, 0, 0, 1920);
    grad.addColorStop(0, '#722F37');
    grad.addColorStop(0.3, '#1C1C28');
    grad.addColorStop(1, '#0A0A0B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative Borders
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.2)';
    ctx.lineWidth = 15;
    ctx.strokeRect(40, 40, 1000, 1840);

    ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, 960, 1800);

    // Venue Name
    ctx.fillStyle = '#C9A84C';
    ctx.font = '600 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(venueName.toUpperCase(), 540, 200);

    // Scan Text
    ctx.fillStyle = 'rgba(232, 232, 232, 0.6)';
    ctx.font = '400 32px sans-serif';
    ctx.fillText('TRIPZY.TRAVEL PRESENT', 540, 140);

    // Draw Mock QR Circle in center/bottom
    ctx.beginPath();
    ctx.arc(540, 1450, 130, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#C9A84C';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Mock QR Code content dots
    ctx.fillStyle = '#1C1C28';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('SCAN', 540, 1440);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('MENU', 540, 1475);

    // Dish Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px Georgia, serif';
    ctx.fillText(name, 540, 1000);

    // Price
    ctx.fillStyle = '#C9A84C';
    ctx.font = 'bold 64px monospace';
    ctx.fillText(`${currencySymbol}${formattedPrice}`, 540, 1120);

    // Tagline
    ctx.fillStyle = 'rgba(232, 232, 232, 0.8)';
    ctx.font = 'italic 36px Georgia, serif';
    ctx.fillText('Experiencing premium tastes...', 540, 1220);

    // Trigger file download
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.download = `${name.replace(/\s+/g, '_')}_story.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
    }
  };

  const defaultFoodImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-[#0A0A0B]/90 backdrop-blur-md"
      />

      {/* Share Container */}
      <div className="relative w-full max-w-sm flex flex-col items-center">
        {/* Story Poster Preview (9:16 Aspect Ratio) */}
        <div 
          ref={cardRef}
          className="w-full aspect-[9/16] rounded-[2rem] border-2 border-[#C9A84C]/30 shadow-2xl relative overflow-hidden flex flex-col justify-between p-8 text-center bg-gradient-to-b from-[#722F37] via-[#1C1C28] to-[#0A0A0B]"
        >
          {/* Accent Borders */}
          <div className="absolute inset-4 border border-[#C9A84C]/10 rounded-[1.7rem] pointer-events-none" />
          <div className="absolute inset-5 border border-[#C9A84C]/20 rounded-[1.5rem] pointer-events-none" />

          {/* Top header */}
          <div className="relative z-10 pt-4">
            <span className="text-[10px] tracking-[0.2em] font-semibold text-white/50 block mb-1">
              TRIPZY PRESENT
            </span>
            <h4 className="text-sm font-semibold tracking-wider text-[#C9A84C] uppercase font-mono">
              {venueName}
            </h4>
          </div>

          {/* Center Image and Info */}
          <div className="relative z-10 flex flex-col items-center my-auto">
            <div className="w-48 h-48 rounded-full border-4 border-[#C9A84C]/30 overflow-hidden shadow-2xl mb-8 relative">
              <img 
                src={item.imageUrl || defaultFoodImage} 
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultFoodImage;
                }}
              />
            </div>

            <h3 className="font-serif text-2xl font-bold text-white mb-2 leading-snug px-4">
              {name}
            </h3>

            <span className="font-mono text-xl font-bold text-[#C9A84C]">
              {currencySymbol}{formattedPrice}
            </span>
          </div>

          {/* Bottom QR Callout */}
          <div className="relative z-10 pb-6 flex flex-col items-center">
            {/* Scan design */}
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border-2 border-[#C9A84C] mb-2 shadow-lg">
              <span className="text-[9px] font-bold text-[#1C1C28] leading-none text-center">
                SCAN<br/>MENU
              </span>
            </div>
            <span className="text-[10px] text-gray-500 tracking-wider">
              {t('menu.welcome')}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex space-x-3 w-full mt-4 relative z-10 px-2">
          <button 
            onClick={handleShare}
            disabled={isSharing}
            className="flex-grow py-3 rounded-xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-[#722F37]/20"
          >
            {isSharing ? 'Sharing...' : 'Share / Download'}
          </button>
          
          <button 
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-[#2A2A3D] text-white font-semibold text-sm hover:bg-[#3E3E56] transition-colors duration-300"
          >
            {t('menu.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
