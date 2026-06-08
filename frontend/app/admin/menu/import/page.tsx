"use client";

import { DEFAULT_VENUE_ID } from "@/lib/config";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Upload, 
  Link2, 
  FileText, 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  Loader2, 
  AlertCircle, 
  Utensils, 
  Info,
  DollarSign,
  Languages
} from "lucide-react";

interface ParsedMenuItem {
  nameTr: string;
  nameEn: string;
  price: number;
  descriptionTr?: string | null;
  descriptionEn?: string | null;
  allergens: string[];
  calories?: number | null;
}

interface ParsedCategory {
  nameTr: string;
  nameEn: string;
  items: ParsedMenuItem[];
}

export default function MenuImportPage() {
  const router = useRouter();
  const venueId = DEFAULT_VENUE_ID; // Seed default matching the system configuration
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  // UI State
  const [activeTab, setActiveTab] = useState<"ai" | "link" | "csv">("ai");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Scraper Input
  const [scraperUrl, setScraperUrl] = useState("");

  // Parsed Output for Preview & Edit
  const [parsedCategories, setParsedCategories] = useState<ParsedCategory[] | null>(null);
  const [isDemoData, setIsDemoData] = useState(false);

  // CSV template string
  const handleDownloadTemplate = () => {
    const csvContent = "Category;Name_TR;Name_EN;Price;Description_TR;Description_EN;Allergens;Calories\n" +
      "Başlangıçlar;Mantar Sote;Sauteed Mushrooms;140.00;Tereyağlı taze mantarlar;Fresh mushrooms sautéed in butter;dairy;180\n" +
      "Ana Yemekler;Köz Patlıcanlı Kebap;Roasted Eggplant Kebab;410.00;Közlenmiş patlıcan yatağında köfte;Meatballs served on roasted eggplant bed;gluten;540\n" +
      "Tatlılar;Sütlaç;Rice Pudding;110.00;Klasik fırın sütlaç;Traditional baked rice pudding;dairy;280";
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tripzy_menu_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Upload/AI Parsing handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, endpoint: "ai" | "csv") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);
    setParsedCategories(null);
    setIsDemoData(false);

    const formData = new FormData();
    formData.append("file", files[0]);

    try {
      const response = await fetch(`${apiUrl}/api/admin/menu/import/${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Dosya ayrıştırma başarısız oldu.");
      }

      const data = await response.json();
      setParsedCategories(data.categories);
      if (data.isDemo || !process.env.GEMINI_API_KEY) {
        setIsDemoData(data.isDemo || endpoint === "ai");
      }
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // URL Scraper handler
  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scraperUrl) return;

    setLoading(true);
    setError(null);
    setParsedCategories(null);
    setIsDemoData(false);

    try {
      const response = await fetch(`${apiUrl}/api/admin/menu/import/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scraperUrl }),
      });

      if (!response.ok) {
        throw new Error("URL kazıma işlemi başarısız oldu.");
      }

      const data = await response.json();
      setParsedCategories(data.categories);
    } catch (err: any) {
      setError(err.message || "Kazıma işlemi sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Edit Preview handlers
  const handleCategoryNameChange = (catIdx: number, lang: "Tr" | "En", value: string) => {
    if (!parsedCategories) return;
    const updated = [...parsedCategories];
    if (lang === "Tr") {
      updated[catIdx].nameTr = value;
    } else {
      updated[catIdx].nameEn = value;
    }
    setParsedCategories(updated);
  };

  const handleItemChange = (catIdx: number, itemIdx: number, field: keyof ParsedMenuItem, value: any) => {
    if (!parsedCategories) return;
    const updated = [...parsedCategories];
    
    if (field === "price") {
      updated[catIdx].items[itemIdx].price = parseFloat(value) || 0;
    } else if (field === "allergens") {
      updated[catIdx].items[itemIdx].allergens = value.split(",").map((a: string) => a.trim());
    } else if (field === "calories") {
      updated[catIdx].items[itemIdx].calories = parseInt(value) || null;
    } else {
      updated[catIdx].items[itemIdx][field] = value;
    }
    
    setParsedCategories(updated);
  };

  const handleDeleteItem = (catIdx: number, itemIdx: number) => {
    if (!parsedCategories) return;
    const updated = [...parsedCategories];
    updated[catIdx].items.splice(itemIdx, 1);
    
    // Clean empty categories
    if (updated[catIdx].items.length === 0) {
      updated.splice(catIdx, 1);
    }
    setParsedCategories(updated.length > 0 ? updated : null);
  };

  const handleDeleteCategory = (catIdx: number) => {
    if (!parsedCategories) return;
    const updated = [...parsedCategories];
    updated.splice(catIdx, 1);
    setParsedCategories(updated.length > 0 ? updated : null);
  };

  // Save parsed data to Supabase
  const handleConfirmImport = async () => {
    if (!parsedCategories) return;
    setImporting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/admin/menu/import/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          categories: parsedCategories
        })
      });

      if (!response.ok) {
        throw new Error("Veritabanına kaydetme başarısız oldu.");
      }

      setSuccess("Menü başarıyla içe aktarıldı! Menü sayfasına yönlendiriliyorsunuz...");
      setTimeout(() => {
        router.push("/admin/menu");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Kaydetme hatası.");
      setImporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link 
            href="/admin/menu" 
            className="p-2.5 rounded-xl bg-[#2A2A3D]/80 border border-gray-800 text-gray-400 hover:text-white transition-all hover:bg-gray-800"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-bold text-white tracking-wide font-sans">Menü İçe Aktar</h1>
            <p className="text-xs text-gray-400 mt-0.5 font-sans">Mevcut menünüzü farklı yöntemlerle dakikalar içinde sisteme aktarın.</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      {!parsedCategories && (
        <div className="bg-[#16213E]/60 border border-gray-800/40 p-1.5 rounded-2xl flex max-w-md">
          <button
            onClick={() => { setActiveTab("ai"); setError(null); }}
            className={`flex-grow py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
              activeTab === "ai"
                ? "bg-[#722F37] text-white shadow-lg shadow-[#722F37]/15"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Tarayıcı</span>
          </button>
          <button
            onClick={() => { setActiveTab("link"); setError(null); }}
            className={`flex-grow py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
              activeTab === "link"
                ? "bg-[#722F37] text-white shadow-lg shadow-[#722F37]/15"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Link2 className="h-4 w-4" />
            <span>Platform Linki</span>
          </button>
          <button
            onClick={() => { setActiveTab("csv"); setError(null); }}
            className={`flex-grow py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
              activeTab === "csv"
                ? "bg-[#722F37] text-white shadow-lg shadow-[#722F37]/15"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>CSV Excel</span>
          </button>
        </div>
      )}

      {/* Error & Success Toasts */}
      {error && (
        <div className="bg-red-950/40 border border-red-800/40 px-4 py-3.5 rounded-xl text-xs text-red-300 flex items-start space-x-2.5 max-w-lg font-sans">
          <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/40 border border-emerald-800/40 px-4 py-3.5 rounded-xl text-xs text-emerald-300 flex items-start space-x-2.5 max-w-lg font-sans">
          <Check className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Upload / Input panels */}
      {!parsedCategories && !loading && (
        <div className="bg-[#16213E]/30 border border-gray-800/40 p-8 rounded-3xl max-w-2xl">
          {/* AI Scanner Tab */}
          {activeTab === "ai" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#722F37]/10 border border-[#722F37]/35 flex items-center justify-center text-[#C9A84C]">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1.5 font-sans">
                <h3 className="text-base font-semibold text-white">Yapay Zeka ile Menü Tara</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Menü fotoğrafı veya PDF formatındaki menü listesini yükleyin. Sistem, kategorileri ve ürünleri otomatik olarak analiz edecektir.
                </p>
              </div>

              <div className="border border-dashed border-gray-800 hover:border-[#C9A84C]/50 rounded-2xl p-8 bg-[#2A2A3D]/10 cursor-pointer relative group transition-colors">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, "ai")}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="h-8 w-8 text-gray-500 group-hover:text-white mx-auto mb-3 transition-colors" />
                <span className="text-xs font-semibold text-gray-300 group-hover:text-white block transition-colors font-sans">Dosyayı Sürükleyin veya Tıklayın</span>
                <span className="text-[10px] text-gray-500 block mt-1 font-mono">PDF, JPG veya PNG (Maks 10MB)</span>
              </div>
            </div>
          )}

          {/* Link Scraper Tab */}
          {activeTab === "link" && (
            <form onSubmit={handleScrape} className="space-y-6">
              <div className="text-center space-y-1.5 font-sans">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-950/20 border border-sky-800/30 flex items-center justify-center text-[#C9A84C] mb-4">
                  <Link2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-white">Platformdan Menü Çek</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Yemeksepeti veya Trendyol Yemek restaurant sayfa linkini ekleyerek menünüzü hızlıca aktarın.
                </p>
              </div>

              <div className="space-y-3 max-w-md mx-auto font-sans">
                <input
                  type="url"
                  value={scraperUrl}
                  onChange={(e) => setScraperUrl(e.target.value)}
                  placeholder="https://www.yemeksepeti.com/restaurant/..."
                  required
                  className="w-full bg-[#2A2A3D]/40 border border-gray-800 focus:border-[#C9A84C]/50 rounded-xl px-4 py-3.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#C9A84C] hover:bg-[#B8973B] text-[#1C1C28] font-bold text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-[#C9A84C]/10"
                >
                  <span>Menüyü Çek</span>
                  <Link2 className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* CSV Excel Tab */}
          {activeTab === "csv" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#722F37]/10 border border-[#722F37]/35 flex items-center justify-center text-[#C9A84C]">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 font-sans">
                <h3 className="text-base font-semibold text-white">CSV Dosyası Yükle</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Sistem formatına uygun olarak hazırlanmış CSV şablonunu doldurarak yükleme yapın.
                </p>
              </div>

              <div className="max-w-md mx-auto p-4 bg-[#2A2A3D]/20 rounded-2xl border border-gray-800/60 flex items-center justify-between text-left font-sans">
                <div className="flex items-center space-x-2.5">
                  <Info className="h-4 w-4 text-[#C9A84C]" />
                  <span className="text-xs text-gray-300">Örnek CSV Şablonu</span>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-xs text-[#C9A84C] hover:underline font-semibold"
                >
                  Şablonu İndir
                </button>
              </div>

              <div className="border border-dashed border-gray-800 hover:border-[#C9A84C]/50 rounded-2xl p-8 bg-[#2A2A3D]/10 cursor-pointer relative group transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e, "csv")}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="h-8 w-8 text-gray-500 group-hover:text-white mx-auto mb-3 transition-colors" />
                <span className="text-xs font-semibold text-gray-300 group-hover:text-white block transition-colors font-sans">Şablon Dosyasını Yükleyin</span>
                <span className="text-[10px] text-gray-500 block mt-1 font-mono">Sadece .csv uzantılı dosyalar</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="bg-[#16213E]/30 border border-gray-800/40 p-12 rounded-3xl max-w-md text-center flex flex-col items-center space-y-4 mx-auto font-sans">
          <Loader2 className="h-10 w-10 text-[#C9A84C] animate-spin" />
          <div>
            <h3 className="text-sm font-semibold text-white">Ayrıştırma İşlemi Yapılıyor</h3>
            <p className="text-xs text-gray-400 mt-1">Lütfen belgenin analiz edilmesi bekleyin. Bu işlem biraz zaman alabilir...</p>
          </div>
        </div>
      )}

      {/* Interactive Preview Grid */}
      {parsedCategories && (
        <div className="space-y-6">
          <div className="bg-[#16213E]/30 border border-gray-800/40 p-5 rounded-2xl flex items-center justify-between font-sans">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Utensils className="h-4 w-4 text-[#C9A84C]" />
                <span>Menü Önizleme & Düzenleme</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Ayrıştırılan kategorileri ve ürünleri kontrol edin. Fiyatları, açıklamaları veya isimleri doğrudan bu grid üzerinden düzeltebilirsiniz.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setParsedCategories(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-800 text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
              >
                Yeniden Yükle
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="px-5 py-2.5 rounded-xl bg-[#C9A84C] hover:bg-[#B8973B] text-[#1C1C28] font-bold text-xs transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#1C1C28]" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Menüyü Kaydet ve Yayınla</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isDemoData && (
            <div className="bg-amber-950/40 border border-amber-800/40 p-4 rounded-xl text-xs text-amber-300 flex items-start space-x-2.5 font-sans">
              <Info className="h-4.5 w-4.5 text-amber-500 flex-shrink-0" />
              <div>
                <span className="font-semibold block">Demo Modu Aktif</span>
                <span className="block mt-0.5 text-[11px] opacity-80">
                  Backend üzerinde `GEMINI_API_KEY` bulunamadığı için AI taranan menülerin çalışmasını göstermek adına örnek veriler yüklenmiştir.
                </span>
              </div>
            </div>
          )}

          {/* Categories Grid */}
          <div className="space-y-8 font-sans">
            {parsedCategories.map((category, catIdx) => (
              <div key={catIdx} className="bg-[#16213E]/20 border border-gray-800/40 rounded-3xl p-6 space-y-4">
                {/* Category Header Inputs */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-800/40">
                  <div className="flex items-center space-x-3 w-[70%]">
                    <div className="flex items-center space-x-1.5 w-1/2">
                      <Languages className="h-3.5 w-3.5 text-gray-500" />
                      <input
                        type="text"
                        value={category.nameTr}
                        onChange={(e) => handleCategoryNameChange(catIdx, "Tr", e.target.value)}
                        placeholder="Kategori İsmi (TR)"
                        className="bg-[#2A2A3D]/40 border border-gray-800 focus:border-[#C9A84C]/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none w-full"
                      />
                    </div>
                    <div className="flex items-center space-x-1.5 w-1/2">
                      <Languages className="h-3.5 w-3.5 text-gray-500" />
                      <input
                        type="text"
                        value={category.nameEn}
                        onChange={(e) => handleCategoryNameChange(catIdx, "En", e.target.value)}
                        placeholder="Kategori İsmi (EN)"
                        className="bg-[#2A2A3D]/40 border border-gray-800 focus:border-[#C9A84C]/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none w-full"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(catIdx)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-xl border border-transparent hover:border-red-900/35 transition-all"
                    title="Delete Category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-800/20">
                        <th className="pb-3 w-[25%]">Ürün İsmi (TR/EN)</th>
                        <th className="pb-3 w-[12%]">Fiyat (₺)</th>
                        <th className="pb-3 w-[35%]">Açıklama (TR/EN)</th>
                        <th className="pb-3 w-[15%]">Alerjenler</th>
                        <th className="pb-3 w-[10%]">Kalori</th>
                        <th className="pb-3 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/10 text-xs">
                      {category.items.map((item, itemIdx) => (
                        <tr key={itemIdx} className="hover:bg-[#2A2A3D]/5 group">
                          {/* Name inputs */}
                          <td className="py-3 pr-4 space-y-1">
                            <input
                              type="text"
                              value={item.nameTr}
                              onChange={(e) => handleItemChange(catIdx, itemIdx, "nameTr", e.target.value)}
                              className="bg-[#2A2A3D]/25 border border-gray-800 focus:border-[#C9A84C]/50 rounded px-2.5 py-1 text-xs text-white focus:outline-none w-full font-semibold"
                            />
                            <input
                              type="text"
                              value={item.nameEn}
                              onChange={(e) => handleItemChange(catIdx, itemIdx, "nameEn", e.target.value)}
                              className="bg-[#2A2A3D]/25 border border-gray-800 focus:border-[#C9A84C]/50 rounded px-2.5 py-1 text-xs text-gray-300 focus:outline-none w-full"
                            />
                          </td>

                          {/* Price input */}
                          <td className="py-3 pr-4">
                            <div className="relative">
                              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                              <input
                                type="number"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => handleItemChange(catIdx, itemIdx, "price", e.target.value)}
                                className="bg-[#2A2A3D]/25 border border-gray-800 focus:border-[#C9A84C]/50 rounded pl-7 pr-2.5 py-1 text-xs text-white focus:outline-none w-full font-mono font-bold text-[#C9A84C]"
                              />
                            </div>
                          </td>

                          {/* Description inputs */}
                          <td className="py-3 pr-4 space-y-1">
                            <textarea
                              value={item.descriptionTr || ""}
                              onChange={(e) => handleItemChange(catIdx, itemIdx, "descriptionTr", e.target.value)}
                              placeholder="Açıklama (Türkçe)"
                              rows={1}
                              className="bg-[#2A2A3D]/25 border border-gray-800 focus:border-[#C9A84C]/50 rounded px-2.5 py-1 text-[11px] text-gray-300 focus:outline-none w-full resize-none"
                            />
                            <textarea
                              value={item.descriptionEn || ""}
                              onChange={(e) => handleItemChange(catIdx, itemIdx, "descriptionEn", e.target.value)}
                              placeholder="Açıklama (İngilizce)"
                              rows={1}
                              className="bg-[#2A2A3D]/25 border border-gray-800 focus:border-[#C9A84C]/50 rounded px-2.5 py-1 text-[11px] text-gray-400 focus:outline-none w-full resize-none"
                            />
                          </td>

                          {/* Allergens input */}
                          <td className="py-3 pr-4">
                            <input
                              type="text"
                              value={item.allergens.join(", ")}
                              onChange={(e) => handleItemChange(catIdx, itemIdx, "allergens", e.target.value)}
                              placeholder="gluten, dairy, nuts..."
                              className="bg-[#2A2A3D]/25 border border-gray-800 focus:border-[#C9A84C]/50 rounded px-2.5 py-1 text-[11px] text-gray-300 focus:outline-none w-full font-mono"
                            />
                          </td>

                          {/* Calories input */}
                          <td className="py-3 pr-4">
                            <input
                              type="number"
                              value={item.calories || ""}
                              onChange={(e) => handleItemChange(catIdx, itemIdx, "calories", e.target.value)}
                              placeholder="-- kcal"
                              className="bg-[#2A2A3D]/25 border border-gray-800 focus:border-[#C9A84C]/50 rounded px-2.5 py-1 text-xs text-white focus:outline-none w-full"
                            />
                          </td>

                          {/* Delete Item button */}
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteItem(catIdx, itemIdx)}
                              className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Item button */}
                <button
                  onClick={() => {
                    const updated = [...parsedCategories];
                    updated[catIdx].items.push({
                      nameTr: "Yeni Ürün",
                      nameEn: "New Item",
                      price: 0,
                      descriptionTr: "",
                      descriptionEn: "",
                      allergens: []
                    });
                    setParsedCategories(updated);
                  }}
                  className="inline-flex items-center space-x-1.5 text-xs text-[#C9A84C] hover:text-[#B8973B] font-semibold mt-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Ürün Ekle</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
