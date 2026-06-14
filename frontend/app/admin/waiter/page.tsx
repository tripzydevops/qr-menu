"use client";

import { DEFAULT_VENUE_ID } from "@/lib/config";
import { supabase } from "@/lib/supabase";

import React, { useEffect, useState, useRef } from "react";
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
  Sparkles,
  Plus,
  Minus,
  Search,
  Trash2,
  PlusCircle,
  ShoppingBag,
  ChefHat,
  Banknote,
  CreditCard,
  Split,
  Tag,
  CheckCircle2,
  X
} from "lucide-react";

import SplitPaymentModal from "../cashier/SplitPaymentModal";
import DiscountModal from "../cashier/DiscountModal";

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
  discountAmount?: string | number;
  discountType?: string;
  discountRef?: string;
  netAmount?: string | number;
  paymentMethod?: string;
  paidAt?: string;
  createdAt: string;
  items: OrderItem[];
}

export default function WaiterConsolePage() {
  const venueId = DEFAULT_VENUE_ID;
  const [activeTab, setActiveTab] = useState<"calls" | "runs" | "order">("calls");
  const [calls, setCalls] = useState<WaiterRequest[]>([]);
  const [runs, setRuns] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  
  // Settings
  const [printingEnabled, setPrintingEnabled] = useState(false);
  const [kdsEnabled, setKdsEnabled] = useState(false);
  const [orgName, setOrgName] = useState("Karaköy Lokantası");
  
  // Tracking alerts
  const seenCallIds = useRef<Set<string>>(new Set());
  const seenRunIds = useRef<Set<string>>(new Set());
  const seenOrderIds = useRef<Set<string>>(new Set());
  
  // Notification states
  const [newOrderToast, setNewOrderToast] = useState<{ tableName: string; text: string } | null>(null);
  const [activePrintRequest, setActivePrintRequest] = useState<{ tableName: string; items: any[]; subtotal?: number; discountAmount?: number; totalAmount: number } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-dismiss success message toast
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [timeNow, setTimeNow] = useState(Date.now());

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  // POS States
  const [tables, setTables] = useState<any[]>([]);
  const [menuCategories, setMenuCategories] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Table Action Sheet & Modals States
  const [activeActionTable, setActiveActionTable] = useState<any | null>(null);
  const [showTableActionModal, setShowTableActionModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Load tables and menu categories for POS order-taking
  useEffect(() => {
    async function loadPosData() {
      try {
        const tablesRes = await fetch(`${apiUrl}/api/admin/tables?venueId=${venueId}`);
        if (tablesRes.ok) {
          const tablesData = await tablesRes.json();
          tablesData.sort((a: any, b: any) => a.name.localeCompare(b.name, "tr"));
          setTables(tablesData);
        }
        
        const menuRes = await fetch(`${apiUrl}/api/admin/categories?venueId=${venueId}`);
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setMenuCategories(menuData);
          if (menuData.length > 0 && !selectedCategory) {
            setSelectedCategory(menuData[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load POS data:", err);
      }
    }
    
    loadPosData();
  }, [venueId, apiUrl, refreshKey]);

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

  // Listen to waiter requests and active orders via Realtime
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
          if (!seenCallIds.current.has(c.id)) {
            hasNewCall = true;
          }
        });

        // Check for new runs to trigger chime
        let hasNewRun = false;
        readyRuns.forEach(r => {
          if (!seenRunIds.current.has(r.id)) {
            hasNewRun = true;
          }
        });

        // Check for new guest orders placed
        let hasNewOrder = false;
        let newOrderDetails = null;
        ordersData.forEach(o => {
          if (!seenOrderIds.current.has(o.id)) {
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

        // Update seen records in refs
        callsData.forEach(c => seenCallIds.current.add(c.id));
        readyRuns.forEach(r => seenRunIds.current.add(r.id));
        ordersData.forEach(o => seenOrderIds.current.add(o.id));

        if (hasNewOrder && newOrderDetails) {
          setNewOrderToast(newOrderDetails);
          playWaiterChime();
        } else if ((hasNewCall || hasNewRun) && !loading) {
          playWaiterChime();
        }
        setIsOnline(true);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch waiter dashboard data", err);
        setIsOnline(false);
      }
    }

    fetchWaiterData();

    // Subscribe to supabase database changes on "WaiterRequest" table where venueId matches
    const callsChannel = supabase
      .channel('waiter-calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'WaiterRequest',
          filter: `venueId=eq.${venueId}`
        },
        (payload) => {
          console.log('Realtime change received for WaiterRequests:', payload);
          fetchWaiterData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsOnline(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsOnline(false);
        }
      });

    // Subscribe to supabase database changes on "Order" table where venueId matches
    const ordersChannel = supabase
      .channel('waiter-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Order',
          filter: `venueId=eq.${venueId}`
        },
        (payload) => {
          console.log('Realtime change received for Waiter Orders:', payload);
          fetchWaiterData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [refreshKey, loading, venueId]);

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

  // POS Helper Functions
  const handleAddToCart = (item: any) => {
    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prevCart.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prevCart,
        {
          menuItemId: item.id,
          nameTr: item.nameTr,
          nameEn: item.nameEn,
          price: Number(item.price),
          quantity: 1,
          notes: "",
        },
      ];
    });
  };

  const handleUpdateQuantity = (menuItemId: string, amount: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((c) => {
          if (c.menuItemId === menuItemId) {
            const newQty = c.quantity + amount;
            return { ...c, quantity: newQty };
          }
          return c;
        })
        .filter((c) => c.quantity > 0);
    });
  };

  const handleUpdateNotes = (menuItemId: string, notes: string) => {
    setCart((prevCart) => {
      return prevCart.map((c) =>
        c.menuItemId === menuItemId ? { ...c, notes } : c
      );
    });
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleSubmitOrder = async () => {
    if (!selectedTableId) {
      alert("Lütfen önce bir masa seçin.");
      return;
    }
    if (cart.length === 0) {
      alert("Sepetiniz boş. Lütfen en az bir ürün ekleyin.");
      return;
    }

    setOrderSubmitting(true);
    try {
      const payload = {
        venueId,
        tableId: selectedTableId,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          notes: c.notes || null,
        })),
      };

      const res = await fetch(`${apiUrl}/api/admin/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Sipariş gönderilemedi.");
      }

      // Success! Play chime, clear cart, reset selected table
      playWaiterChime();
      setCart([]);
      setSelectedTableId(null);
      setRefreshKey((prev) => prev + 1);
      setActiveTab("runs"); // Go to active orders to track
      alert("Sipariş başarıyla alındı ve mutfağa iletildi!");
    } catch (err) {
      console.error(err);
      alert("Sipariş gönderilirken bir hata oluştu.");
    } finally {
      setOrderSubmitting(false);
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

  // Handle processing full payment (cash/card) at the table
  const handleProcessPayment = async (tableId: string, paymentMethod: "cash" | "card") => {
    if (!window.confirm("Ödemeyi onaylıyor musunuz?")) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/tables/${tableId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });

      if (!res.ok) {
        throw new Error("Ödeme işlemi başarısız oldu.");
      }

      playWaiterChime();
      alert("Ödeme başarıyla alındı ve masa kapatıldı!");
      setRefreshKey((prev) => prev + 1);
      setShowTableActionModal(false);
      setActiveActionTable(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Ödeme sırasında bir hata oluştu.");
    }
  };

  // Helper to aggregate active bill items for a table (for payments & modals)
  const getTableBillingData = (tableId: string) => {
    const tableOrders = allOrders.filter(
      (o) => o.tableId === tableId && 
      (o.status === "pending" || o.status === "preparing" || o.status === "ready" || o.status === "served")
    );
    
    const itemsMap: Record<string, { nameTr: string; nameEn: string; quantity: number; price: number; notes: string[]; orderItemIds: string[] }> = {};
    let subtotal = 0;
    let discountAmount = 0;
    let totalBill = 0;

    tableOrders.forEach((o) => {
      o.items.forEach((item) => {
        const key = item.menuItemId + (item.notes ? `-${item.notes}` : "");
        const price = Number(item.price);
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
            price: price,
            notes: item.notes ? [item.notes] : [],
            orderItemIds: [item.id]
          };
        }
      });
      
      const orderTotal = Number(o.totalAmount);
      const orderDiscount = o.discountAmount ? Number(o.discountAmount) : 0;
      const orderNet = o.netAmount ? Number(o.netAmount) : 0;

      subtotal += orderTotal;
      discountAmount += orderDiscount;
      totalBill += (orderNet > 0 || orderDiscount > 0) ? orderNet : orderTotal;
    });

    return {
      ordersCount: tableOrders.length,
      items: Object.values(itemsMap),
      subtotal,
      discountAmount,
      totalBill,
    };
  };

  // Helper to aggregate active bill items for a table
  const getTableActiveBill = (tableId: string) => {
    const tableOrders = allOrders.filter(
      (o) => o.tableId === tableId && 
      (o.status === "pending" || o.status === "preparing" || o.status === "ready" || o.status === "served")
    );
    
    const itemsMap: Record<string, { menuItemNameTr: string; menuItemNameEn: string; quantity: number; price: number; notes: string[] }> = {};
    let subtotal = 0;
    let discountAmount = 0;
    let totalAmount = 0;

    tableOrders.forEach((o) => {
      o.items.forEach((item) => {
        const key = item.menuItemId;
        const price = Number(item.price);
        if (itemsMap[key]) {
          itemsMap[key].quantity += item.quantity;
          if (item.notes && !itemsMap[key].notes.includes(item.notes)) {
            itemsMap[key].notes.push(item.notes);
          }
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
      
      const orderTotal = Number(o.totalAmount);
      const orderDiscount = o.discountAmount ? Number(o.discountAmount) : 0;
      const orderNet = o.netAmount ? Number(o.netAmount) : 0;

      subtotal += orderTotal;
      discountAmount += orderDiscount;
      totalAmount += (orderNet > 0 || orderDiscount > 0) ? orderNet : orderTotal;
    });

    return {
      ordersCount: tableOrders.length,
      items: Object.values(itemsMap),
      subtotal,
      discountAmount,
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
      subtotal: bill.subtotal,
      discountAmount: bill.discountAmount,
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

  const billingData = activeActionTable ? getTableBillingData(activeActionTable.id) : null;

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

          <div className="flex items-center space-x-2">
            {/* Connection status badge */}
            <div className={`px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider ${
              isOnline 
                ? "bg-emerald-950/20 border-emerald-900/35 text-emerald-400" 
                : "bg-red-950/20 border-red-900/35 text-red-400 animate-pulse"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-red-500"}`} />
              <span>{isOnline ? "Canlı" : "Çevrimdışı"}</span>
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
          </div>
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

        {/* Success Toast Alert */}
        {successMsg && (
          <div className="mx-4 mt-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl p-4 flex items-center justify-between shadow-2xl animate-fade-in-up duration-300 relative z-30">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <div>
                <span className="font-bold text-[10px] block uppercase tracking-wider text-green-500/70">İŞLEM BAŞARILI</span>
                <p className="text-xs font-semibold mt-0.5">{successMsg}</p>
              </div>
            </div>
            <button 
              onClick={() => setSuccessMsg(null)}
              className="p-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-all text-xs"
            >
              <X className="h-4 w-4" />
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

          <button
            onClick={() => setActiveTab("order")}
            className={`flex-1 py-4 text-xs font-bold transition-all relative flex items-center justify-center space-x-2 ${
              activeTab === "order" ? "text-indigo-400 font-extrabold" : "text-gray-450 hover:text-white"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Sipariş Al</span>
            {activeTab === "order" && (
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
                          {bill.discountAmount && bill.discountAmount > 0 ? (
                            <div className="space-y-1 text-xs font-mono pt-2 border-t border-dashed border-gray-800/60">
                              <div className="flex justify-between text-gray-400">
                                <span>Ara Toplam:</span>
                                <span>₺{bill.subtotal?.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-green-400">
                                <span>İndirim:</span>
                                <span>-₺{bill.discountAmount.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-dotted border-gray-800/40">
                                <span className="text-emerald-400">TOPLAM HESAP:</span>
                                <span className="text-white">₺{bill.totalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-800/60 text-xs font-bold font-mono">
                              <span className="text-emerald-400">TOPLAM HESAP:</span>
                              <span className="text-white text-sm">₺{bill.totalAmount.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        <span className="font-serif font-black text-xl text-white">
                          {c.tableName || "Masa ?"}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{formatDate(c.createdAt)}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2.5 mt-4">
                        {c.type === "bill" ? (
                          <>
                            <div className="flex gap-2 w-full">
                              {printingEnabled && c.tableId && bill && bill.items.length > 0 && (
                                <button
                                  onClick={() => handlePrintBill(c.tableName || "Masa ?", c.tableId)}
                                  className="flex-1 py-3 rounded-xl border bg-indigo-950/20 hover:bg-indigo-900/30 border-indigo-900/40 text-indigo-400 font-bold text-xs tracking-wide transition-all active:scale-98 flex items-center justify-center space-x-1 shadow-md"
                                >
                                  <Printer className="h-4 w-4" />
                                  <span>Yazdır</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleProcessPayment(c.tableId, "cash")}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-750 text-black font-extrabold text-xs tracking-wide transition-all active:scale-98 flex items-center justify-center space-x-1 shadow-md shadow-emerald-950/20"
                              >
                                <Banknote className="h-4 w-4" />
                                <span>Nakit Öde</span>
                              </button>
                              <button
                                onClick={() => handleProcessPayment(c.tableId, "card")}
                                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-750 text-white font-extrabold text-xs tracking-wide transition-all active:scale-98 flex items-center justify-center space-x-1 shadow-md shadow-blue-950/20"
                              >
                                <CreditCard className="h-4 w-4" />
                                <span>Kart Öde</span>
                              </button>
                            </div>
                            <button
                              onClick={() => handleResolveCall(c.id)}
                              className="w-full py-2.5 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-800 text-gray-400 hover:text-white font-bold text-xs tracking-wide transition-all active:scale-98 flex items-center justify-center space-x-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Ödemesiz Talebi Kapat</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleResolveCall(c.id)}
                            className="w-full py-3 rounded-xl text-xs font-bold transition-all active:scale-98 text-black flex items-center justify-center space-x-1 bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-950/20"
                          >
                            <Check className="h-4 w-4" />
                            <span>Tamamlandı</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) ) : activeTab === "runs" ? (
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

                              {/* Status indicator — waiter must wait for kitchen to mark ready */}
                              <div
                                className="w-full mt-2 py-3 rounded-xl bg-gray-800/50 text-gray-500 font-bold text-xs tracking-wide flex items-center justify-center space-x-2 border border-gray-700/20 cursor-not-allowed select-none"
                              >
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{r.status === "pending" ? "Mutfak Onayı Bekleniyor…" : "Mutfakta Hazırlanıyor…"}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Render POS Order-Taking Screen */
            selectedTableId === null ? (
              /* Table Selector View */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800/40 pb-3">
                  <h3 className="text-sm font-semibold text-gray-300">Sipariş Alınacak Masayı Seçin</h3>
                  <span className="text-[10px] text-gray-500 font-mono">Toplam {tables.length} Masa</span>
                </div>

                {tables.length === 0 ? (
                  <div className="text-center py-20 text-gray-500 text-xs">
                    Masalar bulunamadı. Lütfen önce admin panelinden masa oluşturun.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {tables.map((table) => {
                      const hasActiveOrder = allOrders.some(
                        (o) => o.tableId === table.id && ["pending", "preparing", "ready", "served"].includes(o.status)
                      );
                      const hasPendingCall = calls.some(
                        (c) => c.tableId === table.id && c.status === "pending"
                      );
                      
                      return (
                        <button
                          key={table.id}
                          onClick={() => {
                            if (hasActiveOrder) {
                              setActiveActionTable(table);
                              setShowTableActionModal(true);
                            } else {
                              setSelectedTableId(table.id);
                              setCart([]);
                            }
                          }}
                          className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center text-center space-y-2.5 min-h-[110px] relative ${
                            hasActiveOrder 
                              ? "bg-amber-950/15 border-amber-900/40 hover:border-amber-500/50" 
                              : hasPendingCall
                              ? "bg-red-950/15 border-red-900/40 hover:border-red-500/50"
                              : "bg-[#16213E]/60 border-gray-800 hover:border-indigo-500/50 hover:bg-[#16213E]"
                          }`}
                        >
                          <span className="font-serif font-black text-lg text-white block">
                            {table.name}
                          </span>
                          {table.areaName && (
                            <span className="text-[10px] text-gray-450 block font-sans">
                              {table.areaName}
                            </span>
                          )}
                          
                          <div className="flex gap-1.5 justify-center mt-1">
                            {hasActiveOrder && (
                              <span className="text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500 text-black leading-none">
                                Dolu
                              </span>
                            )}
                            {hasPendingCall && (
                              <span className="text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-red-500 text-white leading-none animate-pulse">
                                Zil
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Split POS Screen (Menu Grid + Cart) */
              <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-12rem)]">
                {/* Left Pane: Categories & Menu Items Grid */}
                <div className="lg:w-3/5 space-y-4">
                  {/* Search & Back button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedTableId(null)}
                      className="p-3.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-450 hover:text-white transition-all flex items-center justify-center"
                      title="Masalara Geri Dön"
                    >
                      <ArrowLeft className="h-4.5 w-4.5" />
                    </button>
                    <div className="relative flex-grow">
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Ürün adı veya kategori ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-950 border border-gray-800/80 focus:border-indigo-500 text-sm text-white placeholder-gray-500 transition-all outline-none"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3.5 top-3 text-gray-450 hover:text-white text-xs"
                        >
                          Temizle
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category tabs */}
                  {!searchQuery && (
                    <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {menuCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            selectedCategory === cat.id
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                          }`}
                        >
                          {cat.nameTr}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Menu items Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                    {(() => {
                      const activeCategory = menuCategories.find((c) => c.id === selectedCategory);
                      let itemsToRender = activeCategory ? activeCategory.items : [];
                      
                      if (searchQuery) {
                        itemsToRender = [];
                        menuCategories.forEach((cat) => {
                          cat.items.forEach((item: any) => {
                            const matchName = 
                              item.nameTr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (item.nameEn && item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()));
                            const matchCat = cat.nameTr.toLowerCase().includes(searchQuery.toLowerCase());
                            if (matchName || matchCat) {
                              itemsToRender.push(item);
                            }
                          });
                        });
                      }

                      if (itemsToRender.length === 0) {
                        return (
                          <div className="col-span-full text-center py-12 text-gray-500 text-xs">
                            Aradığınız kriterlere uygun ürün bulunamadı.
                          </div>
                        );
                      }

                      return itemsToRender.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => handleAddToCart(item)}
                          className="p-4 bg-gray-900/60 border border-gray-800/80 hover:border-indigo-500/50 hover:bg-gray-900 rounded-2xl text-left transition-all duration-200 active:scale-[0.98] group flex flex-col justify-between space-y-2 shadow-sm min-h-[95px]"
                        >
                          <div>
                            <span className="font-bold text-xs text-gray-200 group-hover:text-white line-clamp-2 leading-tight">
                              {item.nameTr}
                            </span>
                            {item.nameEn && (
                              <span className="text-[10px] text-gray-500 block mt-0.5 font-normal truncate">
                                {item.nameEn}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-xs font-black text-indigo-400">
                            ₺{Number(item.price).toFixed(2)}
                          </span>
                        </button>
                      ));
                    })()}
                  </div>
                </div>

                {/* Right Pane: Cart Summary */}
                <div className="lg:w-2/5 bg-[#0E0E18] border border-gray-800/60 rounded-2xl p-5 flex flex-col justify-between shadow-xl min-h-[450px]">
                  <div className="space-y-4 flex-grow flex flex-col">
                    <div className="flex items-center justify-between border-b border-gray-800/40 pb-3">
                      <div>
                        <h3 className="font-serif font-black text-base text-white">
                          {tables.find((t) => t.id === selectedTableId)?.name || "Masa"} Siparişi
                        </h3>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          Garson tarafından alınan sipariş adisyonu
                        </span>
                      </div>
                      {cart.length > 0 && (
                        <button
                          onClick={handleClearCart}
                          className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/5 transition-all"
                          title="Sepeti Temizle"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Cart Items List */}
                    {cart.length === 0 ? (
                      <div className="flex-grow flex flex-col items-center justify-center text-center space-y-3 py-16 text-gray-500">
                        <ShoppingBag className="h-8 w-8 text-gray-600 animate-pulse" />
                        <div>
                          <p className="text-xs font-bold text-gray-400">Sepetiniz Boş</p>
                          <p className="text-[10px] text-gray-500 max-w-xs mt-1">
                            Soldaki listeden ürünlere dokunarak adisyona ekleyebilirsiniz.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-grow overflow-y-auto space-y-3.5 pr-1 max-h-[350px] no-scrollbar">
                        {cart.map((c) => { return (
                          <div
                            key={c.menuItemId}
                            className="border-b border-gray-800/20 pb-3.5 space-y-2"
                          >
                            <div className="flex justify-between items-start text-xs">
                              <div className="space-y-0.5 max-w-[65%]">
                                <span className="font-bold text-gray-200 block">
                                  {c.nameTr}
                                </span>
                                <span className="font-mono text-gray-400 font-bold block">
                                  ₺{c.price.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2.5">
                                <button
                                  onClick={() => handleUpdateQuantity(c.menuItemId, -1)}
                                  className="h-6 w-6 rounded-lg bg-gray-900 border border-gray-805 hover:border-gray-700 text-gray-450 hover:text-white flex items-center justify-center transition-all"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="font-mono font-bold text-xs text-white w-4 text-center">
                                  {c.quantity}
                                </span>
                                <button
                                  onClick={() => handleUpdateQuantity(c.menuItemId, 1)}
                                  className="h-6 w-6 rounded-lg bg-gray-900 border border-gray-805 hover:border-gray-700 text-gray-450 hover:text-white flex items-center justify-center transition-all"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            {/* Modifier notes textarea */}
                            <input
                              type="text"
                              placeholder="Örn: Az pişmiş, soğansız olsun..."
                              value={c.notes}
                              onChange={(e) => handleUpdateNotes(c.menuItemId, e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-gray-955 border border-gray-900 focus:border-indigo-650 text-[10px] text-gray-300 placeholder-gray-600 outline-none transition-all"
                            />
                          </div>
                        )})}
                      </div>
                    )}
                  </div>

                  {/* Checkout Footer */}
                  {cart.length > 0 && (
                    <div className="border-t border-gray-800/40 pt-4 mt-4 space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-gray-400">Genel Toplam</span>
                        <span className="text-xl font-black text-indigo-400 font-mono">
                          ₺{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                        </span>
                      </div>

                      <button
                        disabled={orderSubmitting}
                        onClick={handleSubmitOrder}
                        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 text-white font-bold text-xs tracking-wider transition-all active:scale-98 flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-950/20"
                      >
                        {orderSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ChefHat className="h-4 w-4" />
                            <span>MUTFAK SİPARİŞİ GÖNDER</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </main>
      </div>

      {/* Table Action Modal for Occupied Tables */}
      {showTableActionModal && activeActionTable && billingData && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm no-print">
          <div className="bg-[#0E0E18] border border-gray-805 w-full max-w-md mx-4 rounded-2xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-800/40 pb-3">
              <div>
                <h3 className="font-serif font-black text-lg text-white">
                  {activeActionTable.name} İşlemleri
                </h3>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Masa hesabı ve servis yönetimi
                </span>
              </div>
              <button
                onClick={() => {
                  setShowTableActionModal(false);
                  setActiveActionTable(null);
                }}
                className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-805"
              >
                ✕
              </button>
            </div>

            {/* Billing Summary */}
            <div className="bg-black/30 border border-gray-800/60 rounded-xl p-3.5 space-y-2.5 flex-grow overflow-y-auto max-h-[250px] no-scrollbar">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#6366F1] block border-b border-gray-850 pb-1.5">
                Masa Hesabı Detayı ({billingData.ordersCount} Sipariş)
              </span>
              <div className="space-y-1.5">
                {billingData.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs font-mono">
                    <span className="text-gray-300">
                      {item.quantity}x {item.nameTr}
                    </span>
                    <span className="text-white">
                      ₺{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              
              {billingData.discountAmount > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-800/40 text-xs text-green-450">
                  <span>İndirim:</span>
                  <span className="font-mono">-{billingData.discountAmount.toFixed(2)} ₺</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-850 text-xs font-bold font-mono">
                <span className="text-indigo-400">GENEL TOPLAM:</span>
                <span className="text-white text-sm">₺{billingData.totalBill.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Add items button */}
              <button
                onClick={() => {
                  setSelectedTableId(activeActionTable.id);
                  setCart([]);
                  setShowTableActionModal(false);
                }}
                className="col-span-2 py-3 rounded-xl bg-[#6366F1] hover:bg-[#5053df] text-white font-bold text-xs tracking-wide transition-all flex items-center justify-center space-x-1.5 shadow-md active:scale-98"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Yeni Sipariş Ekle</span>
              </button>

              {/* Cash Settle */}
              <button
                onClick={() => handleProcessPayment(activeActionTable.id, "cash")}
                className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-black font-bold text-xs tracking-wide transition-all flex items-center justify-center space-x-1 shadow-md active:scale-98"
              >
                <Banknote className="h-4 w-4" />
                <span>Nakit Ödeme</span>
              </button>

              {/* Card Settle */}
              <button
                onClick={() => handleProcessPayment(activeActionTable.id, "card")}
                className="py-3 rounded-xl bg-blue-650 hover:bg-blue-700 text-white font-bold text-xs tracking-wide transition-all flex items-center justify-center space-x-1 shadow-md active:scale-98"
              >
                <CreditCard className="h-4 w-4" />
                <span>Kart Ödeme</span>
              </button>

              {/* Split Payment */}
              <button
                onClick={() => {
                  setShowSplitModal(true);
                }}
                className="py-3 rounded-xl border border-[#C9A84C]/35 bg-[#C9A84C]/5 text-[#C9A84C] hover:bg-[#C9A84C]/10 font-bold text-xs tracking-wide transition-all flex items-center justify-center space-x-1 active:scale-98"
              >
                <Split className="h-4 w-4" />
                <span>Hesabı Böl</span>
              </button>

              {/* Discount Application */}
              <button
                onClick={() => {
                  setShowDiscountModal(true);
                }}
                className="py-3 rounded-xl border border-gray-700 bg-gray-900/60 text-gray-300 hover:text-white hover:bg-gray-800 font-bold text-xs tracking-wide transition-all flex items-center justify-center space-x-1 active:scale-98"
              >
                <Tag className="h-4 w-4" />
                <span>İndirim Uygula</span>
              </button>

              {/* Print Slip */}
              {printingEnabled && (
                <button
                  onClick={() => handlePrintBill(activeActionTable.name, activeActionTable.id)}
                  className="col-span-2 py-2.5 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-800 text-gray-400 hover:text-white font-bold text-xs tracking-wide transition-all flex items-center justify-center space-x-1 active:scale-98"
                >
                  <Printer className="h-4 w-4" />
                  <span>Adisyon Fişi Yazdır</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Split Payment Modal */}
      {showSplitModal && activeActionTable && billingData && (
        <SplitPaymentModal
          isOpen={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          totalBill={billingData.totalBill}
          tableName={activeActionTable.name}
          tableId={activeActionTable.id}
          items={billingData.items}
          apiUrl={apiUrl}
          onPaymentSuccess={(msg) => {
            playWaiterChime();
            setSuccessMsg(msg);
            setShowSplitModal(false);
            setShowTableActionModal(false);
            setActiveActionTable(null);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {/* Discount Modal */}
      {showDiscountModal && activeActionTable && billingData && (
        <DiscountModal
          isOpen={showDiscountModal}
          onClose={() => {
            setShowDiscountModal(false);
            setShowTableActionModal(false);
            setActiveActionTable(null);
          }}
          tableId={activeActionTable.id}
          tableName={activeActionTable.name}
          totalBill={billingData.totalBill}
          apiUrl={apiUrl}
          onDiscountApplied={(amt, type, ref, msg) => {
            playWaiterChime();
            setSuccessMsg(msg);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

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
          
          {activePrintRequest.discountAmount && activePrintRequest.discountAmount > 0 ? (
            <div className="border-t border-dashed border-black pt-2 mt-2 space-y-1 text-[11px]">
              <div className="flex justify-between items-center">
                <span>Ara Toplam:</span>
                <span className="font-mono">₺{activePrintRequest.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-green-700 font-semibold">
                <span>İndirim:</span>
                <span className="font-mono">-₺{activePrintRequest.discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-sm pt-1 border-t border-dotted border-black">
                <span>GENEL TOPLAM:</span>
                <span className="font-mono text-base">₺{activePrintRequest.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center font-bold text-sm mt-3 pt-1 border-t border-dashed border-black">
              <span>TOPLAM:</span>
              <span className="font-mono">₺{activePrintRequest.totalAmount.toFixed(2)}</span>
            </div>
          )}
          
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
