"use client";

import React, { useState } from "react";
import { 
  Sliders, 
  Save, 
  Check, 
  Info, 
  ShieldCheck, 
  Building2 
} from "lucide-react";

export default function SuperAdminSettingsPage() {
  const [isSaved, setIsSaved] = useState(false);

  // Free Tier Limits
  const [freeMaxVenues, setFreeMaxVenues] = useState(1);
  const [freeMaxTables, setFreeMaxTables] = useState(5);
  const [freeAnalytics, setFreeAnalytics] = useState(false);

  // Pro Tier Limits
  const [proMaxVenues, setProMaxVenues] = useState(5);
  const [proMaxTables, setProMaxTables] = useState(30);
  const [proAnalytics, setProAnalytics] = useState(true);

  // Premium Tier Limits
  const [premiumMaxVenues, setPremiumMaxVenues] = useState(99);
  const [premiumMaxTables, setPremiumMaxTables] = useState(999);
  const [premiumAnalytics, setPremiumAnalytics] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl select-none animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2C2C4E]/20 pb-5">
        <div>
          <h2 className="text-xl font-bold font-serif text-white flex items-center space-x-2">
            <Sliders className="h-5 w-5 text-[#C9A84C]" />
            <span>SaaS Paket Limit Ayarları</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">Sistemdeki üyelik paketlerinin (Free, Pro, Premium) limitlerini ve sınırlarını belirleyin.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8 text-xs">
        {/* Package Tiers Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="bg-[#16162a]/60 border border-[#2C2C4E]/25 p-5 rounded-2xl shadow-md space-y-4">
            <h3 className="font-serif text-[14px] font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-[#2C2C4E]/15">
              Free Ücretsiz
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-gray-400 font-semibold block">Maksimum Restoran/Şube</label>
              <input 
                type="number" 
                value={freeMaxVenues} 
                onChange={(e) => setFreeMaxVenues(parseInt(e.target.value))}
                className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 font-semibold block">Maksimum Masa (Şube Başı)</label>
              <input 
                type="number" 
                value={freeMaxTables} 
                onChange={(e) => setFreeMaxTables(parseInt(e.target.value))}
                className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-[#2C2C4E]/15">
              <span className="text-gray-400 font-semibold">Gelişmiş Analitik Desteği</span>
              <input 
                type="checkbox" 
                checked={freeAnalytics} 
                onChange={(e) => setFreeAnalytics(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-[#2C2C4E]/40 bg-[#121224]"
              />
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-[#16162a]/60 border border-[#6366F1]/20 p-5 rounded-2xl shadow-md space-y-4 relative">
            <div className="absolute top-2 right-3 text-[9px] bg-[#6366F1]/10 text-indigo-400 border border-[#6366F1]/20 px-2 py-0.5 rounded-full font-bold uppercase">
              Popüler
            </div>
            <h3 className="font-serif text-[14px] font-bold text-indigo-400 uppercase tracking-wider pb-2 border-b border-[#2C2C4E]/15">
              Pro Ücretli
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-gray-400 font-semibold block">Maksimum Restoran/Şube</label>
              <input 
                type="number" 
                value={proMaxVenues} 
                onChange={(e) => setProMaxVenues(parseInt(e.target.value))}
                className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 font-semibold block">Maksimum Masa (Şube Başı)</label>
              <input 
                type="number" 
                value={proMaxTables} 
                onChange={(e) => setProMaxTables(parseInt(e.target.value))}
                className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-[#2C2C4E]/15">
              <span className="text-gray-400 font-semibold">Gelişmiş Analitik Desteği</span>
              <input 
                type="checkbox" 
                checked={proAnalytics} 
                onChange={(e) => setProAnalytics(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-[#2C2C4E]/40 bg-[#121224]"
              />
            </div>
          </div>

          {/* Premium Plan */}
          <div className="bg-[#16162a]/60 border border-[#C9A84C]/25 p-5 rounded-2xl shadow-md space-y-4 relative">
            <div className="absolute top-2 right-3 text-[9px] bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 px-2 py-0.5 rounded-full font-bold uppercase">
              Limit Yok
            </div>
            <h3 className="font-serif text-[14px] font-bold text-[#C9A84C] uppercase tracking-wider pb-2 border-b border-[#2C2C4E]/15">
              Premium Elit
            </h3>
            
            <div className="space-y-1.5">
              <label className="text-gray-400 font-semibold block">Maksimum Restoran/Şube</label>
              <input 
                type="number" 
                value={premiumMaxVenues} 
                onChange={(e) => setPremiumMaxVenues(parseInt(e.target.value))}
                className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 font-semibold block">Maksimum Masa (Şube Başı)</label>
              <input 
                type="number" 
                value={premiumMaxTables} 
                onChange={(e) => setPremiumMaxTables(parseInt(e.target.value))}
                className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-t border-[#2C2C4E]/15">
              <span className="text-gray-400 font-semibold">Gelişmiş Analitik Desteği</span>
              <input 
                type="checkbox" 
                checked={premiumAnalytics} 
                onChange={(e) => setPremiumAnalytics(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-[#2C2C4E]/40 bg-[#121224]"
              />
            </div>
          </div>
        </div>

        {/* Global settings */}
        <div className="bg-[#16162a]/60 border border-[#2C2C4E]/25 p-6 rounded-2xl space-y-4 shadow-lg">
          <h3 className="font-serif text-[15px] font-bold text-white flex items-center space-x-2 border-b border-[#2C2C4E]/15 pb-3">
            <Building2 className="h-4.5 w-4.5 text-[#C9A84C]" />
            <span>SaaS Global Platform Kuralları</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-gray-400 font-semibold">Varsayılan Para Birimi</label>
              <select className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors">
                <option value="TRY">Türk Lirası (TRY)</option>
                <option value="USD">Amerikan Doları (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-400 font-semibold">Sistem Varsayılan Dil</label>
              <select className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors">
                <option value="tr">Türkçe (TR)</option>
                <option value="en">İngilizce (EN)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save button banner */}
        <div className="flex items-center justify-between bg-[#121224]/50 border border-[#2C2C4E]/20 p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-gray-400">
            <Info className="h-4 w-4 text-[#C9A84C]" />
            <span>Ayarlar güncellendiğinde tüm üye işletmelere anında uygulanır.</span>
          </div>

          <button 
            type="submit"
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-xs shadow-lg transition-all duration-300 transform active:scale-98"
          >
            {isSaved ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Ayarlar Kaydedildi!</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Değişiklikleri Kaydet</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
