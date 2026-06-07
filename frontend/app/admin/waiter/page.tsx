"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Bell, 
  Receipt, 
  Check, 
  Clock, 
  Volume2, 
  VolumeX, 
  Loader2, 
  ArrowLeft, 
  Smartphone,
  Navigation,
  UtensilsCrossed,
  Printer,
  Sparkles
} from "lucide-react";

interface WaiterRequest {
  id: string;
  type: string; // "waiter", "bill"
  status: string; // "pending", "completed"
  tableId: string;
  tableName?: string;
  areaName?: string;
  createdAt: string;
}

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  notes?: string;
  menuItemNameTr?: string;
  menuItemNameEn?: string;
}

interface Order {
  id: string;
  status: string; // "pending", "preparing", "ready", "served", "completed", "cancelled"
  tableId?: string;
  tableName?: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

export default function WaiterConsolePage() {
  const venueId = "venue-karakoy-main";
  const [activeTab, setActiveTab] = useState<"calls" | "runs">("calls");
  const [calls, setCalls] = useState<WaiterRequest[]>([]);
  const [runs, setRuns] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Settings
  const [printingEnabled, setPrintingEnabled] = useState(false);
  const [kdsEnabled, setKdsEnabled] = useState(false);
  const [orgName, setOrgName] = useState("Karaköy Lokantası");
  
  // Tracking alerts
  const [seenCallIds, setSeenCallIds] = useState<Set<string>>(new Set());
  const [seenRunIds, setSeenRunIds] = useState<Set<string>>(new Set());
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(new Set());
  
  // Notification states
  const [newOrderToast, setNewOrderToast] = useState<{ tableName: string; text: string } | null>(null);
  const [activePrintRequest, setActivePrintRequest] = useState<{ tableName: string; items: any[]; totalAmount: number } | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [timeNow, setTimeNow] = useState(Date.now());

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  // Load organization settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`${apiUrl}/api/menu/k1`);
        if (res.ok) {
          const data = await res.json();
          setPrintingEnabled(data.printingEnabled || false);
          setKdsEnabled(data.kdsEnabled || false);
          setOrgName(data.organizationName || "Karaköy Lokantası");
        }
      } catch (err) {
        console.error("Failed to fetch venue settings", err);
      }
    }
    fetchSettings();
  }, []);

  // Clear new order toast after 5 seconds
  useEffect(() => {
    if (newOrderToast) {
      const timer = setTimeout(() => setNewOrderToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [newOrderToast]);

  // Synthesize double-ding audio chime via Web Audio API (zero file dependencies)
  const playWaiterChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      // Tone 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(587.33, now); // D5 note
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);
      
      // Tone 2 (Delayed higher pitch)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(880, now + 0.12); // A5 note
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.27);
      gain2.gain.setValueAtTime(0.12, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn("Failed to play waiter chime:", e);
    }
  };

  // Poll waiter requests and active orders
  useEffect(() => {
    async function fetchWaiterData() {
      try {
        // 1. Fetch pending waiter requests
        const callsRes = await fetch(`${apiUrl}/api/admin/waiter-requests?venueId=${venueId}&status=pending`);
        const callsData: WaiterRequest[] = await callsRes.json();

        // 2. Fetch all active orders
        const ordersRes = await fetch(`${apiUrl}/api/admin/orders?venueId=${venueId}`);
        const ordersData: Order[] = await ordersRes.json();
        
        // Filter only orders that are ready at the pass
        const readyRuns = ordersData.filter(o => o.status === "ready");

        // Check for new calls to trigger chime
        let hasNewCall = false;
        callsData.forEach(c => {
          if (!seenCallIds.has(c.id)) {
            hasNewCall = true;
          }
        });

        // Check for new runs to trigger chime
        let hasNewRun = false;
        readyRuns.forEach(r => {
          if (!seenRunIds.has(r.id)) {
            hasNewRun = true;
          }
        });

        // Check for new guest orders placed
        let hasNewOrder = false;
        let newOrderDetails = null;
        ordersData.forEach(o => {
          if (!seenOrderIds.has(o.id)) {
            if (o.status === "pending" && !loading) {
              hasNewOrder = true;
              const mainItemName = o.items[0]?.menuItemNameTr || "Sipariş";
              const count = o.items.length;
              newOrderDetails = {
                tableName: o.tableName || "Masa",
                text: `${count > 1 ? `${mainItemName} ve +${count-1} ürün` : mainItemName}`
              };
            }
          }
        });

        // Update states
        setCalls(callsData);
        setAllOrders(ordersData);
        setRuns(readyRuns);

        // Update seen records
        setSeenCallIds(prev => {
          const next = new Set(prev);
          callsData.forEach(c => next.add(c.id));
          return next;
        });
        setSeenRunIds(prev => {
          const next = new Set(prev);
          readyRuns.forEach(r => next.add(r.id));
          return next;
        });
        setSeenOrderIds(prev => {
          const next = new Set(prev);
          ordersData.forEach(o => next.add(o.id));
          return next;
        });

        if (hasNewOrder && newOrderDetails) {
          setNewOrderToast(newOrderDetails);
          playWaiterChime();
        } else if ((hasNewCall || hasNewRun) && !loading) {
          playWaiterChime();
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch waiter dashboard data", err);
      }
    }

    fetchWaiterData();
    const interval = setInterval(fetchWaiterData, 5000);
    return () => clearInterval(interval);
  }, [seenCallIds, seenRunIds, seenOrderIds, refreshKey, loading]);

  // Handle call resolution
  const handleResolveCall = async (requestId: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/waiter-requests/${requestId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" })
      });
      if (res.ok) {
        setRefreshKey(prev => prev + 1);
        playWaiterChime();
      }
    } catch (err) {
      console.error("Failed to resolve call", err);
    }
  };

  // Handle serving order run
  const handleServeOrder = async (orderId: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "served" })
      });
      if (res.ok) {
        setRefreshKey(prev => prev + 1);
        playWaiterChime();
      }
    } catch (err) {
      console.error("Failed to mark order served", err);
    }
  };

  // Helper to aggregate active bill items for a table
  const getTableActiveBill = (tableId: string) => {
    const tableOrders = allOrders.filter(
      (o) => o.tableId === tableId && 
      (o.status === "pending" || o.status === "preparing" || o.status === "ready" || o.status === "served")
    );
    
    const itemsMap: Record<string, { menuItemNameTr: string; menuItemNameEn: string; quantity: number; price: number; notes: string[] }> = {};
    let totalAmount = 0;

    tableOrders.forEach((o) => {
      o.items.forEach((item) => {
        const key = item.menuItemId;
        const price = Number(item.price);
        if (itemsMap[key]) {
          itemsMap[key].quantity += item.quantity;
          if (item.notes) itemsMap[key].notes.push(item.notes);
        } else {
          itemsMap[key] = {
            menuItemNameTr: item.menuItemNameTr || "Ürün",
            menuItemNameEn: item.menuItemNameEn || "Item",
            quantity: item.quantity,
            price: price,
            notes: item.notes ? [item.notes] : [],
          };
        }
      });
      totalAmount += Number(o.totalAmount);
    });

    return {
      ordersCount: tableOrders.length,
      items: Object.values(itemsMap),
      totalAmount,
    };
  };

  // Trigger browser print for a table's bill
  const handlePrintBill = (tableName: string, tableId: string) => {
    const bill = getTableActiveBill(tableId);
    if (bill.items.length === 0) {
      alert("Bu masa için aktif sipariş bulunmuyor.");
      return;
    }
    setActivePrintRequest({
      tableName,
      items: bill.items,
      totalAmount: bill.totalAmount
    });
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Timer ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeNow(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedTimeMinutes = (createdAtStr: string) => {
    const elapsedMs = timeNow - new Date(createdAtStr).getTime();
    return Math.max(0, Math.floor(elapsedMs / 60000));
  };

  const getTimerStyle = (minutes: number) => {
    if (minutes < 5) return "bg-gray-800 text-gray-400";
    if (minutes < 12) return "bg-amber-950/40 text-amber-400 border border-amber-900/40";
    return "bg-red-950/40 text-red-400 border border-red-900/45 animate-pulse font-bold";
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className="min-h-screen bg-[#090910] text-white flex flex-col font-sans select-none antialiased no-print">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 h-16 bg-[#0E0E18] border-b border-gray-800/45 px-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <Link
              href="/admin/orders"
              className="p-2 rounded-lg bg-gray-900/60 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition-all flex items-center justify-center"
              title="Sipariş Paneline Dön"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center space-x-1.5">
              <Smartphone className="h-4 w-4 text-indigo-400" />
              <h1 className="font-serif font-bold text-sm tracking-wide">Garson Terminali</h1>
            </div>
          </div>

          {/* Mute button */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) {
                setTimeout(playWaiterChime, 50);
              }
            }}
            className={`p-2 rounded-lg border transition-all flex items-center justify-center ${
              soundEnabled 
                ? "bg-[#6366F1]/10 border-[#6366F1]/30 text-indigo-400" 
                : "bg-gray-900/60 border-gray-800 text-gray-500"
            }`}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
        </header>

        {/* New Order Toast Alert */}
        {newOrderToast && (
          <div className="mx-4 mt-4 bg-[#6366F1] border border-indigo-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl animate-fade-in-up duration-300 relative z-30">
            <div className="flex items-center space-x-3">
              <span className="text-xl animate-bounce">🔔</span>
              <div>
                <span className="font-bold text-[10px] block uppercase tracking-wider text-indigo-200">YENİ MÜŞTERİ SİPARİŞİ</span>
                <p className="text-xs font-semibold mt-0.5">
                  <span className="font-serif font-black text-sm">{newOrderToast.tableName}</span>: {newOrderToast.text}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setNewOrderToast(null)}
              className="p-1 rounded bg-black/20 hover:bg-black/35 text-white transition-all text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs Selector */}
        <div className="flex border-b border-gray-800/40 bg-[#0C0C16]">
          <button
            onClick={() => setActiveTab("calls")}
            className={`flex-1 py-4 text-xs font-bold transition-all relative flex items-center justify-center space-x-2 ${
              activeTab === "calls" ? "text-indigo-400 font-extrabold" : "text-gray-450 hover:text-white"
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Masa Çağrıları ({calls.length})</span>
            {calls.length > 0 && (
              <span className="absolute top-2.5 right-6 px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black leading-none">
                {calls.length}
              </span>
            )}
            {activeTab === "calls" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("runs")}
            className={`flex-1 py-4 text-xs font-bold transition-all relative flex items-center justify-center space-x-2 ${
              activeTab === "runs" ? "text-indigo-400 font-extrabold" : "text-gray-450 hover:text-white"
            }`}
          >
            <UtensilsCrossed className="h-4 w-4" />
            <span>Yemek Servisi ({runs.length})</span>
            {runs.length > 0 && (
              <span className="absolute top-2.5 right-6 px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black leading-none animate-pulse">
                {runs.length}
              </span>
            )}
            {activeTab === "runs" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        </div>

        {/* Console Feed */}
        <main className="flex-grow p-4 overflow-y-auto space-y-4">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin text-[#6366F1] mb-3" />
              <p className="text-[11px]">Bağlantı kuruluyor...</p>
            </div>
          ) : activeTab === "calls" ? (
            /* Render Active Customer Requests (Zil Çağrıları) */
            calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <span className="text-4xl">📭</span>
                <p className="text-gray-400 text-sm font-semibold">Aktif masa çağrısı bulunmuyor.</p>
                <p className="text-[11px] text-gray-500 max-w-xs">Müşteriler QR menüden garson veya hesap çağırdığında burada görünecektir.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {calls.map((c) => {
                  const elapsed = getElapsedTimeMinutes(c.createdAt);
                  const bill = c.type === "bill" && c.tableId ? getTableActiveBill(c.tableId) : null;
                  
                  return (
                    <div 
                      key={c.id} 
                      className={`border rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all ${
                        c.type === "waiter" 
                          ? "bg-amber-950/10 border-amber-900/30" 
                          : "bg-emerald-950/10 border-emerald-900/30"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            c.type === "waiter" ? "bg-amber-950/40 text-amber-400" : "bg-emerald-950/40 text-emerald-400"
                          }`}>
                            {c.type === "waiter" ? <Bell className="h-4.5 w-4.5" /> : <Receipt className="h-4.5 w-4.5" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-white">
                              {c.type === "waiter" ? "Garson Çağrısı" : "Hesap Talebi"}
                            </h4>
                            {c.areaName && (
                              <span className="text-[10px] text-gray-400 flex items-center mt-0.5">
                                <Navigation className="h-3 w-3 mr-1 text-gray-500" />
                                {c.areaName}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono ${getTimerStyle(elapsed)}`}>
                          <Clock className="h-3 w-3" />
                          <span>{elapsed} dk</span>
                        </div>
                      </div>

                      {/* Display table active bill elements for bill requests */}
                      {bill && bill.items.length > 0 && (
                        <div className="mt-1.5 mb-3.5 bg-black/40 border border-emerald-900/20 rounded-xl p-3.5 space-y-2.5">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-400 block border-b border-gray-800/40 pb-1.5">
                            Masa Hesabı Detayı ({bill.ordersCount} Sipariş)
                          </span>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                            {bill.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs font-mono">
                                <span className="text-gray-300">
                                  {item.quantity}x {item.menuItemNameTr}
                                </span>
                                <span className="text-white">
                                  ₺{(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-800/60 text-xs font-bold font-mono">
                            <span className="text-emerald-400">TOPLAM HESAP:</span>
                            <span className="text-white text-sm">₺{bill.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        <span className="font-serif font-black text-xl text-white">
                          {c.tableName || "Masa ?"}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{formatDate(c.createdAt)}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2.5 mt-4">
                        {printingEnabled && c.type === "bill" && c.tableId && bill && bill.items.length > 0 && (
                          <button
                            onClick={() => handlePrintBill(c.tableName || "Masa ?", c.tableId)}
                            className="flex-1 py-3 rounded-xl border bg-indigo-950/20 hover:bg-indigo-900/30 border-indigo-900/40 text-indigo-400 font-bold text-xs tracking-wide transition-all active:scale-98 flex items-center justify-center space-x-1 shadow-md shadow-indigo-950/20"
                          >
                            <Printer className="h-4 w-4" />
                            <span>Adisyon Fişi</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleResolveCall(c.id)}
                          className={`py-3 rounded-xl text-xs font-bold transition-all active:scale-98 text-black flex items-center justify-center space-x-1 ${
                            printingEnabled && c.type === "bill" && bill && bill.items.length > 0 ? "flex-1" : "w-full"
                          } ${
                            c.type === "waiter" 
                              ? "bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-950/20" 
                              : "bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-950/20"
                          }`}
                        >
                          <Check className="h-4 w-4" />
                          <span>Tamamlandı</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Render Ready Runs & Active Table Orders (Yemek Servisi) */
            (runs.length === 0 && allOrders.filter(o => o.status === "pending" || o.status === "preparing").length === 0) ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <span className="text-4xl">🍽️</span>
                <p className="text-gray-400 text-sm font-semibold">Aktif sipariş bulunmuyor.</p>
                <p className="text-[11px] text-gray-500 max-w-xs">Mutfaktan çıkan veya hazırlık aşamasında olan siparişler burada listelenecektir.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Ready to serve runs (Mutfaktan Çıkanlar) */}
                {runs.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] uppercase font-extrabold tracking-widest text-[#10B981] flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                      <span>Servise Hazır ({runs.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {runs.map((r) => {
                        const elapsed = getElapsedTimeMinutes(r.createdAt);
                        return (
                          <div 
                            key={r.id} 
                            className="bg-indigo-950/10 border border-[#10B981]/35 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden"
                          >
                            {/* Header info */}
                            <div className="flex justify-between items-start border-b border-gray-800/40 pb-2.5 mb-3">
                              <div>
                                <h4 className="font-serif font-black text-xl text-white tracking-wide">
                                  {r.tableName || "Masa ?"}
                                </h4>
                                <span className="text-[9px] text-gray-500 font-mono">#{r.id.slice(0, 8).toUpperCase()}</span>
                              </div>
                              
                              <div className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono ${getTimerStyle(elapsed)}`}>
                                <Clock className="h-3 w-3" />
                                <span>{elapsed} dk</span>
                              </div>
                            </div>

                            {/* Items Run List */}
                            <div className="space-y-2.5 my-2 flex-grow">
                              {r.items.map((item) => (
                                <div key={item.id} className="text-xs">
                                  <div className="flex items-start">
                                    <span className="font-mono font-bold text-sm text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded mr-2.5 flex-shrink-0">
                                      {item.quantity}x
                                    </span>
                                    <div className="space-y-0.5 mt-0.5">
                                      <span className="font-bold text-gray-200 block">
                                        {item.menuItemNameTr || "Ürün"}
                                      </span>
                                      {item.notes && (
                                        <p className="text-[10px] text-amber-400 italic bg-amber-500/5 border border-amber-900/20 px-1.5 py-0.5 rounded">
                                          Not: {item.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="text-right text-[10px] text-gray-500 font-mono mb-2">
                              Hazırlanma Saati: {formatDate(r.createdAt)}
                            </div>

                            {/* Action Button */}
                            <button
                              onClick={() => handleServeOrder(r.id)}
                              className="w-full mt-2 py-3 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-black font-bold text-xs tracking-wide transition-all active:scale-98 flex items-center justify-center space-x-1 shadow-md shadow-emerald-950/20"
                            >
                              <Check className="h-4 w-4" />
                              <span>Masaya Servis Et / Teslim Et</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Other active table orders (Hazırlananlar / pending & preparing) */}
                {allOrders.filter(o => o.status === "pending" || o.status === "preparing").length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] uppercase font-extrabold tracking-widest text-gray-400 flex items-center space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>Hazırlanmakta Olan Siparişler ({allOrders.filter(o => o.status === "pending" || o.status === "preparing").length})</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {allOrders
                        .filter(o => o.status === "pending" || o.status === "preparing")
                        .map((r) => {
                          const elapsed = getElapsedTimeMinutes(r.createdAt);
                          return (
                            <div 
                              key={r.id} 
                              className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden"
                            >
                              {/* Header info */}
                              <div className="flex justify-between items-start border-b border-gray-800/40 pb-2.5 mb-3">
                                <div>
                                  <h4 className="font-serif font-black text-xl text-white tracking-wide">
                                    {r.tableName || "Masa ?"}
                                  </h4>
                                  <span className="text-[9px] text-gray-500 font-mono">#{r.id.slice(0, 8).toUpperCase()}</span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    r.status === "pending" 
                                      ? "bg-red-950/40 text-red-400 border border-red-900/30" 
                                      : "bg-amber-950/40 text-amber-400 border border-amber-900/30"
                                  }`}>
                                    {r.status === "pending" ? "Onay Bekliyor" : "Hazırlanıyor"}
                                  </span>
                                  <div className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-gray-800 text-gray-400">
                                    <Clock className="h-3 w-3" />
                                    <span>{elapsed} dk</span>
                                  </div>
                                </div>
                              </div>

                              {/* Items Run List */}
                              <div className="space-y-2.5 my-2 flex-grow">
                                {r.items.map((item) => (
                                  <div key={item.id} className="text-xs">
                                    <div className="flex items-start">
                                      <span className="font-mono font-bold text-sm text-gray-450 bg-gray-800/50 px-2 py-0.5 rounded mr-2.5 flex-shrink-0">
                                        {item.quantity}x
                                      </span>
                                      <div className="space-y-0.5 mt-0.5">
                                        <span className="font-bold text-gray-300 block">
                                          {item.menuItemNameTr || "Ürün"}
                                        </span>
                                        {item.notes && (
                                          <p className="text-[10px] text-amber-500/80 italic bg-amber-500/5 border border-amber-900/20 px-1.5 py-0.5 rounded">
                                            Not: {item.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="text-right text-[10px] text-gray-500 font-mono mb-2">
                                Sipariş Saati: {formatDate(r.createdAt)}
                              </div>

                              {/* Action Button to bypass KDS */}
                              <button
                                onClick={() => handleServeOrder(r.id)}
                                className="w-full mt-2 py-3 rounded-xl bg-gray-800 hover:bg-gray-750 text-white font-bold text-xs tracking-wide transition-all active:scale-98 flex items-center justify-center space-x-1 shadow-sm border border-gray-700/40"
                              >
                                <Check className="h-4 w-4" />
                                <span>Teslim Edildi / Servis Et</span>
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </main>
      </div>

      {/* Print Slip Component (Only visible in print media) */}
      {activePrintRequest && (
        <div className="print-slip hidden print:block bg-white text-black font-mono text-xs p-6 w-[80mm] max-w-full mx-auto">
          <div className="text-center font-bold text-sm uppercase tracking-wide mb-2">
            *** {orgName.toUpperCase()} ***
          </div>
          <div className="text-center text-[10px] mb-4 border-b border-dashed border-black pb-2">
            MASA HESAP FİŞİ (ÖN-ADİSYON)
          </div>
          <div className="space-y-1 text-[11px] mb-3">
            <div><strong>Masa:</strong> {activePrintRequest.tableName}</div>
            <div><strong>Tarih:</strong> {new Date().toLocaleDateString("tr-TR")} {new Date().toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>İşlem:</strong> Garson Terminali Fiş Çıktısı</div>
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
              {activePrintRequest.items.map((item, idx) => (
                <React.Fragment key={idx}>
                  <tr className="align-top">
                    <td className="py-1 font-semibold">{item.quantity}x</td>
                    <td className="py-1">{item.menuItemNameTr}</td>
                    <td className="py-1 text-right">₺{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                  {item.notes && item.notes.length > 0 && (
                    <tr key={`note-${idx}`}>
                      <td></td>
                      <td colSpan={2} className="text-[10px] italic pb-1">
                        * Not: {item.notes.join("; ")}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          
          <div className="flex justify-between items-center font-bold text-sm mt-3 pt-1">
            <span>TOPLAM:</span>
            <span>₺{activePrintRequest.totalAmount.toFixed(2)}</span>
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
          html, body, main, div.min-h-screen, div.flex-grow {
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
