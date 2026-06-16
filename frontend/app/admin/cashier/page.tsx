"use client";

import { DEFAULT_VENUE_ID } from "@/lib/config";
import { supabase } from "@/lib/supabase";

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
  X,
  Split,
  Tag
} from "lucide-react";
import SplitPaymentModal from "./SplitPaymentModal";
import DiscountModal from "./DiscountModal";

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: string;
  notes?: string;
  menuItemNameTr?: string;
  menuItemNameEn?: string;
}

interface SplitPaymentRecord {
  id: string;
  amount: string;
  paymentMethod: string;
  splitMode: string;
  label?: string;
  createdAt: string;
}

interface Order {
  id: string;
  status: string; // "pending", "preparing", "ready", "served", "completed", "cancelled"
  tableId?: string;
  tableName?: string;
  totalAmount: string;
  discountAmount?: string;
  discountType?: string;
  discountRef?: string;
  netAmount?: string;
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
  subtotal: number;
  discountAmount: number;
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
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [activePrintTable, setActivePrintTable] = useState<TableOrders | null>(null);
  const [activePrintOrder, setActivePrintOrder] = useState<Order | null>(null);
  const [activePrintSplitPayments, setActivePrintSplitPayments] = useState<SplitPaymentRecord[] | null>(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitPaymentsCache, setSplitPaymentsCache] = useState<Record<string, SplitPaymentRecord[]>>({});

  // Settings
  const [printingEnabled, setPrintingEnabled] = useState(false);
  const [orgName, setOrgName] = useState("Karaköy Lokantası");

  const [refreshKey, setRefreshKey] = useState(0);

  // Register session/shift states
  const [activeSession, setActiveSession] = useState<any>(null);
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [showZReportModal, setShowZReportModal] = useState<any>(null);
  const [openingCashInput, setOpeningCashInput] = useState("500");
  const [closingCashInput, setClosingCashInput] = useState("");
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [selectedHistorySession, setSelectedHistorySession] = useState<any>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activePrintZReport, setActivePrintZReport] = useState<any>(null);

  useEffect(() => {
    const handleAfterPrint = () => {
      setActivePrintTable(null);
      setActivePrintOrder(null);
      setActivePrintSplitPayments(null);
      setActivePrintZReport(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

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

  // Fetch cashier data and listen to changes via Realtime
  useEffect(() => {
    async function fetchCashierData() {
      try {
        // 1. Fetch active session first (unless we are viewing historical session)
        let session = null;
        if (!selectedHistorySession) {
          const activeSessionRes = await fetch(`${apiUrl}/api/admin/cashier/session/active?venueId=${venueId}`);
          if (activeSessionRes.ok) {
            session = await activeSessionRes.json();
            setActiveSession(session);
          } else {
            setActiveSession(null);
          }
        } else {
          session = selectedHistorySession;
        }

        // 2. Fetch all orders filtered by session (or default venue)
        let ordersUrl = `${apiUrl}/api/admin/orders?venueId=${venueId}`;
        if (session) {
          ordersUrl += `&sessionId=${session.id}`;
        }
        const ordersRes = await fetch(ordersUrl);
        if (!ordersRes.ok) throw new Error("Orders failed to load");
        const allOrders: Order[] = await ordersRes.json();

        // 3. Fetch sales summary (optionally filtered by active or historical session)
        let summaryUrl = `${apiUrl}/api/admin/cashier/summary?venueId=${venueId}`;
        if (session) {
          summaryUrl += `&sessionId=${session.id}`;
        }
        const summaryRes = await fetch(summaryUrl);
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
          } else {
            if (order.tableId) {
              if (!activeGrouped[order.tableId]) {
                activeGrouped[order.tableId] = {
                  tableName: order.tableName || `Masa ${order.tableId.slice(0, 4)}`,
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
          const subtotal = group.orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
          const discountAmount = group.orders.reduce((sum, order) => sum + parseFloat(order.discountAmount || "0"), 0);
          const totalBill = group.orders.reduce((sum, order) => {
            const net = parseFloat(order.netAmount || "0");
            const tot = parseFloat(order.totalAmount);
            return sum + (net > 0 || parseFloat(order.discountAmount || "0") > 0 ? net : tot);
          }, 0);
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
            subtotal,
            discountAmount,
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

    // Subscribe to supabase database changes on "Order" table where venueId matches
    const channel = supabase
      .channel('cashier-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Order',
          filter: `venueId=eq.${venueId}`
        },
        (payload) => {
          console.log('Realtime change received for Cashier:', payload);
          fetchCashierData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshKey, selectedTable?.tableId, venueId, selectedHistorySession]);

  // Handle Cash/Card payment
  const handleProcessPayment = async (tableId: string, paymentMethod: "cash" | "card") => {
    setSubmitting(true);
    setPaymentSuccessMsg(null);
    try {
      const loyaltyOrder = selectedTable?.orders.find(o => o.discountType === "LOYALTY");
      const loyaltyPhone = loyaltyOrder?.discountRef || null;

      const res = await fetch(`${apiUrl}/api/admin/tables/${tableId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, loyaltyPhone })
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
    const itemsMap: Record<string, { nameTr: string; nameEn: string; quantity: number; price: number; notes: string[]; orderItemIds: string[] }> = {};
    table.orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.menuItemId + (item.notes ? `-${item.notes}` : "");
        if (itemsMap[key]) {
          itemsMap[key].quantity += item.quantity;
          itemsMap[key].orderItemIds.push(item.id);
          if (item.notes && !itemsMap[key].notes.includes(item.notes)) {
            itemsMap[key].notes.push(item.notes);
          }
        } else {
          itemsMap[key] = {
            nameTr: item.menuItemNameTr || "Ürün",
            nameEn: item.menuItemNameEn || "Item",
            quantity: item.quantity,
            price: parseFloat(item.price),
            notes: item.notes ? [item.notes] : [],
            orderItemIds: [item.id]
          };
        }
      });
    });
    return Object.values(itemsMap);
  };

  // Fetch split payments for a completed order
  const fetchSplitPayments = async (tableId: string): Promise<SplitPaymentRecord[]> => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/tables/${tableId}/payments`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Failed to fetch split payments", err);
    }
    return [];
  };

  // Handle split payment receipt print (per person)
  const handlePrintSplitReceipt = async (table: TableOrders) => {
    const payments = await fetchSplitPayments(table.tableId);
    if (payments.length > 0) {
      setActivePrintOrder(null);
      setActivePrintTable(table);
      setActivePrintSplitPayments(payments);
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };

  // Handle split payment success
  const handleSplitPaymentSuccess = (message: string) => {
    if (printingEnabled && selectedTable) {
      handlePrintSplitReceipt(selectedTable);
    }
    setPaymentSuccessMsg(message);
    setSelectedTable(null);
    setRefreshKey(prev => prev + 1);
  };

  // Open session handler
  const handleOpenSession = async () => {
    if (!openingCashInput) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/cashier/session/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          openingCash: parseFloat(openingCashInput),
          openedById: null
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Oturum açma başarısız");
      }
      const data = await res.json();
      setActiveSession(data);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Kasa açılış işlemi sırasında bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  // Close session handler
  const handleCloseSession = async () => {
    if (!closingCashInput) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/cashier/session/close?venueId=${venueId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closingCash: parseFloat(closingCashInput),
          closedById: null
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Oturum kapatma başarısız");
      }
      const data = await res.json();
      setShowZReportModal(data);
      setActiveSession(null);
      setClosingCashInput("");
      setShowCloseSessionModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Kasa kapatma işlemi sırasında bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch session history list
  const fetchSessionHistory = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/cashier/session/history?venueId=${venueId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch sessions history", err);
    }
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
        {activePrintZReport ? (
          <>
            <div className="text-center font-bold text-base mb-1">{orgName}</div>
            <div className="text-center font-bold text-xs mb-1">KASA Z-RAPORU</div>
            <div className="text-center border-b border-dashed border-black pb-2 mb-2">
              Tarih: {new Date(activePrintZReport.closedAt || activePrintZReport.openedAt).toLocaleString("tr-TR")}
            </div>
            <div className="space-y-1 text-[10px] mb-3">
              <div><strong>Oturum ID:</strong> #{activePrintZReport.id.slice(0, 8).toUpperCase()}</div>
              <div><strong>Açılış:</strong> {new Date(activePrintZReport.openedAt).toLocaleString("tr-TR")}</div>
              <div><strong>Kapanış:</strong> {activePrintZReport.closedAt ? new Date(activePrintZReport.closedAt).toLocaleString("tr-TR") : "Açık"}</div>
            </div>
            <table className="w-full text-left border-y border-dashed border-black py-2 my-2 text-[10px] leading-relaxed">
              <tbody>
                <tr>
                  <td>Devir Kasa (Float):</td>
                  <td className="text-right">{parseFloat(activePrintZReport.openingCash).toFixed(2)} ₺</td>
                </tr>
                <tr>
                  <td>Nakit Satışlar:</td>
                  <td className="text-right">{parseFloat(activePrintZReport.actualRevenue || "0").toFixed(2)} ₺</td>
                </tr>
                <tr className="font-semibold">
                  <td>Beklenen Nakit Toplam:</td>
                  <td className="text-right">{(parseFloat(activePrintZReport.openingCash) + parseFloat(activePrintZReport.actualRevenue || "0")).toFixed(2)} ₺</td>
                </tr>
                <tr>
                  <td>Kart Satışlar:</td>
                  <td className="text-right">{(parseFloat(activePrintZReport.expectedRevenue || "0") - parseFloat(activePrintZReport.actualRevenue || "0")).toFixed(2)} ₺</td>
                </tr>
                <tr className="font-bold border-t border-dashed border-gray-400">
                  <td>TOPLAM CİRO:</td>
                  <td className="text-right">{parseFloat(activePrintZReport.expectedRevenue || "0").toFixed(2)} ₺</td>
                </tr>
                <tr className="border-t border-dashed border-black pt-1">
                  <td>Teslim Alınan (Drawer):</td>
                  <td className="text-right">{parseFloat(activePrintZReport.closingCash || "0").toFixed(2)} ₺</td>
                </tr>
                <tr className="font-bold">
                  <td>KASA FARKI:</td>
                  <td className="text-right">{parseFloat(activePrintZReport.discrepancy || "0").toFixed(2)} ₺</td>
                </tr>
              </tbody>
            </table>
            <div className="text-center font-bold text-[9px] pt-2 mt-4 border-t border-dashed border-black">
              VARDİYA RAPORU ALINDI<br />
              Tripzy QR Menu SaaS
            </div>
          </>
        ) : (
          <>
            <div className="text-center font-bold text-base mb-1">{orgName}</div>
            <div className="text-center border-b border-dashed border-black pb-2 mb-2">
              KASA HESAP FİŞİ<br />
              Tarih: {new Date().toLocaleString("tr-TR")}
            </div>
            
            {activePrintTable && activePrintSplitPayments && activePrintSplitPayments.length > 0 ? (
              /* Split payment receipts — one section per person */
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
                <div className="text-right font-bold text-sm mb-2">
                  TOPLAM: {activePrintTable.totalBill.toFixed(2)} ₺
                </div>
                <div className="border-t border-dashed border-black pt-2 mb-2">
                  <div className="font-bold mb-1">HESAP BÖLÜŞTÜRME</div>
                  {activePrintSplitPayments.map((p, idx) => (
                    <div key={idx} className="flex justify-between mb-0.5">
                      <span>{p.label || `Ödeme ${idx + 1}`}</span>
                      <span>
                        {parseFloat(p.amount).toFixed(2)} ₺{" "}
                        ({p.paymentMethod === "cash" ? "Nakit" : "Kart"})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : activePrintTable ? (
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
                {activePrintTable.discountAmount > 0 ? (
                  <div className="text-right text-xs mb-4 space-y-0.5">
                    <div>Ara Toplam: {activePrintTable.subtotal.toFixed(2)} ₺</div>
                    <div className="text-green-800">İndirim ({activePrintTable.orders.find(o => o.discountRef)?.discountRef || "İndirim"}): -{activePrintTable.discountAmount.toFixed(2)} ₺</div>
                    <div className="font-bold text-sm pt-1 border-t border-dashed border-gray-400">GENEL TOPLAM: {activePrintTable.totalBill.toFixed(2)} ₺</div>
                  </div>
                ) : (
                  <div className="text-right font-bold text-sm mb-4">
                    TOPLAM: {activePrintTable.totalBill.toFixed(2)} ₺
                  </div>
                )}
              </>
            ) : activePrintOrder ? (
              <>
                <div className="font-bold mb-1">Masa: {activePrintOrder.tableName || "Masasız"}</div>
                <div className="mb-2">Ödeme Türü: {activePrintOrder.paymentMethod === "cash" ? "NAKİT" : activePrintOrder.paymentMethod === "card" ? "KREDİ KARTI" : "BÖLÜNMÜŞ"}</div>
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
                {parseFloat(activePrintOrder.discountAmount || "0") > 0 ? (
                  <div className="text-right text-xs mb-4 space-y-0.5">
                    <div>Ara Toplam: {parseFloat(activePrintOrder.totalAmount).toFixed(2)} ₺</div>
                    <div className="text-green-800">İndirim ({activePrintOrder.discountRef || "İndirim"}): -{parseFloat(activePrintOrder.discountAmount || "0").toFixed(2)} ₺</div>
                    <div className="font-bold text-sm pt-1 border-t border-dashed border-gray-400">GENEL TOPLAM: {parseFloat(activePrintOrder.netAmount || "0").toFixed(2)} ₺</div>
                  </div>
                ) : (
                  <div className="text-right font-bold text-sm mb-4">
                    TOPLAM: {parseFloat(activePrintOrder.totalAmount).toFixed(2)} ₺
                  </div>
                )}
              </>
            ) : null}

            <div className="text-center font-bold text-[10px] pt-2 border-t border-dashed border-black">
              ÖDEME ALINDI<br />
              Afiyet Olsun. Yine Bekleriz.
            </div>
          </>
        )}
      </div>

      {/* Page Header (Screen Only) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-800/40 pb-5 print:hidden gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Banknote className="h-7 w-7 text-[#C9A84C]" />
            <span>Kasa ve Ödeme Konsolu</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Restoran aktif hesap takibi, masa hesap kapama ve günlük satış raporlama paneli.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {activeSession ? (
            <div className="flex items-center space-x-3 bg-[#16213E]/80 border border-[#C9A84C]/35 px-4 py-2 rounded-xl text-xs text-gray-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>
                <strong>Vardiya Açılış:</strong> {new Date(activeSession.openedAt).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })} | <strong>Kasa Float:</strong> {activeSession.openingCash} ₺
              </span>
              <button 
                onClick={() => {
                  setClosingCashInput("");
                  setShowCloseSessionModal(true);
                }}
                className="bg-red-600/90 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-lg transition-colors ml-2"
              >
                Kapat
              </button>
            </div>
          ) : selectedHistorySession ? (
            <div className="flex items-center space-x-3 bg-[#16213E]/80 border border-blue-500/35 px-4 py-2 rounded-xl text-xs text-gray-200">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>
                <strong>Geçmiş Oturum:</strong> #{selectedHistorySession.id.slice(0, 6)} ({new Date(selectedHistorySession.openedAt).toLocaleDateString("tr-TR")})
              </span>
              <button 
                onClick={() => {
                  setSelectedHistorySession(null);
                  setRefreshKey(prev => prev + 1);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-2.5 py-1 rounded-lg transition-colors ml-2"
              >
                İncelemeyi Kapat
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3 bg-[#16213E]/80 border border-red-500/35 px-4 py-2 rounded-xl text-xs text-gray-200">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span><strong>Kasa Kapalı</strong></span>
            </div>
          )}
          
          <button 
            onClick={() => {
              fetchSessionHistory();
              setShowHistoryModal(true);
            }}
            className="flex items-center space-x-2 bg-[#16213E] hover:bg-[#2A2A3D] border border-gray-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 transition-colors"
          >
            <Clock className="h-4 w-4 text-[#C9A84C]" />
            <span>Vardiya Geçmişi</span>
          </button>
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 print:hidden text-gray-400 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#C9A84C]" />
          <span>Kasa bilgileri yükleniyor...</span>
        </div>
      ) : (!activeSession && !selectedHistorySession) ? (
        /* Glassmorphic Open Shift Overlay when register shift is closed */
        <div className="flex flex-col items-center justify-center py-16 bg-[#16213E]/25 border border-gray-800/40 rounded-3xl space-y-6 max-w-xl mx-auto print:hidden shadow-2xl backdrop-blur-md">
          <div className="p-5 bg-[#C9A84C]/10 rounded-full text-[#C9A84C] border border-[#C9A84C]/25 shadow-inner">
            <Banknote className="h-12 w-12" />
          </div>
          <div className="text-center space-y-2.5 px-6">
            <h2 className="text-xl font-bold text-white tracking-wide">Yeni Vardiya Başlatın</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
              Kasa işlemlerini yapabilmek, sipariş kabul etmek ve ödeme alabilmek için kasayı açmalı ve açılış devir tutarını girerek yeni bir vardiya başlatmalısınız.
            </p>
          </div>
          <div className="w-full max-w-xs space-y-4 px-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 block tracking-wider uppercase">Açılış Kasa Devri (Float):</label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-xs font-bold">₺</span>
                </div>
                <input
                  type="number"
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(e.target.value)}
                  placeholder="500"
                  className="bg-[#1C1C28]/80 border border-gray-800 text-white block w-full pl-8 pr-12 py-3 rounded-xl focus:outline-none focus:border-[#C9A84C]/60 text-sm font-semibold tracking-wide font-mono"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-xs font-bold">TRY</span>
                </div>
              </div>
            </div>
            <button
              disabled={submitting}
              onClick={handleOpenSession}
              className="w-full py-3 bg-gradient-to-r from-[#C9A84C] to-[#b3913b] hover:from-[#d9b85c] hover:to-[#c9a84c] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#C9A84C]/10 hover:shadow-[#C9A84C]/25 flex items-center justify-center space-x-2 active:scale-95 text-sm"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Kasayı Aç ve Vardiyayı Başlat</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Main console body */
        <>
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

                <div className="border-t border-gray-800/50 pt-4 mt-4 space-y-3">
                  {selectedTable.discountAmount > 0 && (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Ara Toplam</span>
                        <span className="font-mono text-gray-300">{selectedTable.subtotal.toFixed(2)} ₺</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-green-400">
                        <span className="flex items-center">
                          <Tag className="h-3.5 w-3.5 mr-1" />
                          İndirim ({selectedTable.orders.find(o => o.discountRef)?.discountRef || "İndirim"})
                        </span>
                        <span className="font-mono">-{selectedTable.discountAmount.toFixed(2)} ₺</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-gray-800/20">
                    <span className="text-sm font-semibold text-gray-300">Ödenecek Tutar</span>
                    <span className="text-2xl font-extrabold text-[#C9A84C] font-mono">
                      {selectedTable.totalBill.toFixed(2)} ₺
                    </span>
                  </div>

                  {/* Discount / Coupon Trigger */}
                  <button
                    disabled={!activeSession || !!selectedHistorySession}
                    onClick={() => setShowDiscountModal(true)}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl border border-dashed border-[#C9A84C]/40 text-xs font-semibold text-[#C9A84C] hover:bg-[#C9A84C]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Tag className="h-4 w-4" />
                    <span>İndirim / Kupon / Puan Uygula</span>
                  </button>

                  {/* Print bill trigger before payment */}
                  <button
                    onClick={() => handlePrintBill(selectedTable)}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl border border-gray-800 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Hesap Fişi Yazdır (Print)</span>
                  </button>

                  {(!activeSession || selectedHistorySession) ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-3.5 rounded-xl text-center text-xs font-semibold leading-relaxed">
                      {selectedHistorySession 
                        ? "Geçmiş Oturum İnceleme Modu: Ödeme işlemleri devre dışıdır." 
                        : "Aktif bir vardiya bulunmuyor. Ödeme almak için vardiya başlatın."}
                    </div>
                  ) : (
                    <>
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

                      {/* Split Payment Button */}
                      <button
                        disabled={submitting}
                        onClick={() => setShowSplitModal(true)}
                        className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#C9A84C]/20 to-[#722F37]/20 border border-[#C9A84C]/30 text-[#C9A84C] hover:from-[#C9A84C]/30 hover:to-[#722F37]/30 hover:border-[#C9A84C]/50 font-bold text-sm active:scale-95 transition-all"
                      >
                        <Split className="h-4 w-4" />
                        <span>HESABI BÖL</span>
                      </button>
                    </>
                  )}
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
                          {order.paymentMethod === "split" ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 flex items-center space-x-1">
                              <Split className="h-2.5 w-2.5" />
                              <span>Bölündü</span>
                            </span>
                          ) : (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                              order.paymentMethod === "cash" 
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}>
                              {order.paymentMethod === "cash" ? "Nakit" : "Kart"}
                            </span>
                          )}
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
      </>)}

      {/* Split Payment Modal */}
      {selectedTable && (
        <SplitPaymentModal
          isOpen={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          totalBill={selectedTable.totalBill}
          tableName={selectedTable.tableName}
          tableId={selectedTable.tableId}
          items={getAggregatedItems(selectedTable)}
          apiUrl={apiUrl}
          onPaymentSuccess={handleSplitPaymentSuccess}
        />
      )}

      {/* Discount Modal */}
      {selectedTable && (
        <DiscountModal
          isOpen={showDiscountModal}
          onClose={() => setShowDiscountModal(false)}
          tableId={selectedTable.tableId}
          tableName={selectedTable.tableName}
          totalBill={selectedTable.totalBill}
          apiUrl={apiUrl}
          onDiscountApplied={(discountAmount, discountType, discountRef, message) => {
            setPaymentSuccessMsg(message);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Close Shift Modal */}
      {showCloseSessionModal && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
          <div className="bg-[#16213E] border border-gray-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800/60 pb-4">
              <h3 className="text-lg font-bold text-white tracking-wide">Vardiyayı Kapat</h3>
              <button 
                onClick={() => setShowCloseSessionModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-gray-300">
              <div className="bg-[#1C1C28]/60 p-4 rounded-2xl border border-gray-850 space-y-2 font-semibold">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Açılış Zamanı:</span>
                  <span>{new Date(activeSession.openedAt).toLocaleString("tr-TR")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Başlangıç Kasası (Float):</span>
                  <span className="font-mono text-white">{parseFloat(activeSession.openingCash).toFixed(2)} ₺</span>
                </div>
                <div className="flex justify-between">
                  <span>Nakit Satışlar:</span>
                  <span className="font-mono text-white">{(summary?.cashRevenue || 0).toFixed(2)} ₺</span>
                </div>
                <div className="flex justify-between border-t border-gray-800 pt-2 text-[#C9A84C]">
                  <span>Beklenen Nakit Toplam:</span>
                  <span className="font-mono font-bold">{(parseFloat(activeSession.openingCash) + (summary?.cashRevenue || 0)).toFixed(2)} ₺</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 pt-1">
                  <span>Kart Satışları (Bilgi):</span>
                  <span className="font-mono">{(summary?.cardRevenue || 0).toFixed(2)} ₺</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 block tracking-wider uppercase">Kasadaki Güncel Nakit (Drawer Count):</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-xs font-bold">₺</span>
                  </div>
                  <input
                    type="number"
                    value={closingCashInput}
                    onChange={(e) => setClosingCashInput(e.target.value)}
                    placeholder="0.00"
                    className="bg-[#1C1C28] border border-gray-850 text-white block w-full pl-8 pr-12 py-3 rounded-xl focus:outline-none focus:border-[#C9A84C]/60 text-sm font-semibold tracking-wide font-mono"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-xs font-bold">TRY</span>
                  </div>
                </div>
              </div>

              {closingCashInput && (
                <div className={`p-3 rounded-xl text-xs font-bold text-center border ${
                  (parseFloat(closingCashInput) - (parseFloat(activeSession.openingCash) + (summary?.cashRevenue || 0))) === 0
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : (parseFloat(closingCashInput) - (parseFloat(activeSession.openingCash) + (summary?.cashRevenue || 0))) > 0
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}>
                  Fark (Discrepancy): {(parseFloat(closingCashInput) - (parseFloat(activeSession.openingCash) + (summary?.cashRevenue || 0))).toFixed(2)} ₺
                  {((parseFloat(closingCashInput) - (parseFloat(activeSession.openingCash) + (summary?.cashRevenue || 0))) === 0) && " (Kasa Dengede)"}
                  {((parseFloat(closingCashInput) - (parseFloat(activeSession.openingCash) + (summary?.cashRevenue || 0))) > 0) && " (Kasa Fazlası)"}
                  {((parseFloat(closingCashInput) - (parseFloat(activeSession.openingCash) + (summary?.cashRevenue || 0))) < 0) && " (Kasa Açığı)"}
                </div>
              )}
            </div>

            <div className="flex space-x-3 border-t border-gray-800/60 pt-4">
              <button
                onClick={() => setShowCloseSessionModal(false)}
                className="flex-1 py-3 border border-gray-800 text-xs font-bold text-gray-300 hover:text-white rounded-xl hover:bg-[#2A2A3D] transition-colors"
              >
                Vazgeç
              </button>
              <button
                disabled={submitting || !closingCashInput}
                onClick={handleCloseSession}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/15 transition-all flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Vardiyayı Kapat & Raporla</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Z-Report Modal */}
      {showZReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
          <div className="bg-[#16213E] border border-gray-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-gray-800/60 pb-4">
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-[#C9A84C]" />
                <span>Z-Raporu Detayları</span>
              </h3>
              <button 
                onClick={() => setShowZReportModal(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-white text-black p-5 rounded-2xl font-mono text-xs shadow-inner max-h-[350px] overflow-y-auto w-[290px] mx-auto leading-relaxed border border-gray-200">
              <div className="text-center font-bold text-sm mb-1">{orgName}</div>
              <div className="text-center font-bold text-xs mb-1">KASA Z-RAPORU</div>
              <div className="text-center border-b border-dashed border-black pb-2 mb-2">
                Tarih: {new Date(showZReportModal.closedAt || showZReportModal.openedAt).toLocaleString("tr-TR")}
              </div>
              <div className="space-y-1 text-[10px] mb-3">
                <div><strong>Oturum ID:</strong> #{showZReportModal.id.slice(0, 8).toUpperCase()}</div>
                <div><strong>Açılış:</strong> {new Date(showZReportModal.openedAt).toLocaleString("tr-TR")}</div>
                <div><strong>Kapanış:</strong> {showZReportModal.closedAt ? new Date(showZReportModal.closedAt).toLocaleString("tr-TR") : "Açık"}</div>
              </div>
              <table className="w-full text-left border-y border-dashed border-black py-2 my-2 text-[10px] leading-relaxed">
                <tbody>
                  <tr>
                    <td>Devir Kasa (Float):</td>
                    <td className="text-right">{parseFloat(showZReportModal.openingCash).toFixed(2)} ₺</td>
                  </tr>
                  <tr>
                    <td>Nakit Satışlar:</td>
                    <td className="text-right">{parseFloat(showZReportModal.actualRevenue || "0").toFixed(2)} ₺</td>
                  </tr>
                  <tr className="font-semibold">
                    <td>Beklenen Nakit Toplam:</td>
                    <td className="text-right">{(parseFloat(showZReportModal.openingCash) + parseFloat(showZReportModal.actualRevenue || "0")).toFixed(2)} ₺</td>
                  </tr>
                  <tr>
                    <td>Kart Satışlar:</td>
                    <td className="text-right">{(parseFloat(showZReportModal.expectedRevenue || "0") - parseFloat(showZReportModal.actualRevenue || "0")).toFixed(2)} ₺</td>
                  </tr>
                  <tr className="font-bold border-t border-dashed border-gray-400">
                    <td>TOPLAM CİRO:</td>
                    <td className="text-right">{parseFloat(showZReportModal.expectedRevenue || "0").toFixed(2)} ₺</td>
                  </tr>
                  <tr className="border-t border-dashed border-black pt-1">
                    <td>Teslim Alınan (Drawer):</td>
                    <td className="text-right">{parseFloat(showZReportModal.closingCash || "0").toFixed(2)} ₺</td>
                  </tr>
                  <tr className="font-bold">
                    <td>KASA FARKI:</td>
                    <td className="text-right">{parseFloat(showZReportModal.discrepancy || "0").toFixed(2)} ₺</td>
                  </tr>
                </tbody>
              </table>
              <div className="text-center font-bold text-[9px] pt-2 mt-4 border-t border-dashed border-black">
                Z-RAPORU DETAYI
              </div>
            </div>

            <div className="flex space-x-3 border-t border-gray-800/60 pt-4">
              <button
                onClick={() => setShowZReportModal(null)}
                className="flex-1 py-3 border border-gray-800 text-xs font-bold text-gray-300 hover:text-white rounded-xl hover:bg-[#2A2A3D] transition-colors"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  setActivePrintTable(null);
                  setActivePrintOrder(null);
                  setActivePrintSplitPayments(null);
                  setActivePrintZReport(showZReportModal);
                  setTimeout(() => {
                    window.print();
                  }, 100);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-[#C9A84C] to-[#b3913b] hover:from-[#d9b85c] hover:to-[#c9a84c] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#C9A84C]/10 hover:shadow-[#C9A84C]/25 transition-all flex items-center justify-center space-x-2"
              >
                <Printer className="h-4 w-4" />
                <span>Yazdır (Z-Report)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
          <div className="bg-[#16213E] border border-gray-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-850 pb-4">
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
                <Clock className="h-5 w-5 text-[#C9A84C]" />
                <span>Vardiya Geçmişi</span>
              </h3>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-x-auto max-h-[380px] pr-1">
              {sessionHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  Geçmiş kapalı vardiya bulunmamaktadır.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800/60 text-xs font-bold text-gray-400">
                      <th className="pb-3 pr-2">Açılış Tarihi</th>
                      <th className="pb-3 pr-2">Kapanış Tarihi</th>
                      <th className="pb-3 pr-2 text-right">Açılış Float</th>
                      <th className="pb-3 pr-2 text-right">Kapanış Tutar</th>
                      <th className="pb-3 pr-2 text-right">Toplam Ciro</th>
                      <th className="pb-3 pr-2 text-right">Fark</th>
                      <th className="pb-3 pr-2">Durum</th>
                      <th className="pb-3 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850/50 text-xs text-gray-300">
                    {sessionHistory.map((session) => (
                      <tr key={session.id} className="hover:bg-[#2A2A3D]/25 transition-colors">
                        <td className="py-3 pr-2 font-semibold">
                          {new Date(session.openedAt).toLocaleString("tr-TR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3 pr-2">
                          {session.closedAt 
                            ? new Date(session.closedAt).toLocaleString("tr-TR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "-"}
                        </td>
                        <td className="py-3 pr-2 text-right font-mono">{parseFloat(session.openingCash).toFixed(2)} ₺</td>
                        <td className="py-3 pr-2 text-right font-mono">{session.closingCash ? `${parseFloat(session.closingCash).toFixed(2)} ₺` : "-"}</td>
                        <td className="py-3 pr-2 text-right font-mono">{session.expectedRevenue ? `${parseFloat(session.expectedRevenue).toFixed(2)} ₺` : "0.00 ₺"}</td>
                        <td className={`py-3 pr-2 text-right font-mono font-bold ${
                          parseFloat(session.discrepancy || "0") === 0
                            ? "text-green-400"
                            : parseFloat(session.discrepancy || "0") > 0
                              ? "text-blue-400"
                              : "text-red-400"
                        }`}>
                          {session.discrepancy ? `${parseFloat(session.discrepancy).toFixed(2)} ₺` : "-"}
                        </td>
                        <td className="py-3 pr-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            session.status === "open"
                              ? "bg-green-500/15 text-green-400 border border-green-500/25"
                              : "bg-gray-500/15 text-gray-400 border border-gray-500/25"
                          }`}>
                            {session.status === "open" ? "Açık" : "Kapalı"}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedHistorySession(session);
                              setShowHistoryModal(false);
                              setRefreshKey(prev => prev + 1);
                            }}
                            className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/30 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                          >
                            İncele
                          </button>
                          {session.status === "closed" && (
                            <button
                              onClick={() => setShowZReportModal(session)}
                              className="bg-[#C9A84C]/20 hover:bg-[#C9A84C]/40 text-[#C9A84C] border border-[#C9A84C]/30 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                            >
                              Z-Raporu
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex border-t border-gray-800/60 pt-4">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="flex-grow py-3 border border-gray-800 text-xs font-bold text-gray-300 hover:text-white rounded-xl hover:bg-[#2A2A3D] transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
