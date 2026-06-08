"use client";

import { DEFAULT_VENUE_ID } from "@/lib/config";

import React, { useEffect, useState } from "react";
import { 
  BarChart3, 
  Eye, 
  Calendar, 
  TrendingUp, 
  Globe, 
  Flame, 
  Loader2,
  RefreshCw
} from "lucide-react";

interface AnalyticsData {
  totalViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  languages: Record<string, number>;
  topItems: Array<{ name: string; views: number }>;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const venueId = DEFAULT_VENUE_ID;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const fetchAnalytics = async (showRefSymbol = false) => {
    try {
      if (showRefSymbol) setIsRefreshing(true);
      else setLoading(true);

      const res = await fetch(`${apiUrl}/api/admin/analytics/summary?venueId=${venueId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
      // Fallback mockup
      setData({
        totalViews: 1240,
        viewsToday: 48,
        viewsThisWeek: 312,
        languages: { tr: 780, en: 460 },
        topItems: [
          { name: "Zırh Kebabı (Adana)", views: 340 },
          { name: "Sıcak Tereyağlı Humus", views: 280 },
          { name: "Kayseri Mantısı", views: 210 },
          { name: "Fıstıklı Havuç Dilim Baklava", views: 180 },
          { name: "Süzme Mercimek Çorbası", views: 120 }
        ]
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  // Compute percentages for language breakdown
  const totalLangViews = Object.values(data.languages).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-8 select-none">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-serif text-2xl font-bold">Ziyaret İstatistikleri</h2>
          <p className="text-xs text-gray-400 mt-1">Mekanınızın menü görüntülenme sayılarını, tıklanan ürünleri ve dil tercihlerini analiz edin.</p>
        </div>
        
        <button 
          onClick={() => fetchAnalytics(true)}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold border border-gray-700/50 transition-all text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#C9A84C]" : ""}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <span className="text-[10px] tracking-widest text-[#C9A84C] uppercase font-bold font-mono">Bugün</span>
            <h3 className="text-3xl font-mono font-bold text-white leading-none">
              {data.viewsToday}
            </h3>
            <p className="text-xs text-gray-400">Tekil menü gösterimi</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-950/40 border border-indigo-900/35 flex items-center justify-center text-indigo-400 z-10 shadow-inner">
            <Eye className="h-5 w-5" />
          </div>
          {/* Subtle background glow */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
        </div>

        {/* Card 2 */}
        <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <span className="text-[10px] tracking-widest text-[#C9A84C] uppercase font-bold font-mono">Bu Hafta</span>
            <h3 className="text-3xl font-mono font-bold text-white leading-none">
              {data.viewsThisWeek}
            </h3>
            <p className="text-xs text-gray-400">Son 7 günlük ziyaretçi</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-950/40 border border-emerald-900/35 flex items-center justify-center text-emerald-400 z-10 shadow-inner">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
        </div>

        {/* Card 3 */}
        <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <span className="text-[10px] tracking-widest text-[#C9A84C] uppercase font-bold font-mono">Toplam</span>
            <h3 className="text-3xl font-mono font-bold text-white leading-none">
              {data.totalViews}
            </h3>
            <p className="text-xs text-gray-400">Genel açılış trafiği</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-950/40 border border-amber-900/35 flex items-center justify-center text-amber-400 z-10 shadow-inner">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
        </div>
      </div>

      {/* Detail Analytics sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Popular items progress chart */}
        <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl shadow-sm space-y-5">
          <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
            <Flame className="h-5 w-5 text-[#C9A84C]" />
            <span>En Çok İncelenen Ürünler</span>
          </h3>

          <div className="space-y-4">
            {data.topItems.map((item, index) => {
              // Calculate percent relative to top item views
              const maxViews = data.topItems[0]?.views || 1;
              const percent = Math.round((item.views / maxViews) * 100);

              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-300">
                      {index + 1}. {item.name}
                    </span>
                    <span className="text-[#C9A84C] font-mono">{item.views} tıklama</span>
                  </div>
                  {/* Custom Premium progress bar */}
                  <div className="w-full h-2 rounded-full bg-[#1C1C28] overflow-hidden border border-gray-800/30">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Language preference details */}
        <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl shadow-sm space-y-5">
          <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
            <Globe className="h-5 w-5 text-[#C9A84C]" />
            <span>Dil Dağılımı</span>
          </h3>

          <div className="space-y-4">
            {Object.entries(data.languages).map(([lang, count]) => {
              const pct = Math.round((count / totalLangViews) * 100);
              const langName = lang === "tr" ? "Türkçe" : lang === "en" ? "English" : lang.toUpperCase();
              
              return (
                <div key={lang} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center space-x-2">
                      <span className="h-2 w-2 rounded-full bg-[#C9A84C]" />
                      <span className="text-white">{langName}</span>
                    </div>
                    <div className="font-mono space-x-2">
                      <span className="text-gray-400">({count} gösterim)</span>
                      <span className="text-[#C9A84C]">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[#1C1C28] overflow-hidden border border-gray-800/30">
                    <div 
                      className="h-full rounded-full bg-[#C9A84C]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
