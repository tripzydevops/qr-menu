import React, { useState } from 'react';
import { Locale } from '../../../i18n/config';
import { TranslateFn } from '../../../i18n/useLocale';
import { MenuItem } from './MenuItemCard';
import { X, Copy, Check, Share2 } from 'lucide-react';

interface ShareCardProps {
  item: MenuItem;
  locale: Locale;
  venueName: string;
  currencySymbol: string;
  onClose: () => void;
  t: TranslateFn;
  brandColor: string;
}

const WhatsAppIcon = () => (
  <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.457h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TelegramIcon = () => (
  <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.94-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.53 2.78-1.16 3.35-1.36 3.73-1.37.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function ShareCard({
  item,
  locale,
  venueName,
  currencySymbol,
  onClose,
  t,
  brandColor
}: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [isSystemSharing, setIsSystemSharing] = useState(false);

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

  const getShareUrl = () => {
    return typeof window !== 'undefined' ? window.location.href : '';
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleSystemShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    setIsSystemSharing(true);
    try {
      await navigator.share({
        title: `${name} @ ${venueName}`,
        text: locale === 'tr' 
          ? `Tripzy ile ${venueName} mekanındaki nefis "${name}" yemeğini inceleyin!` 
          : `Check out the delicious "${name}" at ${venueName} via Tripzy!`,
        url: getShareUrl()
      });
    } catch (error) {
      // AbortError is triggered when user cancels the native prompt, which is expected
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    } finally {
      setIsSystemSharing(false);
    }
  };

  const defaultFoodImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
  const currentUrl = getShareUrl();
  const shareText = locale === 'tr'
    ? `Tripzy ile ${venueName} mekanındaki nefis "${name}" yemeğini inceleyin! ${currentUrl}`
    : `Check out the delicious "${name}" at ${venueName} via Tripzy! ${currentUrl}`;

  // Social Share URLs
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(locale === 'tr' ? `Tripzy ile ${venueName} mekanındaki nefis "${name}" yemeğini inceleyin!` : `Check out the delicious "${name}" at ${venueName} via Tripzy!`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(locale === 'tr' ? `Tripzy ile ${venueName} mekanındaki nefis "${name}" yemeğini inceleyin!` : `Check out the delicious "${name}" at ${venueName} via Tripzy!`)}`;

  // QR Code URL using qrserver API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentUrl)}&color=0a0b0e&bgcolor=ffffff&qzone=1`;

  const isSystemShareSupported = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-[#0A0A0B]/85 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Share Container */}
      <div className="relative w-full max-w-sm rounded-[2rem] border border-[#C9A84C]/30 bg-gradient-to-b from-[#1C1C28] via-[#0A0A0B] to-[#050507] p-6 text-center shadow-2xl animate-fade-in-up">
        {/* Decorative ambient gold glow */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#C9A84C]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#C9A84C]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center mb-4 relative z-10">
          <div className="text-left">
            <span className="text-[9px] tracking-[0.2em] font-semibold text-white/40 block uppercase">
              {venueName}
            </span>
            <h3 className="font-serif text-lg font-bold text-white tracking-wide">
              {locale === 'tr' ? 'Yemeği Paylaş' : 'Share Item'}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Item Preview */}
        <div className="flex items-center gap-3 p-3 mb-4.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-left relative z-10">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#C9A84C]/20 shrink-0">
            <img 
              src={item.imageUrl || defaultFoodImage} 
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultFoodImage;
              }}
            />
          </div>
          <div className="min-w-0 flex-grow">
            <h4 className="font-serif text-sm font-bold text-white truncate leading-snug">
              {name}
            </h4>
            <span className="font-mono text-xs font-semibold text-[#DFBA73] mt-0.5 inline-block">
              {currencySymbol}{formattedPrice}
            </span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center p-4.5 mb-5 rounded-2xl bg-white text-[#0A0B0E] shadow-2xl relative z-10">
          <div className="w-36 h-36 relative flex items-center justify-center bg-white p-1 rounded-xl">
            <img 
              src={qrCodeUrl} 
              alt="Scan Menu QR"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[10px] text-gray-500 font-semibold tracking-wide mt-2.5">
            {locale === 'tr' ? 'MENÜYÜ DİĞER CİHAZDA AÇIN' : 'SCAN MENU ON ANOTHER DEVICE'}
          </span>
        </div>

        {/* Share Buttons Grid */}
        <div className="grid grid-cols-2 gap-2.5 relative z-10">
          {/* Copy Link Button */}
          <button 
            onClick={handleCopyLink}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-300 ${
              copied 
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-[#DFBA73]/10 border border-[#DFBA73]/20 hover:bg-[#DFBA73]/20 text-[#DFBA73]'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 animate-scale-up" />
                <span>{locale === 'tr' ? 'Kopyalandı!' : 'Copied!'}</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>{locale === 'tr' ? 'Linki Kopyala' : 'Copy Link'}</span>
              </>
            )}
          </button>

          {/* WhatsApp Share */}
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all duration-300"
          >
            <WhatsAppIcon />
            <span>WhatsApp</span>
          </a>

          {/* Telegram Share */}
          <a 
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 text-sky-400 text-xs font-bold transition-all duration-300"
          >
            <TelegramIcon />
            <span>Telegram</span>
          </a>

          {/* Twitter / X Share */}
          <a 
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold transition-all duration-300"
          >
            <XIcon />
            <span>X / Twitter</span>
          </a>
        </div>

        {/* System Share (If Supported) */}
        {isSystemShareSupported && (
          <button 
            onClick={handleSystemShare}
            disabled={isSystemSharing}
            className="w-full mt-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-white text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-300 relative z-10"
          >
            <Share2 className="h-4 w-4 text-[#DFBA73]" />
            <span>
              {isSystemSharing 
                ? (locale === 'tr' ? 'Paylaşılıyor...' : 'Sharing...') 
                : (locale === 'tr' ? 'Diğer Seçenekler' : 'More Options')}
            </span>
          </button>
        )}

        {/* Toast Notification overlay */}
        {copied && (
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#DFBA73] to-[#C9A84C] text-[#0A0B0E] font-bold text-xs px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 whitespace-nowrap animate-fade-in-up border border-[#C9A84C]/50 z-50">
            <Check className="h-4 w-4 stroke-[3]" />
            <span>{locale === 'tr' ? 'Bağlantı panoya kopyalandı!' : 'Link copied to clipboard!'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
