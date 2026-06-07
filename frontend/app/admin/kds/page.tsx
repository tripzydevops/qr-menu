"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Clock, 
  Check, 
  ArrowLeft, 
  ChefHat, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  Loader2, 
  Play,
  Printer
} from "lucide-react";

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: string;
  notes?: string;
  menuItemNameTr?: string;
  menuItemNameEn?: string;
}

interface Order {
  id: string;
  status: string; // "pending", "preparing", "completed", "cancelled"
  totalAmount: string;
  tableName?: string;
  createdAt: string;
  items: OrderItem[];
}

export default function KitchenDisplaySystemPage() {
  const venueId = "venue-karakoy-main";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [kdsEnabled, setKdsEnabled] = useState(true); // Default to true while loading
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [timeNow, setTimeNow] = useState(Date.now());
  const [printingEnabled, setPrintingEnabled] = useState(false);
  const [orgName, setOrgName] = useState("Karaköy Lokantası");
  const [activePrintOrder, setActivePrintOrder] = useState<Order | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  // 1. Synthesize a clean, double-ding chime using Web Audio API
  const playKitchenChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      // Ding 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now); // A5 note
      osc1.frequency.exponentialRampToValueAtTime(1050, now + 0.12);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);
      
      // Ding 2 (Delayed higher pitch)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, now + 0.12); // E6 note
      osc2.frequency.exponentialRampToValueAtTime(1560, now + 0.24);
      gain2.gain.setValueAtTime(0.12, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (e) {
      console.warn("Failed to synthesize KDS chime:", e);
    }
  };

  // 2. Fetch KDS settings / permissions
  useEffect(() => {
    async function fetchPermissions() {
      try {
        const res = await fetch(`${apiUrl}/api/menu/k1`);
        if (res.ok) {
          const data = await res.json();
          setKdsEnabled(data.kdsEnabled || false);
          setPrintingEnabled(data.printingEnabled || false);
          setOrgName(data.organizationName || "Karaköy Lokantası");
        }
      } catch (err) {
        console.error("Failed to check KDS settings", err);
      }
    }
    fetchPermissions();
  }, []);

  // 3. Poll active orders
  useEffect(() => {
    if (!kdsEnabled) return;

    async function fetchKdsOrders() {
      try {
        // Fetch all orders
        const res = await fetch(`${apiUrl}/api/admin/orders?venueId=${venueId}`);
        if (res.ok) {
          const data: Order[] = await res.json();
          // Filter only active orders for the kitchen (pending & preparing)
          const activeKds = data.filter(o => o.status === "pending" || o.status === "preparing");
          
          // Check for new orders to trigger chime
          let hasNewPending = false;
          const currentIds = new Set(activeKds.map(o => o.id));
          
          activeKds.forEach(order => {
            if (!seenOrderIds.has(order.id) && order.status === "pending") {
              hasNewPending = true;
            }
          });

          // Update state
          setOrders(activeKds);
          setSeenOrderIds(prev => {
            const next = new Set(prev);
            activeKds.forEach(o => next.add(o.id));
            return next;
          });

          if (hasNewPending && !loading) {
            playKitchenChime();
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch KDS orders", err);
      }
    }

    fetchKdsOrders();
    const interval = setInterval(fetchKdsOrders, 5000);
    return () => clearInterval(interval);
  }, [kdsEnabled, seenOrderIds, refreshKey, loading]);

  // 4. Update order status
  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setRefreshKey(prev => prev + 1);
        playKitchenChime(); // Play subtle chime on action confirmation
      }
    } catch (err) {
      console.error("Failed to update KDS order status", err);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePrintOrder = (order: Order) => {
    setActivePrintOrder(order);
  };

  useEffect(() => {
    if (activePrintOrder) {
      const timer = setTimeout(() => {
        window.print();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activePrintOrder]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setActivePrintOrder(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  // 5. Timer ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(Date.now());
    }, 10000); // Update timers every 10s
    return () => clearInterval(timer);
  }, []);

  const getElapsedTimeMinutes = (createdAtStr: string) => {
    const elapsedMs = timeNow - new Date(createdAtStr).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  const getTimerStyle = (minutes: number) => {
    if (minutes < 10) {
      return "bg-gray-800 text-gray-300 border border-gray-700/40";
    } else if (minutes < 20) {
      return "bg-amber-950/40 text-amber-400 border border-amber-900/40 font-semibold";
    } else {
      return "bg-red-950/50 text-red-400 border border-red-900/50 animate-pulse font-bold";
    }
  };

  // Render Access Blocked
  if (!kdsEnabled) {
    return (
      <div className="min-h-screen bg-[#0A0A12] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="max-w-md bg-[#121220] border border-[#2C2C4E]/40 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-red-500" />
          <div className="h-16 w-16 bg-amber-950/30 border border-amber-900/45 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2.5">
            <h2 className="font-serif text-xl font-bold">Mutfak Ekranı (KDS) Kilitli</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Mutfak Görüntüleme Sistemi (KDS) bu işletme için henüz etkinleştirilmemiştir. 
              Özelliği kullanmak için lütfen yöneticiniz veya Super Admin ile görüşün.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="flex items-center justify-center space-x-2 w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs transition-colors border border-gray-700/50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sipariş Paneline Dön</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#07070E] text-white flex flex-col font-sans select-none antialiased no-print">
      {/* KDS Header Navbar */}
      <header className="sticky top-0 z-30 h-18 bg-[#0C0C16] border-b border-gray-800/45 px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3.5">
          <Link
            href="/admin/orders"
            className="p-2 rounded-lg bg-gray-900/60 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition-all flex items-center justify-center"
            title="Siparişler & İstekler Paneline Dön"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          
          <div className="h-9 w-9 rounded-xl bg-[#6366F1] border border-indigo-500/20 flex items-center justify-center font-bold text-white text-base">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-sm block tracking-wide text-white leading-tight">
              Mutfak Görüntüleme Sistemi (KDS)
            </span>
            <span className="text-[10px] text-gray-400 font-mono tracking-wider block">
              Karaköy Lokantası — Canlı Mutfak Paneli
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Active ticket counter */}
          <div className="bg-[#121224] border border-gray-800/40 px-3.5 py-1.5 rounded-xl flex items-center space-x-2 text-xs font-semibold text-gray-300">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{orders.length} Sipariş Hazırlanıyor</span>
          </div>

          {/* Sound toggle button */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) {
                // Test sound immediately to unlock audio context in mobile browsers
                setTimeout(playKitchenChime, 50);
              }
            }}
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
              soundEnabled 
                ? "bg-[#6366F1]/10 border-[#6366F1]/30 text-indigo-400 hover:bg-[#6366F1]/20" 
                : "bg-gray-900/60 border-gray-800 text-gray-500 hover:bg-gray-800"
            }`}
            title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main KDS Grid Area */}
      <main className="flex-grow p-6 overflow-y-auto">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-[#6366F1] mb-4" />
            <p className="text-xs">Sipariş veritabanı yükleniyor...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="text-5xl animate-bounce">🍳</div>
            <h3 className="font-serif text-lg font-semibold text-white">Mutfakta Sipariş Bulunmuyor</h3>
            <p className="text-xs text-gray-500 max-w-xs text-center leading-relaxed">
              Tebrikler! Tüm siparişler tamamlandı. Yeni bir QR kod siparişi alındığında anlık olarak burada belirecektir.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {orders.map((order) => {
              const elapsedMinutes = getElapsedTimeMinutes(order.createdAt);
              return (
                <div 
                  key={order.id} 
                  className={`bg-[#0C0C16] border border-gray-800/50 rounded-2xl flex flex-col justify-between overflow-hidden shadow-xl relative min-h-[300px] transition-all hover:scale-[1.01] hover:border-gray-700/60`}
                >
                  {/* Status strip */}
                  <div className={`h-1.5 w-full ${
                    order.status === "pending" ? "bg-amber-500" : "bg-indigo-600"
                  }`} />

                  {/* Header info */}
                  <div className="p-5 flex-grow flex flex-col">
                    <div className="flex justify-between items-start border-b border-gray-800/40 pb-3 mb-4.5">
                      <div>
                        <h4 className="font-serif font-bold text-xl text-white tracking-wide">
                          {order.tableName || "Masa ?"}
                        </h4>
                        <span className="text-[10px] text-gray-500 font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      
                      {/* Timer Badge */}
                      <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono ${getTimerStyle(elapsedMinutes)}`}>
                        <Clock className="h-3.5 w-3.5" />
                        <span>{elapsedMinutes} dk</span>
                      </div>
                    </div>

                    {/* Order Items with BIG quantity indicator */}
                    <div className="space-y-3 flex-grow">
                      {order.items.map((item) => (
                        <div key={item.id} className="text-sm">
                          <div className="flex items-start">
                            <span className="font-mono font-bold text-lg text-[#6366F1] bg-[#6366F1]/10 border border-indigo-500/10 px-2.5 py-0.5 rounded-lg mr-3 flex-shrink-0">
                              {item.quantity}
                            </span>
                            <div className="space-y-1 mt-0.5 pr-1">
                              <span className="font-bold text-gray-200 block text-base leading-snug">
                                {item.menuItemNameTr || "Ürün"}
                              </span>
                              {item.notes && (
                                <p className="text-xs text-amber-400 italic bg-amber-500/5 border border-amber-900/25 px-2 py-1 rounded-lg">
                                  Not: {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="p-4 border-t border-gray-800/45 bg-[#0A0A12]/40 flex space-x-2">
                    {order.status === "pending" ? (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "preparing")}
                        className="flex-grow py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-950/20"
                      >
                        <Play className="h-4 w-4" />
                        <span>HAZIRLA</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "ready")}
                        className="flex-grow py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-950/20"
                      >
                        <Check className="h-4 w-4" />
                        <span>TAMAMLANDI</span>
                      </button>
                    )}
                    {printingEnabled && (
                      <button
                        onClick={() => handlePrintOrder(order)}
                        className="px-3 py-3 rounded-xl bg-indigo-950/20 hover:bg-indigo-950/50 border border-indigo-900/20 hover:border-indigo-900/40 text-indigo-400 hover:text-indigo-350 text-xs font-bold transition-all flex items-center justify-center"
                        title="Adisyon Fişi Yazdır"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      </div>

      {/* Print Slip Component (Only visible in print media) */}
      {activePrintOrder && (
        <div className="print-slip hidden print:block bg-white text-black font-mono text-xs p-6 w-[80mm] max-w-full mx-auto">
          <div className="text-center font-bold text-sm uppercase tracking-wide mb-2">
            *** {orgName.toUpperCase()} ***
          </div>
          <div className="text-center text-[10px] mb-4 border-b border-dashed border-black pb-2">
            ADİSYON TİKETİ
          </div>
          <div className="space-y-1 text-[11px] mb-3">
            <div><strong>Masa:</strong> {activePrintOrder.tableName || "Masa Bilgisi Yok"}</div>
            <div><strong>Tarih:</strong> {new Date(activePrintOrder.createdAt).toLocaleDateString("tr-TR")} {formatDate(activePrintOrder.createdAt)}</div>
            <div><strong>Sipariş ID:</strong> #{activePrintOrder.id.slice(0, 8).toUpperCase()}</div>
          </div>
          
          <table className="w-full text-left border-y border-dashed border-black py-2 my-3 text-[11px]">
            <thead>
              <tr className="font-bold">
                <th className="pb-1 w-12">Adet</th>
                <th className="pb-1">Ürün</th>
                <th className="pb-1 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {activePrintOrder.items.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className="align-top">
                    <td className="py-1 font-semibold">{item.quantity}x</td>
                    <td className="py-1">
                      {item.menuItemNameTr || "Ürün"}
                    </td>
                    <td className="py-1 text-right">₺{(Number(item.price) * item.quantity).toFixed(2)}</td>
                  </tr>
                  {item.notes && (
                    <tr key={`note-${item.id}`}>
                      <td></td>
                      <td colSpan={2} className="text-[10px] italic pb-1">
                        * Not: {item.notes}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          
          <div className="flex justify-between items-center font-bold text-sm mt-3 pt-1">
            <span>TOPLAM:</span>
            <span>₺{Number(activePrintOrder.totalAmount).toFixed(2)}</span>
          </div>
          
          <div className="text-center text-[9px] text-gray-500 mt-8 pt-4 border-t border-dashed border-gray-400">
            Tripzy QR Menü SaaS tarafından üretilmiştir.
          </div>
        </div>
      )}

      {/* HTML style override specifically targeting browser print configurations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide all dashboard/web interfaces */
          header, aside, .no-print {
            display: none !important;
          }
          /* Reset parent containers to block layouts to prevent print engine flex/grid height bugs */
          html, body, main, div.min-h-screen:not(.no-print), div.flex-grow:not(.no-print) {
            display: block !important;
            position: static !important;
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          /* Make printing ticket explicitly visible and single-column formatting */
          .print-slip, .print-slip * {
            display: block !important;
          }
          .print-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            padding: 10px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          .print-slip table {
            display: table !important;
          }
          .print-slip tr {
            display: table-row !important;
          }
          .print-slip td, .print-slip th {
            display: table-cell !important;
          }
        }
      `}} />
    </>
  );
}
