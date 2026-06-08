"use client";

import { DEFAULT_VENUE_ID } from "@/lib/config";

import React, { useEffect, useState } from "react";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  Settings, 
  RefreshCw, 
  ChevronRight, 
  DollarSign,
  Info,
  Loader2,
  Check
} from "lucide-react";

interface ProfitabilityItem {
  menuItemId: string;
  menuItemName: string;
  menuPrice: string;
  recipeCost: string;
  margin: string;
  targetMargin: string;
  marginDeviation: string;
  suggestedPrice: string;
  status: "healthy" | "warning" | "critical";
}

interface ProfitabilitySummary {
  venueId: string;
  totalMenuItems: number;
  itemsWithRecipes: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  averageMargin: string;
  items: ProfitabilityItem[];
}

interface PricingAlert {
  id: string;
  venueId: string;
  menuItemId: string;
  menuItemName: string | null;
  recipeId: string;
  alertType: string;
  message: string;
  currentMargin: string;
  targetMargin: string;
  suggestedPrice: string | null;
  isResolved: boolean;
  createdAt: string;
}

interface AlertRule {
  id: string;
  venueId: string;
  swingThreshold: string;
  stockDeductionMode: "auto" | "manual";
  autoSyncEnabled: boolean;
  isActive: boolean;
}

export default function AdminProfitabilityPage() {
  const venueId = DEFAULT_VENUE_ID; // Seed default
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const [summary, setSummary] = useState<ProfitabilitySummary | null>(null);
  const [alerts, setAlerts] = useState<PricingAlert[]>([]);
  const [rule, setRule] = useState<AlertRule | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Rule form states
  const [swingThreshold, setSwingThreshold] = useState("0.05");
  const [deductionMode, setDeductionMode] = useState<"auto" | "manual">("manual");
  const [autoSync, setAutoSync] = useState(false);
  const [ruleActive, setRuleActive] = useState(true);
  const [savingRule, setSavingRule] = useState(false);

  // Sync Modal states
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncingPrices, setSyncingPrices] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profRes, alertsRes, ruleRes] = await Promise.all([
        fetch(`${apiUrl}/api/admin/inventory/profitability?venueId=${venueId}`),
        fetch(`${apiUrl}/api/admin/inventory/alerts?venueId=${venueId}`),
        fetch(`${apiUrl}/api/admin/inventory/alert-rules?venueId=${venueId}`)
      ]);

      if (profRes.ok) setSummary(await profRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (ruleRes.ok) {
        const ruleData: AlertRule = await ruleRes.json();
        setRule(ruleData);
        setSwingThreshold(ruleData.swingThreshold);
        setDeductionMode(ruleData.stockDeductionMode);
        setAutoSync(ruleData.autoSyncEnabled);
        setRuleActive(ruleData.isActive);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/inventory/alerts/${alertId}/resolve`, {
        method: "PUT"
      });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingRule(true);
      const payload = {
        swingThreshold: parseFloat(swingThreshold),
        stockDeductionMode: deductionMode,
        autoSyncEnabled: autoSync,
        isActive: ruleActive
      };

      const res = await fetch(`${apiUrl}/api/admin/inventory/alert-rules?venueId=${venueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setRule(updated);
        alert("Kural ayarları başarıyla güncellendi.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingRule(false);
    }
  };

  const handleSyncPrices = async () => {
    if (!summary) return;
    const itemsToSync = summary.items.filter(item => item.status !== "healthy");
    if (itemsToSync.length === 0) return;

    try {
      setSyncingPrices(true);
      const payload = {
        menuItemIds: itemsToSync.map(item => item.menuItemId),
        syncType: "suggested"
      };

      const res = await fetch(`${apiUrl}/api/admin/inventory/sync-prices?venueId=${venueId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSyncModalOpen(false);
        fetchData();
        alert("Yeni fiyatlar dijital QR menü ile başarıyla eşitlendi.");
      } else {
        alert("Fiyat eşitleme başarısız oldu.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingPrices(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  // Find non-healthy items to sync
  const itemsToSync = summary ? summary.items.filter(item => item.status !== "healthy") : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white">Menü Kârlılık Analizi</h2>
          <p className="text-xs text-gray-400 mt-1">
            Maliyetlerdeki dalgalanmaları takip edin ve menü fiyatlarınızı kâr hedeflerinize göre senkronize edin.
          </p>
        </div>
        <div>
          {itemsToSync.length > 0 && (
            <button
              onClick={() => setSyncModalOpen(true)}
              className="flex items-center space-x-1.5 px-5 py-3 rounded-xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-bold text-xs transition-all shadow-lg shadow-[#722F37]/15 animate-pulse"
            >
              <DollarSign className="h-4 w-4" />
              <span>{itemsToSync.length} Fiyatı Menüye Eşitle</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Alerts Banner */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center space-x-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Aktif Maliyet & Kâr Uyarısı</span>
          </h4>
          <div className="space-y-2">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 flex justify-between items-center text-xs">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-red-950/40 text-red-400 mt-0.5">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-white">{alert.menuItemName || "Ürün"}</h5>
                    <p className="text-gray-400 mt-0.5">{alert.message}</p>
                    {alert.suggestedPrice && (
                      <p className="text-emerald-400 font-mono mt-1 font-semibold">
                        Önerilen Fiyat: ₺{parseFloat(alert.suggestedPrice).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/60 border border-red-900/30 text-[10px] font-bold text-red-300 transition-colors uppercase tracking-wider"
                >
                  Kapat
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary && (
        /* Summary KPIs */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#16213E]/30 border border-gray-800/40 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Kayıtlı Ürünler</span>
            <span className="text-2xl font-bold text-white mt-2 font-mono">{summary.totalMenuItems}</span>
            <div className="w-2 h-2 rounded-full bg-blue-500 absolute top-5 right-5" />
          </div>

          <div className="bg-[#16213E]/30 border border-gray-800/40 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Reçeteli Ürünler</span>
            <span className="text-2xl font-bold text-white mt-2 font-mono">{summary.itemsWithRecipes}</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 absolute top-5 right-5" />
          </div>

          <div className="bg-[#16213E]/30 border border-gray-800/40 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ortalama Kâr Marjı</span>
            <span className="text-2xl font-bold text-white mt-2 font-mono">{(parseFloat(summary.averageMargin) * 100).toFixed(1)}%</span>
            <div className="w-2 h-2 rounded-full bg-[#C9A84C] absolute top-5 right-5" />
          </div>

          <div className="bg-[#16213E]/30 border border-gray-800/40 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Maliyet Riski (Kritik)</span>
            <span className="text-2xl font-bold text-red-400 mt-2 font-mono">{summary.criticalCount}</span>
            <div className="w-2 h-2 rounded-full bg-red-500 absolute top-5 right-5" />
          </div>
        </div>
      )}

      {/* Rules Setting & Profitability Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Table view (Left/Main) */}
        <div className="lg:col-span-2 bg-[#16213E]/30 border border-gray-800/50 rounded-2xl overflow-hidden shadow-xl space-y-4">
          <div className="px-6 py-4 border-b border-gray-800/40 bg-[#16213E]/80 flex justify-between items-center">
            <h4 className="font-serif text-sm font-bold text-white">Fiyat & Marj Durumu</h4>
            <div className="flex space-x-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" /> Sağlıklı</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" /> Sınırda</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1.5" /> Kritik</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#16213E]/50 border-b border-gray-800/40 text-[9px] text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="px-6 py-3">Ürün</th>
                  <th className="px-6 py-3">Mevcut Fiyat</th>
                  <th className="px-6 py-3">Porsiyon Maliyet</th>
                  <th className="px-6 py-3">Mevcut Marj</th>
                  <th className="px-6 py-3">Hedef</th>
                  <th className="px-6 py-3">Önerilen Fiyat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/20 text-xs">
                {summary && summary.items.length > 0 ? (
                  summary.items.map((item) => {
                    const price = parseFloat(item.menuPrice);
                    const cost = parseFloat(item.recipeCost);
                    const margin = parseFloat(item.margin) * 100;
                    const target = parseFloat(item.targetMargin) * 100;
                    const deviation = parseFloat(item.marginDeviation) * 100;
                    const suggested = parseFloat(item.suggestedPrice);

                    return (
                      <tr key={item.menuItemId} className="hover:bg-[#2A2A3D]/10 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              item.status === "healthy"
                                ? "bg-emerald-500"
                                : item.status === "warning"
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`} />
                            <span className="font-semibold text-white">{item.menuItemName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-gray-300">₺{price.toFixed(2)}</td>
                        <td className="px-6 py-3.5 font-mono text-[#C9A84C]">₺{cost.toFixed(2)}</td>
                        <td className={`px-6 py-3.5 font-mono font-bold ${
                          item.status === "healthy"
                            ? "text-emerald-400"
                            : item.status === "warning"
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}>
                          {margin.toFixed(1)}%
                        </td>
                        <td className="px-6 py-3.5 font-mono text-gray-400">{target.toFixed(0)}%</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-emerald-400">
                          {deviation > 0 ? `₺${suggested.toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Reçete atanmış ürün bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing rule Settings (Right) */}
        <div className="bg-[#16213E]/30 border border-gray-800/50 rounded-2xl p-6 shadow-xl space-y-5">
          <h4 className="font-serif text-sm font-bold text-white flex items-center space-x-2">
            <Settings className="h-4.5 w-4.5 text-[#C9A84C]" />
            <span>Kural & Alarm Ayarları</span>
          </h4>

          <form onSubmit={handleSaveRule} className="space-y-4 text-xs text-gray-300">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">
                Kâr Sapma Eşik Değeri (Swing Threshold)
              </label>
              <select
                value={swingThreshold}
                onChange={(e) => setSwingThreshold(e.target.value)}
                className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
              >
                <option value="0.02">2% sapmada uyar</option>
                <option value="0.03">3% sapmada uyar</option>
                <option value="0.05">5% sapmada uyar (Önerilen)</option>
                <option value="0.08">8% sapmada uyar</option>
                <option value="0.10">10% sapmada uyar</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">
                Stok Düşüm Modu
              </label>
              <select
                value={deductionMode}
                onChange={(e) => setDeductionMode(e.target.value as any)}
                className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
              >
                <option value="manual">Manuel mutabakat (Gün sonu sayımı)</option>
                <option value="auto">Otomatik stok düşümü (Sipariş sonu)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#1C1C28]/40 border border-gray-800/30 rounded-xl">
              <div>
                <span className="font-semibold block text-white">Alarm Bildirimi Aktif</span>
                <span className="text-[10px] text-gray-500">Kâr hedeflerinden sapmalarda uyar</span>
              </div>
              <input
                type="checkbox"
                checked={ruleActive}
                onChange={(e) => setRuleActive(e.target.checked)}
                className="w-4 h-4 accent-[#C9A84C]"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[#1C1C28]/40 border border-gray-800/30 rounded-xl">
              <div>
                <span className="font-semibold block text-white">Otomatik Fiyat Güncelleme</span>
                <span className="text-[10px] text-gray-500">Sapmalarda onay almadan fiyatı senkronize et</span>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 accent-[#C9A84C]"
              />
            </div>

            <button
              type="submit"
              disabled={savingRule}
              className="w-full py-2.5 rounded-xl bg-[#722F37] hover:bg-[#8B3E48] text-white font-bold transition-all flex items-center justify-center space-x-1.5"
            >
              {savingRule ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>Ayarları Kaydet</span>
            </button>
          </form>
        </div>
      </div>

      {/* Sync Price Confirmation Modal */}
      {syncModalOpen && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSyncModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#16213E] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh]">
            <div className="flex-shrink-0">
              <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-[#C9A84C]" />
                <span>Menü Fiyat Senkronizasyonu</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Aşağıdaki ürünlerin fiyatları kâr marjı hedeflerinize uyum sağlaması için güncellenecektir.
              </p>
            </div>

            {/* Change logs preview list */}
            <div className="max-h-[30vh] overflow-y-auto space-y-2 border-t border-b border-gray-800/40 py-3 pr-1 no-scrollbar">
              {itemsToSync.map(item => (
                <div key={item.menuItemId} className="flex justify-between items-center text-xs p-2 bg-[#1C1C28]/40 border border-gray-800/30 rounded-lg">
                  <div>
                    <p className="font-semibold text-white">{item.menuItemName}</p>
                    <p className="text-[10px] text-red-400 font-mono mt-0.5">
                      Sapma: -{(parseFloat(item.marginDeviation)*100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 font-mono text-sm">
                    <span className="text-gray-500 line-through">₺{parseFloat(item.menuPrice).toFixed(2)}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
                    <span className="font-bold text-emerald-400">₺{parseFloat(item.suggestedPrice).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-2 pt-2 flex-shrink-0">
              <button
                onClick={() => setSyncModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white border border-gray-700/50"
              >
                İptal
              </button>
              <button
                disabled={syncingPrices}
                onClick={handleSyncPrices}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-[#722F37] hover:bg-[#8B3E48] text-white font-bold text-xs"
              >
                {syncingPrices ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>Eşitlemeyi Onayla</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
