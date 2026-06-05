"use client";

import Link from "next/link";
import { QrCode, Utensils, Hotel, ArrowRight, Settings, Smartphone, Award, ShieldCheck, Globe, ShieldAlert } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden bg-[#1C1C28] min-h-screen text-white select-none">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#722F37]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#C9A84C]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl w-full text-center z-10 flex flex-col items-center">
        {/* Turkey-first Product Badge */}
        <div className="flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#722F37]/20 border border-[#C9A84C]/25 mb-6 text-xs text-[#C9A84C] font-semibold tracking-wide animate-pulse">
          <Award className="h-4.5 w-4.5" />
          <span>Türkiye'nin İlk Entegre Turizm QR Menü Platformu</span>
        </div>

        {/* Logo Icon */}
        <div className="h-16 w-16 bg-gradient-to-tr from-[#722F37] to-[#C9A84C] rounded-2xl flex items-center justify-center shadow-lg shadow-[#722F37]/20 mb-8 transform hover:rotate-12 transition-transform duration-300">
          <QrCode className="h-9 w-9 text-white" />
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 font-serif text-white">
          Tripzy <span className="text-[#C9A84C]">QR Menu</span>
        </h1>
        <p className="text-base md:text-lg text-gray-400 max-w-2xl mb-12 leading-relaxed">
          Otel ve restoranlar için i18n dil algılama, çevrimdışı PWA desteği ve Instagram görsel üretimi sunan elit QR menü altyapısı.
        </p>

        {/* Action Demo Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl mb-12">
          {/* Restaurant Demo */}
          <div className="bg-[#16213E]/45 border border-gray-800/40 p-6 rounded-2xl flex flex-col justify-between items-start text-left hover:border-[#C9A84C]/35 transition-all group duration-300 shadow-lg">
            <div>
              <div className="h-10 w-10 bg-[#722F37]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#722F37]/20 transition-colors">
                <Utensils className="h-5 w-5 text-[#C9A84C]" />
              </div>
              <h3 className="text-lg font-bold font-serif mb-2 text-white">Karaköy Lokantası</h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Mezeler, ana yemekler ve tatlılardan oluşan geleneksel Türk menüsü. i18n dil ve alerjen filtreleme.
              </p>
            </div>
            <Link 
              href="/menu?token=k1"
              className="flex items-center text-[#C9A84C] font-semibold text-xs group-hover:translate-x-1 transition-transform"
            >
              Menüyü Gör <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Hotel Room Demo */}
          <div className="bg-[#16213E]/45 border border-gray-800/40 p-6 rounded-2xl flex flex-col justify-between items-start text-left hover:border-[#C9A84C]/35 transition-all group duration-300 shadow-lg">
            <div>
              <div className="h-10 w-10 bg-[#C9A84C]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#C9A84C]/20 transition-colors">
                <Hotel className="h-5 w-5 text-[#C9A84C]" />
              </div>
              <h3 className="text-lg font-bold font-serif mb-2 text-white">Masa 3 (Teras)</h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Mekanımızın teras bölümündeki Masa 3 için özelleştirilmiş menü ve canlı garson çağırma.
              </p>
            </div>
            <Link 
              href="/menu?token=k3"
              className="flex items-center text-[#C9A84C] font-semibold text-xs group-hover:translate-x-1 transition-transform"
            >
              Teras Menüsünü Gör <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Admin Dashboard Demo */}
          <div className="bg-[#16213E]/45 border border-gray-800/40 p-6 rounded-2xl flex flex-col justify-between items-start text-left hover:border-[#C9A84C]/35 transition-all group duration-300 shadow-lg">
            <div>
              <div className="h-10 w-10 bg-[#722F37]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#722F37]/20 transition-colors">
                <Settings className="h-5 w-5 text-[#C9A84C]" />
              </div>
              <h3 className="text-lg font-bold font-serif mb-2 text-white">Yönetici Paneli</h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Menü içerikleri, stok durumu, masa QR kod etiketleri ve canlı analitik verilerinin yönetim paneli.
              </p>
            </div>
            <Link 
              href="/admin"
              className="flex items-center text-[#C9A84C] font-semibold text-xs group-hover:translate-x-1 transition-transform"
            >
              Paneli Aç <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Super Admin Dashboard Demo */}
          <div className="bg-[#16213E]/45 border border-gray-800/40 p-6 rounded-2xl flex flex-col justify-between items-start text-left hover:border-[#6366F1]/35 transition-all group duration-300 shadow-lg">
            <div>
              <div className="h-10 w-10 bg-[#6366F1]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#6366F1]/20 transition-colors">
                <ShieldAlert className="h-5 w-5 text-[#6366F1]" />
              </div>
              <h3 className="text-lg font-bold font-serif mb-2 text-white">Süper Yönetici</h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                SaaS platform yöneticileri için üye onboarding, plan limitleri ve genel platform istatistiklerinin yönetim paneli.
              </p>
            </div>
            <Link 
              href="/super-admin"
              className="flex items-center text-[#6366F1] font-semibold text-xs group-hover:translate-x-1 transition-transform"
            >
              Platformu Yönet <ArrowRight className="ml-1.5 h-3.5 w-3.5 text-[#6366F1]" />
            </Link>
          </div>
        </div>

        {/* Feature Highlights section */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-3xl border-t border-gray-800/40 pt-8 text-center text-xs text-gray-500 mb-12">
          <div className="flex flex-col items-center">
            <Smartphone className="h-5 w-5 mb-1.5 text-[#C9A84C]/60" />
            <span className="font-semibold text-white/80">PWA Çevrimdışı Desteği</span>
            <span className="text-[10px] mt-0.5">İnternetsiz de çalışır</span>
          </div>
          <div className="flex flex-col items-center">
            <Globe className="h-5 w-5 mb-1.5 text-[#C9A84C]/60" />
            <span className="font-semibold text-white/80">i18n Dil Algılama</span>
            <span className="text-[10px] mt-0.5">Otomatik TR/EN geçişi</span>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="h-5 w-5 mb-1.5 text-[#C9A84C]/60" />
            <span className="font-semibold text-white/80">SaaS Güvenliği</span>
            <span className="text-[10px] mt-0.5">Prisma + Supabase DB</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[10px] text-gray-600 w-full max-w-md font-mono">
          <p>Masa QR kod test token'ları: <span className="bg-gray-800/50 px-1.5 py-0.5 rounded text-gray-400">k1</span>, <span className="bg-gray-800/50 px-1.5 py-0.5 rounded text-gray-400">k2</span>, <span className="bg-gray-800/50 px-1.5 py-0.5 rounded text-gray-400">k3</span>, <span className="bg-gray-800/50 px-1.5 py-0.5 rounded text-gray-400">k4</span>, <span className="bg-gray-800/50 px-1.5 py-0.5 rounded text-gray-400">k5</span></p>
        </div>
      </div>
    </main>
  );
}

