"use client";

import { DEFAULT_VENUE_ID } from "@/lib/config";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Check, 
  Image as ImageIcon, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Upload
} from "lucide-react";

interface DietaryLabel {
  id: string;
  key: string;
  icon: string | null;
}

interface MenuItem {
  id: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string | null;
  descriptionEn: string | null;
  price: string;
  imageUrl: string | null;
  allergens: string[];
  isAvailable: boolean;
  showOnMenu: boolean;
  calories: number | null;
  dietaryLabels: DietaryLabel[];
  sortOrder?: number;
}

interface Category {
  id: string;
  nameTr: string;
  nameEn: string;
  iconName: string | null;
  sortOrder: number;
  items: MenuItem[];
  menuId?: string | null;
}

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dietaryLabels, setDietaryLabels] = useState<DietaryLabel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / Editors state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catNameTr, setCatNameTr] = useState("");
  const [catNameEn, setCatNameEn] = useState("");

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemCategoryId, setItemCategoryId] = useState("");
  
  const [itemNameTr, setItemNameTr] = useState("");
  const [itemNameEn, setItemNameEn] = useState("");
  const [itemDescTr, setItemDescTr] = useState("");
  const [itemDescEn, setItemDescEn] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCalories, setItemCalories] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemAllergens, setItemAllergens] = useState<string[]>([]);
  const [itemDietaryIds, setItemDietaryIds] = useState<string[]>([]);
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemShowOnMenu, setItemShowOnMenu] = useState(true);
  
  const [isUploading, setIsUploading] = useState(false);
  
  // Validation errors state
  const [catErrors, setCatErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const venueId = DEFAULT_VENUE_ID; // Seed default
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const [catRes, labelRes] = await Promise.all([
        fetch(`${apiUrl}/api/admin/categories?venueId=${venueId}`),
        fetch(`${apiUrl}/api/admin/dietary-labels`)
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }
      if (labelRes.ok) {
        const labelData = await labelRes.json();
        setDietaryLabels(labelData);
      }
    } catch (e) {
      console.error("Error fetching menu data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleReorderCategories = async (index: number, direction: "up" | "down") => {
    const newCategories = [...categories];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;
    
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;
    
    setCategories(newCategories);
    
    try {
      const categoryIds = newCategories.map(c => c.id);
      const res = await fetch(`${apiUrl}/api/admin/categories/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryIds)
      });
      if (!res.ok) {
        throw new Error("Failed to reorder categories");
      }
    } catch (e) {
      console.error(e);
      fetchMenuData();
    }
  };

  const handleReorderItems = async (catId: string, itemIndex: number, direction: "up" | "down") => {
    const catIndex = categories.findIndex(c => c.id === catId);
    if (catIndex === -1) return;
    
    const cat = categories[catIndex];
    const newItems = [...cat.items];
    const targetIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    
    const temp = newItems[itemIndex];
    newItems[itemIndex] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    
    const newCategories = [...categories];
    newCategories[catIndex] = {
      ...cat,
      items: newItems
    };
    setCategories(newCategories);
    
    try {
      const itemIds = newItems.map(i => i.id);
      const res = await fetch(`${apiUrl}/api/admin/menu-items/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemIds)
      });
      if (!res.ok) {
        throw new Error("Failed to reorder items");
      }
    } catch (e) {
      console.error(e);
      fetchMenuData();
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  const handleToggleAvailable = async (itemId: string, currentVal: boolean) => {
    // Find item
    let targetItem: MenuItem | null = null;
    let targetCatId = "";
    
    categories.forEach(c => {
      const found = c.items.find(i => i.id === itemId);
      if (found) {
        targetItem = found;
        targetCatId = c.id;
      }
    });

    if (!targetItem) return;

    try {
      // Optimistic update
      setCategories(prev => prev.map(c => ({
        ...c,
        items: c.items.map(i => i.id === itemId ? { ...i, isAvailable: !currentVal } : i)
      })));

      const res = await fetch(`${apiUrl}/api/admin/menu-items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: targetCatId,
          nameTr: targetItem.nameTr,
          nameEn: targetItem.nameEn,
          descriptionTr: targetItem.descriptionTr,
          descriptionEn: targetItem.descriptionEn,
          price: parseFloat(targetItem.price),
          imageUrl: targetItem.imageUrl,
          allergens: targetItem.allergens,
          isAvailable: !currentVal,
          showOnMenu: targetItem.showOnMenu,
          calories: targetItem.calories,
          dietaryLabelIds: targetItem.dietaryLabels.map(l => l.id)
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update availability");
      }
    } catch (e) {
      console.error(e);
      // Revert on error
      setCategories(prev => prev.map(c => ({
        ...c,
        items: c.items.map(i => i.id === itemId ? { ...i, isAvailable: currentVal } : i)
      })));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      const res = await fetch(`${apiUrl}/api/admin/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setItemImageUrl(data.url);
      } else {
        alert("Image upload failed.");
      }
    } catch (e) {
      console.error(e);
      alert("Error uploading image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveCategory = async () => {
    const errors: Record<string, string> = {};
    if (!catNameTr.trim()) {
      errors.nameTr = "Kategori adı (Türkçe) zorunludur.";
    }

    if (Object.keys(errors).length > 0) {
      setCatErrors(errors);
      return;
    }
    setCatErrors({});

    try {
      const isEdit = editingCategory !== null;
      const url = isEdit 
        ? `${apiUrl}/api/admin/categories/${editingCategory.id}` 
        : `${apiUrl}/api/admin/categories`;
      
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        venueId,
        nameTr: catNameTr,
        nameEn: catNameEn.trim() || catNameTr,
        iconName: editingCategory?.iconName || "Utensils",
        sortOrder: editingCategory?.sortOrder || categories.length,
        menuId: editingCategory?.menuId || null
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setCatModalOpen(false);
        setEditingCategory(null);
        setCatNameTr("");
        setCatNameEn("");
        fetchMenuData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category and all its items?")) return;

    try {
      const res = await fetch(`${apiUrl}/api/admin/categories/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchMenuData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveItem = async () => {
    const errors: Record<string, string> = {};
    if (!itemNameTr.trim()) {
      errors.nameTr = "Ürün adı (Türkçe) zorunludur.";
    }
    if (!itemPrice.trim()) {
      errors.price = "Fiyat alanı zorunludur.";
    } else {
      const parsedPrice = parseFloat(itemPrice);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        errors.price = "Fiyat 0'dan büyük geçerli bir sayı olmalıdır.";
      }
    }
    if (itemCalories.trim()) {
      const parsedCalories = parseInt(itemCalories);
      if (isNaN(parsedCalories) || parsedCalories < 0 || !Number.isInteger(Number(itemCalories))) {
        errors.calories = "Kalori değeri pozitif bir tam sayı olmalıdır.";
      }
    }
    if (!itemCategoryId) {
      errors.categoryId = "Kategori seçimi zorunludur.";
    }

    if (Object.keys(errors).length > 0) {
      setItemErrors(errors);
      return;
    }
    setItemErrors({});

    try {
      const isEdit = editingItem !== null;
      const url = isEdit 
        ? `${apiUrl}/api/admin/menu-items/${editingItem.id}` 
        : `${apiUrl}/api/admin/menu-items`;
      
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        categoryId: itemCategoryId,
        nameTr: itemNameTr,
        nameEn: itemNameEn.trim() || itemNameTr,
        descriptionTr: itemDescTr || null,
        descriptionEn: itemDescEn || null,
        price: parseFloat(itemPrice),
        imageUrl: itemImageUrl || null,
        allergens: itemAllergens,
        isAvailable: itemAvailable,
        showOnMenu: itemShowOnMenu,
        sortOrder: editingItem?.sortOrder || 0,
        calories: itemCalories ? parseInt(itemCalories) : null,
        dietaryLabelIds: itemDietaryIds
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setItemModalOpen(false);
        setEditingItem(null);
        clearItemForm();
        fetchMenuData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;

    try {
      const res = await fetch(`${apiUrl}/api/admin/menu-items/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchMenuData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearItemForm = () => {
    setItemNameTr("");
    setItemNameEn("");
    setItemDescTr("");
    setItemDescEn("");
    setItemPrice("");
    setItemCalories("");
    setItemImageUrl("");
    setItemAllergens([]);
    setItemDietaryIds([]);
    setItemAvailable(true);
    setItemShowOnMenu(true);
    setItemErrors({});
  };

  const openAddItemModal = (catId: string) => {
    clearItemForm();
    setItemCategoryId(catId);
    setEditingItem(null);
    setItemModalOpen(true);
  };

  const openEditItemModal = (item: MenuItem, catId: string) => {
    setItemErrors({});
    setEditingItem(item);
    setItemCategoryId(catId);
    setItemNameTr(item.nameTr);
    setItemNameEn(item.nameEn);
    setItemDescTr(item.descriptionTr || "");
    setItemDescEn(item.descriptionEn || "");
    setItemPrice(item.price.toString());
    setItemCalories(item.calories?.toString() || "");
    setItemImageUrl(item.imageUrl || "");
    setItemAllergens(item.allergens || []);
    setItemDietaryIds(item.dietaryLabels.map(l => l.id) || []);
    setItemAvailable(item.isAvailable);
    setItemShowOnMenu(item.showOnMenu !== undefined ? item.showOnMenu : true);
    setItemModalOpen(true);
  };

  const toggleAllergen = (allergen: string) => {
    setItemAllergens(prev => 
      prev.includes(allergen) ? prev.filter(a => a !== allergen) : [...prev, allergen]
    );
  };

  const toggleDietaryLabel = (id: string) => {
    setItemDietaryIds(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  const commonAllergens = ["gluten", "dairy", "nuts", "sesame", "eggs", "fish"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-serif text-2xl font-bold">Menü Listesi</h2>
          <p className="text-xs text-gray-400 mt-1">Mekanınızın dijital menüsünü yönetin, ürün ekleyin ve reorder yapın.</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/menu/import"
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#2A2A3D]/80 border border-gray-800 hover:border-[#C9A84C]/35 text-white font-semibold text-xs transition-all hover:bg-gray-800"
          >
            <Upload className="h-4 w-4 text-[#C9A84C]" />
            <span>Menü İçe Aktar</span>
          </Link>
          <button 
            onClick={() => { setEditingCategory(null); setCatNameTr(""); setCatNameEn(""); setCatErrors({}); setCatModalOpen(true); }}
            className="flex items-center space-x-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-xs transition-all shadow-md shadow-[#722F37]/15"
          >
            <Plus className="h-4 w-4" />
            <span>Kategori Ekle</span>
          </button>
        </div>
      </div>

      {/* Categories Accordion/Cards */}
      <div className="space-y-6">
        {categories.map((cat, idx) => (
          <div key={cat.id} className="bg-[#16213E]/50 border border-gray-800/40 rounded-2xl overflow-hidden shadow-sm">
            {/* Category Header */}
            <div className="bg-[#16213E]/80 border-b border-gray-800/40 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Category Reorder buttons */}
                <div className="flex bg-[#2A2A3D]/40 rounded-lg p-0.5 border border-gray-800/60">
                  <button
                    disabled={idx === 0}
                    onClick={() => handleReorderCategories(idx, "up")}
                    className="p-1 rounded-md hover:bg-gray-800 disabled:opacity-25 disabled:hover:bg-transparent text-gray-400 hover:text-white transition-colors"
                    title="Yukarı Taşı"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={idx === categories.length - 1}
                    onClick={() => handleReorderCategories(idx, "down")}
                    className="p-1 rounded-md hover:bg-gray-800 disabled:opacity-25 disabled:hover:bg-transparent text-gray-400 hover:text-white transition-colors"
                    title="Aşağı Taşı"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
                  <span>🍽️</span>
                  <span>{cat.nameTr}</span>
                  <span className="text-gray-500 font-sans text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2A2A3D]/60 border border-gray-800/50">
                    {cat.nameEn}
                  </span>
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => openAddItemModal(cat.id)}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold transition-all text-white border border-gray-700/50"
                >
                  + Ürün Ekle
                </button>
                <button 
                  onClick={() => { setEditingCategory(cat); setCatNameTr(cat.nameTr); setCatNameEn(cat.nameEn); setCatErrors({}); setCatModalOpen(true); }}
                  className="p-2 rounded-lg bg-gray-800/40 hover:bg-gray-800 hover:text-white text-gray-400 border border-gray-800/60"
                  title="Düzenle"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-2 rounded-lg bg-red-950/20 hover:bg-red-950/60 text-red-400 border border-red-900/20"
                  title="Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Items table */}
            <div className="p-4 divide-y divide-gray-800/30">
              {cat.items && cat.items.length > 0 ? (
                cat.items.map((item, itemIdx) => (
                  <div key={item.id} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
                    <div className="flex items-center space-x-4">
                      {/* Image Preview */}
                      <div className="w-14 h-14 rounded-lg bg-gray-800 border border-gray-700/40 overflow-hidden flex-shrink-0 relative">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.nameTr} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <h4 className={`text-sm font-semibold ${item.isAvailable ? "text-white" : "text-gray-500 line-through"}`}>
                            {item.nameTr}
                          </h4>
                          <span className="text-gray-500 text-xs font-medium">({item.nameEn})</span>
                          
                          {item.showOnMenu === false && (
                            <span className="text-[9px] bg-purple-950/40 text-purple-400 px-1.5 py-0.5 rounded border border-purple-900/30 font-bold uppercase tracking-wider">
                              Menüde Gizli (Sadece Reçete)
                            </span>
                          )}

                          {/* Dietary badges */}
                          {item.dietaryLabels?.map(l => (
                            <span key={l.id} title={l.key} className="text-[10px] bg-emerald-950/40 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-900/30">
                              {l.icon}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{item.descriptionTr || "Açıklama yok"}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <span className="font-mono text-sm font-bold text-[#C9A84C] bg-[#C9A84C]/5 px-2.5 py-1 rounded-lg border border-[#C9A84C]/10">
                        ₺{Number(item.price).toFixed(2)}
                      </span>

                      {/* Availability status clicker */}
                      <button 
                        onClick={() => handleToggleAvailable(item.id, item.isAvailable)}
                        className={`p-2 rounded-xl flex items-center space-x-1 border transition-all ${
                          item.isAvailable 
                            ? "bg-[#5B8A3C]/10 text-[#5B8A3C] border-[#5B8A3C]/30 hover:bg-[#5B8A3C]/20" 
                            : "bg-red-950/20 text-red-400 border-red-900/20 hover:bg-red-950/40"
                        }`}
                        title={item.isAvailable ? "Satışı Kapat" : "Satışı Aç"}
                      >
                        {item.isAvailable ? (
                          <>
                            <Eye className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1">AÇIK</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1">KAPALI</span>
                          </>
                        )}
                      </button>

                      {/* Item Reorder buttons */}
                      <div className="flex bg-[#2A2A3D]/40 rounded-lg p-0.5 border border-gray-800/60">
                        <button
                          disabled={itemIdx === 0}
                          onClick={() => handleReorderItems(cat.id, itemIdx, "up")}
                          className="p-1 rounded-md hover:bg-gray-800 disabled:opacity-25 disabled:hover:bg-transparent text-gray-400 hover:text-white transition-colors"
                          title="Yukarı Taşı"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          disabled={itemIdx === cat.items.length - 1}
                          onClick={() => handleReorderItems(cat.id, itemIdx, "down")}
                          className="p-1 rounded-md hover:bg-gray-800 disabled:opacity-25 disabled:hover:bg-transparent text-gray-400 hover:text-white transition-colors"
                          title="Aşağı Taşı"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Action buttons */}
                      <div className="flex space-x-1.5">
                        <button 
                          onClick={() => openEditItemModal(item, cat.id)}
                          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/50"
                          title="Düzenle"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 rounded-lg bg-red-950/10 hover:bg-red-950/50 text-red-400 border border-red-950/30"
                          title="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 text-xs">
                  Bu kategoride henüz ürün bulunmuyor.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Category Edit/Add Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setCatModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#16213E] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh]">
            <h3 className="font-serif text-lg font-bold text-white flex-shrink-0">
              {editingCategory ? "Kategoriyi Düzenle" : "Kategori Ekle"}
            </h3>
            
            <div className="space-y-3 overflow-y-auto flex-grow">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Kategori Adı (TR)</label>
                <input 
                  type="text" 
                  value={catNameTr}
                  onChange={(e) => setCatNameTr(e.target.value)}
                  className={`w-full bg-[#1C1C28] border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none ${
                    catErrors.nameTr ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-[#C9A84C]/50"
                  }`}
                  placeholder="örn. Başlangıçlar"
                />
                {catErrors.nameTr && <p className="text-red-500 text-[11px] mt-1">{catErrors.nameTr}</p>}
              </div>
              
              <div>
                <label className="text-xs text-gray-400 block mb-1">Kategori Adı (EN - Opsiyonel)</label>
                <input 
                  type="text" 
                  value={catNameEn}
                  onChange={(e) => setCatNameEn(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/50"
                  placeholder="örn. Starters (Opsiyonel)"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-800/40 flex-shrink-0">
              <button 
                onClick={() => setCatModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-bold hover:bg-gray-700"
              >
                İptal
              </button>
              <button 
                onClick={handleSaveCategory}
                className="px-4 py-2 rounded-xl bg-[#722F37] text-xs font-bold text-white hover:bg-[#8B3E48]"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Edit/Add Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setItemModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#16213E] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh]">
            <h3 className="font-serif text-lg font-bold text-white flex-shrink-0">
              {editingItem ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
            </h3>

            <div className="space-y-3.5 overflow-y-auto flex-grow pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Ürün Adı (TR)</label>
                  <input 
                    type="text" 
                    value={itemNameTr}
                    onChange={(e) => setItemNameTr(e.target.value)}
                    className={`w-full bg-[#1C1C28] border rounded-xl px-4 py-2 text-sm text-white focus:outline-none ${
                      itemErrors.nameTr ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-[#C9A84C]/50"
                    }`}
                  />
                  {itemErrors.nameTr && <p className="text-red-500 text-[11px] mt-1">{itemErrors.nameTr}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Ürün Adı (EN - Opsiyonel)</label>
                  <input 
                    type="text" 
                    value={itemNameEn}
                    onChange={(e) => setItemNameEn(e.target.value)}
                    className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#C9A84C]/50"
                    placeholder="Opsiyonel"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Fiyat (TRY)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className={`w-full bg-[#1C1C28] border rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none ${
                      itemErrors.price ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-[#C9A84C]/50"
                    }`}
                  />
                  {itemErrors.price && <p className="text-red-500 text-[11px] mt-1">{itemErrors.price}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Kalori (kcal)</label>
                  <input 
                    type="number" 
                    value={itemCalories}
                    onChange={(e) => setItemCalories(e.target.value)}
                    className={`w-full bg-[#1C1C28] border rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none ${
                      itemErrors.calories ? "border-red-500 focus:border-red-500" : "border-gray-800 focus:border-[#C9A84C]/50"
                    }`}
                    placeholder="örn. 350 (Opsiyonel)"
                  />
                  {itemErrors.calories && <p className="text-red-500 text-[11px] mt-1">{itemErrors.calories}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Açıklama (TR)</label>
                  <textarea 
                    value={itemDescTr}
                    onChange={(e) => setItemDescTr(e.target.value)}
                    rows={2}
                    className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:border-[#C9A84C]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Açıklama (EN)</label>
                  <textarea 
                    value={itemDescEn}
                    onChange={(e) => setItemDescEn(e.target.value)}
                    rows={2}
                    className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:border-[#C9A84C]/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Image upload widget */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Ürün Görseli</label>
                <div className="flex space-x-3 items-center">
                  <div className="w-16 h-16 rounded-xl bg-[#1C1C28] border border-gray-800 flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                    {itemImageUrl ? (
                      <img src={itemImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <input 
                      type="text" 
                      value={itemImageUrl}
                      onChange={(e) => setItemImageUrl(e.target.value)}
                      className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-1.5 text-xs text-white focus:border-[#C9A84C]/50 focus:outline-none mb-2"
                      placeholder="Görsel URL veya yükleyin"
                    />
                    <label className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[11px] font-bold text-white border border-gray-700/50 w-fit cursor-pointer">
                      {isUploading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Yükleniyor...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          <span>Dosya Seç</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Allergens checkboxes */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Alerjenler</label>
                <div className="flex flex-wrap gap-1.5">
                  {commonAllergens.map(a => {
                    const isSelected = itemAllergens.includes(a);
                    return (
                      <button
                        key={a}
                        onClick={() => toggleAllergen(a)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected 
                            ? "bg-amber-950/40 text-amber-400 border-amber-800/40" 
                            : "bg-[#1C1C28] text-gray-400 border-gray-800/60"
                        }`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dietary preferences selection */}
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Beslenme Etiketleri</label>
                <div className="flex flex-wrap gap-1.5">
                  {dietaryLabels.map(d => {
                    const isSelected = itemDietaryIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        onClick={() => toggleDietaryLabel(d.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected 
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/40" 
                            : "bg-[#1C1C28] text-gray-400 border-gray-800/60"
                        }`}
                      >
                        {d.icon} {d.key}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility Settings */}
              <div className="pt-3.5 border-t border-gray-800/40">
                <label className="text-xs text-gray-400 block mb-2">Görünürlük</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="itemShowOnMenu"
                    checked={itemShowOnMenu}
                    onChange={(e) => setItemShowOnMenu(e.target.checked)}
                    className="rounded border-gray-800 bg-[#1C1C28] text-[#C9A84C] focus:ring-[#C9A84C]/50 h-4 w-4 accent-[#C9A84C]"
                  />
                  <label htmlFor="itemShowOnMenu" className="text-xs text-gray-300 font-semibold select-none cursor-pointer">
                    QR Menüde Göster (Müşterilere açık/görünür olsun)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-800/40 flex-shrink-0">
              <button 
                onClick={() => setItemModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-xs font-bold hover:bg-gray-700"
              >
                İptal
              </button>
              <button 
                onClick={handleSaveItem}
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
