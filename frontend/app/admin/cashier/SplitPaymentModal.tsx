"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  X,
  Users,
  ShoppingBag,
  DollarSign,
  Banknote,
  CreditCard,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Split,
} from "lucide-react";

interface AggregatedItem {
  nameTr: string;
  nameEn: string;
  quantity: number;
  price: number;
  notes: string[];
  orderItemIds: string[];
}

interface SplitPerson {
  id: string;
  label: string;
  amount: number;
  paymentMethod: "cash" | "card";
  selectedItemIndices: number[];
}

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalBill: number;
  tableName: string;
  tableId: string;
  items: AggregatedItem[];
  apiUrl: string;
  onPaymentSuccess: (message: string) => void;
}

type SplitTab = "equal" | "by_item" | "by_amount";

export default function SplitPaymentModal({
  isOpen,
  onClose,
  totalBill,
  tableName,
  tableId,
  items,
  apiUrl,
  onPaymentSuccess,
}: SplitPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<SplitTab>("equal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // === Equal Split State ===
  const [personCount, setPersonCount] = useState(2);
  const [equalPaymentMethods, setEqualPaymentMethods] = useState<
    Record<number, "cash" | "card">
  >({});

  // === By Item State ===
  const [itemPersons, setItemPersons] = useState<SplitPerson[]>([
    {
      id: "p1",
      label: "Kişi 1",
      amount: 0,
      paymentMethod: "cash",
      selectedItemIndices: [],
    },
    {
      id: "p2",
      label: "Kişi 2",
      amount: 0,
      paymentMethod: "cash",
      selectedItemIndices: [],
    },
  ]);
  const [activePersonIdx, setActivePersonIdx] = useState(0);

  // === By Amount State ===
  const [amountRows, setAmountRows] = useState<
    { id: string; amount: string; paymentMethod: "cash" | "card" }[]
  >([
    { id: "a1", amount: "", paymentMethod: "cash" },
    { id: "a2", amount: "", paymentMethod: "card" },
  ]);

  // === Equal Split Logic ===
  const perPersonAmount = useMemo(() => {
    const base = Math.floor((totalBill / personCount) * 100) / 100;
    return base;
  }, [totalBill, personCount]);

  const lastPersonAmount = useMemo(() => {
    const base = Math.floor((totalBill / personCount) * 100) / 100;
    const remainder = totalBill - base * (personCount - 1);
    return Math.round(remainder * 100) / 100;
  }, [totalBill, personCount]);

  const getEqualPaymentMethod = (idx: number): "cash" | "card" => {
    return equalPaymentMethods[idx] || "cash";
  };

  const toggleEqualPaymentMethod = (idx: number) => {
    setEqualPaymentMethods((prev) => ({
      ...prev,
      [idx]: prev[idx] === "card" ? "cash" : "card",
    }));
  };

  // === By Item Logic ===
  const discountRatio = useMemo(() => {
    const sub = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return sub > 0 ? totalBill / sub : 1;
  }, [items, totalBill]);

  // Flat items: list each unit of an item as a separate checkable item
  const flatItems = useMemo(() => {
    const list: {
      id: string;
      originalIdx: number;
      nameTr: string;
      nameEn: string;
      price: number;
      orderItemId: string;
      unitIndex: number;
    }[] = [];
    items.forEach((item, itemIdx) => {
      for (let q = 0; q < item.quantity; q++) {
        const orderItemId = item.orderItemIds[q] || item.orderItemIds[0];
        list.push({
          id: `${itemIdx}-${q}`,
          originalIdx: itemIdx,
          nameTr: `${item.nameTr} (${q + 1}/${item.quantity})`,
          nameEn: `${item.nameEn} (${q + 1}/${item.quantity})`,
          price: item.price,
          orderItemId,
          unitIndex: q
        });
      }
    });
    return list;
  }, [items]);

  const toggleItemForPerson = (itemIdx: number) => {
    setItemPersons((prev) => {
      const updated = [...prev];
      const person = { ...updated[activePersonIdx] };
      const selectedSet = new Set(person.selectedItemIndices);

      // First check: is this item already assigned to ANOTHER person?
      for (let i = 0; i < updated.length; i++) {
        if (i !== activePersonIdx && updated[i].selectedItemIndices.includes(itemIdx)) {
          // Remove from other person
          const otherPerson = { ...updated[i] };
          otherPerson.selectedItemIndices = otherPerson.selectedItemIndices.filter(
            (idx) => idx !== itemIdx
          );
          otherPerson.amount = otherPerson.selectedItemIndices.reduce(
            (sum, idx) => sum + flatItems[idx].price * discountRatio,
            0
          );
          updated[i] = otherPerson;
        }
      }

      if (selectedSet.has(itemIdx)) {
        selectedSet.delete(itemIdx);
      } else {
        selectedSet.add(itemIdx);
      }

      person.selectedItemIndices = Array.from(selectedSet);
      person.amount = person.selectedItemIndices.reduce(
        (sum, idx) => sum + flatItems[idx].price * discountRatio,
        0
      );
      updated[activePersonIdx] = person;
      return updated;
    });
  };

  const addItemPerson = () => {
    const nextNum = itemPersons.length + 1;
    setItemPersons((prev) => [
      ...prev,
      {
        id: `p${nextNum}`,
        label: `Kişi ${nextNum}`,
        amount: 0,
        paymentMethod: "cash",
        selectedItemIndices: [],
      },
    ]);
  };

  const removeItemPerson = (idx: number) => {
    if (itemPersons.length <= 2) return;
    setItemPersons((prev) => prev.filter((_, i) => i !== idx));
    if (activePersonIdx >= itemPersons.length - 1) {
      setActivePersonIdx(Math.max(0, itemPersons.length - 2));
    }
  };

  const toggleItemPersonPayment = (idx: number) => {
    setItemPersons((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        paymentMethod: updated[idx].paymentMethod === "card" ? "cash" : "card",
      };
      return updated;
    });
  };

  const assignedItemIndices = useMemo(() => {
    const assigned = new Set<number>();
    itemPersons.forEach((p) => p.selectedItemIndices.forEach((i) => assigned.add(i)));
    return assigned;
  }, [itemPersons]);

  const allItemsAssigned = assignedItemIndices.size === flatItems.length;
  const itemAssignedTotal = useMemo(
    () => itemPersons.reduce((sum, p) => sum + p.amount, 0),
    [itemPersons]
  );

  // === By Amount Logic ===
  const addAmountRow = () => {
    setAmountRows((prev) => [
      ...prev,
      {
        id: `a${Date.now()}`,
        amount: "",
        paymentMethod: "cash",
      },
    ]);
  };

  const removeAmountRow = (idx: number) => {
    if (amountRows.length <= 2) return;
    setAmountRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAmountRow = (idx: number, value: string) => {
    setAmountRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], amount: value };
      return updated;
    });
  };

  const toggleAmountPayment = (idx: number) => {
    setAmountRows((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        paymentMethod: updated[idx].paymentMethod === "card" ? "cash" : "card",
      };
      return updated;
    });
  };

  const amountTotal = useMemo(
    () =>
      amountRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0),
    [amountRows]
  );

  const amountRemaining = Math.round((totalBill - amountTotal) * 100) / 100;

  // Auto-fill remaining to last empty row
  const autoFillRemaining = useCallback(() => {
    if (amountRemaining <= 0) return;
    // Find first empty row
    const emptyIdx = amountRows.findIndex(
      (r) => !r.amount || parseFloat(r.amount) === 0
    );
    if (emptyIdx >= 0) {
      updateAmountRow(emptyIdx, amountRemaining.toFixed(2));
    }
  }, [amountRows, amountRemaining]);

  // === Submit ===
  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      let payments: {
        amount: number;
        paymentMethod: string;
        label: string;
        orderItemIds: string[];
      }[] = [];

      let successMessage = "";
      if (activeTab === "equal") {
        payments = Array.from({ length: personCount }, (_, i) => ({
          amount: i === personCount - 1 ? lastPersonAmount : perPersonAmount,
          paymentMethod: getEqualPaymentMethod(i),
          label: `Kişi ${i + 1}`,
          orderItemIds: [],
        }));
        successMessage = `${tableName} hesabı ${payments.length} kişiye bölünerek kapatıldı!`;
      } else if (activeTab === "by_item") {
        if (assignedItemIndices.size === 0) {
          setError("Lütfen en az bir ürünü bir kişiye atayın.");
          setSubmitting(false);
          return;
        }
        payments = itemPersons
          .filter((p) => p.selectedItemIndices.length > 0)
          .map((p) => {
            const itemQuantities: Record<string, number> = {};
            p.selectedItemIndices.forEach((idx) => {
              const itemId = flatItems[idx].orderItemId;
              itemQuantities[itemId] = (itemQuantities[itemId] || 0) + 1;
            });
            return {
              amount: Math.round(p.amount * 100) / 100,
              paymentMethod: p.paymentMethod,
              label: p.label,
              orderItemIds: Object.keys(itemQuantities),
              items: Object.entries(itemQuantities).map(([orderItemId, qty]) => ({
                orderItemId,
                quantity: qty
              }))
            };
          });
        successMessage = allItemsAssigned
          ? `${tableName} hesabı ${payments.length} kişiye bölünerek kapatıldı!`
          : `${tableName} masasından kısmi ödeme alındı. Kalan ürünler masada aktif durumdadır.`;
      } else if (activeTab === "by_amount") {
        const validRows = amountRows.filter(
          (r) => r.amount && parseFloat(r.amount) > 0
        );
        if (validRows.length === 0) {
          setError("En az bir ödeme tutarı giriniz.");
          setSubmitting(false);
          return;
        }
        if (Math.abs(amountRemaining) > 0.02) {
          setError(
            `Toplam tutar hesapla eşleşmiyor. Kalan: ${amountRemaining.toFixed(2)} ₺`
          );
          setSubmitting(false);
          return;
        }
        payments = validRows.map((row, i) => ({
          amount: parseFloat(row.amount),
          paymentMethod: row.paymentMethod,
          label: `Ödeme ${i + 1}`,
          orderItemIds: [],
        }));
        successMessage = `${tableName} hesabı ${payments.length} kişiye bölünerek kapatıldı!`;
      }

      const res = await fetch(
        `${apiUrl}/api/admin/tables/${tableId}/split-pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            splitMode: activeTab,
            payments,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.detail || "Bölünmüş ödeme kaydedilemedi."
        );
      }

      onPaymentSuccess(successMessage);
      onClose();
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const tabs: { key: SplitTab; label: string; icon: React.ReactNode }[] = [
    { key: "equal", label: "Eşit Böl", icon: <Users className="h-4 w-4" /> },
    {
      key: "by_item",
      label: "Ürüne Göre",
      icon: <ShoppingBag className="h-4 w-4" />,
    },
    {
      key: "by_amount",
      label: "Tutara Göre",
      icon: <DollarSign className="h-4 w-4" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#16213E] w-full max-w-lg mx-4 rounded-2xl border border-[#C9A84C]/30 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800/50">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Split className="h-5 w-5 text-[#C9A84C]" />
              <span>Hesabı Böl</span>
            </h2>
            <span className="text-xs text-gray-400">
              {tableName} · Toplam:{" "}
              <span className="text-[#C9A84C] font-semibold">
                {totalBill.toFixed(2)} ₺
              </span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2A2A3D] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-800/50">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-3 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? "text-[#C9A84C] border-b-2 border-[#C9A84C] bg-[#C9A84C]/5"
                  : "text-gray-400 hover:text-white border-b-2 border-transparent"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* === EQUAL SPLIT === */}
          {activeTab === "equal" && (
            <div className="space-y-5">
              {/* Person Count Stepper */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-300">
                  Kişi Sayısı
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setPersonCount((c) => Math.max(2, c - 1))}
                    className="p-1.5 rounded-lg bg-[#2A2A3D] text-gray-300 hover:text-white hover:bg-[#3A3A4D] transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-xl font-bold text-white w-8 text-center">
                    {personCount}
                  </span>
                  <button
                    onClick={() => setPersonCount((c) => Math.min(20, c + 1))}
                    className="p-1.5 rounded-lg bg-[#2A2A3D] text-gray-300 hover:text-white hover:bg-[#3A3A4D] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Per-Person Breakdown */}
              <div className="space-y-2.5">
                {Array.from({ length: personCount }, (_, i) => {
                  const amt =
                    i === personCount - 1 ? lastPersonAmount : perPersonAmount;
                  const method = getEqualPaymentMethod(i);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#1C1C28]/60 border border-gray-800/40"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="h-7 w-7 bg-gradient-to-br from-[#722F37] to-[#C9A84C]/50 text-white font-bold rounded-lg flex items-center justify-center text-xs">
                          {i + 1}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-white">
                            Kişi {i + 1}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {amt.toFixed(2)} ₺
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleEqualPaymentMethod(i)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          method === "cash"
                            ? "bg-green-600/20 text-green-400 border border-green-500/30"
                            : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {method === "cash" ? (
                          <>
                            <Banknote className="h-3.5 w-3.5" />
                            <span>Nakit</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Kart</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* === BY ITEM SPLIT === */}
          {activeTab === "by_item" && (
            <div className="space-y-4">
              {/* Person tabs */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                {itemPersons.map((person, idx) => (
                  <button
                    key={person.id}
                    onClick={() => setActivePersonIdx(idx)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      activePersonIdx === idx
                        ? "bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/40"
                        : "bg-[#2A2A3D] text-gray-400 border border-gray-800/40 hover:text-white"
                    }`}
                  >
                    <span>{person.label}</span>
                    {person.amount > 0 && (
                      <span className="text-[10px] font-mono opacity-70">
                        {person.amount.toFixed(0)}₺
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={addItemPerson}
                  className="p-1.5 rounded-lg bg-[#2A2A3D] text-gray-400 hover:text-[#C9A84C] border border-gray-800/40 hover:border-[#C9A84C]/30 transition-colors"
                  title="Kişi Ekle"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Items list with checkboxes */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {flatItems.map((flatItem, idx) => {
                  const isAssignedToCurrent =
                    itemPersons[activePersonIdx]?.selectedItemIndices.includes(
                      idx
                    );
                  const assignedToOther = itemPersons.findIndex(
                    (p, pIdx) =>
                      pIdx !== activePersonIdx &&
                      p.selectedItemIndices.includes(idx)
                  );
                  const assignedToOtherLabel =
                    assignedToOther >= 0
                      ? itemPersons[assignedToOther].label
                      : null;

                  return (
                    <button
                      key={flatItem.id}
                      onClick={() => toggleItemForPerson(idx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all border ${
                        isAssignedToCurrent
                          ? "bg-[#C9A84C]/10 border-[#C9A84C]/40 text-white"
                          : assignedToOtherLabel
                          ? "bg-gray-800/20 border-gray-800/30 text-gray-500"
                          : "bg-[#1C1C28]/60 border-gray-800/40 text-gray-300 hover:border-[#C9A84C]/20"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                            isAssignedToCurrent
                              ? "bg-[#C9A84C] border-[#C9A84C]"
                              : "border-gray-600"
                          }`}
                        >
                          {isAssignedToCurrent && (
                            <CheckCircle2 className="h-3 w-3 text-black" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-white">
                            {flatItem.nameTr}
                          </div>
                          {assignedToOtherLabel && !isAssignedToCurrent && (
                            <div className="text-[10px] text-amber-400/70 font-mono">
                              → {assignedToOtherLabel}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-gray-300">
                        {(flatItem.price * discountRatio).toFixed(2)} ₺
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Person payment breakdown */}
              <div className="space-y-2 pt-2 border-t border-gray-800/40">
                {itemPersons.map((person, idx) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#1C1C28]/60 border border-gray-800/40 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">
                        {person.label}
                      </span>
                      <span className="text-gray-500 font-mono">
                        {person.amount.toFixed(2)} ₺
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleItemPersonPayment(idx)}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          person.paymentMethod === "cash"
                            ? "bg-green-600/20 text-green-400 border border-green-500/30"
                            : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {person.paymentMethod === "cash" ? (
                          <>
                            <Banknote className="h-3 w-3" />
                            <span>Nakit</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-3 w-3" />
                            <span>Kart</span>
                          </>
                        )}
                      </button>
                      {itemPersons.length > 2 && (
                        <button
                          onClick={() => removeItemPerson(idx)}
                          className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!allItemsAssigned && (
                <div className="flex items-center space-x-2 text-xs text-amber-400/80 bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Henüz atanmamış {flatItems.length - assignedItemIndices.size}{" "}
                    ürün var. Bu işlem kısmi ödeme (Partial Payment) olarak kaydedilecek ve masa açık kalacaktır.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* === BY AMOUNT SPLIT === */}
          {activeTab === "by_amount" && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {amountRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="flex items-center space-x-2 p-2.5 rounded-xl bg-[#1C1C28]/60 border border-gray-800/40"
                  >
                    <span className="h-6 w-6 bg-gradient-to-br from-[#722F37] to-[#C9A84C]/50 text-white font-bold rounded-lg flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Tutar"
                      value={row.amount}
                      onChange={(e) => updateAmountRow(idx, e.target.value)}
                      className="flex-1 bg-[#2A2A3D] border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono focus:outline-none focus:border-[#C9A84C]/50 transition-colors w-0"
                    />
                    <span className="text-gray-500 text-xs">₺</span>
                    <button
                      onClick={() => toggleAmountPayment(idx)}
                      className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                        row.paymentMethod === "cash"
                          ? "bg-green-600/20 text-green-400 border border-green-500/30"
                          : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {row.paymentMethod === "cash" ? (
                        <>
                          <Banknote className="h-3 w-3" />
                          <span>Nakit</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-3 w-3" />
                          <span>Kart</span>
                        </>
                      )}
                    </button>
                    {amountRows.length > 2 && (
                      <button
                        onClick={() => removeAmountRow(idx)}
                        className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={addAmountRow}
                  className="flex items-center space-x-1.5 text-xs text-[#C9A84C] hover:text-[#C9A84C]/80 font-semibold transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Satır Ekle</span>
                </button>
                {amountRemaining > 0 && (
                  <button
                    onClick={autoFillRemaining}
                    className="text-[10px] text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
                  >
                    Kalanı otomatik doldur
                  </button>
                )}
              </div>

              {/* Running total */}
              <div className="p-3 rounded-xl bg-[#1C1C28]/80 border border-gray-800/40 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Girilen Toplam</span>
                  <span
                    className={`font-mono font-semibold ${
                      Math.abs(amountRemaining) <= 0.02
                        ? "text-green-400"
                        : "text-gray-300"
                    }`}
                  >
                    {amountTotal.toFixed(2)} ₺
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Hesap Toplamı</span>
                  <span className="font-mono font-semibold text-[#C9A84C]">
                    {totalBill.toFixed(2)} ₺
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t border-gray-800/40 pt-1.5">
                  <span className="text-gray-400">Kalan</span>
                  <span
                    className={`font-mono font-bold ${
                      amountRemaining === 0
                        ? "text-green-400"
                        : amountRemaining > 0
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {amountRemaining.toFixed(2)} ₺
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-2 flex items-center space-x-2 text-xs text-red-400 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-800/50 flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800/50 text-sm font-semibold transition-colors"
          >
            İptal
          </button>
          <button
            disabled={
              submitting ||
              (activeTab === "by_item" && assignedItemIndices.size === 0) ||
              (activeTab === "by_amount" && Math.abs(amountRemaining) > 0.02)
            }
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#B8963E] hover:from-[#D4B35A] hover:to-[#C9A84C] text-black font-bold text-sm shadow-lg shadow-[#C9A84C]/10 hover:shadow-[#C9A84C]/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Ödemeyi Onayla</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
