"use client";

import React, { useEffect, useState } from "react";
import { 
  ChefHat, 
  Plus, 
  Trash2, 
  Loader2, 
  Search, 
  Percent, 
  Check,
  TrendingUp,
  X,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface MenuItem {
  id: string;
  nameEn: string;
  nameTr: string;
  price: string;
  categoryId: string;
  categoryName?: string;
  recipe?: {
    id: string;
    targetMargin: string;
    currentCost: string;
    ingredients: Array<{
      id: string;
      ingredientId: string;
      ingredientName?: string;
      ingredientUnit?: string;
      ingredientCost?: string;
      amountUsed: string;
    }>;
  } | null;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  weightedCost: string;
}

interface RecipeItemForm {
  ingredientId: string;
  name: string;
  unit: string;
  cost: number;
  amountUsed: number;
}

export default function AdminRecipesPage() {
  const venueId = "venue-karakoy-main"; // Seed default
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Builder Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItemForm[]>([]);
  const [targetMargin, setTargetMargin] = useState(0.70); // 70% default
  const [ingSearchQuery, setIngSearchQuery] = useState("");

  // Form errors
  const [errors, setErrors] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, ingRes] = await Promise.all([
        fetch(`${apiUrl}/api/admin/categories?venueId=${venueId}`), // Load categories + menu items
        fetch(`${apiUrl}/api/admin/inventory/ingredients?venueId=${venueId}`) // Load ingredients
      ]);

      if (itemsRes.ok && ingRes.ok) {
        const categoriesData = await itemsRes.json();
        const ingredientsData = await ingRes.json();
        setIngredients(ingredientsData);

        // Flatten menu items with category names
        const flattenedItems: MenuItem[] = [];
        // Load recipes for these menu items
        const recipesRes = await fetch(`${apiUrl}/api/admin/inventory/recipes?venueId=${venueId}`);
        const recipesList = recipesRes.ok ? await recipesRes.json() : [];
        const recipesMap = new Map(recipesList.map((r: any) => [r.menuItemId, r]));

        categoriesData.forEach((cat: any) => {
          if (cat.items && Array.isArray(cat.items)) {
            cat.items.forEach((item: any) => {
              const matchedRecipe: any = recipesMap.get(item.id);
              flattenedItems.push({
                ...item,
                categoryName: cat.nameTr,
                recipe: matchedRecipe ? {
                  id: matchedRecipe.id,
                  targetMargin: matchedRecipe.targetMargin,
                  currentCost: matchedRecipe.currentCost,
                  ingredients: matchedRecipe.ingredients
                } : null
              });
            });
          }
        });

        setMenuItems(flattenedItems);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openBuilderModal = (item: MenuItem) => {
    setErrors(null);
    setSelectedItem(item);
    setIngSearchQuery("");

    if (item.recipe) {
      setTargetMargin(parseFloat(item.recipe.targetMargin));
      const loadedItems = item.recipe.ingredients.map(ri => {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        return {
          ingredientId: ri.ingredientId,
          name: ri.ingredientName || ing?.name || "Bilinmeyen Malzeme",
          unit: ri.ingredientUnit || ing?.unit || "g",
          cost: parseFloat(ri.ingredientCost || ing?.weightedCost || "0.0"),
          amountUsed: parseFloat(ri.amountUsed)
        };
      });
      setRecipeItems(loadedItems);
    } else {
      setTargetMargin(0.70);
      setRecipeItems([]);
    }
    setModalOpen(true);
  };

  const handleAddIngredientToRecipe = (ing: Ingredient) => {
    const existingIdx = recipeItems.findIndex(item => item.ingredientId === ing.id);
    if (existingIdx !== -1) {
      alert("Bu malzeme reçetede zaten ekli. Miktarını sağ panelden güncelleyebilirsiniz.");
      return;
    }

    setRecipeItems([
      ...recipeItems,
      {
        ingredientId: ing.id,
        name: ing.name,
        unit: ing.unit,
        cost: parseFloat(ing.weightedCost),
        amountUsed: ing.unit === "unit" ? 1 : 10 // Default amount
      }
    ]);
  };

  const handleRemoveIngredientFromRecipe = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const handleUpdateAmount = (index: number, amount: number) => {
    setRecipeItems(
      recipeItems.map((item, i) => (i === index ? { ...item, amountUsed: amount } : item))
    );
  };

  const calculateTotalCost = () => {
    return recipeItems.reduce((sum, item) => sum + (item.cost * item.amountUsed), 0);
  };

  const calculateSuggestedPrice = (cost: number) => {
    const denom = 1.0 - targetMargin;
    if (denom <= 0) return 0;
    return cost / denom;
  };

  const handleSaveRecipe = async () => {
    if (!selectedItem) return;
    if (recipeItems.length === 0) {
      setErrors("Reçete kaydedilebilmesi için en az bir malzeme eklenmelidir.");
      return;
    }

    setErrors(null);
    setIsSaving(true);

    try {
      const isEdit = selectedItem.recipe !== null;
      const url = isEdit 
        ? `${apiUrl}/api/admin/inventory/recipes/${selectedItem.recipe!.id}`
        : `${apiUrl}/api/admin/inventory/recipes`;
      
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        menuItemId: selectedItem.id,
        targetMargin: targetMargin,
        ingredients: recipeItems.map(item => ({
          ingredientId: item.ingredientId,
          amountUsed: item.amountUsed
        }))
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalOpen(false);
        fetchData();
      } else {
        const errData = await res.json();
        setErrors(errData.detail || "Reçete kaydedilirken hata oluştu.");
      }
    } catch (e) {
      console.error(e);
      setErrors("Sunucu bağlantı hatası.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm("Bu reçeteyi tamamen silmek istediğinize emin misiniz?")) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/admin/inventory/recipes/${recipeId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateAll = async () => {
    if (!confirm("Tüm reçetelerin maliyetlerini güncel stok maliyetlerine (WAC) göre yeniden hesaplamak istiyor musunuz?")) return;
    try {
      setLoading(true);
      // Recalculate all using a force loop on existing recipes
      const existingRecipes = menuItems.filter(item => item.recipe).map(item => item.recipe!);
      await Promise.all(
        existingRecipes.map(r => 
          fetch(`${apiUrl}/api/admin/inventory/recipes/${r.id}/recalculate`, { method: "POST" })
        )
      );
      fetchData();
      alert("Tüm reçete maliyetleri başarıyla yeniden hesaplandı.");
    } catch (e) {
      console.error(e);
      alert("Hesaplama sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item =>
    item.nameTr.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.categoryName && item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredIngSearch = ingredients.filter(ing =>
    ing.name.toLowerCase().includes(ingSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white">Ürün Reçeteleri & Maliyet</h2>
          <p className="text-xs text-gray-400 mt-1">
            Menüdeki ürünlerinize reçete bağlayarak porsiyon bazlı hammadde maliyetini otomatik hesaplayın.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRecalculateAll}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#2A2A3D]/80 border border-gray-800 hover:border-[#C9A84C]/35 text-white font-semibold text-xs transition-all hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4 text-[#C9A84C]" />
            <span>Maliyetleri Yenile</span>
          </button>
        </div>
      </div>

      {/* Search filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-3 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Ürün adı veya kategori ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#16213E]/50 border border-gray-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A84C]/50"
        />
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#C9A84C] animate-spin" />
        </div>
      ) : (
        /* Recipes Table List */
        <div className="bg-[#16213E]/30 border border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#16213E]/80 border-b border-gray-800/40 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Ürün Adı</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Satış Fiyatı</th>
                  <th className="px-6 py-4">Reçete Durumu</th>
                  <th className="px-6 py-4">Hesaplanan Maliyet</th>
                  <th className="px-6 py-4">Brüt Kâr Marjı</th>
                  <th className="px-6 py-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/20 text-xs">
                {filteredMenuItems.length > 0 ? (
                  filteredMenuItems.map((item) => {
                    const price = parseFloat(item.price) || 0;
                    const cost = item.recipe ? parseFloat(item.recipe.currentCost) : 0;
                    const currentMargin = price > 0 ? ((price - cost) / price) * 100 : 0;
                    const targetMarginPct = item.recipe ? parseFloat(item.recipe.targetMargin) * 100 : 0;
                    const isMarginCrit = item.recipe && currentMargin < targetMarginPct;

                    return (
                      <tr key={item.id} className="hover:bg-[#2A2A3D]/10 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-white">{item.nameTr}</p>
                            <p className="text-[10px] text-gray-500">({item.nameEn})</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {item.categoryName}
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-white">
                          ₺{price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            item.recipe
                              ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30"
                              : "bg-gray-950/40 text-gray-400 border-gray-900/30"
                          }`}>
                            {item.recipe ? "REÇETELİ" : "REÇETESİZ"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.recipe ? (
                            <span className="font-mono font-semibold text-[#C9A84C]">
                              ₺{cost.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {item.recipe ? (
                            <div className="flex items-center space-x-1.5">
                              <span className={`font-mono font-bold ${isMarginCrit ? "text-red-400" : "text-emerald-400"}`}>
                                {currentMargin.toFixed(1)}%
                              </span>
                              {isMarginCrit && (
                                <span className="flex items-center text-[9px] bg-red-950/40 border border-red-900/30 text-red-400 px-1 py-0.2 rounded font-bold" title={`Hedef Marj: ${targetMarginPct}%`}>
                                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                  <span>DÜŞÜK</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => openBuilderModal(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/40 flex items-center space-x-1 text-xs font-semibold"
                            >
                              <ChefHat className="h-3.5 w-3.5" />
                              <span>{item.recipe ? "Düzenle" : "Reçete Yap"}</span>
                            </button>
                            {item.recipe && (
                              <button
                                onClick={() => handleDeleteRecipe(item.recipe!.id)}
                                className="p-1.5 rounded-lg bg-red-950/10 hover:bg-red-950/50 text-red-450 border border-red-950/20"
                                title="Reçeteyi Sil"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Eşleşen menü ürünü bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recipe Builder Modal */}
      {modalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-[#16213E] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#16213E]/80 border-b border-gray-800/40 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
                  <ChefHat className="h-5 w-5 text-[#C9A84C]" />
                  <span>{selectedItem.nameTr} Reçetesi</span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Menü Fiyatı: ₺{parseFloat(selectedItem.price).toFixed(2)}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content - Dual Column */}
            <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
              {/* Left Column - Ingredient Selection */}
              <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-gray-800/40 p-5 flex flex-col overflow-hidden">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">Malzeme Seçimi</h4>
                
                {/* Search */}
                <div className="relative mb-3 flex-shrink-0">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Malzeme adı ara..."
                    value={ingSearchQuery}
                    onChange={(e) => setIngSearchQuery(e.target.value)}
                    className="w-full bg-[#1C1C28]/80 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                  />
                </div>

                {/* List */}
                <div className="flex-grow overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {filteredIngSearch.length > 0 ? (
                    filteredIngSearch.map((ing) => (
                      <div key={ing.id} className="bg-[#1C1C28]/40 border border-gray-800/20 p-2.5 rounded-lg flex justify-between items-center text-xs hover:bg-[#2A2A3D]/20 transition-all">
                        <div>
                          <p className="font-semibold text-white">{ing.name}</p>
                          <p className="text-[9px] text-[#C9A84C] font-mono mt-0.5">₺{parseFloat(ing.weightedCost).toFixed(4)} / {ing.unit}</p>
                        </div>
                        <button
                          onClick={() => handleAddIngredientToRecipe(ing)}
                          className="px-2 py-1 bg-gray-850 hover:bg-[#722F37] border border-gray-800 hover:border-transparent text-[10px] font-bold rounded transition-colors text-white"
                        >
                          + Ekle
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 text-[10px] py-8">Malzeme bulunamadı.</p>
                  )}
                </div>
              </div>

              {/* Right Column - Recipe Formulation */}
              <div className="w-full md:w-7/12 p-5 flex flex-col overflow-hidden bg-[#16213E]/10">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">Reçete İçeriği</h4>
                
                {/* Ingredients Form List */}
                <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                  {recipeItems.length > 0 ? (
                    recipeItems.map((item, index) => {
                      const lineCost = item.cost * item.amountUsed;
                      return (
                        <div key={item.ingredientId} className="bg-[#1C1C28]/60 border border-gray-800/40 p-3 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex-grow min-w-0">
                            <p className="font-semibold text-white truncate text-xs">{item.name}</p>
                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">₺{item.cost.toFixed(2)} / {item.unit}</p>
                          </div>
                          
                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <input
                              type="number"
                              step="0.01"
                              value={item.amountUsed}
                              onChange={(e) => handleUpdateAmount(index, parseFloat(e.target.value) || 0)}
                              className="w-16 bg-[#1C1C28] border border-gray-800 rounded px-2 py-1 text-center font-mono text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                            />
                            <span className="text-xs text-gray-400 w-8">{item.unit}</span>
                          </div>

                          <div className="text-right flex-shrink-0 w-20">
                            <p className="font-mono text-xs font-semibold text-white">₺{lineCost.toFixed(2)}</p>
                          </div>

                          <button
                            onClick={() => handleRemoveIngredientFromRecipe(index)}
                            className="p-1 rounded bg-red-950/20 hover:bg-red-950/50 text-red-400 border border-red-900/30 flex-shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-gray-500 text-xs py-12">
                      Henüz malzeme eklenmedi. Sol panelden malzeme seçin.
                    </div>
                  )}
                </div>

                {/* Live Computations Panel */}
                <div className="border-t border-gray-800/60 pt-4 mt-4 space-y-3 flex-shrink-0 bg-[#16213E]/50 p-4 rounded-2xl border border-gray-800/40">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Toplam Porsiyon Maliyeti:</span>
                    <span className="font-mono font-bold text-white text-sm">₺{calculateTotalCost().toFixed(2)}</span>
                  </div>

                  {/* Target Margin Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Hedef Brüt Kâr Marjı:</span>
                      <span className="font-mono font-bold text-[#C9A84C]">{(targetMargin * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.40"
                      max="0.95"
                      step="0.05"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(parseFloat(e.target.value))}
                      className="w-full accent-[#C9A84C]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-850 text-xs">
                    <div>
                      <span className="text-gray-500 block">Önerilen Fiyat:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ₺{calculateSuggestedPrice(calculateTotalCost()).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Mevcut Marjınız:</span>
                      <span className={`font-mono font-bold ${
                        ((parseFloat(selectedItem.price) - calculateTotalCost()) / parseFloat(selectedItem.price)) < targetMargin
                          ? "text-red-400"
                          : "text-emerald-400"
                      }`}>
                        {(((parseFloat(selectedItem.price) - calculateTotalCost()) / parseFloat(selectedItem.price)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error alerts banner inside modal */}
            {errors && (
              <div className="px-6 py-2 bg-red-950/20 border-t border-b border-red-900/30 text-xs text-red-400 flex items-center space-x-1.5">
                <AlertTriangle className="h-4 w-4" />
                <span>{errors}</span>
              </div>
            )}

            {/* Modal Footer */}
            <div className="bg-[#16213E]/80 border-t border-gray-800/40 px-6 py-4 flex justify-end space-x-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white border border-gray-700/50"
              >
                İptal
              </button>
              <button
                disabled={isSaving}
                onClick={handleSaveRecipe}
                className="flex items-center space-x-1 px-6 py-2.5 rounded-xl bg-[#722F37] hover:bg-[#8B3E48] text-white font-bold text-xs shadow-md shadow-[#722F37]/15"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>Reçeteyi Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
