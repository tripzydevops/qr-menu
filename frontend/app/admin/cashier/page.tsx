"use client";

import { DEFAULT_VENUE_ID } from "@/lib/config";

import React, { useEffect, useState } from "react";
import { 
  Banknote, 
  CreditCard, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Clock, 
  Printer, 
  CheckCircle2, 
  Utensils, 
  Loader2, 
  AlertCircle,
  ChevronRight,
  Receipt,
  UserCheck,
  Calendar,
  X
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
  status: string; // "pending", "preparing", "ready", "served", "completed", "cancelled"
  tableId?: string;
  tableName?: string;
  totalAmount: string;
  paymentMethod?: string;
  paidAt?: string;
  createdAt: string;
  items: OrderItem[];
}

interface DailySummary {
  totalRevenue: number;
  orderCount: number;
  cashRevenue: number;
  cardRevenue: number;
  onlineRevenue: number;
  activeOrdersCount: number;
  topItems: Array<{
    id: string;
    nameTr: string;
    nameEn: string;
    quantity: number;
    price: number;
  }>;
}

interface TableOrders {
  tableId: string;
  tableName: string;
  orders: Order[];
  totalBill: number;
  itemCount: number;
  status: string; // highest status e.g., "served" or "ready"
}

export default function CashierConsolePage() {
  const venueId = DEFAULT_VENUE_ID;
  const [activeTables, setActiveTables] = useState<TableOrders[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableOrders | null>(null);
  const [activePrintTable, setActivePrintTable] = useState<TableOrders | null>(null);
  const [activePrintOrder, setActivePrintOrder] = useState<Order | null>(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Settings
  const [printingEnabled, setPrintingEnabled] = useState(false);
  const [orgName, setOrgName] = useState("Karaköy Lokantası");

  const [refreshKey, setRefreshKey] = useState(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  // Load organization settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`${apiUrl}/api/menu/k1`);
        if (res.ok) {
          const data = await res.json();
          setPrintingEnabled(data.printingEnabled || false);
          setOrgName(data.organizationName || "Karaköy Lokantası");
        }
      } catch (err) {
        console.error("Failed to fetch venue settings", err);
      }
    }
    fetchSettings();
  }, []);

  // Fetch cashier data (polling every 5 seconds)
  useEffect(() => {
    async function fetchCashierData() {
      try {
        // 1. Fetch all orders (active & completed)
        const ordersRes = await fetch(`${apiUrl}/api/admin/orders?venueId=${venueId}`);
        if (!ordersRes.ok) throw new Error("Orders failed to load");
        const allOrders: Order[] = await ordersRes.json();

        // 2. Fetch daily sales summary
        const summaryRes = await fetch(`${apiUrl}/api/admin/cashier/summary?venueId=${venueId}`);
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setSummary(summaryData);
        }

        // Process active orders grouped by table
        const activeGrouped: Record<string, { tableName: string; orders: Order[] }> = {};
        const completedList: Order[] = [];

        allOrders.forEach(order => {
          if (order.status === "completed") {
            completedList.push(order);
          } else if (["pending", "preparing", "ready", "served"].includes(order.status)) {
            if (order.tableId) {
              if (!activeGrouped[order.tableId]) {
                activeGrouped[order.tableId] = {
                  tableName: order.tableName || "Masasız",
                  orders: []
                };
              }
              activeGrouped[order.tableId].orders.push(order);
            }
          }
        });

        // Convert grouped tables into structured list
        const processedTables: TableOrders[] = Object.keys(activeGrouped).map(tableId => {
          const group = activeGrouped[tableId];
          const totalBill = group.orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
          const itemCount = group.orders.reduce((sum, order) => 
            sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
          , 0);

          // Get the highest state: served > ready > preparing > pending
          let status = "pending";
          const statuses = group.orders.map(o => o.status);
          if (statuses.includes("served")) status = "served";
          else if (statuses.includes("ready")) status = "ready";
          else if (statuses.includes("preparing")) status = "preparing";

          return {
            tableId,
            tableName: group.tableName,
            orders: group.orders,
            totalBill,
            itemCount,
            status
          };
        });

        // Sort tables alphabetically
        processedTables.sort((a, b) => a.tableName.localeCompare(b.tableName, "tr"));

        setActiveTables(processedTables);
        setCompletedOrders(completedList.slice(0, 15)); // last 15 completed orders

        // If the selected table has been updated, update state to match
        if (selectedTable) {
          const updatedTable = processedTables.find(t => t.tableId === selectedTable.tableId);
          if (updatedTable) {
            setSelectedTable(updatedTable);
          } else {
            // Settle action triggered or table paid
            setSelectedTable(null);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Cashier console fetch error:", err);
      }
    }

    fetchCashierData();
    const interval = setInterval(fetchCashierData, 5000);
    return () => clearInterval(interval);
  }, [refreshKey, selectedTable?.tableId]);

  // Handle Cash/Card payment
  const handleProcessPayment = async (tableId: string, paymentMethod: "cash" | "card") => {
    setSubmitting(true);
    setPaymentSuccessMsg(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/tables/${tableId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod })
      });

      if (!res.ok) throw new Error("Payment failed to process");

      // Auto-trigger printing if enabled
      if (printingEnabled && selectedTable) {
        handlePrintBill(selectedTable);
      }

      setPaymentSuccessMsg(`${selectedTable?.tableName} ödemesi başarıyla alındı!`);
      setSelectedTable(null);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert("Ödeme kaydı sırasında bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger web print for table bill
  const handlePrintBill = (table: TableOrders) => {
    setActivePrintOrder(null);
    setActivePrintTable(table);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Trigger web print for single completed order
  const handlePrintReceipt = (order: Order) => {
    setActivePrintTable(null);
    setActivePrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Helper: Aggregate items for a table with multiple orders
  const getAggregatedItems = (table: TableOrders) => {
    const itemsMap: Record<string, { nameTr: string; nameEn: string; quantity: number; price: number; notes: string[] }> = {};
    table.orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.menuItemId + (item.notes ? `-${item.notes}` : "");
        if (itemsMap[key]) {
          itemsMap[key].quantity += item.quantity;
          if (item.notes && !itemsMap[key].notes.includes(item.notes)) {
            itemsMap[key].notes.push(item.notes);
          }
        } else {
          itemsMap[key] = {
            nameTr: item.menuItemNameTr || "Ürün",
            nameEn: item.menuItemNameEn || "Item",
            quantity: item.quantity,
            price: parseFloat(item.price),
            notes: item.notes ? [item.notes] : []
          };
        }
      });
    });
    return Object.values(itemsMap);
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/25",
    preparing: "bg-blue-500/10 text-blue-400 border border-blue-500/25",
    ready: "bg-purple-500/10 text-purple-400 border border-purple-500/25",
    served: "bg-green-500/10 text-green-400 border border-green-500/25"
  };

  const statusLabels: Record<string, string> = {
    pending: "Sipariş Bekliyor",
    preparing: "Hazırlanıyor",
    ready: "Mutfakta Hazır",
    served: "Masaya Servis Edildi"
  };

  return (
    <div className="space-y-6">
      {/* 80mm Receipt layout hidden on screen, active on media print */}
      <div className="hidden print:block print-bill-slip bg-white text-black p-4 font-mono text-xs w-[80mm] leading-tight">
        <div className="text-center font-bold text-base mb-1">{orgName}</div>
        <div className="text-center border-b border-dashed border-black pb-2 mb-2">
          KASA HESAP FİŞİ<br />
          Tarih: {new Date().toLocaleString("tr-TR")}
        </div>
        
        {activePrintTable ? (
          <>
            <div className="font-bold mb-2">Masa: {activePrintTable.tableName}</div>
            <div className="border-b border-dashed border-black pb-1 mb-2">
              <div className="grid grid-cols-12 font-bold mb-1">
                <div className="col-span-6">Ürün</div>
                <div className="col-span-2 text-right">Adet</div>
                <div className="col-span-4 text-right">Tutar</div>
              </div>
              {getAggregatedItems(activePrintTable).map((item, idx) => (
                <div key={idx} className="mb-1">
                  <div className="grid grid-cols-12">
                    <div className="col-span-6 truncate">{item.nameTr}</div>
                    <div className="col-span-2 text-right">x{item.quantity}</div>
                    <div className="col-span-4 text-right">{(item.price * item.quantity).toFixed(2)} ₺</div>
                  </div>
                  {item.notes.map((n, nIdx) => (
                    <div key={nIdx} className="text-[10px] text-gray-700 pl-2">*{n}</div>
                  ))}
                </div>
              ))}
            </div>
            <div className="text-right font-bold text-sm mb-4">
              TOPLAM: {activePrintTable.totalBill.toFixed(2)} ₺
            </div>
          </>
        ) : activePrintOrder ? (
          <>
            <div className="font-bold mb-1">Masa: {activePrintOrder.tableName || "Masasız"}</div>
            <div className="mb-2">Ödeme Türü: {activePrintOrder.paymentMethod === "cash" ? "NAKİT" : "KREDİ KARTI"}</div>
            <div className="border-b border-dashed border-black pb-1 mb-2">
              <div className="grid grid-cols-12 font-bold mb-1">
                <div className="col-span-6">Ürün</div>
                <div className="col-span-2 text-right">Adet</div>
                <div className="col-span-4 text-right">Tutar</div>
              </div>
              {activePrintOrder.items.map((item, idx) => (
                <div key={idx} className="mb-1">
                  <div className="grid grid-cols-12">
                    <div className="col-span-6 truncate">{item.menuItemNameTr || "Ürün"}</div>
                    <div className="col-span-2 text-right">x{item.quantity}</div>
                    <div className="col-span-4 text-right">{(parseFloat(item.price) * item.quantity).toFixed(2)} ₺</div>
                  </div>
                  {item.notes && <div className="text-[10px] text-gray-700 pl-2">*{item.notes}</div>}
                </div>
              ))}
            </div>
            <div className="text-right font-bold text-sm mb-4">
              TOPLAM: {parseFloat(activePrintOrder.totalAmount).toFixed(2)} ₺
            </div>
          </>
        ) : null}

        <div className="text-center font-bold text-[10px] pt-2 border-t border-dashed border-black">
          ÖDEME ALINDI<br />
          Afiyet Olsun. Yine Bekleriz.
        </div>
      </div>

      {/* Page Header (Screen Only) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-800/40 pb-5 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Banknote className="h-7 w-7 text-[#C9A84C]" />
            <span>Kasa ve Ödeme Konsolu</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Restoran aktif hesap takibi, masa hesap kapama ve günlük satış raporlama paneli.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3 text-xs bg-[#16213E] border border-gray-800 p-2.5 rounded-xl text-gray-400">
          <Calendar className="h-4 w-4 text-[#C9A84C]" />
          <span>Gün Başlangıcı: Bugün 00:00</span>
        </div>
      </div>

      {/* Toast Alert */}
      {paymentSuccessMsg && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl flex items-center justify-between text-sm animate-pulse print:hidden">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <span>{paymentSuccessMsg}</span>
          </div>
          <button onClick={() => setPaymentSuccessMsg(null)} className="text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grid Stats Banner (Screen Only) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-[#16213E] p-4 rounded-2xl border border-gray-800/50 flex items-center space-x-4">
          <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <div className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Bugün Toplam Ciro</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {summary ? summary.totalRevenue.toFixed(2) : "0.00"} ₺
            </div>
          </div>
        </div>

        <div className="bg-[#16213E] p-4 rounded-2xl border border-gray-800/50 flex items-center space-x-4">
          <div className="p-3 bg-[#722F37]/25 rounded-xl text-[#C9A84C]">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <div className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Kapanan Masa</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {summary ? summary.orderCount : 0} adet
            </div>
          </div>
        </div>

        <div className="bg-[#16213E] p-4 rounded-2xl border border-gray-800/50 flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Banknote className="h-6 w-6" />
          </div>
          <div>
            <div className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Toplam Nakit</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {summary ? summary.cashRevenue.toFixed(2) : "0.00"} ₺
            </div>
          </div>
        </div>

        <div className="bg-[#16213E] p-4 rounded-2xl border border-gray-800/50 flex items-center space-x-4">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <div className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Kredi Kartı</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {summary ? summary.cardRevenue.toFixed(2) : "0.00"} ₺
            </div>
          </div>
        </div>
      </div>

      {/* Main Console Content (Screen Only) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 print:hidden text-gray-400 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#C9A84C]" />
          <span>Kasa bilgileri yükleniyor...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          {/* Active Tables Grid Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center space-x-2">
                <Utensils className="h-4.5 w-4.5 text-[#C9A84C]" />
                <span>Aktif Masalar ({activeTables.length})</span>
              </h2>
              <span className="text-[10px] text-gray-400 bg-[#2A2A3D] px-2 py-0.5 rounded-full font-mono uppercase">
                5s Otomatik Yenileme
              </span>
            </div>

            {activeTables.length === 0 ? (
              <div className="bg-[#16213E] p-12 text-center rounded-2xl border border-gray-800/40 text-gray-400 flex flex-col items-center justify-center space-y-3">
                <CheckCircle2 className="h-8 w-8 text-green-500/70" />
                <div>
                  <div className="font-semibold text-white">Hesabı Bulunan Aktif Masa Yok</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Misafirler sipariş verdiğinde masalar bu ekranda görünecektir.
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeTables.map((table) => {
                  const hasServed = table.status === "served";
                  return (
                    <div 
                      key={table.tableId}
                      onClick={() => setSelectedTable(table)}
                      className={`cursor-pointer group relative bg-[#16213E] p-5 rounded-2xl border border-gray-800 hover:border-[#C9A84C]/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 ${
                        selectedTable?.tableId === table.tableId ? "border-[#C9A84C]" : ""
                      }`}
                    >
                      {/* Left colored tag based on delivery state */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                        hasServed ? "bg-green-500" : "bg-[#C9A84C]"
                      }`} />

                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-white group-hover:text-[#C9A84C] transition-colors">
                            {table.tableName}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColors[table.status]}`}>
                              {statusLabels[table.status]}
                            </span>
                            <span className="text-gray-500 text-[10px] font-mono">
                              {table.orders.length} sipariş
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-[#C9A84C] block font-mono">
                            {table.totalBill.toFixed(2)} ₺
                          </span>
                          <span className="text-gray-500 text-[10px] mt-0.5 block">
                            {table.itemCount} ürün
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-gray-800/40 mt-4 pt-3 flex items-center justify-between text-xs text-gray-400 group-hover:text-white transition-colors">
                        <span>Hesap Detayını Gör</span>
                        <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-[#C9A84C] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar Settle Panel / Daily Summary */}
          <div className="space-y-6">
            {/* selected Table Settle Card */}
            {selectedTable ? (
              <div className="bg-[#16213E] p-6 rounded-2xl border border-[#C9A84C]/30 shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-gray-800/50 pb-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedTable.tableName}</h2>
                    <span className="text-xs text-gray-400 font-mono">Toplam Hesap Detayı</span>
                  </div>
                  <button 
                    onClick={() => setSelectedTable(null)}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#2A2A3D]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Items aggregation list */}
                <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
                  {getAggregatedItems(selectedTable).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-800/30 pb-2">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white">
                          {item.nameTr} <span className="text-gray-400">x{item.quantity}</span>
                        </div>
                        {item.notes.map((n, nIdx) => (
                          <div key={nIdx} className="text-[10px] text-gray-500 font-mono italic pl-2">
                            *{n}
                          </div>
                        ))}
                      </div>
                      <span className="font-mono text-gray-300 font-semibold">
                        {(item.price * item.quantity).toFixed(2)} ₺
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-800/50 pt-4 mt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-300">Ödenecek Tutar</span>
                    <span className="text-2xl font-extrabold text-[#C9A84C] font-mono">
                      {selectedTable.totalBill.toFixed(2)} ₺
                    </span>
                  </div>

                  {/* Print bill trigger before payment */}
                  <button
                    onClick={() => handlePrintBill(selectedTable)}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl border border-gray-800 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Hesap Fişi Yazdır (Print)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      disabled={submitting}
                      onClick={() => handleProcessPayment(selectedTable.tableId, "cash")}
                      className="flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-lg shadow-green-600/10 hover:shadow-green-600/20 active:scale-95 transition-all"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Banknote className="h-4 w-4" />
                          <span>NAKİT</span>
                        </>
                      )}
                    </button>

                    <button
                      disabled={submitting}
                      onClick={() => handleProcessPayment(selectedTable.tableId, "card")}
                      className="flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-95 transition-all"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          <span>KART</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Empty State sidebar or Daily Selling items list
              <div className="bg-[#16213E] p-6 rounded-2xl border border-gray-800/40 space-y-5">
                <div className="border-b border-gray-800/40 pb-3">
                  <h3 className="font-bold text-white flex items-center space-x-2">
                    <TrendingUp className="h-4.5 w-4.5 text-[#C9A84C]" />
                    <span>En Çok Satanlar (Bugün)</span>
                  </h3>
                  <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">
                    Tamamlanan sipariş verileri üzerinden
                  </span>
                </div>

                {!summary || summary.topItems.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 text-xs flex flex-col items-center justify-center space-y-2">
                    <AlertCircle className="h-6 w-6 text-gray-600" />
                    <span>Bugün henüz satış gerçekleşmedi.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summary.topItems.map((item, idx) => (
                      <div key={item.id} className="flex items-center justify-between text-xs pb-1 border-b border-gray-800/20">
                        <div className="flex items-center space-x-2.5">
                          <span className="h-5 w-5 bg-gradient-to-br from-[#722F37] to-[#C9A84C]/50 text-white font-bold rounded-lg flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-gray-200 text-left truncate max-w-[150px]">
                            {item.nameTr}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-400 font-mono">x{item.quantity}</span>
                          <span className="text-[#C9A84C] font-semibold font-mono">
                            {item.price.toFixed(2)} ₺
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Completed Orders History */}
            <div className="bg-[#16213E] p-6 rounded-2xl border border-gray-800/40 space-y-4">
              <div className="border-b border-gray-800/40 pb-3 flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center space-x-2">
                  <Receipt className="h-4.5 w-4.5 text-green-400" />
                  <span>Son Ödemeler ({completedOrders.length})</span>
                </h3>
              </div>

              {completedOrders.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  Henüz tamamlanan sipariş kaydı yok.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {completedOrders.map((order) => (
                    <div key={order.id} className="p-3 bg-[#1C1C28]/60 border border-gray-800/50 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white flex items-center space-x-2">
                          <span>{order.tableName || "Masasız"}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            order.paymentMethod === "cash" 
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>
                            {order.paymentMethod === "cash" ? "Nakit" : "Kart"}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 block mt-1">
                          {new Date(order.paidAt || order.createdAt).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-gray-300">
                          {parseFloat(order.totalAmount).toFixed(2)} ₺
                        </span>
                        <button
                          onClick={() => handlePrintReceipt(order)}
                          className="p-1.5 bg-[#2A2A3D] text-gray-400 hover:text-white rounded-lg border border-gray-800 hover:border-[#C9A84C]/30 transition-colors"
                          title="Faturayı Yazdır"
                        >
                          <Printer className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
