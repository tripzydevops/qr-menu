"use client";

import { DEFAULT_VENUE_ID } from "@/lib/config";

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
  RefreshCw,
  Sparkles
} from "lucide-react";

interface MenuItem {
  id: string;
  nameEn: string;
  nameTr: string;
  price: string;
  categoryId: string;
  categoryName?: string;
  showOnMenu?: boolean;
  recipe?: {
    id: string;
    targetMargin: string;
    currentCost: string;
    yieldQuantity?: number;
    yieldUnit?: string;
    portionSize?: number;
    totalYield?: number;
    ingredients: Array<{
      id: string;
      ingredientId: string;
      ingredientName?: string;
      ingredientUnit?: string;
      ingredientCost?: string;
      ingredientDensity?: number;
      amountUsed: string;
    }>;
  } | null;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  weightedCost: string;
  density: number;
}

interface RecipeItemForm {
  ingredientId: string;
  name: string;
  unit: string;
  density: number;
  cost: number;
  amountUsed: number;
  inputAmount: number | string;
  inputUnit: string;
  originalText?: string;
  confidence?: number;
  lineCostOverride?: string;
}

const convertUnit = (amount: number, fromUnit: string, toUnit: string, density: number): number => {
  let volumeMl = 0;
  let isVolume = false;

  if (fromUnit === "ml") {
    volumeMl = amount;
    isVolume = true;
  } else if (fromUnit === "liter") {
    volumeMl = amount * 1000;
    isVolume = true;
  } else if (fromUnit === "cup") {
    volumeMl = amount * 240;
    isVolume = true;
  } else if (fromUnit === "tea_glass" || fromUnit === "çay_bardağı") {
    volumeMl = amount * 100;
    isVolume = true;
  } else if (fromUnit === "tbsp") {
    volumeMl = amount * 15;
    isVolume = true;
  } else if (fromUnit === "tsp") {
    volumeMl = amount * 5;
    isVolume = true;
  } else if (fromUnit === "çay_kaşığı" || fromUnit === "turkish_teaspoon") {
    volumeMl = amount * 2.5;
    isVolume = true;
  }

  if (isVolume) {
    const weightG = volumeMl * density;
    if (toUnit === "g") return weightG;
    if (toUnit === "kg") return weightG / 1000;
    if (toUnit === "clove" || toUnit === "diş") return weightG / 4;
    if (toUnit === "ml") return volumeMl;
    if (toUnit === "liter") return volumeMl / 1000;
    if (toUnit === "tea_glass" || toUnit === "çay_bardağı") return volumeMl / 100;
    if (toUnit === "çay_kaşığı" || toUnit === "turkish_teaspoon") return volumeMl / 2.5;
    return weightG;
  }

  let weightG = 0;
  let isWeight = false;
  if (fromUnit === "g") {
    weightG = amount;
    isWeight = true;
  } else if (fromUnit === "kg") {
    weightG = amount * 1000;
    isWeight = true;
  } else if (fromUnit === "clove" || fromUnit === "diş") {
    weightG = amount * 4;
    isWeight = true;
  }

  if (isWeight) {
    if (toUnit === "g") return weightG;
    if (toUnit === "kg") return weightG / 1000;
    if (toUnit === "clove" || toUnit === "diş") return weightG / 4;
    const volMl = weightG / (density || 1.0);
    if (toUnit === "ml") return volMl;
    if (toUnit === "liter") return volMl / 1000;
    if (toUnit === "cup") return volMl / 240;
    if (toUnit === "tea_glass" || toUnit === "çay_bardağı") return volMl / 100;
    if (toUnit === "tbsp") return volMl / 15;
    if (toUnit === "tsp") return volMl / 5;
    if (toUnit === "çay_kaşığı" || toUnit === "turkish_teaspoon") return volMl / 2.5;
    return weightG;
  }

  return amount;
};

export default function AdminRecipesPage() {
  const venueId = DEFAULT_VENUE_ID; // Seed default
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  // Add Recipe Modal state
  const [addRecipeModalOpen, setAddRecipeModalOpen] = useState(false);
  const [newRecipeNameTr, setNewRecipeNameTr] = useState("");
  const [newRecipeNameEn, setNewRecipeNameEn] = useState("");
  const [newRecipeCategoryId, setNewRecipeCategoryId] = useState("");
  const [newRecipePrice, setNewRecipePrice] = useState("0");
  const [creatingRecipe, setCreatingRecipe] = useState(false);

  // Builder Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItemForm[]>([]);
  const [targetMargin, setTargetMargin] = useState(0.70); // 70% default
  const [yieldQuantity, setYieldQuantity] = useState<number>(1);
  const [ingSearchQuery, setIngSearchQuery] = useState("");

  // AI Scan states
  const [aiScanOpen, setAiScanOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiScanning, setAiScanning] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [unmatchedScannedItems, setUnmatchedScannedItems] = useState<any[]>([]);

  // Yield Calculator states
  const [yieldMode, setYieldMode] = useState<string>("porsiyon");
  const [yieldUnit, setYieldUnit] = useState<string>("porsiyon");
  const [portionSize, setPortionSize] = useState<number>(1);
  const [portionUnit, setPortionUnit] = useState<string>("g");
  const [totalYield, setTotalYield] = useState<number>(1);

  // Inline Ingredient creation state
  const [showNewIngForm, setShowNewIngForm] = useState(false);
  const [newIngName, setNewIngName] = useState("");
  const [newIngUnit, setNewIngUnit] = useState("g");
  const [newIngCost, setNewIngCost] = useState("0");
  const [newIngDensity, setNewIngDensity] = useState("1.0");

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
        setCategories(categoriesData);

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
                  yieldQuantity: matchedRecipe.yieldQuantity,
                  yieldUnit: matchedRecipe.yieldUnit,
                  portionSize: matchedRecipe.portionSize,
                  totalYield: matchedRecipe.totalYield,
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

    setUnmatchedScannedItems([]);

    if (item.recipe) {
      setTargetMargin(parseFloat(item.recipe.targetMargin));
      const yq = item.recipe.yieldQuantity ? Number(item.recipe.yieldQuantity) : 1;
      const yu = item.recipe.yieldUnit || "porsiyon";
      const ps = item.recipe.portionSize ? Number(item.recipe.portionSize) : 1;
      const ty = item.recipe.totalYield ? Number(item.recipe.totalYield) : 1;
       
      setYieldQuantity(yq);
      setYieldUnit(yu);
      setPortionSize(ps);
      setTotalYield(ty);
 
      // Determine yield mode and portion unit
      if (yu === "porsiyon") {
        setYieldMode("porsiyon");
        setPortionUnit("porsiyon");
      } else if (["g", "kg"].includes(yu)) {
        setYieldMode("weight");
        setPortionUnit(ps >= 1000 ? "kg" : "g");
      } else {
        setYieldMode("volume");
        setPortionUnit(ps >= 1000 ? "L" : "ml");
      }
 
      const loadedItems = item.recipe.ingredients.map(ri => {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        const density = ing ? Number(ing.density) : 1.0;
        const amountUsed = parseFloat(ri.amountUsed);
        return {
          ingredientId: ri.ingredientId,
          name: ri.ingredientName || ing?.name || "Bilinmeyen Malzeme",
          unit: ri.ingredientUnit || ing?.unit || "g",
          density,
          cost: parseFloat(ri.ingredientCost || ing?.weightedCost || "0.0"),
          amountUsed,
          inputAmount: amountUsed,
          inputUnit: ri.ingredientUnit || ing?.unit || "g",
          confidence: 1.0,
          originalText: ri.ingredientName || ing?.name || "Bilinmeyen Malzeme"
        };
      });
      setRecipeItems(loadedItems);
    } else {
      setTargetMargin(0.70);
      setYieldQuantity(1);
      setYieldUnit("porsiyon");
      setPortionSize(1);
      setTotalYield(1);
      setYieldMode("porsiyon");
      setPortionUnit("porsiyon");
      setRecipeItems([]);
    }
    setAiScanOpen(false);
    setAiText("");
    setModalOpen(true);
  };

  const handleAiScanRecipe = async (file?: File) => {
    setErrors(null);
    setAiScanning(true);
    setUnmatchedScannedItems([]);
    try {
      const formData = new FormData();
      let res;
      if (file) {
        formData.append("file", file);
        res = await fetch(`${apiUrl}/api/admin/inventory/recipes/scan?venueId=${venueId}`, {
          method: "POST",
          body: formData,
        });
      } else {
        if (!aiText.trim()) {
          alert("Lütfen bir tarif metni yazın veya dosya yükleyin.");
          setAiScanning(false);
          return;
        }
        res = await fetch(`${apiUrl}/api/admin/inventory/recipes/scan?venueId=${venueId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: aiText }),
        });
      }

      if (res.ok) {
        let data;
        try {
          data = await res.json();
        } catch (jsonErr) {
          throw new Error("Sunucu yanıtı okunamadı. AI taraması başarısız oldu.");
        }
        const items = data.items || [];
        
        if (items.length > 0) {
          const mappedItems = items.map((item: any) => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            const defaultAmount = parseFloat(item.amountUsed) || 0;
            return {
              ingredientId: item.ingredientId,
              name: ing?.name || item.name || "Bilinmeyen Malzeme",
              unit: ing?.unit || item.unit || "g",
              density: ing?.density || 1.0,
              cost: parseFloat(ing?.weightedCost || "0.0"),
              amountUsed: defaultAmount,
              inputAmount: defaultAmount,
              inputUnit: ing?.unit || item.unit || "g",
              confidence: item.confidence !== undefined ? item.confidence : (item.ingredientId ? 1.0 : 0.0),
              originalText: item.originalText || item.name || ""
            };
          });
          
          setRecipeItems(mappedItems);
          
          if (data.suggestedYieldQuantity) {
            const qty = Number(data.suggestedYieldQuantity);
            const unit = data.suggestedYieldUnit || "porsiyon";
            setTotalYield(qty);
            setYieldUnit(unit);
            
            if (unit === "porsiyon") {
              setYieldMode("porsiyon");
              setPortionUnit("porsiyon");
              setPortionSize(1);
            } else if (["g", "kg"].includes(unit)) {
              setYieldMode("weight");
              setPortionUnit("g");
              setPortionSize(150); 
            } else {
              setYieldMode("volume");
              setPortionUnit("ml");
              setPortionSize(150);
            }
          }
          
          setAiText("");
          setAiScanOpen(false);
        } else {
          alert("AI tariften hiçbir malzeme eşleştiremedi. Lütfen malzemelerin adlarını kontrol edin.");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "AI reçete tarama başarısız oldu.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "AI tarama sırasında bir hata oluştu.");
    } finally {
      setAiScanning(false);
    }
  };

  const handleAiSuggestRecipe = async () => {
    if (!selectedItem) return;
    setErrors(null);
    setAiSuggesting(true);
    setUnmatchedScannedItems([]);
    try {
      const res = await fetch(`${apiUrl}/api/admin/inventory/recipes/suggest?venueId=${venueId}&menuItemId=${selectedItem.id}`, {
        method: "POST",
      });

      if (res.ok) {
        let data;
        try {
          data = await res.json();
        } catch (jsonErr) {
          throw new Error("Sunucu yanıtı okunamadı. AI önerisi başarısız oldu.");
        }
        const items = data.items || [];
        
        if (items.length > 0) {
          const mappedItems = items.map((item: any) => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            const defaultAmount = parseFloat(item.amountUsed) || 0;
            return {
              ingredientId: item.ingredientId,
              name: ing?.name || item.name || "Bilinmeyen Malzeme",
              unit: ing?.unit || item.unit || "g",
              density: ing?.density || item.density || 1.0,
              cost: parseFloat(ing?.weightedCost || "0.0"),
              amountUsed: defaultAmount,
              inputAmount: defaultAmount,
              inputUnit: ing?.unit || item.unit || "g",
              confidence: item.confidence !== undefined ? item.confidence : (item.ingredientId ? 1.0 : 0.0),
              originalText: item.originalText || item.name || ""
            };
          });
          
          setRecipeItems(mappedItems);
          
          if (data.suggestedYieldQuantity) {
            const qty = Number(data.suggestedYieldQuantity);
            const unit = data.suggestedYieldUnit || "porsiyon";
            setTotalYield(qty);
            setYieldUnit(unit);
            
            if (unit === "porsiyon") {
              setYieldMode("porsiyon");
              setPortionUnit("porsiyon");
              setPortionSize(1);
            } else if (["g", "kg"].includes(unit)) {
              setYieldMode("weight");
              setPortionUnit("g");
              setPortionSize(150); 
            } else {
              setYieldMode("volume");
              setPortionUnit("ml");
              setPortionSize(150);
            }
          }
        } else {
          alert("Yapay Zeka bu ürün için reçete öneremedi.");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "Yapay Zeka reçete önerisi başarısız oldu.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Reçete önerisi sırasında bir hata oluştu.");
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleCreateUnmatchedIngredient = async (index: number, name: string, unit: string, density: number) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/inventory/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          name,
          unit,
          density: Number(density) || 1.0,
          currentStock: 0,
          weightedCost: 0,
        })
      });
      if (res.ok) {
        const newIng = await res.json();
        setIngredients(prev => [...prev, newIng]);
        
        const matchedItem = {
          ingredientId: newIng.id,
          name: newIng.name,
          unit: newIng.unit,
          density: Number(newIng.density) || 1.0,
          cost: 0,
          amountUsed: unmatchedScannedItems[index].amountUsed,
          inputAmount: unmatchedScannedItems[index].amountUsed,
          inputUnit: newIng.unit,
          originalText: unmatchedScannedItems[index].originalText,
          confidence: 1.0
        };
        
        setRecipeItems(prev => [...prev, matchedItem]);
        setUnmatchedScannedItems(prev => prev.filter((_, idx) => idx !== index));
      } else {
        const err = await res.json();
        alert(err.detail || "Malzeme oluşturulamadı.");
      }
    } catch (e) {
      console.error(e);
      alert("Malzeme oluşturulurken hata oluştu.");
    }
  };

  const handleAddIngredientToRecipe = (ing: Ingredient) => {
    const existingIdx = recipeItems.findIndex(item => item.ingredientId === ing.id);
    if (existingIdx !== -1) {
      alert("Bu malzeme reçetede zaten ekli. Miktarını sağ panelden güncelleyebilirsiniz.");
      return;
    }

    const defaultAmount = ing.unit === "unit" ? 1 : 10;

    setRecipeItems([
      ...recipeItems,
      {
        ingredientId: ing.id,
        name: ing.name,
        unit: ing.unit,
        density: ing.density || 1.0,
        cost: parseFloat(ing.weightedCost),
        amountUsed: defaultAmount,
        inputAmount: defaultAmount,
        inputUnit: ing.unit,
      }
    ]);
  };

  const handleRemoveIngredientFromRecipe = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const handleUpdateAmount = (index: number, amountVal: string | number, unit?: string) => {
    setRecipeItems(
      recipeItems.map((item, i) => {
        if (i === index) {
          const nextUnit = unit !== undefined ? unit : item.inputUnit;
          
          let parsedAmount = 0;
          if (typeof amountVal === "string") {
            if (amountVal === "-" || amountVal === "") {
              parsedAmount = 0;
            } else {
              parsedAmount = parseFloat(amountVal);
              if (isNaN(parsedAmount)) parsedAmount = 0;
            }
          } else {
            parsedAmount = amountVal;
          }

          const amountUsed = convertUnit(parsedAmount, nextUnit, item.unit, item.density);
          return {
            ...item,
            inputAmount: amountVal,
            inputUnit: nextUnit,
            amountUsed,
            lineCostOverride: undefined,
          };
        }
        return item;
      })
    );
  };

  const handleUpdateLineCost = (index: number, costVal: string) => {
    if (costVal !== "" && costVal !== "-" && !/^-?\d*\.?\d*$/.test(costVal)) {
      return;
    }

    setRecipeItems(
      recipeItems.map((item, i) => {
        if (i === index) {
          const parsedCost = parseFloat(costVal);
          if (isNaN(parsedCost)) {
            return {
              ...item,
              lineCostOverride: costVal,
            };
          }

          if (item.cost !== 0) {
            const nextAmountUsed = parsedCost / item.cost;
            const nextInputAmount = convertUnit(nextAmountUsed, item.unit, item.inputUnit, item.density);
            return {
              ...item,
              amountUsed: nextAmountUsed,
              inputAmount: Number(nextInputAmount.toFixed(4)),
              lineCostOverride: undefined,
            };
          } else {
            const assumedUnitCost = 1.0;
            const nextAmountUsed = parsedCost / assumedUnitCost;
            const nextInputAmount = convertUnit(nextAmountUsed, item.unit, item.inputUnit, item.density);
            return {
              ...item,
              cost: assumedUnitCost,
              amountUsed: nextAmountUsed,
              inputAmount: Number(nextInputAmount.toFixed(4)),
              lineCostOverride: undefined,
            };
          }
        }
        return item;
      })
    );
  };

  const handleCreateIngredientInline = async () => {
    if (!newIngName.trim()) {
      alert("Malzeme adı zorunludur.");
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/admin/inventory/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          name: newIngName.trim(),
          unit: newIngUnit,
          density: parseFloat(newIngDensity) || 1.0,
          weightedCost: parseFloat(newIngCost) || 0.0,
          currentStock: 0,
        })
      });
      if (res.ok) {
        const newIng = await res.json();
        setIngredients(prev => [...prev, newIng]);
        handleAddIngredientToRecipe({
          id: newIng.id,
          name: newIng.name,
          unit: newIng.unit,
          weightedCost: newIng.weightedCost.toString(),
          density: parseFloat(newIng.density) || 1.0,
        });
        setShowNewIngForm(false);
        setNewIngName("");
      } else {
        const err = await res.json();
        alert(err.detail || "Malzeme oluşturulamadı.");
      }
    } catch (e) {
      console.error(e);
      alert("Malzeme oluşturulurken hata oluştu.");
    }
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
      // 1. Automatically create missing ingredients
      const updatedRecipeItems = [...recipeItems];
      for (let i = 0; i < updatedRecipeItems.length; i++) {
        const item = updatedRecipeItems[i];
        if (!item.ingredientId) {
          const resIng = await fetch(`${apiUrl}/api/admin/inventory/ingredients`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              venueId,
              name: item.name,
              unit: item.unit,
              density: Number(item.density) || 1.0,
              currentStock: 0,
              weightedCost: item.cost,
            })
          });
          
          if (resIng.ok) {
            const newIng = await resIng.json();
            setIngredients(prev => [...prev, newIng]);
            updatedRecipeItems[i] = {
              ...item,
              ingredientId: newIng.id,
              cost: parseFloat(newIng.weightedCost) || 0,
            };
          } else {
            const errData = await resIng.json().catch(() => ({}));
            throw new Error(errData.detail || `Malzeme '${item.name}' oluşturulamadı.`);
          }
        } else {
          // If the unit cost changed, update the database
          const originalIng = ingredients.find(ing => ing.id === item.ingredientId);
          if (originalIng && parseFloat(originalIng.weightedCost) !== item.cost) {
            await fetch(`${apiUrl}/api/admin/inventory/ingredients/${item.ingredientId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: originalIng.name,
                unit: originalIng.unit,
                density: Number(originalIng.density) || 1.0,
                weightedCost: item.cost,
              })
            });
          }
        }
      }

      // 2. Save the recipe
      const isEdit = selectedItem.recipe !== null;
      const url = isEdit 
        ? `${apiUrl}/api/admin/inventory/recipes/${selectedItem.recipe!.id}`
        : `${apiUrl}/api/admin/inventory/recipes`;
      
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        menuItemId: selectedItem.id,
        targetMargin: targetMargin,
        yieldQuantity: calculatedPortions,
        yieldUnit: yieldUnit,
        portionSize: portionSize,
        totalYield: totalYield,
        ingredients: updatedRecipeItems.map(item => ({
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
    } catch (e: any) {
      console.error(e);
      setErrors(e.message || "Sunucu bağlantı hatası.");
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

  const handleCreateInternalRecipe = async () => {
    if (!newRecipeNameTr.trim() || !newRecipeCategoryId) {
      alert("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }
    setCreatingRecipe(true);
    try {
      const payload = {
        categoryId: newRecipeCategoryId,
        nameTr: newRecipeNameTr,
        nameEn: newRecipeNameEn.trim() || newRecipeNameTr,
        price: parseFloat(newRecipePrice) || 0,
        showOnMenu: false, // Hidden from menu!
        isAvailable: true
      };
      const res = await fetch(`${apiUrl}/api/admin/menu-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newItem = await res.json();
        setAddRecipeModalOpen(false);
        setNewRecipeNameTr("");
        setNewRecipeNameEn("");
        setNewRecipePrice("0");
        
        await fetchData();
        
        const catName = categories.find(c => c.id === newItem.categoryId)?.nameTr || "";
        const formattedItem: MenuItem = {
          id: newItem.id,
          nameTr: newItem.nameTr,
          nameEn: newItem.nameEn,
          price: newItem.price.toString(),
          categoryId: newItem.categoryId,
          categoryName: catName,
          showOnMenu: false,
          recipe: null
        };
        openBuilderModal(formattedItem);
      } else {
        alert("Reçete ürünü oluşturulamadı.");
      }
    } catch (e) {
      console.error(e);
      alert("Bağlantı hatası.");
    } finally {
      setCreatingRecipe(false);
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

  const getPortionsCount = (): number => {
    if (yieldMode === "porsiyon") {
      return totalYield;
    }
    const totalInBase = ["kg", "L"].includes(yieldUnit) ? totalYield * 1000 : totalYield;
    const portionInBase = ["kg", "L"].includes(portionUnit) ? portionSize * 1000 : portionSize;
    if (portionInBase > 0) {
      return totalInBase / portionInBase;
    }
    return 1;
  };
  
  const calculatedPortions = getPortionsCount();

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
          <button
            onClick={() => {
              if (categories.length === 0) {
                alert("Önce Menü Yönetiminden bir kategori oluşturmalısınız.");
                return;
              }
              setNewRecipeCategoryId(categories[0].id);
              setAddRecipeModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-xs transition-all shadow-md shadow-[#722F37]/15"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Reçete Ekle</span>
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
                            <div className="flex items-center space-x-2">
                              <p className="font-semibold text-white">{item.nameTr}</p>
                              {item.showOnMenu === false && (
                                <span className="text-[8px] bg-purple-950/40 text-purple-400 px-1.5 py-0.2 rounded border border-purple-900/30 font-bold uppercase tracking-wider">
                                  Menüde Gizli
                                </span>
                              )}
                            </div>
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
                            {item.recipe ? `REÇETELİ (${Number(item.recipe.yieldQuantity || 1)} Pors.)` : "REÇETESİZ"}
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

                {/* Add New Ingredient Form (Inline) */}
                {showNewIngForm ? (
                  <div className="bg-[#1C1C28]/90 border border-gray-800 p-3 rounded-lg mb-3 space-y-2.5 text-xs flex-shrink-0">
                    <p className="font-semibold text-[#C9A84C]">Yeni Malzeme Ekle</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Malzeme Adı</label>
                        <input
                          type="text"
                          value={newIngName}
                          onChange={(e) => setNewIngName(e.target.value)}
                          className="w-full bg-[#16213E] border border-gray-800 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#C9A84C]/50"
                          placeholder="örn. Tuz"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Birim</label>
                        <select
                          value={newIngUnit}
                          onChange={(e) => setNewIngUnit(e.target.value)}
                          className="w-full bg-[#16213E] border border-gray-800 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#C9A84C]/50"
                        >
                          <option value="g">Gram (g)</option>
                          <option value="kg">Kilo (kg)</option>
                          <option value="ml">Mililitre (ml)</option>
                          <option value="liter">Litre (L)</option>
                          <option value="unit">Adet (unit)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Birim Maliyet (₺)</label>
                        <input
                          type="number"
                          step="any"
                          value={newIngCost}
                          onChange={(e) => setNewIngCost(e.target.value)}
                          className="w-full bg-[#16213E] border border-gray-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#C9A84C]/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Yoğunluk (g/ml)</label>
                        <input
                          type="number"
                          step="any"
                          value={newIngDensity}
                          onChange={(e) => setNewIngDensity(e.target.value)}
                          className="w-full bg-[#16213E] border border-gray-800 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#C9A84C]/50"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => setShowNewIngForm(false)}
                        className="px-2.5 py-1 rounded bg-gray-800 text-white font-bold hover:bg-gray-700 text-[10px]"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleCreateIngredientInline}
                        className="px-2.5 py-1 rounded bg-[#722F37] text-white font-bold hover:bg-[#8B3E48] text-[10px]"
                      >
                        Ekle
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setNewIngName(ingSearchQuery);
                      setNewIngUnit("g");
                      setNewIngCost("0");
                      setNewIngDensity("1.0");
                      setShowNewIngForm(true);
                    }}
                    className="w-full mb-3 px-3 py-2 bg-[#722F37]/10 hover:bg-[#722F37]/20 border border-[#722F37]/30 text-[#C9A84C] text-[11px] font-bold rounded-lg flex items-center justify-center space-x-1 transition-all flex-shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Yeni Malzeme Tanımla</span>
                  </button>
                )}

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
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Reçete İçeriği</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAiSuggestRecipe}
                      disabled={aiSuggesting || aiScanning}
                      className="flex items-center space-x-1 text-[10px] text-purple-400 hover:text-purple-300 font-bold transition-all bg-[#1C1C28]/80 px-2.5 py-1.5 rounded-lg border border-gray-800 hover:border-purple-500/35 disabled:opacity-50"
                    >
                      {aiSuggesting ? (
                        <Loader2 className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                      ) : (
                        <ChefHat className="h-3.5 w-3.5 text-purple-400" />
                      )}
                      <span>{aiSuggesting ? "AI Öneriyor..." : "AI Reçete Öner"}</span>
                    </button>
                    <button
                      onClick={() => { setAiScanOpen(!aiScanOpen); setAiText(""); }}
                      className="flex items-center space-x-1 text-[10px] text-[#C9A84C] hover:text-[#C9A84C]/80 font-bold transition-all bg-[#1C1C28]/80 px-2.5 py-1.5 rounded-lg border border-gray-800 hover:border-[#C9A84C]/35"
                    >
                      <Sparkles className="h-3 w-3 text-[#C9A84C]" />
                      <span>AI Reçete Tara</span>
                    </button>
                  </div>
                </div>

                {/* AI Scan Form Panel */}
                {aiScanOpen && (
                  <div className="mb-4 bg-[#1C1C28]/80 border border-gray-800 rounded-xl p-3 space-y-3 flex-shrink-0">
                    <h5 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#C9A84C]" />
                      <span>Akıllı Yapay Zeka Reçete Okuyucu</span>
                    </h5>
                    
                    <textarea
                      placeholder="Örnek tarif metni girin: '2 dilim Baget Ekmek, 50g Hindi Füme, 20g Çedar Peyniri ve 15g Pesto Sos...'"
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      rows={3}
                      disabled={aiScanning}
                      className="w-full bg-[#16213E]/60 border border-gray-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/40 placeholder-gray-600 resize-none"
                    />

                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                      <label className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#16213E]/60 border border-gray-800 hover:border-gray-750 text-gray-400 hover:text-white font-semibold text-[10px] transition-all cursor-pointer">
                        {aiScanning ? (
                          <Loader2 className="h-3.5 w-3.5 text-[#C9A84C] animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        <span>{aiScanning ? "Okunuyor..." : "Reçete Görseli Yükle"}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleAiScanRecipe(e.target.files[0]);
                            }
                          }}
                          disabled={aiScanning}
                          className="hidden"
                        />
                      </label>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => setAiScanOpen(false)}
                          disabled={aiScanning}
                          className="px-3 py-1.5 rounded-lg bg-gray-850 hover:bg-gray-800 text-[10px] font-bold text-white transition-all border border-gray-800"
                        >
                          Kapat
                        </button>
                        <button
                          onClick={() => handleAiScanRecipe()}
                          disabled={aiScanning}
                          className="flex items-center justify-center space-x-1 px-4 py-1.5 rounded-lg bg-[#722F37] hover:bg-[#8B3E48] text-white font-bold text-[10px] transition-all shadow-md shadow-[#722F37]/15"
                        >
                          {aiScanning ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          <span>Metni Çözümle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Unmatched Scanned Items Panel */}
                {unmatchedScannedItems.length > 0 && (
                  <div className="mb-4 bg-yellow-950/20 border border-yellow-900/30 rounded-xl p-3.5 space-y-2 flex-shrink-0">
                    <h5 className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                      <span>Yapay Zekanın Bulduğu Ancak Stokta Olmayan Malzemeler</span>
                    </h5>
                    <p className="text-[10px] text-gray-400">
                      Bu malzemeler veritabanınızda bulunamadı. Reçeteye eklemek için inline olarak stoka ekleyin:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                      {unmatchedScannedItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 bg-[#1C1C28]/60 p-2.5 rounded-lg border border-gray-800/40">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                            <p className="text-[9px] text-gray-500 font-mono">Parsed: {item.amountUsed} {item.unit}</p>
                          </div>
                          <button
                            onClick={() => handleCreateUnmatchedIngredient(idx, item.name, item.unit, 1.0)}
                            className="flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg bg-[#C9A84C] hover:bg-[#C9A84C]/80 text-[#1C1C28] font-bold text-[10px] transition-all flex-shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Stoka Ekle</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ingredients Form List */}
                <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                  {recipeItems.length > 0 ? (
                    recipeItems.map((item, index) => {
                      const lineCost = item.cost * item.amountUsed;
                      return (
                        <div key={item.ingredientId} className="bg-[#1C1C28]/60 border border-gray-800/40 p-3 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-semibold text-white truncate text-xs">{item.name}</p>
                              {item.confidence !== undefined && item.confidence < 0.95 && (
                                <span 
                                  className={`inline-flex items-center text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                    item.confidence === 0 ? "bg-red-950/40 text-red-400 border border-red-900/30" : "bg-yellow-950/40 text-yellow-400 border border-yellow-900/30"
                                  }`}
                                  title={item.originalText ? `Orijinal: "${item.originalText}"` : undefined}
                                >
                                  {item.confidence === 0 ? "Yeni" : `%${Math.round(item.confidence * 100)} Güven`}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <div className="flex items-center space-x-1">
                                <span className="text-[9px] text-gray-500 font-mono">₺</span>
                                <input
                                  type="text"
                                  value={item.cost}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || val === "-" || /^-?\d*\.?\d*$/.test(val)) {
                                      const parsedCost = parseFloat(val) || 0;
                                      setRecipeItems(recipeItems.map((ri, rIdx) => rIdx === index ? { ...ri, cost: parsedCost } : ri));
                                    }
                                  }}
                                  className="w-10 bg-transparent border-b border-gray-800/80 focus:border-[#C9A84C]/50 text-[9px] text-gray-400 font-mono px-0.5 focus:outline-none text-center"
                                />
                                <span className="text-[9px] text-gray-500 font-mono">/ {item.unit}</span>
                              </div>
                              {item.inputUnit !== item.unit && (
                                <span className="text-[9px] bg-gray-800/40 border border-gray-700/20 px-1.5 py-0.2 rounded font-mono text-[#C9A84C] font-semibold">
                                  (= {item.amountUsed.toFixed(1)} {item.unit})
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <input
                              type="text"
                              value={item.inputAmount}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || val === "-" || /^-?\d*\.?\d*$/.test(val)) {
                                  handleUpdateAmount(index, val);
                                }
                              }}
                              className="w-16 bg-[#1C1C28] border border-gray-800 rounded px-2 py-1 text-center font-mono text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                            />
                            <select
                              value={item.inputUnit}
                              onChange={(e) => handleUpdateAmount(index, item.inputAmount, e.target.value)}
                              className="bg-[#1C1C28] border border-gray-800 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50 w-24"
                            >
                              {item.unit === "unit" ? (
                                <option value="unit">Adet</option>
                              ) : (
                                <>
                                  <option value="g">Gram (g)</option>
                                  <option value="kg">Kilo (kg)</option>
                                  <option value="ml">Mili. (ml)</option>
                                  <option value="liter">Litre (L)</option>
                                  <option value="cup">Su Bardak (cup)</option>
                                  <option value="tea_glass">Çay Bardak (tea glass)</option>
                                  <option value="tbsp">Y.Kaşık (tbsp)</option>
                                  <option value="tsp">T.Kaşık (tsp)</option>
                                  <option value="çay_kaşığı">Çay Kaşık (teaspoon)</option>
                                  <option value="diş">Diş (clove)</option>
                                </>
                              )}
                            </select>
                          </div>

                          <div className="flex items-center space-x-1 flex-shrink-0 w-24 justify-end">
                            <span className="text-gray-500 font-mono text-xs">₺</span>
                            <input
                              type="text"
                              value={item.lineCostOverride !== undefined ? item.lineCostOverride : lineCost.toFixed(2)}
                              onChange={(e) => handleUpdateLineCost(index, e.target.value)}
                              className="w-16 bg-[#1C1C28] border border-gray-800 rounded px-2 py-1 text-right font-mono text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                            />
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-2 pb-2 border-b border-gray-800/40">
                    <div>
                      <span className="text-gray-400 block font-semibold">Verim Tipi:</span>
                      <select
                        value={yieldMode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setYieldMode(val);
                          if (val === "porsiyon") {
                            setYieldUnit("porsiyon");
                            setPortionUnit("porsiyon");
                            setPortionSize(1);
                          } else if (val === "weight") {
                            setYieldUnit("g");
                            setPortionUnit("g");
                            setPortionSize(150);
                          } else {
                            setYieldUnit("ml");
                            setPortionUnit("ml");
                            setPortionSize(150);
                          }
                        }}
                        className="mt-1 w-full bg-[#1C1C28] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                      >
                        <option value="porsiyon">Porsiyon (Adet)</option>
                        <option value="weight">Ağırlık (Gram/Kilo)</option>
                        <option value="volume">Hacim (Mili./Litre)</option>
                      </select>
                    </div>
                    {yieldMode === "porsiyon" ? (
                      <div className="col-span-2">
                        <span className="text-gray-400 block font-semibold">Porsiyon Adedi:</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.1"
                          value={totalYield}
                          onChange={(e) => {
                            const val = Math.max(0.01, parseFloat(e.target.value) || 1);
                            setTotalYield(val);
                            setPortionSize(1);
                          }}
                          className="mt-1 w-full bg-[#1C1C28] border border-gray-800 rounded px-2.5 py-1 font-mono text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-gray-400 block font-semibold">Toplam Elde Edilen:</span>
                          <div className="flex space-x-1.5 mt-1">
                            <input
                              type="number"
                              min="0.01"
                              step="0.1"
                              value={totalYield}
                              onChange={(e) => setTotalYield(Math.max(0.01, parseFloat(e.target.value) || 1))}
                              className="w-full bg-[#1C1C28] border border-gray-800 rounded px-2 py-1 font-mono text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                            />
                            <select
                              value={yieldUnit}
                              onChange={(e) => setYieldUnit(e.target.value)}
                              className="bg-[#1C1C28] border border-gray-800 rounded px-1 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50 w-16"
                            >
                              {yieldMode === "weight" ? (
                                <>
                                  <option value="g">g</option>
                                  <option value="kg">kg</option>
                                </>
                              ) : (
                                <>
                                  <option value="ml">ml</option>
                                  <option value="L">L</option>
                                </>
                              )}
                            </select>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-semibold">Porsiyon Boyutu:</span>
                          <div className="flex space-x-1.5 mt-1">
                            <input
                              type="number"
                              min="0.01"
                              step="0.1"
                              value={portionSize}
                              onChange={(e) => setPortionSize(Math.max(0.01, parseFloat(e.target.value) || 1))}
                              className="w-full bg-[#1C1C28] border border-gray-800 rounded px-2 py-1 font-mono text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                            />
                            <select
                              value={portionUnit}
                              onChange={(e) => setPortionUnit(e.target.value)}
                              className="bg-[#1C1C28] border border-gray-800 rounded px-1 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50 w-16"
                            >
                              {yieldMode === "weight" ? (
                                <>
                                  <option value="g">g</option>
                                  <option value="kg">kg</option>
                                </>
                              ) : (
                                <>
                                  <option value="ml">ml</option>
                                  <option value="L">L</option>
                                </>
                              )}
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-gray-400 font-semibold">Reçete Toplam Maliyeti:</span>
                    <span className="font-mono font-bold text-gray-300">₺{calculateTotalCost().toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-gray-850 pt-2.5">
                    <div>
                      <span className="text-gray-400 font-bold block">Porsiyon Başına Maliyet:</span>
                      {yieldMode !== "porsiyon" && (
                        <span className="text-[10px] text-gray-500 font-mono">
                          (Hesaplanan: {calculatedPortions.toFixed(1)} Porsiyon)
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-white text-sm">₺{(calculateTotalCost() / calculatedPortions).toFixed(2)}</span>
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
                        ₺{calculateSuggestedPrice(calculateTotalCost() / calculatedPortions).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Mevcut Marjınız:</span>
                      <span className={`font-mono font-bold ${
                        ((parseFloat(selectedItem.price) - (calculateTotalCost() / calculatedPortions)) / parseFloat(selectedItem.price)) < targetMargin
                          ? "text-red-400"
                          : "text-emerald-400"
                      }`}>
                        {(((parseFloat(selectedItem.price) - (calculateTotalCost() / calculatedPortions)) / parseFloat(selectedItem.price)) * 100).toFixed(1)}%
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
      {/* Add Recipe Modal */}
      {addRecipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setAddRecipeModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#16213E] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh]">
            <h3 className="font-serif text-lg font-bold text-white flex-shrink-0">
              Yeni Reçete Kartı Oluştur
            </h3>
            
            <div className="space-y-3.5 overflow-y-auto flex-grow pr-1">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Reçete Adı (TR)</label>
                <input 
                  type="text" 
                  value={newRecipeNameTr}
                  onChange={(e) => setNewRecipeNameTr(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-850 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                  placeholder="örn. Pizza Hamuru veya Domates Sosu"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-400 block mb-1">Reçete Adı (EN - Opsiyonel)</label>
                <input 
                  type="text" 
                  value={newRecipeNameEn}
                  onChange={(e) => setNewRecipeNameEn(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-850 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                  placeholder="örn. Pizza Dough (Opsiyonel)"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Kategori</label>
                <select 
                  value={newRecipeCategoryId}
                  onChange={(e) => setNewRecipeCategoryId(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-850 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                >
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nameTr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Satış Fiyatı (Opsiyonel)</label>
                <input 
                  type="number" 
                  value={newRecipePrice}
                  onChange={(e) => setNewRecipePrice(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-850 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50 font-mono"
                  placeholder="Müşteriye satılmayacaksa 0 bırakın"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Bu reçete otomatik olarak **Menüde Gizli** işaretlenecektir (Müşteriler QR kodda göremez).
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-800/40 flex-shrink-0">
              <button 
                onClick={() => setAddRecipeModalOpen(false)}
                disabled={creatingRecipe}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white border border-gray-700/50"
              >
                İptal
              </button>
              <button 
                onClick={handleCreateInternalRecipe}
                disabled={creatingRecipe}
                className="flex items-center space-x-1 px-5 py-2.5 rounded-xl bg-[#722F37] hover:bg-[#8B3E48] text-white font-bold text-xs shadow-md shadow-[#722F37]/15"
              >
                {creatingRecipe ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Oluştur & Formüle Et</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
