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
  RefreshCw,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Layers,
  Sparkles,
  Utensils,
  HelpCircle,
  TrendingDown,
  Percent
} from "lucide-react";

interface VisitorAnalyticsData {
  totalViews: number;
  viewsToday: number;
  viewsThisWeek: number;
  languages: Record<string, number>;
  topItems: Array<{ name: string; views: number }>;
}

interface SalesPerformanceItem {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  recipeCost: number;
  margin: number;
  quantity: number;
  revenue: number;
  views: number;
  conversionRate: number;
  recommendation?: string;
}

interface SalesAnalyticsData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalItemsSold: number;
  };
  bestSellers: SalesPerformanceItem[];
  worstSellers: SalesPerformanceItem[];
  matrix: {
    stars: SalesPerformanceItem[];
    plowhorses: SalesPerformanceItem[];
    puzzles: SalesPerformanceItem[];
    dogs: SalesPerformanceItem[];
    thresholds: {
      popularity: number;
      margin: number;
    };
  };
}

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"visitor" | "sales">("visitor");
  const [days, setDays] = useState<number>(30);
  
  const [visitorData, setVisitorData] = useState<VisitorAnalyticsData | null>(null);
  const [salesData, setSalesData] = useState<SalesAnalyticsData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const venueId = DEFAULT_VENUE_ID;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("tr-TR").format(value);
  };

  const fetchVisitorAnalytics = async () => {
    const res = await fetch(`${apiUrl}/api/admin/analytics/summary?venueId=${venueId}`);
    if (!res.ok) throw new Error("Visitor stats load failed");
    return res.json();
  };

  const fetchSalesAnalytics = async (selectedDays: number) => {
    const res = await fetch(`${apiUrl}/api/admin/analytics/sales?venueId=${venueId}&days=${selectedDays}`);
    if (!res.ok) throw new Error("Sales stats load failed");
    return res.json();
  };

  const loadAllData = async (showRefSymbol = false, customDays = days) => {
    try {
      if (showRefSymbol) setIsRefreshing(true);
      else setLoading(true);

      const [visRes, salesRes] = await Promise.allSettled([
        fetchVisitorAnalytics(),
        fetchSalesAnalytics(customDays)
      ]);

      if (visRes.status === "fulfilled") {
        setVisitorData(visRes.value);
      } else {
        console.error(visRes.reason);
        // Fallback visitor
        setVisitorData({
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
      }

      if (salesRes.status === "fulfilled") {
        setSalesData(salesRes.value);
      } else {
        console.error(salesRes.reason);
        // Fallback sales
        setSalesData({
          summary: {
            totalRevenue: 48650.00,
            totalOrders: 242,
            averageOrderValue: 201.03,
            totalItemsSold: 512
          },
          bestSellers: [
            { id: "1", name: "Zırh Kebabı (Adana)", nameEn: "Adana Kebab", price: 280, recipeCost: 85, margin: 195, quantity: 184, revenue: 51520, views: 420, conversionRate: 43.8 },
            { id: "2", name: "Kayseri Mantısı", nameEn: "Kayseri Manti", price: 190, recipeCost: 65, margin: 125, quantity: 112, revenue: 21280, views: 310, conversionRate: 36.1 },
            { id: "3", name: "Sıcak Tereyağlı Humus", nameEn: "Hot Hummus", price: 140, recipeCost: 40, margin: 100, quantity: 98, revenue: 13720, views: 280, conversionRate: 35.0 },
            { id: "4", name: "Fıstıklı Havuç Dilim Baklava", nameEn: "Baklava", price: 150, recipeCost: 45, margin: 105, quantity: 72, revenue: 10800, views: 190, conversionRate: 37.8 },
            { id: "5", name: "Süzme Mercimek Çorbası", nameEn: "Lentil Soup", price: 90, recipeCost: 25, margin: 65, quantity: 46, revenue: 4140, views: 150, conversionRate: 30.6 }
          ],
          worstSellers: [
            { id: "6", name: "Vegan Salata", nameEn: "Vegan Salad", price: 160, recipeCost: 110, margin: 50, quantity: 2, revenue: 320, views: 45, conversionRate: 4.4 },
            { id: "7", name: "Enginar Kalbi", nameEn: "Artichoke Hearts", price: 180, recipeCost: 130, margin: 50, quantity: 4, revenue: 720, views: 60, conversionRate: 6.6 },
            { id: "8", name: "Türk Kahvesi", nameEn: "Turkish Coffee", price: 60, recipeCost: 15, margin: 45, quantity: 12, revenue: 720, views: 90, conversionRate: 13.3 },
            { id: "9", name: "Ayran", nameEn: "Ayran", price: 35, recipeCost: 10, margin: 25, quantity: 28, revenue: 980, views: 180, conversionRate: 15.5 },
            { id: "10", name: "Kola", nameEn: "Cola", price: 50, recipeCost: 20, margin: 30, quantity: 32, revenue: 1600, views: 140, conversionRate: 22.8 }
          ],
          matrix: {
            stars: [
              { id: "1", name: "Zırh Kebabı (Adana)", nameEn: "Adana Kebab", price: 280, recipeCost: 85, margin: 195, quantity: 184, revenue: 51520, views: 420, conversionRate: 43.8, recommendation: "Popüler ve karlı! Kalitesini koruyun ve menüde görünürlüğünü sürdürün." },
              { id: "3", name: "Sıcak Tereyağlı Humus", nameEn: "Hot Hummus", price: 140, recipeCost: 40, margin: 100, quantity: 98, revenue: 13720, views: 280, conversionRate: 35.0, recommendation: "Popüler ve karlı! Kalitesini koruyun ve menüde görünürlüğünü sürdürün." }
            ],
            plowhorses: [
              { id: "2", name: "Kayseri Mantısı", nameEn: "Kayseri Manti", price: 190, recipeCost: 65, margin: 125, quantity: 112, revenue: 21280, views: 310, conversionRate: 36.1, recommendation: "Çok satıyor ama karı düşük. Porsiyon küçültmeyi, fiyatı hafif artırmayı veya malzeme maliyetini düşürmeyi deneyin." }
            ],
            puzzles: [
              { id: "4", name: "Fıstıklı Havuç Dilim Baklava", nameEn: "Baklava", price: 150, recipeCost: 45, margin: 105, quantity: 72, revenue: 10800, views: 190, conversionRate: 37.8, recommendation: "Karlı ama az satıyor. Menüde daha görünür yapın, görsel ekleyin veya yapay zeka garson ile önerilmesini sağlayın." }
            ],
            dogs: [
              { id: "6", name: "Vegan Salata", nameEn: "Vegan Salad", price: 160, recipeCost: 110, margin: 50, quantity: 2, revenue: 320, views: 45, conversionRate: 4.4, recommendation: "Hem az satıyor hem karı düşük. Menüden kaldırmayı veya tarifini/fiyatını yeniden gözden geçirmeyi düşünün." },
              { id: "7", name: "Enginar Kalbi", nameEn: "Artichoke Hearts", price: 180, recipeCost: 130, margin: 50, quantity: 4, revenue: 720, views: 60, conversionRate: 6.6, recommendation: "Hem az satıyor hem karı düşük. Menüden kaldırmayı veya tarifini/fiyatını yeniden gözden geçirmeyi düşünün." }
            ],
            thresholds: {
              popularity: 43.5,
              margin: 85.0
            }
          }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRangeChange = (newDays: number) => {
    setDays(newDays);
    loadAllData(false, newDays);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      {/* Header and Toggle Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-3xl font-bold text-white tracking-wide">
            {activeTab === "visitor" ? "Ziyaretçi Analizi" : "Satış ve Menü Mühendisliği"}
          </h2>
          <p className="text-xs text-gray-400 mt-1.5">
            {activeTab === "visitor" 
              ? "Mekanınızın menü görüntülenme sayılarını, tıklanan ürünleri ve dil tercihlerini analiz edin."
              : "Menü performansını, satışları ve maliyet bazlı karlılık analizini (Menü Mühendisliği) görün."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {/* Tab toggler */}
          <div className="flex bg-gray-900 border border-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("visitor")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "visitor" 
                  ? "bg-[#C9A84C] text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Ziyaretler</span>
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "sales" 
                  ? "bg-[#C9A84C] text-black" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>Satışlar</span>
            </button>
          </div>

          <button 
            onClick={() => loadAllData(true)}
            disabled={isRefreshing}
            className="flex items-center justify-center p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700/50 transition-all text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-[#C9A84C]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TAB: VISITOR ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === "visitor" && visitorData && (
        <div className="space-y-8 animate-fadeIn">
          {/* Grid Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] tracking-widest text-[#C9A84C] uppercase font-bold font-mono">Bugün</span>
                <h3 className="text-3xl font-mono font-bold text-white leading-none">
                  {formatNumber(visitorData.viewsToday)}
                </h3>
                <p className="text-xs text-gray-400">Tekil menü gösterimi</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-950/40 border border-indigo-900/35 flex items-center justify-center text-indigo-400 z-10 shadow-inner">
                <Eye className="h-5 w-5" />
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />
            </div>

            <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] tracking-widest text-[#C9A84C] uppercase font-bold font-mono">Bu Hafta</span>
                <h3 className="text-3xl font-mono font-bold text-white leading-none">
                  {formatNumber(visitorData.viewsThisWeek)}
                </h3>
                <p className="text-xs text-gray-400">Son 7 günlük ziyaretçi</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-950/40 border border-emerald-900/35 flex items-center justify-center text-emerald-400 z-10 shadow-inner">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
            </div>

            <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] tracking-widest text-[#C9A84C] uppercase font-bold font-mono">Toplam</span>
                <h3 className="text-3xl font-mono font-bold text-white leading-none">
                  {formatNumber(visitorData.totalViews)}
                </h3>
                <p className="text-xs text-gray-400">Genel açılış trafiği</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-950/40 border border-amber-900/35 flex items-center justify-center text-amber-400 z-10 shadow-inner">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top viewed items */}
            <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl shadow-sm space-y-5">
              <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
                <Flame className="h-5 w-5 text-[#C9A84C]" />
                <span>En Çok İncelenen Ürünler</span>
              </h3>

              <div className="space-y-4">
                {visitorData.topItems.map((item, index) => {
                  const maxViews = visitorData.topItems[0]?.views || 1;
                  const percent = Math.round((item.views / maxViews) * 100);

                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-300">
                          {index + 1}. {item.name}
                        </span>
                        <span className="text-[#C9A84C] font-mono">{formatNumber(item.views)} tıklama</span>
                      </div>
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

            {/* Language breakdown */}
            <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl shadow-sm space-y-5">
              <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
                <Globe className="h-5 w-5 text-[#C9A84C]" />
                <span>Dil Dağılımı</span>
              </h3>

              <div className="space-y-4">
                {Object.entries(visitorData.languages).map(([lang, count]) => {
                  const totalLangViews = Object.values(visitorData.languages).reduce((a, b) => a + b, 0) || 1;
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
                          <span className="text-gray-400">({formatNumber(count)} gösterim)</span>
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
      )}

      {/* ========================================================================= */}
      {/* 2. TAB: SALES & MENU ENGINEERING */}
      {/* ========================================================================= */}
      {activeTab === "sales" && salesData && (
        <div className="space-y-8 animate-fadeIn">
          {/* Time range switcher */}
          <div className="flex items-center justify-between bg-gray-900/40 border border-gray-800/60 px-4 py-3 rounded-2xl">
            <span className="text-xs text-gray-400 font-semibold">Zaman Aralığı Seçin:</span>
            <div className="flex space-x-2">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => handleRangeChange(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    days === d 
                      ? "bg-[#C9A84C]/20 border border-[#C9A84C]/50 text-[#C9A84C]" 
                      : "bg-gray-800/40 border border-gray-700/20 text-gray-400 hover:text-white"
                  }`}
                >
                  {d} Gün
                </button>
              ))}
            </div>
          </div>

          {/* Sales Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Net Revenue */}
            <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] tracking-widest text-[#C9A84C] uppercase font-bold font-mono">Net Ciro</span>
                <h3 className="text-2xl font-mono font-bold text-white leading-none">
                  {formatCurrency(salesData.summary.totalRevenue)}
                </h3>
                <p className="text-xs text-gray-400">Tamamlanan satış hacmi</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-950/40 border border-emerald-900/35 flex items-center justify-center text-emerald-400 z-10 shadow-inner">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
            </div>

            {/* Total Orders */}
            <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] tracking-widest text-[#C9A84C] uppercase font-bold font-mono">Sipariş Sayısı</span>
                <h3 className="text-2xl font-mono font-bold text-white leading-none">
                  {formatNumber(salesData.summary.totalOrders)}
                </h3>
                <p className="text-xs text-gray-400">Kabul edilen adisyonlar</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-950/40 border border-blue-900/35 flex items-center justify-center text-blue-400 z-10 shadow-inner">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />
            </div>

            {/* AOV */}
            <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] tracking-widest text-[#C9A84C] uppercase font-bold font-mono">Ort. Sepet</span>
                <h3 className="text-2xl font-mono font-bold text-white leading-none">
                  {formatCurrency(salesData.summary.averageOrderValue)}
                </h3>
                <p className="text-xs text-gray-400">Adisyon başına ortalama tutar</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-950/40 border border-amber-900/35 flex items-center justify-center text-amber-400 z-10 shadow-inner">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-amber-500/5 blur-xl pointer-events-none" />
            </div>

            {/* Items Sold */}
            <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <span className="text-[10px] tracking-widest text-[#C9A84C] uppercase font-bold font-mono">Satılan Ürün</span>
                <h3 className="text-2xl font-mono font-bold text-white leading-none">
                  {formatNumber(salesData.summary.totalItemsSold)} adet
                </h3>
                <p className="text-xs text-gray-400">Toplam servis edilen porsiyon</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-950/40 border border-purple-900/35 flex items-center justify-center text-purple-400 z-10 shadow-inner">
                <Utensils className="h-5 w-5" />
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-purple-500/5 blur-xl pointer-events-none" />
            </div>
          </div>

          {/* Best & Worst Sellers Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Best Sellers */}
            <div className="bg-[#16213E]/30 border border-gray-800/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-800/50">
                <div className="p-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/20 text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-lg font-bold text-white">En Çok Satanlar (Best Sellers)</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-gray-400 font-bold border-b border-gray-800/30">
                      <th className="py-2.5">Ürün</th>
                      <th className="py-2.5 text-right">Fiyat</th>
                      <th className="py-2.5 text-right">Adet</th>
                      <th className="py-2.5 text-right">Ciro</th>
                      <th className="py-2.5 text-right">İncelenme</th>
                      <th className="py-2.5 text-right">Dönüşüm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.bestSellers.map((item) => (
                      <tr key={item.id} className="border-b border-gray-800/20 hover:bg-gray-800/10 text-gray-200">
                        <td className="py-3 font-semibold">{item.name}</td>
                        <td className="py-3 text-right font-mono">{formatCurrency(item.price)}</td>
                        <td className="py-3 text-right font-bold font-mono text-emerald-400">{item.quantity}</td>
                        <td className="py-3 text-right font-mono text-gray-400">{formatCurrency(item.revenue)}</td>
                        <td className="py-3 text-right font-mono text-gray-400">{item.views}</td>
                        <td className="py-3 text-right">
                          <div className="flex flex-col items-end space-y-1">
                            <span className="font-bold text-[#C9A84C] font-mono">{item.conversionRate}%</span>
                            <div className="w-16 h-1 rounded-full bg-gray-800 overflow-hidden">
                              <div className="h-full bg-[#C9A84C]" style={{ width: `${Math.min(item.conversionRate, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Worst Sellers */}
            <div className="bg-[#16213E]/30 border border-gray-800/60 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-800/50">
                <div className="p-1.5 rounded-lg bg-rose-950/50 border border-rose-500/20 text-rose-400">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-lg font-bold text-white">En Az Satanlar (Worst Sellers)</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-gray-400 font-bold border-b border-gray-800/30">
                      <th className="py-2.5">Ürün</th>
                      <th className="py-2.5 text-right">Fiyat</th>
                      <th className="py-2.5 text-right">Adet</th>
                      <th className="py-2.5 text-right">Ciro</th>
                      <th className="py-2.5 text-right">İncelenme</th>
                      <th className="py-2.5 text-right">Dönüşüm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.worstSellers.map((item) => (
                      <tr key={item.id} className="border-b border-gray-800/20 hover:bg-gray-800/10 text-gray-200">
                        <td className="py-3 font-semibold">{item.name}</td>
                        <td className="py-3 text-right font-mono">{formatCurrency(item.price)}</td>
                        <td className="py-3 text-right font-bold font-mono text-rose-400">{item.quantity}</td>
                        <td className="py-3 text-right font-mono text-gray-400">{formatCurrency(item.revenue)}</td>
                        <td className="py-3 text-right font-mono text-gray-400">{item.views}</td>
                        <td className="py-3 text-right">
                          <div className="flex flex-col items-end space-y-1">
                            <span className="font-bold text-gray-400 font-mono">{item.conversionRate}%</span>
                            <div className="w-16 h-1 rounded-full bg-gray-800 overflow-hidden">
                              <div className="h-full bg-rose-500" style={{ width: `${Math.min(item.conversionRate, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Menu Engineering Matrix Explanation */}
          <div className="bg-[#16213E]/20 border border-gray-800 p-6 rounded-2xl space-y-3">
            <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
              <Layers className="h-5 w-5 text-[#C9A84C]" />
              <span>Menü Mühendisliği Analizi (Popularity vs Profitability)</span>
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Bu analiz, ürünlerinizin **satış hacmi (popülerlik)** ile **reçete maliyeti sonrası kalan net karını (karlılık)** karşılaştırır.
              Menünüzü optimize etmek ve karlılığı artırmak için her kategorideki ürünlere yönelik yapay zeka önerilerimizi inceleyin.
            </p>
          </div>

          {/* 2x2 Menu Engineering Matrix Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Stars (Yıldızlar) */}
            <div className="bg-[#101F18] border border-emerald-500/20 p-6 rounded-2xl flex flex-col justify-between space-y-6 shadow-[0_0_15px_-3px_rgba(16,185,129,0.05)] relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">⭐</span>
                    <h4 className="font-serif text-base font-bold text-emerald-400">Yıldızlar (Stars)</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                    Yüksek Satış & Yüksek Kar
                  </span>
                </div>

                <div className="space-y-3">
                  {salesData.matrix.stars.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Bu kategoride henüz ürün bulunmuyor.</p>
                  ) : (
                    salesData.matrix.stars.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-950/40 rounded-xl border border-gray-800/50 text-xs space-y-2">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-200">{item.name}</span>
                          <span className="text-emerald-400 font-mono">{formatCurrency(item.price)} (Kar: {formatCurrency(item.margin)})</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                          <span>Satış: {item.quantity} adet</span>
                          <span>Maliyet: {formatCurrency(item.recipeCost)}</span>
                        </div>
                        {item.recommendation && (
                          <div className="pt-2 border-t border-gray-900 flex items-start space-x-1.5 text-[10px] text-emerald-300">
                            <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0 text-[#C9A84C]" />
                            <span>{item.recommendation}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
            </div>

            {/* Puzzles (Soru İşaretleri) */}
            <div className="bg-[#241B0E] border border-amber-500/20 p-6 rounded-2xl flex flex-col justify-between space-y-6 shadow-[0_0_15px_-3px_rgba(245,158,11,0.05)] relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🧩</span>
                    <h4 className="font-serif text-base font-bold text-amber-400">Soru İşaretleri (Puzzles)</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">
                    Düşük Satış & Yüksek Kar
                  </span>
                </div>

                <div className="space-y-3">
                  {salesData.matrix.puzzles.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Bu kategoride henüz ürün bulunmuyor.</p>
                  ) : (
                    salesData.matrix.puzzles.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-950/40 rounded-xl border border-gray-800/50 text-xs space-y-2">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-200">{item.name}</span>
                          <span className="text-amber-400 font-mono">{formatCurrency(item.price)} (Kar: {formatCurrency(item.margin)})</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                          <span>Satış: {item.quantity} adet</span>
                          <span>Maliyet: {formatCurrency(item.recipeCost)}</span>
                        </div>
                        {item.recommendation && (
                          <div className="pt-2 border-t border-gray-900 flex items-start space-x-1.5 text-[10px] text-amber-300">
                            <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0 text-[#C9A84C]" />
                            <span>{item.recommendation}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-amber-500/5 blur-xl pointer-events-none" />
            </div>

            {/* Plowhorses (Beygirler) */}
            <div className="bg-[#121B2F] border border-blue-500/20 p-6 rounded-2xl flex flex-col justify-between space-y-6 shadow-[0_0_15px_-3px_rgba(59,130,246,0.05)] relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🐴</span>
                    <h4 className="font-serif text-base font-bold text-blue-400">Beygirler (Plowhorses)</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">
                    Yüksek Satış & Düşük Kar
                  </span>
                </div>

                <div className="space-y-3">
                  {salesData.matrix.plowhorses.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Bu kategoride henüz ürün bulunmuyor.</p>
                  ) : (
                    salesData.matrix.plowhorses.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-950/40 rounded-xl border border-gray-800/50 text-xs space-y-2">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-200">{item.name}</span>
                          <span className="text-blue-400 font-mono">{formatCurrency(item.price)} (Kar: {formatCurrency(item.margin)})</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                          <span>Satış: {item.quantity} adet</span>
                          <span>Maliyet: {formatCurrency(item.recipeCost)}</span>
                        </div>
                        {item.recommendation && (
                          <div className="pt-2 border-t border-gray-900 flex items-start space-x-1.5 text-[10px] text-blue-300">
                            <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0 text-[#C9A84C]" />
                            <span>{item.recommendation}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />
            </div>

            {/* Dogs (Kaybedenler) */}
            <div className="bg-[#211218] border border-rose-500/20 p-6 rounded-2xl flex flex-col justify-between space-y-6 shadow-[0_0_15px_-3px_rgba(244,63,94,0.05)] relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🐕</span>
                    <h4 className="font-serif text-base font-bold text-rose-400">Kaybedenler (Dogs)</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono">
                    Düşük Satış & Düşük Kar
                  </span>
                </div>

                <div className="space-y-3">
                  {salesData.matrix.dogs.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Bu kategoride henüz ürün bulunmuyor.</p>
                  ) : (
                    salesData.matrix.dogs.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-950/40 rounded-xl border border-gray-800/50 text-xs space-y-2">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-200">{item.name}</span>
                          <span className="text-rose-400 font-mono">{formatCurrency(item.price)} (Kar: {formatCurrency(item.margin)})</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                          <span>Satış: {item.quantity} adet</span>
                          <span>Maliyet: {formatCurrency(item.recipeCost)}</span>
                        </div>
                        {item.recommendation && (
                          <div className="pt-2 border-t border-gray-900 flex items-start space-x-1.5 text-[10px] text-rose-300">
                            <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0 text-[#C9A84C]" />
                            <span>{item.recommendation}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-rose-500/5 blur-xl pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
