"use client";

import React, { useEffect, useState } from "react";
import { ClipboardList, Bell, Receipt, CheckCircle2, Clock, Check, X, ShieldAlert, Sparkles, Printer } from "lucide-react";

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

interface WaiterRequest {
  id: string;
  type: string; // "waiter", "bill"
  status: string; // "pending", "completed"
  tableName?: string;
  areaName?: string;
  createdAt: string;
}

export default function AdminOrdersPage() {
  const venueId = "venue-karakoy-main"; // Seed default matching other pages
  const [activeTab, setActiveTab] = useState<"orders" | "requests" | "history">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<WaiterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [printingEnabled, setPrintingEnabled] = useState(false);
  const [activePrintOrder, setActivePrintOrder] = useState<Order | null>(null);
  const [orgName, setOrgName] = useState("Karaköy Lokantası");

  // Load organization settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${apiUrl}/api/menu/k1`);
        if (res.ok) {
          const data = await res.json();
          setPrintingEnabled(data.printingEnabled || false);
          setOrgName(data.organizationName || "Karaköy Lokantası");
        }
      } catch (err) {
        console.error("Failed to fetch printing permission", err);
      }
    }
    fetchSettings();
  }, []);

  // Poll for new orders/requests every 6 seconds
  useEffect(() => {
    async function fetchData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        
        // Fetch all orders
        const ordersRes = await fetch(`${apiUrl}/api/admin/orders?venueId=${venueId}`);
        const ordersData = await ordersRes.json();
        
        // Fetch pending waiter requests
        const requestsRes = await fetch(`${apiUrl}/api/admin/waiter-requests?venueId=${venueId}&status=pending`);
        const requestsData = await requestsRes.json();

        setOrders(ordersData);
        setRequests(requestsData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch orders or requests", err);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setRefreshKey(prev => prev + 1);
      }
    } catch (err) {
      console.error("Failed to update order status", err);
    }
  };

  const handleResolveRequest = async (requestId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/api/admin/waiter-requests/${requestId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" })
      });
      if (res.ok) {
        setRefreshKey(prev => prev + 1);
      }
    } catch (err) {
      console.error("Failed to resolve waiter request", err);
    }
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

  // Filter orders based on active tab
  const activeOrders = orders.filter(o => o.status === "pending" || o.status === "preparing" || o.status === "ready" || o.status === "served");
  const pastOrders = orders.filter(o => o.status === "completed" || o.status === "cancelled");

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div className="space-y-6 no-print">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-gray-800/40">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-wide">Sipariş & İstek Paneli</h1>
          <p className="text-xs text-gray-400 mt-1">Gelen müşteri siparişleri ve masa garson/hesap çağrılarını canlı izleyin.</p>
        </div>
        
        {/* Statistics Badges */}
        <div className="flex space-x-3 mt-4 md:mt-0">
          <div className="bg-[#16213E]/50 border border-gray-800/40 px-4 py-2 rounded-xl flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-gray-300">
              {activeOrders.length} Aktif Sipariş
            </span>
          </div>
          <div className="bg-[#16213E]/50 border border-gray-800/40 px-4 py-2 rounded-xl flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-gray-300">
              {requests.length} Bekleyen Çağrı
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1.5 bg-[#16213E]/50 border border-gray-800/40 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center space-x-2 px-4.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === "orders"
              ? "bg-[#722F37] text-white shadow-md shadow-[#722F37]/15"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Aktif Siparişler ({activeOrders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex items-center space-x-2 px-4.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === "requests"
              ? "bg-[#722F37] text-white shadow-md shadow-[#722F37]/15"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Garson & Hesap Çağrıları ({requests.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center space-x-2 px-4.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === "history"
              ? "bg-[#722F37] text-white shadow-md shadow-[#722F37]/15"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Geçmiş Siparişler</span>
        </button>
      </div>

      {/* Content views */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-[#16213E]/30 border border-gray-800/40 rounded-2xl animate-pulse" />
          <div className="h-40 bg-[#16213E]/30 border border-gray-800/40 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Orders Tab */}
          {activeTab === "orders" && (
            activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[#16213E]/20 border border-gray-800/40 rounded-3xl space-y-3">
                <span className="text-4xl">🍳</span>
                <p className="text-gray-400 text-sm font-semibold">Aktif sipariş bulunmuyor.</p>
                <p className="text-xs text-gray-500">Müşteriler sipariş verdiğinde burada listelenecektir.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeOrders.map((order) => (
                  <div key={order.id} className="bg-[#16213E]/45 border border-gray-800/40 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between relative overflow-hidden">
                    {/* Status Top border color */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                      order.status === "pending" 
                        ? "bg-amber-500 animate-pulse" 
                        : order.status === "preparing" 
                          ? "bg-indigo-500" 
                          : order.status === "ready"
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-blue-500"
                    }`} />
                    
                    <div>
                      {/* Card Header */}
                      <div className="flex justify-between items-start pt-1.5">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-base text-white">{order.tableName || "Masa Bilgisi Yok"}</h4>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              order.status === "pending"
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                : order.status === "preparing"
                                  ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                                  : order.status === "ready"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 animate-pulse"
                                    : "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                            }`}>
                              {order.status === "pending" && "Yeni Sipariş"}
                              {order.status === "preparing" && "Hazırlanıyor"}
                              {order.status === "ready" && "Servise Hazır! 🍽️"}
                              {order.status === "served" && "Servis Edildi"}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">{order.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-400 font-mono bg-gray-800/40 px-2 py-0.5 rounded-lg border border-gray-800/50">
                          <Clock className="h-3.5 w-3.5 text-gray-500" />
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </div>

                      {/* Items list */}
                      <div className="mt-4 border-y border-gray-800/40 py-3 space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-start text-xs">
                            <div className="space-y-0.5 pr-2">
                              <span className="font-semibold text-white">
                                {item.quantity}x {item.menuItemNameTr || "Ürün Detayı"}
                              </span>
                              {item.notes && (
                                <p className="text-[10px] text-amber-400 italic bg-amber-500/5 px-1.5 py-0.2 rounded border border-amber-900/10 w-fit">
                                  ✍️ {item.notes}
                                </p>
                              )}
                            </div>
                            <span className="font-mono text-gray-400">
                              ₺{(Number(item.price) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer price & actions */}
                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-3.5">
                        <span className="text-[11px] text-gray-400">Toplam Tutar:</span>
                        <span className="font-mono font-bold text-[#C9A84C]">₺{Number(order.totalAmount).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex space-x-2">
                        {order.status === "pending" && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors flex items-center justify-center space-x-1"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>Hazırla</span>
                          </button>
                        )}
                        {order.status === "preparing" && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, "ready")}
                            className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors flex items-center justify-center space-x-1"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Mutfak Tamamlandı</span>
                          </button>
                        )}
                        {order.status === "ready" && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, "served")}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors flex items-center justify-center space-x-1 animate-pulse"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Servis Et</span>
                          </button>
                        )}
                        {order.status === "served" && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors flex items-center justify-center space-x-1"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Ödeme Al / Kapat</span>
                          </button>
                        )}
                        {printingEnabled && (
                          <button
                            onClick={() => handlePrintOrder(order)}
                            className="px-3 py-2 rounded-xl bg-indigo-950/20 hover:bg-indigo-950/50 border border-indigo-900/20 hover:border-indigo-900/40 text-indigo-400 hover:text-indigo-350 text-xs font-bold transition-all flex items-center justify-center"
                            title="Adisyon Fişi Yazdır"
                          >
                            <Printer className="h-4.5 w-4.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                          className="px-3.5 py-2 rounded-xl bg-red-950/20 hover:bg-red-950/50 border border-red-900/20 hover:border-red-900/40 text-red-400 text-xs font-bold transition-all flex items-center justify-center"
                          title="Siparişi İptal Et"
                        >
                          <X className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Waiter Requests Tab */}
          {activeTab === "requests" && (
            requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[#16213E]/20 border border-gray-800/40 rounded-3xl space-y-3">
                <span className="text-4xl">🔔</span>
                <p className="text-gray-400 text-sm font-semibold">Bekleyen çağrı bulunmuyor.</p>
                <p className="text-xs text-gray-500">Müşteriler yardım veya hesap talep ettiğinde burada listelenecektir.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {requests.map((req) => (
                  <div 
                    key={req.id} 
                    className={`border rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden animate-pulse-border ${
                      req.type === "waiter" 
                        ? "bg-amber-950/15 border-amber-900/35" 
                        : "bg-emerald-950/15 border-emerald-900/35"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            req.type === "waiter" ? "bg-amber-950/40 text-amber-400" : "bg-emerald-950/40 text-emerald-400"
                          }`}>
                            {req.type === "waiter" ? <Bell className="h-4.5 w-4.5" /> : <Receipt className="h-4.5 w-4.5" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-white">
                              {req.type === "waiter" ? "Garson Çağrısı" : "Hesap Talebi"}
                            </h4>
                            <span className="text-[10px] text-gray-400 font-mono">{req.tableName || "Masa"}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono bg-gray-800/40 px-2 py-0.5 rounded-lg border border-gray-800/40">
                          {formatDate(req.createdAt)}
                        </span>
                      </div>
                      
                      {req.areaName && (
                        <p className="text-xs text-gray-300 font-semibold">
                          Bölge: <span className="text-white bg-gray-800/30 px-2 py-0.5 rounded border border-gray-800/30 font-mono text-[10px]">{req.areaName}</span>
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleResolveRequest(req.id)}
                      className={`w-full mt-5 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1 text-[#1C1C28] ${
                        req.type === "waiter" 
                          ? "bg-amber-500 hover:bg-amber-600" 
                          : "bg-emerald-500 hover:bg-emerald-600"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      <span>Tamamlandı Olarak İşaretle</span>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            pastOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[#16213E]/20 border border-gray-800/40 rounded-3xl space-y-3">
                <span className="text-4xl">📜</span>
                <p className="text-gray-400 text-sm font-semibold">Geçmiş sipariş kaydı bulunmuyor.</p>
              </div>
            ) : (
              <div className="bg-[#16213E]/30 border border-gray-800/40 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#16213E]/80 border-b border-gray-800/40 text-xs font-semibold text-gray-400">
                        <th className="p-4">Masa</th>
                        <th className="p-4">Sipariş ID</th>
                        <th className="p-4">İçerik</th>
                        <th className="p-4">Zaman</th>
                        <th className="p-4">Tutar</th>
                        <th className="p-4">Durum</th>
                        {printingEnabled && <th className="p-4 text-right">Yazdır</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/20 text-xs">
                      {pastOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-[#2A2A3D]/25 transition-colors">
                          <td className="p-4 font-semibold text-white">{order.tableName || "Masa"}</td>
                          <td className="p-4 font-mono text-gray-400">{order.id.slice(0, 8)}</td>
                          <td className="p-4">
                            <div className="space-y-1">
                              {order.items.map(i => (
                                <span key={i.id} className="block text-[11px] text-gray-300">
                                  {i.quantity}x {i.menuItemNameTr || "Ürün"}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-gray-400">{formatDate(order.createdAt)}</td>
                          <td className="p-4 font-mono font-bold text-white">₺{Number(order.totalAmount).toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] tracking-wide uppercase ${
                              order.status === "completed" 
                                ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" 
                                : "bg-red-950/40 text-red-400 border border-red-900/30"
                            }`}>
                              {order.status === "completed" ? "Tamamlandı" : "İptal Edildi"}
                            </span>
                          </td>
                          {printingEnabled && (
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handlePrintOrder(order)}
                                className="p-1.5 rounded-lg border bg-[#121224] text-indigo-400 border-indigo-900/30 hover:bg-indigo-950/40 transition-colors inline-flex items-center justify-center animate-pulse-border"
                                title="Yazdır"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      )}
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
