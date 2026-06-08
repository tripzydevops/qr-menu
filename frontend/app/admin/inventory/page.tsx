"use client";

import React, { useEffect, useState } from "react";
import { 
  Package, 
  Truck, 
  Plus, 
  Trash2, 
  Edit3, 
  Loader2, 
  AlertTriangle, 
  Search,
  Mail,
  Phone,
  Settings,
  Sparkles
} from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: string;
  weightedCost: string;
  reorderLevel: string | null;
  density: number;
}

interface Supplier {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

export default function AdminInventoryPage() {
  const venueId = "venue-karakoy-main"; // Seed default
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  
  const [activeTab, setActiveTab] = useState<"ingredients" | "suppliers">("ingredients");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [ingModalOpen, setIngModalOpen] = useState(false);
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null);
  const [ingName, setIngName] = useState("");
  const [ingUnit, setIngUnit] = useState("g");
  const [ingReorder, setIngReorder] = useState("");
  const [ingDensity, setIngDensity] = useState("1.0");
  const [fetchingDensity, setFetchingDensity] = useState(false);

  const [supModalOpen, setSupModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supPhone, setSupPhone] = useState("");

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === "ingredients" ? "ingredients" : "suppliers";
      const res = await fetch(`${apiUrl}/api/admin/inventory/${endpoint}?venueId=${venueId}`);
      if (res.ok) {
        const data = await res.json();
        if (activeTab === "ingredients") {
          setIngredients(data);
        } else {
          setSuppliers(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSaveIngredient = async () => {
    const newErrors: Record<string, string> = {};
    if (!ingName.trim()) newErrors.name = "Malzeme adı zorunludur.";
    if (!ingUnit.trim()) newErrors.unit = "Birim seçimi zorunludur.";
    if (ingReorder && isNaN(parseFloat(ingReorder))) {
      newErrors.reorder = "Kritik stok miktarı sayısal bir değer olmalıdır.";
    }
    if (ingDensity && (isNaN(parseFloat(ingDensity)) || parseFloat(ingDensity) <= 0)) {
      newErrors.density = "Yoğunluk sıfırdan büyük sayısal bir değer olmalıdır.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      const isEdit = editingIng !== null;
      const url = isEdit 
        ? `${apiUrl}/api/admin/inventory/ingredients/${editingIng.id}` 
        : `${apiUrl}/api/admin/inventory/ingredients`;
      
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit 
        ? {
            name: ingName,
            unit: ingUnit,
            reorderLevel: ingReorder ? parseFloat(ingReorder) : null,
            density: parseFloat(ingDensity)
          }
        : {
            venueId,
            name: ingName,
            unit: ingUnit,
            reorderLevel: ingReorder ? parseFloat(ingReorder) : null,
            density: parseFloat(ingDensity)
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIngModalOpen(false);
        setEditingIng(null);
        clearIngForm();
        fetchData();
      } else {
        const errData = await res.json();
        setErrors({ name: errData.detail || "Bir hata oluştu." });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!confirm("Bu malzemeyi silmek istediğinize emin misiniz? Malzemeyi kullanan reçeteler etkilenebilir.")) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/inventory/ingredients/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSupplier = async () => {
    const newErrors: Record<string, string> = {};
    if (!supName.trim()) newErrors.name = "Tedarikçi adı zorunludur.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      const isEdit = editingSup !== null;
      const url = isEdit 
        ? `${apiUrl}/api/admin/inventory/suppliers/${editingSup.id}` 
        : `${apiUrl}/api/admin/inventory/suppliers`;
      
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit 
        ? {
            name: supName,
            contactEmail: supEmail || null,
            contactPhone: supPhone || null
          }
        : {
            venueId,
            name: supName,
            contactEmail: supEmail || null,
            contactPhone: supPhone || null
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSupModalOpen(false);
        setEditingSup(null);
        clearSupForm();
        fetchData();
      } else {
        const errData = await res.json();
        setErrors({ name: errData.detail || "Bir hata oluştu." });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Bu tedarikçiyi silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/inventory/suppliers/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSuggestDensity = async (name: string) => {
    if (!name.trim()) return;
    try {
      setFetchingDensity(true);
      const res = await fetch(`${apiUrl}/api/admin/inventory/ingredients/suggest-density?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.density) {
          setIngDensity(data.density.toString());
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingDensity(false);
    }
  };

  const clearIngForm = () => {
    setIngName("");
    setIngUnit("g");
    setIngReorder("");
    setIngDensity("1.0");
    setErrors({});
  };

  const clearSupForm = () => {
    setSupName("");
    setSupEmail("");
    setSupPhone("");
    setErrors({});
  };

  const openAddIngModal = () => {
    clearIngForm();
    setEditingIng(null);
    setIngModalOpen(true);
  };

  const openEditIngModal = (ing: Ingredient) => {
    setErrors({});
    setEditingIng(ing);
    setIngName(ing.name);
    setIngUnit(ing.unit);
    setIngReorder(ing.reorderLevel?.toString() || "");
    setIngDensity(ing.density?.toString() || "1.0");
    setIngModalOpen(true);
  };

  const openAddSupModal = () => {
    clearSupForm();
    setEditingSup(null);
    setSupModalOpen(true);
  };

  const openEditSupModal = (sup: Supplier) => {
    setErrors({});
    setEditingSup(sup);
    setSupName(sup.name);
    setSupEmail(sup.contactEmail || "");
    setSupPhone(sup.contactPhone || "");
    setSupModalOpen(true);
  };

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white">Stok & Malzeme Yönetimi</h2>
          <p className="text-xs text-gray-400 mt-1">
            Reçetelerinizde kullandığınız hammaddeleri, maliyetlerini ve tedarikçileri yönetin.
          </p>
        </div>
        <div>
          {activeTab === "ingredients" ? (
            <button 
              onClick={openAddIngModal}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-xs transition-all shadow-md shadow-[#722F37]/15"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Malzeme Ekle</span>
            </button>
          ) : (
            <button 
              onClick={openAddSupModal}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-xs transition-all shadow-md shadow-[#722F37]/15"
            >
              <Plus className="h-4 w-4" />
              <span>Yeni Tedarikçi Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800/40">
        <button
          onClick={() => { setActiveTab("ingredients"); setSearchQuery(""); }}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "ingredients" 
              ? "border-[#C9A84C] text-white bg-[#2A2A3D]/20" 
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Package className="h-4 w-4 text-[#C9A84C]" />
          <span>Malzemeler</span>
        </button>
        <button
          onClick={() => { setActiveTab("suppliers"); setSearchQuery(""); }}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "suppliers" 
              ? "border-[#C9A84C] text-white bg-[#2A2A3D]/20" 
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Truck className="h-4 w-4 text-[#C9A84C]" />
          <span>Tedarikçiler</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder={activeTab === "ingredients" ? "Malzeme adı ara..." : "Tedarikçi adı ara..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#16213E]/50 border border-gray-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A84C]/50"
        />
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#C9A84C] animate-spin" />
        </div>
      ) : activeTab === "ingredients" ? (
        /* Ingredients Table */
        <div className="bg-[#16213E]/30 border border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#16213E]/80 border-b border-gray-800/40 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Malzeme Adı</th>
                  <th className="px-6 py-4">Stok Miktarı</th>
                  <th className="px-6 py-4">Birim Ortalama Maliyet (WAC)</th>
                  <th className="px-6 py-4">Kritik Stok Seviyesi</th>
                  <th className="px-6 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/20 text-xs">
                {filteredIngredients.length > 0 ? (
                  filteredIngredients.map((ing) => {
                    const stock = parseFloat(ing.currentStock);
                    const reorder = ing.reorderLevel ? parseFloat(ing.reorderLevel) : null;
                    const isLowStock = reorder !== null && stock <= reorder;

                    return (
                      <tr key={ing.id} className="hover:bg-[#2A2A3D]/10 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">{ing.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className={`font-mono font-bold ${isLowStock ? "text-red-400" : "text-gray-300"}`}>
                              {stock.toFixed(2)} {ing.unit}
                            </span>
                            {isLowStock && (
                              <span className="flex items-center space-x-1 text-[10px] bg-red-950/40 border border-red-900/30 text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Kritik</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-[#C9A84C] font-semibold">
                          ₺{parseFloat(ing.weightedCost).toFixed(4)} / {ing.unit}
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-400">
                          {reorder !== null ? `${reorder.toFixed(2)} ${ing.unit}` : "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => openEditIngModal(ing)}
                              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/40"
                              title="Düzenle"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteIngredient(ing.id)}
                              className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/50 text-red-400 border border-red-900/30"
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Kayıtlı malzeme bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Suppliers Table */
        <div className="bg-[#16213E]/30 border border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#16213E]/80 border-b border-gray-800/40 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Tedarikçi Adı</th>
                  <th className="px-6 py-4">E-posta</th>
                  <th className="px-6 py-4">Telefon</th>
                  <th className="px-6 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/20 text-xs">
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-[#2A2A3D]/10 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">{sup.name}</td>
                      <td className="px-6 py-4 text-gray-300">
                        {sup.contactEmail ? (
                          <div className="flex items-center space-x-1.5">
                            <Mail className="h-3.5 w-3.5 text-gray-500" />
                            <span>{sup.contactEmail}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {sup.contactPhone ? (
                          <div className="flex items-center space-x-1.5">
                            <Phone className="h-3.5 w-3.5 text-gray-500" />
                            <span>{sup.contactPhone}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openEditSupModal(sup)}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/40"
                            title="Düzenle"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(sup.id)}
                            className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/50 text-red-400 border border-red-900/30"
                            title="Sil"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      Kayıtlı tedarikçi bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ingredient Add/Edit Modal */}
      {ingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIngModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#16213E] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh]">
            <h3 className="font-serif text-lg font-bold text-white flex-shrink-0">
              {editingIng ? "Malzemeyi Düzenle" : "Yeni Malzeme Ekle"}
            </h3>

            <div className="space-y-4 overflow-y-auto flex-grow pr-1">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Malzeme Adı</label>
                <input
                  type="text"
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  onBlur={() => handleSuggestDensity(ingName)}
                  className={`w-full bg-[#1C1C28] border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none ${
                    errors.name ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-[#C9A84C]/50"
                  }`}
                  placeholder="örn. Espresso Çekirdeği, Süt, Şeker..."
                />
                {errors.name && <p className="text-red-500 text-[11px] mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Stok Birimi</label>
                  <select
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value)}
                    className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/50"
                  >
                    <option value="g">Gram (g)</option>
                    <option value="ml">Mililitre (ml)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="liter">Litre (liter)</option>
                    <option value="unit">Adet (unit)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Kritik Stok Seviyesi</label>
                  <input
                    type="number"
                    value={ingReorder}
                    onChange={(e) => setIngReorder(e.target.value)}
                    className={`w-full bg-[#1C1C28] border rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none ${
                      errors.reorder ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-[#C9A84C]/50"
                    }`}
                    placeholder="örn. 1000"
                  />
                  {errors.reorder && <p className="text-red-500 text-[11px] mt-1">{errors.reorder}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Özgül Ağırlık / Yoğunluk (g/mL)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={ingDensity}
                    onChange={(e) => setIngDensity(e.target.value)}
                    className={`w-full bg-[#1C1C28] border rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none pr-16 ${
                      errors.density ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-[#C9A84C]/50"
                    }`}
                    placeholder="örn. 1.0 (Su), 1.08 (Yoğurt)..."
                  />
                  <div className="absolute right-4 top-3 flex items-center space-x-1.5 text-[10px] text-gray-500 font-bold select-none">
                    {fetchingDensity ? (
                      <Loader2 className="h-3 w-3 animate-spin text-[#C9A84C]" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-[#C9A84C]/80 animate-pulse" />
                    )}
                    <span>g/mL</span>
                  </div>
                </div>
                {errors.density && <p className="text-red-500 text-[11px] mt-1">{errors.density}</p>}
                <p className="text-[10px] text-gray-500 mt-1">
                  Reçetelerde bardak, kaşık gibi hacim birimlerini ağırlığa çevirmek için kullanılır. (Su = 1.0)
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-800/40 flex-shrink-0">
              <button
                onClick={() => setIngModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-bold hover:bg-gray-700"
              >
                İptal
              </button>
              <button
                onClick={handleSaveIngredient}
                className="px-4 py-2 rounded-xl bg-[#722F37] text-xs font-bold text-white hover:bg-[#8B3E48]"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Add/Edit Modal */}
      {supModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSupModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#16213E] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh]">
            <h3 className="font-serif text-lg font-bold text-white flex-shrink-0">
              {editingSup ? "Tedarikçiyi Düzenle" : "Yeni Tedarikçi Ekle"}
            </h3>

            <div className="space-y-4 overflow-y-auto flex-grow pr-1">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Tedarikçi Adı</label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className={`w-full bg-[#1C1C28] border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none ${
                    errors.name ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-[#C9A84C]/50"
                  }`}
                  placeholder="örn. Metro Market, Kahve İthalat A.Ş..."
                />
                {errors.name && <p className="text-red-500 text-[11px] mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">E-posta (Opsiyonel)</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/50"
                  placeholder="örn. siparis@tedarikci.com"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Telefon (Opsiyonel)</label>
                <input
                  type="text"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/50"
                  placeholder="örn. +90 212 555 12 34"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-800/40 flex-shrink-0">
              <button
                onClick={() => setSupModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-bold hover:bg-gray-700"
              >
                İptal
              </button>
              <button
                onClick={handleSaveSupplier}
                className="px-4 py-2 rounded-xl bg-[#722F37] text-xs font-bold text-white hover:bg-[#8B3E48]"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
