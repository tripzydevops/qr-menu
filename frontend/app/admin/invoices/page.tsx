"use client";

import { DEFAULT_VENUE_ID } from "@/lib/config";

import React, { useEffect, useState } from "react";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Check, 
  AlertCircle,
  Calendar,
  Sparkles,
  DollarSign
} from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface InvoiceItem {
  id?: string;
  ingredientId: string;
  ingredientName?: string;
  quantity: number;
  unitCost: number;
  vatRate?: number;
  isVatInclusive?: boolean;
  totalCost?: number;
  isPackage?: boolean;
  packageCount?: number;
  packageSize?: number;
  packagePrice?: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  supplierId: string;
  supplierName?: string;
  invoiceDate: string;
  totalAmount: string;
  status: string; // "pending", "processed", "void"
  items: InvoiceItem[];
}

export default function AdminInvoicesPage() {
  const venueId = DEFAULT_VENUE_ID; // Seed default
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Form states
  const [invNumber, setInvNumber] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().split("T")[0]);
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, ingRes, supRes] = await Promise.all([
        fetch(`${apiUrl}/api/admin/inventory/invoices?venueId=${venueId}`),
        fetch(`${apiUrl}/api/admin/inventory/ingredients?venueId=${venueId}`),
        fetch(`${apiUrl}/api/admin/inventory/suppliers?venueId=${venueId}`)
      ]);

      if (invRes.ok) setInvoices(await invRes.json());
      if (ingRes.ok) setIngredients(await ingRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      { 
        ingredientId: ingredients[0]?.id || "", 
        quantity: 1, 
        unitCost: 0, 
        vatRate: 0.01, 
        isVatInclusive: false,
        isPackage: false,
        packageCount: 1,
        packageSize: 1,
        packagePrice: 0
      }
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setLineItems(
      lineItems.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };

        if (field === "ingredientId" && value) {
          const savedConfigStr = typeof window !== "undefined" ? localStorage.getItem(`last_ing_config_${value}`) : null;
          if (savedConfigStr) {
            try {
              const savedConfig = JSON.parse(savedConfigStr);
              updated.isPackage = savedConfig.isPackage ?? false;
              updated.packageCount = savedConfig.packageCount ?? 1;
              updated.packageSize = savedConfig.packageSize ?? 1;
              updated.packagePrice = savedConfig.packagePrice ?? 0;
              updated.vatRate = savedConfig.vatRate ?? 0.01;
              updated.isVatInclusive = savedConfig.isVatInclusive ?? false;

              if (updated.isPackage) {
                updated.quantity = updated.packageCount * updated.packageSize;
                updated.unitCost = updated.packageSize > 0 ? updated.packagePrice / updated.packageSize : 0;
              } else {
                updated.quantity = savedConfig.quantity ?? 1;
                updated.unitCost = savedConfig.unitCost ?? 0;
              }
            } catch (e) {
              console.error("Failed to parse saved ingredient config", e);
            }
          }
        }

        if (field === "isPackage") {
          const isPkg = value as boolean;
          if (isPkg) {
            updated.packageCount = 1;
            updated.packageSize = updated.quantity;
            updated.packagePrice = updated.quantity * updated.unitCost;
          }
        }

        if (updated.isPackage) {
          const count = updated.packageCount ?? 1;
          const size = updated.packageSize ?? 1;
          const price = updated.packagePrice ?? 0;

          updated.quantity = count * size;
          updated.unitCost = size > 0 ? price / size : 0;
        }

        return updated;
      })
    );
  };

  const calculateGrandTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  };

  const handleSaveInvoice = async () => {
    const newErrors: Record<string, string> = {};
    if (!selectedSupplierId) newErrors.supplierId = "Tedarikçi seçimi zorunludur.";
    if (!invDate) newErrors.invoiceDate = "Fatura tarihi zorunludur.";
    if (lineItems.length === 0) newErrors.items = "En az bir fatura kalemi eklemelisiniz.";

    lineItems.forEach((item, index) => {
      if (!item.ingredientId) {
        newErrors[`item_${index}_ing`] = "Malzeme seçilmelidir.";
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_qty`] = "Miktar 0'dan büyük olmalıdır.";
      }
      if (item.unitCost < 0) {
        newErrors[`item_${index}_cost`] = "Birim maliyet negatif olamaz.";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      setLoading(true);
      const payload = {
        invoiceNumber: invNumber || null,
        supplierId: selectedSupplierId,
        invoiceDate: new Date(invDate).toISOString(),
        venueId,
        items: lineItems.map(item => ({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          vatRate: item.vatRate ?? 0.01,
          isVatInclusive: item.isVatInclusive ?? false
        }))
      };

      const res = await fetch(`${apiUrl}/api/admin/inventory/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (typeof window !== "undefined") {
          lineItems.forEach(item => {
            if (item.ingredientId) {
              const config = {
                isPackage: item.isPackage,
                packageCount: item.packageCount,
                packageSize: item.packageSize,
                packagePrice: item.packagePrice,
                vatRate: item.vatRate,
                isVatInclusive: item.isVatInclusive,
                quantity: item.quantity,
                unitCost: item.unitCost
              };
              localStorage.setItem(`last_ing_config_${item.ingredientId}`, JSON.stringify(config));
            }
          });
        }
        setIsCreating(false);
        clearForm();
        fetchData();
      } else {
        alert("Fatura kaydedilemedi.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVoidInvoice = async (id: string) => {
    if (!confirm("Bu faturayı iptal (void) etmek istediğinize emin misiniz? Maliyetler ve stoklar geri alınmayacaktır.")) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/inventory/invoices/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsScanning(true);
      const res = await fetch(`${apiUrl}/api/admin/inventory/invoices/scan`, {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        
        if (data._debugError) {
          alert(`AI Fatura Tarama Hatası (Gemini):\n${data._debugError}`);
        }

        // Match supplier
        if (data.supplierName) {
          const matchedSup = suppliers.find(s => 
            s.name.toLowerCase().includes(data.supplierName.toLowerCase())
          );
          if (matchedSup) setSelectedSupplierId(matchedSup.id);
        }

        if (data.invoiceNumber) setInvNumber(data.invoiceNumber);
        if (data.invoiceDate) setInvDate(data.invoiceDate);

        // Map items
        const mappedItems: InvoiceItem[] = [];
        if (data.items && Array.isArray(data.items)) {
          data.items.forEach((ocrItem: any) => {
            // Find closest matching ingredient
            const matchedIng = ingredients.find(ing =>
              ing.name.toLowerCase().includes(ocrItem.itemName.toLowerCase()) ||
              ocrItem.itemName.toLowerCase().includes(ing.name.toLowerCase())
            );
            mappedItems.push({
              ingredientId: matchedIng ? matchedIng.id : (ingredients[0]?.id || ""),
              quantity: ocrItem.quantity || 1,
              unitCost: ocrItem.unitCost || 0,
              vatRate: ocrItem.vatRate ?? 0.01,
              isVatInclusive: ocrItem.isVatInclusive ?? false,
              isPackage: false,
              packageCount: 1,
              packageSize: ocrItem.quantity || 1,
              packagePrice: (ocrItem.quantity || 1) * (ocrItem.unitCost || 0)
            });
          });
        }
        setLineItems(mappedItems);
        setIsCreating(true);
      } else {
        alert("Fatura tarama başarısız oldu. Manuel girişe devam edebilirsiniz.");
      }
    } catch (err) {
      console.error(err);
      alert("Fatura tarama sırasında bir hata oluştu.");
    } finally {
      setIsScanning(false);
    }
  };

  const clearForm = () => {
    setInvNumber("");
    setSelectedSupplierId("");
    setInvDate(new Date().toISOString().split("T")[0]);
    setLineItems([]);
    setErrors({});
  };

  const toggleExpand = (id: string) => {
    setExpandedInvoiceId(expandedInvoiceId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white">Fatura Girişi & Geçmişi</h2>
          <p className="text-xs text-gray-400 mt-1">
            Gelen ürün faturalarını manuel girebilir veya akıllı yapay zekayla fatura fotoğrafı taratarak doğrudan ekleyebilirsiniz.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Scan invoice file input */}
          <label className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#2A2A3D]/80 border border-gray-800 hover:border-[#C9A84C]/35 text-white font-semibold text-xs transition-all hover:bg-gray-800 cursor-pointer">
            {isScanning ? (
              <Loader2 className="h-4 w-4 text-[#C9A84C] animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-[#C9A84C]" />
            )}
            <span>{isScanning ? "Fatura Taranıyor..." : "AI Fatura Tara"}</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleScanInvoice}
              disabled={isScanning}
              className="hidden"
            />
          </label>
          
          <button 
            onClick={() => { clearForm(); setIsCreating(!isCreating); }}
            className="flex items-center space-x-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-xs transition-all shadow-md shadow-[#722F37]/15"
          >
            <Plus className="h-4 w-4" />
            <span>{isCreating ? "Listeyi Göster" : "Manuel Fatura Gir"}</span>
          </button>
        </div>
      </div>

      {isCreating ? (
        /* Create Invoice Form */
        <div className="bg-[#16213E]/30 border border-gray-800/50 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
            <FileText className="h-5 w-5 text-[#C9A84C]" />
            <span>Fatura Bilgileri</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Tedarikçi</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className={`w-full bg-[#1C1C28] border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none ${
                  errors.supplierId ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-[#C9A84C]/50"
                }`}
              >
                <option value="">Tedarikçi Seçin...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.supplierId && <p className="text-red-500 text-[10px] mt-1">{errors.supplierId}</p>}
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Fatura Numarası (Opsiyonel)</label>
              <input
                type="text"
                value={invNumber}
                onChange={(e) => setInvNumber(e.target.value)}
                className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                placeholder="örn. MTR-102938"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Fatura Tarihi</label>
              <input
                type="date"
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className={`w-full bg-[#1C1C28] border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none ${
                  errors.invoiceDate ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-[#C9A84C]/50"
                }`}
              />
              {errors.invoiceDate && <p className="text-red-500 text-[10px] mt-1">{errors.invoiceDate}</p>}
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-gray-800/40 pb-2">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Fatura Kalemleri</h4>
              <button
                onClick={handleAddLineItem}
                className="flex items-center space-x-1 text-xs text-[#C9A84C] hover:text-[#C9A84C]/80 font-semibold transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Kalem Ekle</span>
              </button>
            </div>

            {errors.items && (
              <div className="flex items-center space-x-1.5 text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-3 rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.items}</span>
              </div>
            )}

            {lineItems.length > 0 ? (
              <div className="space-y-3">
                {lineItems.map((item, index) => {
                  const currentIng = ingredients.find(ing => ing.id === item.ingredientId);
                  const unit = currentIng ? currentIng.unit : "";

                  return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#1C1C28]/40 border border-gray-800/35 p-3 rounded-xl items-end">
                      <div className="md:col-span-3">
                        <label className="text-[10px] text-gray-400 block mb-1">Malzeme</label>
                        <select
                          value={item.ingredientId}
                          onChange={(e) => handleUpdateLineItem(index, "ingredientId", e.target.value)}
                          className={`w-full bg-[#1C1C28] border rounded-lg px-3 py-2 text-xs text-white focus:outline-none ${
                            errors[`item_${index}_ing`] ? "border-red-500" : "border-gray-800"
                          }`}
                        >
                          <option value="">Malzeme Seçin...</option>
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-1">
                        <label className="text-[10px] text-gray-400 block mb-1">Giriş Türü</label>
                        <select
                          value={item.isPackage ? "package" : "unit"}
                          onChange={(e) => handleUpdateLineItem(index, "isPackage", e.target.value === "package")}
                          className="w-full bg-[#1C1C28] border border-gray-800 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                        >
                          <option value="unit">Birim</option>
                          <option value="package">Paket</option>
                        </select>
                      </div>

                      {!item.isPackage ? (
                        <>
                          <div className="md:col-span-3">
                            <label className="text-[10px] text-gray-400 block mb-1">
                              Miktar {unit ? `(${unit})` : ""}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => handleUpdateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                              className={`w-full bg-[#1C1C28] border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none ${
                                errors[`item_${index}_qty`] ? "border-red-500" : "border-gray-800"
                              }`}
                              placeholder="örn. 10"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-[10px] text-gray-400 block mb-1">
                              Birim Fiyat {unit ? `(₺/${unit})` : " (₺)"}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) => handleUpdateLineItem(index, "unitCost", parseFloat(e.target.value) || 0)}
                              className={`w-full bg-[#1C1C28] border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none ${
                                errors[`item_${index}_cost`] ? "border-red-500" : "border-gray-800"
                              }`}
                              placeholder="örn. 45"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="md:col-span-1">
                            <label className="text-[10px] text-gray-400 block mb-1">Adet</label>
                            <input
                              type="number"
                              value={item.packageCount ?? 1}
                              onChange={(e) => handleUpdateLineItem(index, "packageCount", parseInt(e.target.value) || 0)}
                              className={`w-full bg-[#1C1C28] border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none ${
                                errors[`item_${index}_qty`] ? "border-red-500" : "border-gray-800"
                              }`}
                              placeholder="1"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-[10px] text-gray-400 block mb-1">
                              Boyut {unit ? `(${unit})` : ""}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.packageSize ?? 1}
                              onChange={(e) => handleUpdateLineItem(index, "packageSize", parseFloat(e.target.value) || 0)}
                              className={`w-full bg-[#1C1C28] border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none ${
                                errors[`item_${index}_qty`] ? "border-red-500" : "border-gray-800"
                              }`}
                              placeholder="örn. 900"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-[10px] text-gray-400 block mb-1">Paket Fiyatı (₺)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.packagePrice ?? 0}
                              onChange={(e) => handleUpdateLineItem(index, "packagePrice", parseFloat(e.target.value) || 0)}
                              className={`w-full bg-[#1C1C28] border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none ${
                                errors[`item_${index}_cost`] ? "border-red-500" : "border-gray-800"
                              }`}
                              placeholder="örn. 209"
                            />
                          </div>
                        </>
                      )}

                      <div className="md:col-span-1">
                        <label className="text-[10px] text-gray-400 block mb-1">KDV Oranı</label>
                        <select
                          value={item.vatRate ?? 0.01}
                          onChange={(e) => handleUpdateLineItem(index, "vatRate", parseFloat(e.target.value))}
                          className="w-full bg-[#1C1C28] border border-gray-800 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                        >
                          <option value={0.01}>%1</option>
                          <option value={0.10}>%10</option>
                          <option value={0.20}>%20</option>
                        </select>
                      </div>

                      <div className="md:col-span-1">
                        <label className="text-[10px] text-gray-400 block mb-1">KDV</label>
                        <select
                          value={item.isVatInclusive ? "true" : "false"}
                          onChange={(e) => handleUpdateLineItem(index, "isVatInclusive", e.target.value === "true")}
                          className="w-full bg-[#1C1C28] border border-gray-800 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                        >
                          <option value="false">Hariç</option>
                          <option value="true">Dahil</option>
                        </select>
                      </div>

                      <div className="md:col-span-1">
                        <button
                          onClick={() => handleRemoveLineItem(index)}
                          className="p-2.5 rounded-lg bg-red-950/20 hover:bg-red-950/50 text-red-400 border border-red-900/30 w-full flex items-center justify-center font-semibold shrink-0"
                          title="Kalemi Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 text-xs">
                Faturada kalem bulunmuyor. Yeni bir kalem ekleyerek başlayın.
              </div>
            )}
          </div>

          {/* Grand Total & Actions */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center border-t border-gray-800/40 pt-4 gap-4">
            <div className="flex items-center space-x-2 text-sm text-white">
              <span>Fatura Toplam Tutarı:</span>
              <span className="font-mono text-lg font-bold text-[#C9A84C]">
                ₺{calculateGrandTotal().toFixed(2)}
              </span>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => { setIsCreating(false); clearForm(); }}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all border border-gray-700/50"
              >
                İptal
              </button>
              <button
                onClick={handleSaveInvoice}
                className="flex items-center space-x-1.5 px-6 py-2.5 rounded-xl bg-[#722F37] hover:bg-[#8B3E48] text-white font-bold text-xs transition-all shadow-md shadow-[#722F37]/15"
              >
                <Check className="h-4 w-4" />
                <span>Faturayı Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Invoices List */
        <div className="bg-[#16213E]/30 border border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-[#C9A84C] animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#16213E]/80 border-b border-gray-800/40 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="w-10 px-6 py-4"></th>
                    <th className="px-6 py-4">Fatura No</th>
                    <th className="px-6 py-4">Tedarikçi</th>
                    <th className="px-6 py-4">Tarih</th>
                    <th className="px-6 py-4">Toplam Tutar</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/20 text-xs">
                  {invoices.length > 0 ? (
                    invoices.map((inv) => {
                      const isExpanded = expandedInvoiceId === inv.id;
                      const isVoid = inv.status === "void";

                      return (
                        <React.Fragment key={inv.id}>
                          <tr className={`hover:bg-[#2A2A3D]/10 transition-colors ${isVoid ? "opacity-55" : ""}`}>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => toggleExpand(inv.id)}
                                className="text-gray-500 hover:text-white"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="px-6 py-4 font-mono font-semibold text-white">
                              {inv.invoiceNumber || "-"}
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-250">
                              {inv.supplierName || "Bilinmeyen Tedarikçi"}
                            </td>
                            <td className="px-6 py-4 text-gray-400">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                <span>{new Date(inv.invoiceDate).toLocaleDateString("tr-TR")}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-[#C9A84C] font-semibold">
                              ₺{parseFloat(inv.totalAmount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                inv.status === "processed"
                                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30"
                                  : isVoid
                                  ? "bg-gray-950/40 text-gray-400 border-gray-900/30"
                                  : "bg-amber-950/40 text-amber-400 border-amber-900/30"
                              }`}>
                                {inv.status === "processed" ? "İŞLENDİ" : isVoid ? "İPTAL" : "BEKLEMEDE"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {!isVoid && (
                                <button
                                  onClick={() => handleVoidInvoice(inv.id)}
                                  className="p-1.5 rounded-lg bg-red-950/15 hover:bg-red-950/40 text-red-400 border border-red-950/30"
                                  title="Faturayı İptal Et"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Expanded detail panel */}
                          {isExpanded && (
                            <tr className="bg-[#1C1C28]/25">
                              <td colSpan={7} className="px-12 py-4 border-l-2 border-[#C9A84C]">
                                <div className="space-y-2">
                                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Fatura İçeriği</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                    {inv.items.map((item, idx) => (
                                      <div key={idx} className="bg-[#1C1C28]/60 border border-gray-800/40 p-2.5 rounded-lg flex justify-between items-center">
                                        <div>
                                          <p className="font-semibold text-white">{item.ingredientName || "Bilinmeyen Malzeme"}</p>
                                          <p className="text-[10px] text-gray-500 font-mono">
                                            {item.quantity} x ₺{parseFloat(item.unitCost as any).toFixed(2)}
                                            <span className="text-[9px] text-gray-400 ml-1">
                                              ({item.isVatInclusive ? "KDV Dahil" : "KDV Hariç"} - %{Number(item.vatRate || 0.01) * 100})
                                            </span>
                                          </p>
                                        </div>
                                        <div className="font-mono text-[#C9A84C] font-semibold">
                                          ₺{parseFloat(item.totalCost as any).toFixed(2)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        Kayıtlı fatura geçmişi bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
