"use client";

import { useEffect, useState } from "react";
import { Coffee, Settings, Eye, ToggleLeft, ToggleRight, Plus, ExternalLink, QrCode } from "lucide-react";
import Link from "next/link";

interface MenuItem {
  id: string;
  nameTr: string;
  nameEn: string;
  price: string;
  isAvailable: boolean;
  allergens: string[];
}

interface Category {
  id: string;
  nameTr: string;
  nameEn: string;
  items: MenuItem[];
}

interface VenueData {
  venueName: string;
  organizationName: string;
  categories: Category[];
}

// Fallback mock dashboard data
const MOCK_DASHBOARD: VenueData = {
  venueName: "Karaköy Merkez",
  organizationName: "Karaköy Lokantası",
  categories: [
    {
      id: "cat-starters",
      nameTr: "Başlangıçlar & Mezeler",
      nameEn: "Starters & Mezes",
      items: [
        { id: "item-lentil", nameTr: "Süzme Mercimek Çorbası", nameEn: "Lentil Soup", price: "120.00", isAvailable: true, allergens: ["gluten"] },
        { id: "item-hummus", nameTr: "Sıcak Tereyağlı Humus", nameEn: "Warm Hummus with Butter", price: "195.00", isAvailable: true, allergens: ["sesame", "dairy"] }
      ]
    },
    {
      id: "cat-mains",
      nameTr: "Ana Yemekler",
      nameEn: "Main Courses",
      items: [
        { id: "item-kebab", nameTr: "Zırh Kebabı (Adana Kebabı)", nameEn: "Hand-Minced Adana Kebab", price: "420.00", isAvailable: true, allergens: ["gluten"] },
        { id: "item-manti", nameTr: "Kayseri Mantısı", nameEn: "Traditional Kayseri Manti", price: "310.00", isAvailable: true, allergens: ["gluten", "dairy"] }
      ]
    },
    {
      id: "cat-desserts",
      nameTr: "Tatlılar",
      nameEn: "Desserts",
      items: [
        { id: "item-baklava", nameTr: "Fıstıklı Havuç Dilim Baklava", nameEn: "Pistachio Carrot-Slice Baklava", price: "240.00", isAvailable: true, allergens: ["gluten", "nuts", "dairy"] }
      ]
    }
  ]
};

export default function AdminPage() {
  const [data, setData] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"menu" | "tables">("menu");

  useEffect(() => {
    async function fetchAdminData() {
      try {
        setLoading(true);
        // Attempt to fetch from k4 (Karaköy Merkez) as the default admin venue query
        const res = await fetch("http://localhost:8000/api/menu/k4");
        if (!res.ok) throw new Error("Offline. Falling back.");
        const json = await res.json();
        setData({
          venueName: json.venueName,
          organizationName: json.organizationName,
          categories: json.categories
        });
      } catch (err) {
        console.warn(err);
        setData(MOCK_DASHBOARD);
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, []);

  const toggleItemAvailability = (catId: string, itemId: string) => {
    if (!data) return;
    const updatedCategories = data.categories.map((cat) => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        items: cat.items.map((item) => {
          if (item.id !== itemId) return item;
          return { ...item, isAvailable: !item.isAvailable };
        })
      };
    });
    setData({ ...data, categories: updatedCategories });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 flex flex-col bg-background min-h-screen">
      {/* Navbar */}
      <header className="border-b border-muted bg-card/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm md:text-base">{data.organizationName}</h1>
            <p className="text-xs text-muted-foreground">{data.venueName} — Yönetici Paneli</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/menu?token=k4" target="_blank" className="text-xs bg-muted border border-muted hover:border-primary/30 px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all text-foreground font-semibold">
            <Eye className="h-3.5 w-3.5" /> Canlı Menü <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-48 flex flex-row md:flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab("menu")}
            className={`flex-1 md:flex-initial text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "menu" ? "bg-primary text-white" : "bg-card border border-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Menü Yönetimi
          </button>
          <button
            onClick={() => setActiveTab("tables")}
            className={`flex-1 md:flex-initial text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "tables" ? "bg-primary text-white" : "bg-card border border-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            QR Kod & Masalar
          </button>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 space-y-6">
          {activeTab === "menu" ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-foreground">Menü Listesi</h2>
                <button className="bg-primary hover:bg-primary/95 text-white text-xs px-3.5 py-2 rounded-lg flex items-center gap-1 font-semibold transition-all">
                  <Plus className="h-4 w-4" /> Kategori Ekle
                </button>
              </div>

              {/* Categories list */}
              <div className="space-y-6">
                {data.categories.map((cat) => (
                  <div key={cat.id} className="bg-card border border-muted rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-muted/50 pb-2.5">
                      <div>
                        <h3 className="font-extrabold text-foreground">{cat.nameTr}</h3>
                        <p className="text-xs text-muted-foreground">{cat.nameEn}</p>
                      </div>
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded font-mono uppercase">
                        {cat.items.length} Ürün
                      </span>
                    </div>

                    {/* Category Items list */}
                    <div className="divide-y divide-muted/50">
                      {cat.items.map((item) => (
                        <div key={item.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-foreground">{item.nameTr}</p>
                              {!item.isAvailable && (
                                <span className="text-[9px] bg-accent/15 text-accent border border-accent/25 px-1.5 py-0.5 rounded-full font-bold">
                                  Tükendi
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{item.nameEn}</p>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="text-sm font-extrabold text-primary">
                              ₺{parseFloat(item.price).toFixed(2)}
                            </span>
                            <button
                              onClick={() => toggleItemAvailability(cat.id, item.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title="Kullanılabilirliği Değiştir"
                            >
                              {item.isAvailable ? (
                                <ToggleRight className="h-7 w-7 text-primary" />
                              ) : (
                                <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">Masalar ve QR Kodları</h2>
              <p className="text-sm text-muted-foreground">
                Aşağıdaki masalar için oluşturulmuş QR kod URL linklerini kopyalayabilir veya doğrudan görüntüleyebilirsiniz.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Masa 1", token: "k1" },
                  { name: "Masa 2", token: "k2" },
                  { name: "Masa 3", token: "k3" },
                  { name: "Masa 4", token: "k4" },
                  { name: "Room 101 (Oda Servisi)", token: "r101" }
                ].map((tbl) => (
                  <div key={tbl.token} className="bg-card border border-muted p-5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <QrCode className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{tbl.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono">Token: {tbl.token}</p>
                      </div>
                    </div>

                    <Link
                      href={`/menu?token=${tbl.token}`}
                      target="_blank"
                      className="text-xs bg-muted border border-muted hover:border-primary/40 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all text-foreground font-semibold"
                    >
                      Aç <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
