"use client";

import React, { useEffect, useState } from "react";
import { DEFAULT_VENUE_ID } from "@/lib/config";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

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
  DollarSign,
  X,
  Edit,
  Search
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
  ingredientUnit?: string;
  quantity: number;
  unitCost: number;
  vatRate?: number;
  isVatInclusive?: boolean;
  totalCost?: number;
  isPackage?: boolean;
  packageCount?: number;
  packageSize?: number;
  packagePrice?: number;
  brand?: string;
  rawName?: string;
  costInputUnit?: string;
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
  isArchived?: boolean;
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
  const [showArchived, setShowArchived] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Form states
  const [invNumber, setInvNumber] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().split("T")[0]);
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // New ingredient form states
  const [isCreatingIngredient, setIsCreatingIngredient] = useState(false);
  const [newIngName, setNewIngName] = useState("");
  const [newIngUnit, setNewIngUnit] = useState("g");
  const [newIngDensity, setNewIngDensity] = useState(1.0);
  const [targetLineItemIndex, setTargetLineItemIndex] = useState<number | null>(null);
  const [creatingIngLoading, setCreatingIngLoading] = useState(false);

  // New supplier form states
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [creatingSupLoading, setCreatingSupLoading] = useState(false);

  // Searchable select states
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [ingSearchTerm, setIngSearchTerm] = useState("");

  const { data: rawInvoices, mutate: mutateInvoices } = useSWR(
    `${apiUrl}/api/admin/inventory/invoices?venueId=${venueId}&includeArchived=${showArchived}`,
    fetcher
  );
  const { data: rawIngredients, mutate: mutateIngredients } = useSWR(
    `${apiUrl}/api/admin/inventory/ingredients?venueId=${venueId}`,
    fetcher
  );
  const { data: rawSuppliers, mutate: mutateSuppliers } = useSWR(
    `${apiUrl}/api/admin/inventory/suppliers?venueId=${venueId}`,
    fetcher
  );

  const fetchData = async () => {
    try {
      await Promise.all([
        mutateInvoices(),
        mutateIngredients(),
        mutateSuppliers()
      ]);
    } catch (e) {
      console.error("Failed to revalidate SWR cache", e);
    }
  };

  useEffect(() => {
    if (rawInvoices) setInvoices(rawInvoices);
  }, [rawInvoices]);

  useEffect(() => {
    if (rawIngredients) setIngredients(rawIngredients);
  }, [rawIngredients]);

  useEffect(() => {
    if (rawSuppliers) setSuppliers(rawSuppliers);
  }, [rawSuppliers]);

  useEffect(() => {
    if (rawInvoices && rawIngredients && rawSuppliers) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [rawInvoices, rawIngredients, rawSuppliers]);

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
        packagePrice: 0,
        brand: "",
        rawName: "",
        costInputUnit: ingredients[0]?.unit || "g"
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
          const ing = ingredients.find(c => c.id === value);
          updated.costInputUnit = ing ? ing.unit : "g";
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

  const handleCreateNewIngredient = async () => {
    if (!newIngName.trim()) {
      alert("Lütfen malzeme adını girin.");
      return;
    }
    
    try {
      setCreatingIngLoading(true);
      const payload = {
        venueId,
        name: newIngName.trim(),
        unit: newIngUnit,
        density: Number(newIngDensity) || 1.0,
      };

      const res = await fetch(`${apiUrl}/api/admin/inventory/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newIng = await res.json();
        // Update local ingredients list
        setIngredients(prev => [...prev, newIng].sort((a, b) => a.name.localeCompare(b.name)));
        
        // If we opened this for a specific line item row, update its ingredientId!
        if (targetLineItemIndex !== null) {
          handleUpdateLineItem(targetLineItemIndex, "ingredientId", newIng.id);
        }
        
        // Reset states and close modal
        setNewIngName("");
        setNewIngUnit("g");
        setNewIngDensity(1.0);
        setIsCreatingIngredient(false);
        setTargetLineItemIndex(null);
      } else {
        const err = await res.json();
        alert(err.detail || "Malzeme eklenemedi.");
      }
    } catch (e) {
      console.error(e);
      alert("Malzeme eklenirken bir hata oluştu.");
    } finally {
      setCreatingIngLoading(false);
    }
  };

  const handleCreateNewSupplier = async () => {
    if (!newSupName.trim()) {
      alert("Lütfen tedarikçi adını girin.");
      return;
    }

    try {
      setCreatingSupLoading(true);
      const payload = {
        venueId,
        name: newSupName.trim(),
        contactEmail: newSupEmail.trim() || null,
        contactPhone: newSupPhone.trim() || null,
      };

      const res = await fetch(`${apiUrl}/api/admin/inventory/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newSup = await res.json();
        // Update local suppliers list
        setSuppliers(prev => [...prev, newSup].sort((a, b) => a.name.localeCompare(b.name)));
        
        // Auto-select the newly created supplier
        setSelectedSupplierId(newSup.id);
        
        // Reset states and close modal
        setNewSupName("");
        setNewSupEmail("");
        setNewSupPhone("");
        setIsCreatingSupplier(false);
      } else {
        const err = await res.json();
        alert(err.detail || "Tedarikçi eklenemedi.");
      }
    } catch (e) {
      console.error(e);
      alert("Tedarikçi eklenirken bir hata oluştu.");
    } finally {
      setCreatingSupLoading(false);
    }
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
          isVatInclusive: item.isVatInclusive ?? false,
          brand: item.brand || null,
          rawName: item.rawName || null
        }))
      };

      const method = editingInvoiceId ? "PUT" : "POST";
      const endpoint = editingInvoiceId 
        ? `${apiUrl}/api/admin/inventory/invoices/${editingInvoiceId}`
        : `${apiUrl}/api/admin/inventory/invoices`;

      const res = await fetch(endpoint, {
        method,
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

  const handleArchiveInvoice = async (invoiceId: string, isArchived: boolean) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/inventory/invoices/${invoiceId}/archive`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived })
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
    let file = e.target.files[0];
    
    // Client-side image compression
    if (file.type.startsWith("image/")) {
      try {
        console.log(`Original image size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        file = await compressImage(file, 1600, 0.75);
        console.log(`Compressed image size: ${(file.size / 1024).toFixed(2)} KB`);
      } catch (err) {
        console.error("Image compression failed, using original file", err);
      }
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsScanning(true);
      const res = await fetch(`${apiUrl}/api/admin/inventory/invoices/scan?venueId=${venueId}`, {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        
        if (data._debugError) {
          alert(`AI Fatura Tarama Hatası (Gemini):\n${data._debugError}`);
        }

        // Re-fetch ingredients and suppliers to include newly auto-created records
        let updatedSuppliers = suppliers;
        let updatedIngredients = ingredients;
        try {
          const [ingRes, supRes] = await Promise.all([
            fetch(`${apiUrl}/api/admin/inventory/ingredients?venueId=${venueId}`),
            fetch(`${apiUrl}/api/admin/inventory/suppliers?venueId=${venueId}`)
          ]);
          if (ingRes.ok) {
            const freshIngs = await ingRes.json();
            setIngredients(freshIngs);
            updatedIngredients = freshIngs;
          }
          if (supRes.ok) {
            const freshSups = await supRes.json();
            setSuppliers(freshSups);
            updatedSuppliers = freshSups;
          }
        } catch (e) {
          console.error("Failed to re-fetch updated inventory lists", e);
        }

        // Match supplier
        if (data.matchedSupplierId) {
          setSelectedSupplierId(data.matchedSupplierId);
        } else if (data.supplierName) {
          const matchedSup = updatedSuppliers.find(s => 
            s.name.toLowerCase().includes(data.supplierName.toLowerCase()) ||
            data.supplierName.toLowerCase().includes(s.name.toLowerCase())
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
            let ingredientId = "";
            if (ocrItem.matchedIngredientId) {
              const exists = updatedIngredients.some(ing => ing.id === ocrItem.matchedIngredientId);
              if (exists) {
                ingredientId = ocrItem.matchedIngredientId;
              }
            }
            if (!ingredientId && ocrItem.itemName) {
              const matchedIng = updatedIngredients.find(ing =>
                ing.name.toLowerCase().includes(ocrItem.itemName.toLowerCase()) ||
                ocrItem.itemName.toLowerCase().includes(ing.name.toLowerCase())
              );
              if (matchedIng) ingredientId = matchedIng.id;
            }

            const currentMatched = updatedIngredients.find(ing => ing.id === ingredientId);
            const ingUnit = currentMatched ? currentMatched.unit : "g";

            mappedItems.push({
              ingredientId: ingredientId,
              quantity: ocrItem.quantity || 1,
              unitCost: ocrItem.unitCost || 0,
              vatRate: ocrItem.vatRate ?? 0.01,
              isVatInclusive: ocrItem.isVatInclusive ?? false,
              isPackage: false,
              packageCount: 1,
              packageSize: ocrItem.quantity || 1,
              packagePrice: (ocrItem.quantity || 1) * (ocrItem.unitCost || 0),
              brand: ocrItem.brand || "",
              rawName: ocrItem.itemName || "",
              costInputUnit: ingUnit
            });
          });
        }
        setLineItems(mappedItems);
        setIsCreating(true);
      } else {
        let errMsg = "Fatura tarama başarısız oldu. Manuel girişe devam edebilirsiniz.";
        try {
          const errData = await res.json();
          if (errData.detail) {
            errMsg = `Fatura tarama başarısız oldu:\n${errData.detail}`;
          }
        } catch (_) {}
        alert(errMsg);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Fatura tarama sırasında bir hata oluştu: ${err.message || err}`);
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
    setEditingInvoiceId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedInvoiceId(expandedInvoiceId === id ? null : id);
  };

  const handleStartEdit = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setInvNumber(inv.invoiceNumber || "");
    setSelectedSupplierId(inv.supplierId);
    setInvDate(new Date(inv.invoiceDate).toISOString().split("T")[0]);
    
    const mappedItems: InvoiceItem[] = inv.items.map(item => {
      const itemQty = Number(item.quantity);
      const itemCost = Number(item.unitCost);
      
      let isPackage = false;
      let packageCount = 1;
      let packageSize = itemQty;
      let packagePrice = itemQty * itemCost;

      if (typeof window !== "undefined") {
        const savedConfigStr = localStorage.getItem(`last_ing_config_${item.ingredientId}`);
        if (savedConfigStr) {
          try {
            const savedConfig = JSON.parse(savedConfigStr);
            const savedQty = Number(savedConfig.quantity);
            const savedCost = Number(savedConfig.unitCost);
            
            if (savedQty === itemQty && savedCost === itemCost) {
              isPackage = savedConfig.isPackage ?? false;
              packageCount = savedConfig.packageCount ?? 1;
              packageSize = savedConfig.packageSize ?? itemQty;
              packagePrice = savedConfig.packagePrice ?? (itemQty * itemCost);
            }
          } catch (e) {
            console.error("Failed to parse saved config on edit start", e);
          }
        }
      }

      return {
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        ingredientUnit: item.ingredientUnit,
        quantity: itemQty,
        unitCost: itemCost,
        vatRate: item.vatRate !== null ? Number(item.vatRate) : 0.01,
        isVatInclusive: item.isVatInclusive ?? false,
        isPackage,
        packageCount,
        packageSize,
        packagePrice,
        brand: item.brand || "",
        rawName: item.rawName || "",
        costInputUnit: item.ingredientUnit || "g"
      };
    });
    
    setLineItems(mappedItems);
    setIsCreating(true);
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
          {!isCreating && (
            <label className="flex items-center space-x-2 cursor-pointer select-none bg-[#16213E]/40 border border-gray-800/60 px-3.5 py-2.5 rounded-xl">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded bg-[#1C1C28] border-gray-800 text-[#722F37] focus:ring-0 focus:ring-offset-0 h-4.5 w-4.5 cursor-pointer"
              />
              <span className="text-xs text-gray-300 font-bold">Arşivi Göster</span>
            </label>
          )}

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
            onClick={() => {
              if (isCreating) {
                clearForm();
                setIsCreating(false);
              } else {
                clearForm();
                setIsCreating(true);
              }
            }}
            className="flex items-center space-x-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-xs transition-all shadow-md shadow-[#722F37]/15"
          >
            {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{isCreating ? (editingInvoiceId ? "Düzenlemeyi İptal Et" : "Listeyi Göster") : "Manuel Fatura Gir"}</span>
          </button>
        </div>
      </div>

      {isCreating ? (
        /* Create Invoice Form */
        <div className="bg-[#16213E]/30 border border-gray-800/50 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
            <FileText className="h-5 w-5 text-[#C9A84C]" />
            <span>{editingInvoiceId ? "Faturayı Düzenle" : "Fatura Bilgileri"}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-gray-400">Tedarikçi</label>
                <button
                  type="button"
                  onClick={() => setIsCreatingSupplier(true)}
                  className="text-[10px] text-[#C9A84C] hover:underline"
                >
                  + Yeni Ekle
                </button>
              </div>
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
                      <div className="md:col-span-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] text-gray-400 block">Malzeme</label>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetLineItemIndex(index);
                              setIsCreatingIngredient(true);
                            }}
                            className="text-[10px] text-[#C9A84C] hover:underline"
                          >
                            + Yeni Ekle
                          </button>
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (openDropdownIndex === index) {
                                setOpenDropdownIndex(null);
                              } else {
                                setOpenDropdownIndex(index);
                                setIngSearchTerm("");
                              }
                            }}
                            className={`w-full bg-[#1C1C28] border rounded-lg px-2 py-2 text-xs text-white text-left focus:outline-none flex justify-between items-center h-[38px] ${
                              errors[`item_${index}_ing`] ? "border-red-500" : "border-gray-800"
                            }`}
                          >
                            <span className="truncate">
                              {currentIng ? `${currentIng.name} (${currentIng.unit})` : "Malzeme Seçin..."}
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 ml-1" />
                          </button>

                          {openDropdownIndex === index && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setOpenDropdownIndex(null)}
                              />
                              
                              <div className="absolute left-0 mt-1 w-64 bg-[#1C1C28] border border-gray-800 rounded-lg shadow-2xl z-50 p-2 space-y-2 max-h-[300px] flex flex-col">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
                                  <input
                                    type="text"
                                    placeholder="Malzeme ara..."
                                    value={ingSearchTerm}
                                    onChange={(e) => setIngSearchTerm(e.target.value)}
                                    className="w-full bg-[#16213E] border border-gray-800 rounded pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                                    autoFocus
                                  />
                                </div>
                                <div className="overflow-y-auto flex-grow space-y-0.5 max-h-[200px] no-scrollbar">
                                  {ingredients.filter(ing => 
                                    ing.name.toLowerCase().includes(ingSearchTerm.toLowerCase())
                                  ).length > 0 ? (
                                    ingredients.filter(ing => 
                                      ing.name.toLowerCase().includes(ingSearchTerm.toLowerCase())
                                    ).map(ing => (
                                      <button
                                        key={ing.id}
                                        type="button"
                                        onClick={() => {
                                          handleUpdateLineItem(index, "ingredientId", ing.id);
                                          setOpenDropdownIndex(null);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-[#722F37] hover:text-white transition-colors truncate ${
                                          item.ingredientId === ing.id ? "bg-[#722F37]/35 text-[#C9A84C] font-semibold" : "text-gray-300"
                                        }`}
                                      >
                                        {ing.name} ({ing.unit})
                                      </button>
                                    ))
                                  ) : (
                                    <div className="text-center py-4 text-[10px] text-gray-500">
                                      Malzeme bulunamadı
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-[10px] text-gray-400 block mb-1">Marka / Detay</label>
                        <input
                          type="text"
                          value={item.brand || ""}
                          onChange={(e) => handleUpdateLineItem(index, "brand", e.target.value)}
                          className="w-full bg-[#1C1C28] border border-gray-800 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                          placeholder="örn. Altınkılıç"
                        />
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
                          <div className="md:col-span-1">
                            <label className="text-[10px] text-gray-400 block mb-1">
                              Miktar {unit ? `(${unit})` : ""}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => handleUpdateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                              className={`w-full bg-[#1C1C28] border rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none ${
                                errors[`item_${index}_qty`] ? "border-red-500" : "border-gray-800"
                              }`}
                              placeholder="örn. 10"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-[10px] text-gray-400 block mb-1">
                              Birim Fiyatı
                            </label>
                            <div className="flex space-x-1">
                              <input
                                type="number"
                                step="any"
                                value={
                                  item.costInputUnit === "kg" || item.costInputUnit === "liter"
                                    ? Number((item.unitCost * 1000).toFixed(4))
                                    : item.unitCost
                                }
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const baseCost =
                                    item.costInputUnit === "kg" || item.costInputUnit === "liter"
                                      ? val / 1000
                                      : val;
                                  handleUpdateLineItem(index, "unitCost", baseCost);
                                }}
                                className={`w-2/3 bg-[#1C1C28] border rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none ${
                                  errors[`item_${index}_cost`] ? "border-red-500" : "border-gray-800"
                                }`}
                                placeholder="örn. 45"
                              />
                              <select
                                value={item.costInputUnit || unit || "g"}
                                onChange={(e) => {
                                  const nextCostUnit = e.target.value;
                                  handleUpdateLineItem(index, "costInputUnit", nextCostUnit);
                                }}
                                className="w-1/3 bg-[#1C1C28] border border-gray-800 rounded-lg px-1 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50 font-mono"
                              >
                                {unit === "g" ? (
                                  <>
                                    <option value="g">₺/g</option>
                                    <option value="kg">₺/kg</option>
                                  </>
                                ) : unit === "ml" ? (
                                  <>
                                    <option value="ml">₺/ml</option>
                                    <option value="liter">₺/L</option>
                                  </>
                                ) : (
                                  <option value={unit || "g"}>₺/{unit || "g"}</option>
                                )}
                              </select>
                            </div>
                          </div>

                          <div className="md:col-span-1">
                            <label className="text-[10px] text-gray-400 block mb-1">Tutar (₺)</label>
                            <div className="w-full bg-[#1C1C28]/80 border border-gray-800 rounded-lg px-2 py-2 text-xs text-[#C9A84C] font-mono font-bold flex items-center h-[38px] overflow-hidden whitespace-nowrap text-ellipsis" title={`₺${(item.quantity * item.unitCost).toFixed(2)}`}>
                              ₺{(item.quantity * item.unitCost).toFixed(2)}
                            </div>
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
                              className={`w-full bg-[#1C1C28] border rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none ${
                                errors[`item_${index}_qty`] ? "border-red-500" : "border-gray-800"
                              }`}
                              placeholder="1"
                            />
                          </div>

                          <div className="md:col-span-1">
                            <label className="text-[10px] text-gray-400 block mb-1">
                              Boyut {unit ? `(${unit})` : ""}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.packageSize ?? 1}
                              onChange={(e) => handleUpdateLineItem(index, "packageSize", parseFloat(e.target.value) || 0)}
                              className={`w-full bg-[#1C1C28] border rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none ${
                                errors[`item_${index}_qty`] ? "border-red-500" : "border-gray-800"
                              }`}
                              placeholder="örn. 900"
                            />
                          </div>

                          <div className="md:col-span-1">
                            <label className="text-[10px] text-gray-400 block mb-1">Paket Fiyatı (₺)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.packagePrice ?? 0}
                              onChange={(e) => handleUpdateLineItem(index, "packagePrice", parseFloat(e.target.value) || 0)}
                              className={`w-full bg-[#1C1C28] border rounded-lg px-2 py-2 text-xs text-white font-mono focus:outline-none ${
                                errors[`item_${index}_cost`] ? "border-red-500" : "border-gray-800"
                              }`}
                              placeholder="örn. 209"
                            />
                            {item.packageSize > 0 && item.packagePrice > 0 && (
                              <span className="text-[9px] text-gray-500 mt-1 block font-mono">
                                (Birim: ₺{(item.packagePrice / item.packageSize).toFixed(4)})
                              </span>
                            )}
                          </div>

                          <div className="md:col-span-1">
                            <label className="text-[10px] text-gray-400 block mb-1">Tutar (₺)</label>
                            <div className="w-full bg-[#1C1C28]/80 border border-gray-800 rounded-lg px-2 py-2 text-xs text-[#C9A84C] font-mono font-bold flex items-center h-[38px] overflow-hidden whitespace-nowrap text-ellipsis" title={`₺${((item.packageCount ?? 1) * (item.packagePrice ?? 0)).toFixed(2)}`}>
                              ₺{((item.packageCount ?? 1) * (item.packagePrice ?? 0)).toFixed(2)}
                            </div>
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
                <span>{editingInvoiceId ? "Değişiklikleri Kaydet" : "Faturayı Kaydet"}</span>
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
                              <div className="flex justify-end items-center space-x-2">
                                <button
                                  onClick={() => handleArchiveInvoice(inv.id, !inv.isArchived)}
                                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all ${
                                    inv.isArchived
                                      ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400 hover:bg-emerald-950/40"
                                      : "bg-amber-950/20 border-amber-900/30 text-amber-400 hover:bg-amber-950/40"
                                  }`}
                                >
                                  {inv.isArchived ? "Geri Yükle" : "Arşivle"}
                                </button>
                                {!isVoid && !inv.isArchived && (
                                  <>
                                    <button
                                      onClick={() => handleStartEdit(inv)}
                                      className="p-1.5 rounded-lg bg-blue-950/15 hover:bg-blue-950/40 text-blue-400 border border-blue-950/30"
                                      title="Faturayı Düzenle"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleVoidInvoice(inv.id)}
                                      className="p-1.5 rounded-lg bg-red-950/15 hover:bg-red-950/40 text-red-400 border border-red-950/30"
                                      title="Faturayı İptal Et"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
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
                                          <p className="font-semibold text-white">
                                            {item.ingredientName || "Bilinmeyen Malzeme"}
                                            {item.brand && (
                                              <span className="text-[10px] text-[#C9A84C] ml-2 font-normal bg-[#C9A84C]/10 px-1.5 py-0.5 rounded">
                                                {item.brand}
                                              </span>
                                            )}
                                          </p>
                                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                            {Number(parseFloat(item.quantity as any).toFixed(2))} {item.ingredientUnit || ""} x ₺{parseFloat(item.unitCost as any) < 1 ? parseFloat(item.unitCost as any).toFixed(4) : parseFloat(item.unitCost as any).toFixed(2)}
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

      {/* Inline Create Ingredient Modal */}
      {isCreatingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#16213E]/95 border border-gray-800/80 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-800/40">
              <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
                <Plus className="h-5 w-5 text-[#C9A84C]" />
                <span>Yeni Malzeme Ekle</span>
              </h3>
              <button
                onClick={() => {
                  setIsCreatingIngredient(false);
                  setTargetLineItemIndex(null);
                  setNewIngName("");
                  setNewIngUnit("g");
                  setNewIngDensity(1.0);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Malzeme Adı (Zorunlu)</label>
                <input
                  type="text"
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                  placeholder="örn. Süzme Peynir, Tereyağı"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Birim</label>
                  <select
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                    className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                  >
                    <option value="g">Gram (g)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ml">Mililitre (ml)</option>
                    <option value="liter">Litre (L)</option>
                    <option value="unit">Adet (unit)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Yoğunluk (g/ml)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newIngDensity}
                    onChange={(e) => setNewIngDensity(parseFloat(e.target.value) || 1.0)}
                    className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                    placeholder="1.0"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-500">
                Yoğunluk, reçetelerde hacim (ml/L) ve kütle (g/kg) dönüşümleri yapılırken kullanılır. Emin değilseniz 1.0 bırakabilirsiniz.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-800/40">
              <button
                onClick={() => {
                  setIsCreatingIngredient(false);
                  setTargetLineItemIndex(null);
                  setNewIngName("");
                  setNewIngUnit("g");
                  setNewIngDensity(1.0);
                }}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all border border-gray-700/50"
              >
                İptal
              </button>
              <button
                onClick={handleCreateNewIngredient}
                disabled={creatingIngLoading}
                className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-bold text-xs transition-all shadow-md shadow-[#722F37]/15 disabled:opacity-50"
              >
                {creatingIngLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Create Supplier Modal */}
      {isCreatingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#16213E]/95 border border-gray-800/80 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-800/40">
              <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
                <Plus className="h-5 w-5 text-[#C9A84C]" />
                <span>Yeni Tedarikçi Ekle</span>
              </h3>
              <button
                onClick={() => {
                  setIsCreatingSupplier(false);
                  setNewSupName("");
                  setNewSupEmail("");
                  setNewSupPhone("");
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Tedarikçi Adı (Zorunlu)</label>
                <input
                  type="text"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                  placeholder="örn. Metro Market, Kahve İthalat A.Ş..."
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">E-posta (Opsiyonel)</label>
                <input
                  type="email"
                  value={newSupEmail}
                  onChange={(e) => setNewSupEmail(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                  placeholder="örn. siparis@tedarikci.com"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Telefon (Opsiyonel)</label>
                <input
                  type="text"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                  placeholder="örn. +90 212 555 12 34"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-800/40">
              <button
                onClick={() => {
                  setIsCreatingSupplier(false);
                  setNewSupName("");
                  setNewSupEmail("");
                  setNewSupPhone("");
                }}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-all border border-gray-700/50"
              >
                İptal
              </button>
              <button
                onClick={handleCreateNewSupplier}
                disabled={creatingSupLoading}
                className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-bold text-xs transition-all shadow-md shadow-[#722F37]/15 disabled:opacity-50"
              >
                {creatingSupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Browser-side image compression utility
function compressImage(file: File, maxDimension: number, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Image load error"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsDataURL(file);
  });
}
