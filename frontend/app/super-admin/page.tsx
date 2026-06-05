"use client";

import React, { useEffect, useState } from "react";
import { 
  Building2, 
  MapPin, 
  QrCode, 
  Eye, 
  Activity, 
  TrendingUp, 
  Globe2, 
  Loader2 
} from "lucide-react";

interface StatsData {
  totalOrganizations: number;
  activeOrganizations: number;
  totalVenues: number;
  totalTables: number;
  totalViews: number;
  viewsByLocale: Record<string, number>;
  viewsByDay: Record<string, number>;
  organizationPlanDistribution: Record<string, number>;
}

export default function SuperAdminPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${apiUrl}/api/super-admin/stats`);
        if (!res.ok) throw new Error("Failed to fetch platform statistics");
        const data = await res.json();
        setStats(data);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C] mb-4" />
        <p className="text-sm font-medium">Platform analitik verileri yükleniyor...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="h-14 w-14 bg-red-950/20 border border-red-900/40 rounded-full flex items-center justify-center mb-4 text-red-400">
          ⚠️
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Hata Oluştu</h3>
        <p className="text-sm text-gray-400 max-w-sm mb-6">{error || "Veriler alınamadı."}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-xs shadow-lg transition-all duration-300"
        >
          Yeniden Dene
        </button>
      </div>
    );
  }

  const cards = [
    { name: "Toplam Üye İşletme", val: stats.totalOrganizations, label: `Aktif: ${stats.activeOrganizations}`, icon: Building2, color: "from-[#3B82F6]/10 to-[#3B82F6]/5", iconColor: "text-blue-400" },
    { name: "Toplam Şube / Restoran", val: stats.totalVenues, label: "Platform Geneli", icon: MapPin, color: "from-[#10B981]/10 to-[#10B981]/5", iconColor: "text-emerald-400" },
    { name: "Aktif Masa & Konum", val: stats.totalTables, label: "Tüm QR Kod Üretimleri", icon: QrCode, color: "from-[#F59E0B]/10 to-[#F59E0B]/5", iconColor: "text-[#C9A84C]" },
    { name: "Menü Görüntüleme", val: stats.totalViews, label: "Canlı Analizler", icon: Eye, color: "from-[#6366F1]/10 to-[#6366F1]/5", iconColor: "text-indigo-400" },
  ];

  return (
    <div className="space-y-8 animate-fade-in select-none">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-[#16162a]/90 to-[#121224]/50 border border-[#2C2C4E]/30 p-6 md:p-8 rounded-2xl relative overflow-hidden shadow-lg">
        <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[150%] bg-[#6366F1]/5 rounded-full blur-[90px] pointer-events-none" />
        <div className="z-10">
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-white tracking-wide">
            Hoş Geldiniz, <span className="text-[#C9A84C]">DevOps Admin</span>!
          </h1>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed max-w-xl">
            Tripzy QR Menu SaaS platformunun genel sağlık durumunu, aktif üyeleri, fatura plan dağılımını ve menü gösterim analitiklerini buradan izleyebilirsiniz.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2 bg-[#1d1d3a]/60 border border-[#2c2c4e]/30 px-4 py-2.5 rounded-xl text-xs text-emerald-400 font-semibold z-10 w-fit">
          <Activity className="h-4.5 w-4.5 animate-pulse" />
          <span>SaaS Altyapısı Aktif & Sağlıklı</span>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div 
              key={i}
              className={`bg-gradient-to-br ${c.color} border border-[#2C2C4E]/20 p-6 rounded-2xl flex items-center justify-between shadow-md hover:border-[#C9A84C]/25 transition-all duration-300`}
            >
              <div>
                <span className="text-xs text-gray-400 font-medium tracking-wide">{c.name}</span>
                <h3 className="text-3xl font-bold text-white font-mono mt-1.5 tracking-tight">{c.val}</h3>
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mt-1">{c.label}</span>
              </div>
              <div className={`h-12 w-12 bg-[#121224]/75 rounded-xl border border-[#2C2C4E]/40 flex items-center justify-center shadow-inner ${c.iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Plan Distribution */}
        <div className="bg-[#16162a]/60 border border-[#2C2C4E]/25 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#2C2C4E]/25 pb-4 mb-6">
            <h3 className="font-serif text-[16px] font-bold text-white flex items-center space-x-2">
              <TrendingUp className="h-4.5 w-4.5 text-[#C9A84C]" />
              <span>Fatura Plan Dağılımı</span>
            </h3>
            <span className="text-[10px] bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/15 px-2 py-0.5 rounded-full font-semibold">Tüm Tenants</span>
          </div>

          <div className="space-y-4">
            {Object.entries(stats.organizationPlanDistribution).map(([plan, count]) => {
              const total = Math.max(1, Object.values(stats.organizationPlanDistribution).reduce((a, b) => a + b, 0));
              const pct = Math.round((count / total) * 100);
              const barColor = plan === "premium" 
                ? "bg-[#C9A84C]" 
                : plan === "pro" 
                  ? "bg-[#6366F1]" 
                  : "bg-gray-600";

              return (
                <div key={plan} className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="capitalize text-gray-300 font-serif">{plan} Planı</span>
                    <span className="text-white font-mono">{count} Üye ({pct}%)</span>
                  </div>
                  <div className="w-full bg-[#121224] h-2.5 rounded-full overflow-hidden border border-[#2C2C4E]/10">
                    <div className={`${barColor} h-full rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Views by Locale */}
        <div className="bg-[#16162a]/60 border border-[#2C2C4E]/25 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between border-b border-[#2C2C4E]/25 pb-4 mb-6">
            <h3 className="font-serif text-[16px] font-bold text-white flex items-center space-x-2">
              <Globe2 className="h-4.5 w-4.5 text-[#6366F1]" />
              <span>Dil Dağılım Oranları (i18n)</span>
            </h3>
            <span className="text-[10px] bg-[#6366F1]/10 text-indigo-400 border border-[#6366F1]/15 px-2 py-0.5 rounded-full font-semibold">Görüntüleme</span>
          </div>

          <div className="space-y-4">
            {Object.keys(stats.viewsByLocale).length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">Henüz dil analitik verisi bulunmuyor.</p>
            ) : (
              Object.entries(stats.viewsByLocale).map(([locale, count]) => {
                const total = Math.max(1, Object.values(stats.viewsByLocale).reduce((a, b) => a + b, 0));
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={locale} className="flex items-center justify-between bg-[#121224]/60 border border-[#2C2C4E]/10 px-4 py-3.5 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{locale === "tr" ? "🇹🇷" : "🇬🇧"}</span>
                      <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">{locale}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-white font-mono">{count} Gösterim</span>
                      <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">{pct}% Oran</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
