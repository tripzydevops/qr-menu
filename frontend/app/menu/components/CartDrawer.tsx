import React, { useState } from 'react';
import { ShoppingBag, X, Trash2, CheckCircle2, ChevronRight, AlertCircle, Loader } from 'lucide-react';
import { Locale } from '../../../i18n/config';
import { MenuItem } from './MenuItemCard';

interface CartItem {
  item: MenuItem;
  quantity: number;
  notes: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Record<string, CartItem>;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  token: string;
  locale: Locale;
  currency: string;
  brandColor?: string | null;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  token,
  locale,
  currency,
  brandColor = '#722F37'
}: CartDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartArray = Object.values(cart);
  const totalItems = cartArray.reduce((acc, curr) => acc + curr.quantity, 0);
  
  const getCurrencySymbol = (code: string) => {
    switch (code) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'TRY':
      default: return '₺';
    }
  };

  const totalPrice = cartArray.reduce(
    (acc, curr) => acc + Number(curr.item.price) * curr.quantity,
    0
  );

  const handleCheckout = async () => {
    if (cartArray.length === 0) return;
    setError(null);
    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/menu/${token}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartArray.map((i) => ({
            menuItemId: i.item.id,
            quantity: i.quantity,
            notes: i.notes || null
          }))
        })
      });

      if (!response.ok) {
        throw new Error(locale === 'en' ? 'Failed to place order. Please try again.' : 'Sipariş gönderilemedi. Lütfen tekrar deneyin.');
      }

      setOrderSuccess(true);
      setTimeout(() => {
        onClearCart();
        setOrderSuccess(false);
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-[#0A0A0B]/85 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-[#0A0B0E] border-t border-white/[0.05] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] z-10 animate-fade-in-up">
        {/* Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-gray-700/60" />

        {/* Header */}
        <div className="p-6 border-b border-white/[0.04] flex justify-between items-center mt-2">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5 text-[#DFBA73]" />
            <h3 className="font-serif text-lg font-bold text-white">
              {locale === 'en' ? 'Your Basket' : 'Sepetiniz'}
            </h3>
            <span className="bg-[#DFBA73]/10 text-[#DFBA73] text-xs font-mono font-bold px-2 py-0.5 rounded-full border border-[#DFBA73]/25">
              {totalItems}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.02] text-gray-400 hover:text-white flex items-center justify-center border border-white/[0.05] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4 no-scrollbar">
          {orderSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-emerald-950/45 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-10 w-10 animate-pulse" />
              </div>
              <h4 className="font-serif text-xl font-bold text-white">
                {locale === 'en' ? 'Order Placed!' : 'Siparişiniz Alındı!'}
              </h4>
              <p className="text-xs text-gray-400 max-w-xs">
                {locale === 'en' 
                  ? 'Your order has been sent to the kitchen. Please relax while we prepare your food.' 
                  : 'Siparişiniz mutfağa iletildi. Yemekleriniz hazırlanırken keyfinize bakın.'}
              </p>
            </div>
          ) : cartArray.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <span className="text-4xl">🛒</span>
              <h4 className="font-semibold text-gray-300 text-sm">
                {locale === 'en' ? 'Your basket is empty' : 'Sepetiniz boş'}
              </h4>
              <p className="text-xs text-gray-500 max-w-xs">
                {locale === 'en' 
                  ? 'Browse the menu and add items to start ordering.' 
                  : 'Sipariş vermek için menüden sepetinize ürün ekleyin.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3.5 bg-red-950/30 border border-red-900/40 rounded-2xl flex items-start space-x-2.5 text-xs text-red-300">
                  <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Items List */}
              <div className="divide-y divide-white/[0.03] space-y-3.5">
                {cartArray.map(({ item, quantity, notes }) => {
                  const name = locale === 'en' ? item.nameEn : item.nameTr;
                  return (
                    <div key={item.id} className="pt-3.5 flex justify-between items-start space-x-4">
                      <div className="flex-grow">
                        <h5 className="font-semibold text-sm text-white leading-tight">
                          {name}
                        </h5>
                        {notes && (
                          <p className="text-[11px] text-gray-400 bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded w-fit mt-1.5 font-mono">
                            ✍️ {notes}
                          </p>
                        )}
                        <span className="inline-block text-xs text-[#DFBA73] font-semibold mt-1">
                          {getCurrencySymbol(currency)}{(Number(item.price) * quantity).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Quantity Editor */}
                      <div className="flex items-center space-x-2.5 flex-shrink-0 bg-white/[0.02] px-2.5 py-1.5 rounded-xl border border-white/[0.05]">
                        <button 
                          onClick={() => onUpdateQuantity(item.id, quantity - 1)}
                          className="w-5.5 h-5.5 text-xs font-bold text-gray-400 hover:text-white flex items-center justify-center bg-[#0A0B0E] rounded-md"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-white w-4 text-center">
                          {quantity}
                        </span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, quantity + 1)}
                          className="w-5.5 h-5.5 text-xs font-bold text-gray-400 hover:text-white flex items-center justify-center bg-[#0A0B0E] rounded-md"
                        >
                          +
                        </button>
                        <button 
                          onClick={() => onRemoveItem(item.id)}
                          className="text-red-400 hover:text-red-300 ml-1.5"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!orderSuccess && cartArray.length > 0 && (
          <div className="p-6 border-t border-white/[0.04] bg-[#0A0B0E]/95 space-y-4 rounded-b-[2.5rem]">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {locale === 'en' ? 'Total Amount' : 'Toplam Tutar'}
              </span>
              <span className="font-mono text-lg font-bold text-[#DFBA73] bg-[#DFBA73]/5 px-3 py-1 rounded-xl border border-[#DFBA73]/10">
                {getCurrencySymbol(currency)}{totalPrice.toFixed(2)}
              </span>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-[#DFBA73] hover:bg-[#DFBA73]/85 text-[#0A0B0E] font-bold text-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-[#DFBA73]/10"
            >
              {submitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin text-[#0A0B0E]" />
                  <span>{locale === 'en' ? 'Placing Order...' : 'Sipariş Gönderiliyor...'}</span>
                </>
              ) : (
                <>
                  <span>{locale === 'en' ? 'Confirm & Place Order' : 'Siparişi Onayla & Gönder'}</span>
                  <ChevronRight className="h-4.5 w-4.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
