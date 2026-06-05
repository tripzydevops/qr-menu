"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Globe, ShieldAlert, Coffee, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useLocale } from "../../i18n/useLocale";
import { Locale } from "../../i18n/config";
import MenuSkeleton from "./components/MenuSkeleton";
import CategoryNav from "./components/CategoryNav";
import DietaryFilter from "./components/DietaryFilter";
import MenuItemCard, { MenuItem } from "./components/MenuItemCard";
import ItemDetailSheet from "./components/ItemDetailSheet";

interface Category {
  id: string;
  nameTr: string;
  nameEn: string;
  iconName?: string | null;
  sortOrder: number;
  items: MenuItem[];
}

interface MenuData {
  tableName: string;
  areaName: string | null;
  venueId: string;
  venueName: string;
  coverImageUrl: string | null;
  phone: string | null;
  operatingHours: Record<string, any> | null;
  currency: string;
  defaultLocale: string;
  supportedLocales: string[];
  organizationName: string;
  logoUrl: string | null;
  brandColor: string | null;
  categories: Category[];
}

// Resilient fallback mock data mirroring backend seed data
const MOCK_DATA: Record<string, MenuData> = {
  k1: {
    tableName: "Masa 1",
    areaName: "Bahçe",
    venueId: "venue-karakoy-main",
    venueName: "Karaköy Merkez",
    coverImageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&auto=format&fit=crop&q=80",
    phone: "+90 212 292 44 55",
    operatingHours: null,
    currency: "TRY",
    defaultLocale: "tr",
    supportedLocales: ["tr", "en"],
    organizationName: "Karaköy Lokantası",
    logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80",
    brandColor: "#722F37",
    categories: [] // Seeding has them, we'll populate basic items
  }
};

function MenuContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "k1";

  const { locale, setLocale, t } = useLocale();
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isScrollingRef = useRef<boolean>(false);
  const activeCategoryIdRef = useRef<string>("");

  // Sync categories for Karaköy mock fallback if backend fails
  useEffect(() => {
    MOCK_DATA.k1.categories = [
      {
        id: "cat-starters",
        nameTr: "Başlangıçlar & Mezeler",
        nameEn: "Starters & Mezes",
        sortOrder: 1,
        items: [
          {
            id: "item-lentil",
            nameTr: "Süzme Mercimek Çorbası",
            nameEn: "Lentil Soup",
            descriptionTr: "Kıtır ekmek ve limon ile servis edilir.",
            descriptionEn: "Served with crunchy croutons and lemon.",
            price: "120.00",
            imageUrl: "https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=500&auto=format&fit=crop&q=80",
            allergens: ["gluten"],
            isAvailable: true,
            calories: 180,
            dietaryLabels: [{ key: "halal", icon: "☪" }, { key: "vegan", icon: "🌱" }]
          },
          {
            id: "item-hummus",
            nameTr: "Sıcak Tereyağlı Humus",
            nameEn: "Warm Hummus with Butter",
            descriptionTr: "Pastırma dilimleri ve tereyağı ile fırınlanmış humus.",
            descriptionEn: "Baked hummus topped with pastrami slices and melted butter.",
            price: "195.00",
            imageUrl: "https://images.unsplash.com/photo-1628294895520-73f08b1c51d9?w=500&auto=format&fit=crop&q=80",
            allergens: ["sesame", "dairy"],
            isAvailable: true,
            calories: 340,
            dietaryLabels: [{ key: "halal", icon: "☪" }, { key: "gluten-free", icon: "🌾" }]
          }
        ]
      },
      {
        id: "cat-mains",
        nameTr: "Ana Yemekler",
        nameEn: "Main Courses",
        sortOrder: 2,
        items: [
          {
            id: "item-kebab",
            nameTr: "Zırh Kebabı (Adana)",
            nameEn: "Hand-Minced Adana Kebab",
            descriptionTr: "Közlenmiş biber, domates, lavaş ve sumaklı soğan salatası eşliğinde.",
            descriptionEn: "Served with grilled pepper, tomato, lavash, and sumac onion salad.",
            price: "420.00",
            imageUrl: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&auto=format&fit=crop&q=80",
            allergens: ["gluten"],
            isAvailable: true,
            calories: 620,
            dietaryLabels: [{ key: "halal", icon: "☪" }]
          },
          {
            id: "item-manti",
            nameTr: "Kayseri Mantısı",
            nameEn: "Turkish Manti (Dumplings)",
            descriptionTr: "Sarımsaklı yoğurt, nane ve sumaklı tereyağ sosu ile.",
            descriptionEn: "Tiny beef-filled dumplings served with garlic yogurt, mint, and sumac butter.",
            price: "310.00",
            imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=80",
            allergens: ["gluten", "dairy"],
            isAvailable: true,
            calories: 480,
            dietaryLabels: [{ key: "halal", icon: "☪" }]
          }
        ]
      }
    ];
  }, []);

  useEffect(() => {
    async function fetchMenu() {
      try {
        setLoading(true);
        // API requests are now relative (empty string fallback) to run on same origin
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${apiUrl}/api/menu/${token}?locale=${locale}`);
        
        if (!res.ok) {
          throw new Error("Invalid response");
        }
        
        const data = await res.json();
        setMenu(data);
        if (data.categories.length > 0) {
          const firstId = data.categories[0].id;
          setActiveCategoryId(firstId);
          activeCategoryIdRef.current = firstId;
        }
        setIsOffline(false);
      } catch (err) {
        console.warn("Backend unavailable, loading local fallback client-cache", err);
        setIsOffline(true);
        const localData = MOCK_DATA[token] || MOCK_DATA.k1;
        setMenu(localData);
        if (localData.categories.length > 0) {
          const firstId = localData.categories[0].id;
          setActiveCategoryId(firstId);
          activeCategoryIdRef.current = firstId;
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, [token]);

  // Scroll spy effect to active category indicator
  useEffect(() => {
    if (loading || !menu) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const scrollPos = window.scrollY + 120; // offset sticky bars
      const cats = menu.categories;
      
      let foundId = "";
      for (let i = cats.length - 1; i >= 0; i--) {
        const el = categoryRefs.current[cats[i].id];
        if (el && el.offsetTop <= scrollPos) {
          foundId = cats[i].id;
          break;
        }
      }

      if (!foundId && cats.length > 0) {
        foundId = cats[0].id;
      }

      if (foundId && foundId !== activeCategoryIdRef.current) {
        activeCategoryIdRef.current = foundId;
        setActiveCategoryId(foundId);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, menu]);

  const scrollToCategory = (id: string) => {
    const el = categoryRefs.current[id];
    if (el) {
      isScrollingRef.current = true;
      setActiveCategoryId(id);
      activeCategoryIdRef.current = id;
      
      const targetOffset = el.offsetTop - 100;
      window.scrollTo({
        top: targetOffset,
        behavior: "smooth"
      });

      // Release scroll spy lock after scroll completes
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    }
  };

  if (loading) {
    return <MenuSkeleton />;
  }

  if (!menu) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-[#1C1C28] text-white p-6 min-h-screen">
        <ShieldAlert className="h-14 w-14 text-[#C9A84C] mb-4 animate-bounce" />
        <h2 className="text-2xl font-serif font-bold mb-2">Menü Yüklenemedi</h2>
        <p className="text-gray-400 text-sm text-center mb-6 max-w-sm">Taramış olduğunuz QR kod geçersiz veya sunucuya bağlanılamadı.</p>
        <Link href="/" className="bg-[#2A2A3D] border border-gray-800 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  // Filter items in memory by live dietary choice
  const getFilteredCategories = () => {
    if (activeFilter === "all") return menu.categories;

    return menu.categories.map((cat) => {
      const filteredItems = cat.items.filter((item) => 
        item.dietaryLabels?.some((lbl) => lbl.key.toLowerCase() === activeFilter.toLowerCase())
      );
      return { ...cat, items: filteredItems };
    }).filter((cat) => cat.items.length > 0);
  };

  const filteredCategories = getFilteredCategories();

  return (
    <div className="flex-grow flex flex-col bg-[#1C1C28] min-h-screen pb-24 relative select-none animate-fade-in">
      {/* Banner / Cover Image */}
      <div 
        className="w-full h-56 relative bg-gradient-to-b overflow-hidden"
        style={{ backgroundImage: `linear-gradient(to bottom, ${menu.brandColor || '#722F37'}, #1C1C28)` }}
      >
        {menu.coverImageUrl ? (
          <img 
            src={menu.coverImageUrl} 
            alt={menu.venueName} 
            className="w-full h-full object-cover opacity-60 scale-105 transition-transform duration-1000"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C28] via-transparent to-black/40" />
        
        {/* Call actions overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <Link href="/" className="p-2.5 rounded-full bg-[#1C1C28]/60 backdrop-blur-md text-white border border-gray-800/40 hover:bg-[#1C1C28] transition-all">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          
          {/* Active Locale dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-full bg-[#1C1C28]/60 backdrop-blur-md text-white border border-gray-800/40 hover:border-[#C9A84C]/40 transition-all font-semibold uppercase text-xs"
            >
              <Globe className="h-4 w-4 text-[#C9A84C]" />
              <span>{locale}</span>
            </button>
            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-28 bg-[#16213E] border border-gray-800 rounded-xl overflow-hidden shadow-2xl z-55">
                <button 
                  onClick={() => { setLocale('tr'); setShowLangMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#2A2A3D] text-white border-b border-gray-800/60"
                >
                  Türkçe
                </button>
                <button 
                  onClick={() => { setLocale('en'); setShowLangMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#2A2A3D] text-white"
                >
                  English
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating Brand Logo */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
          {menu.logoUrl ? (
            <div className="h-20 w-20 rounded-full border-4 border-[#1C1C28] overflow-hidden bg-white shadow-xl">
              <img src={menu.logoUrl} alt={menu.organizationName} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div 
              className="h-20 w-20 rounded-full border-4 border-[#1C1C28] bg-gradient-to-r flex items-center justify-center shadow-xl"
              style={{ backgroundImage: `linear-gradient(to right, ${menu.brandColor || '#722F37'}, #C9A84C)` }}
            >
              <Coffee className="h-9 w-9 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Brand Title */}
      <div className="mt-12 text-center px-4 mb-4">
        <h1 className="font-serif text-3xl font-bold text-white tracking-wide">
          {menu.venueName}
        </h1>
        <p className="text-xs text-[#C9A84C] font-mono tracking-widest uppercase mt-1 flex items-center justify-center space-x-1.5">
          <span>{menu.organizationName}</span>
          {menu.areaName ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
              <span className="text-white/80">{menu.areaName}</span>
            </>
          ) : null}
          <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
          <span className="bg-[#C9A84C]/10 px-2 py-0.5 rounded text-white border border-[#C9A84C]/20">{menu.tableName}</span>
        </p>
      </div>

      {/* Offline Mode Banner */}
      {isOffline && (
        <div className="mx-4 bg-amber-950/40 border border-amber-800/40 px-4 py-2.5 rounded-xl text-xs text-amber-300 flex items-center space-x-2 mb-4 animate-pulse">
          <span className="text-base">⚠️</span>
          <span>{t('menu.offlineMode')}</span>
        </div>
      )}

      {/* Category Nav */}
      {menu.categories.length > 0 && (
        <CategoryNav 
          categories={menu.categories} 
          activeCategoryId={activeCategoryId} 
          onCategoryClick={scrollToCategory} 
          locale={locale}
          brandColor={menu.brandColor}
        />
      )}

      {/* Dietary Filters */}
      <div className="px-4">
        <DietaryFilter 
          activeFilter={activeFilter} 
          onFilterChange={setActiveFilter} 
          t={t}
          brandColor={menu.brandColor}
        />
      </div>

      {/* Items list container */}
      <main className="px-4 max-w-2xl mx-auto w-full flex-grow space-y-10">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <div 
              key={category.id} 
              ref={(el) => { categoryRefs.current[category.id] = el; }}
              className="space-y-4 pt-2"
            >
              <h3 className="font-serif text-xl font-bold text-[#E8E8E8] tracking-wide border-b border-gray-800/50 pb-2">
                {locale === 'en' ? category.nameEn : category.nameTr}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.items.map((item) => (
                  <MenuItemCard 
                    key={item.id} 
                    item={item} 
                    onClick={setSelectedItem} 
                    locale={locale} 
                    currency={menu.currency}
                    brandColor={menu.brandColor}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-3xl mb-2">🍽️</span>
            <p className="text-gray-400 text-sm">{t('menu.noItems') || 'No items match the filter.'}</p>
          </div>
        )}
      </main>

      {/* Bottom Sheet Drawer for dish details */}
      <ItemDetailSheet 
        isOpen={selectedItem !== null} 
        item={selectedItem} 
        onClose={() => setSelectedItem(null)} 
        locale={locale} 
        currency={menu.currency} 
        t={t}
        brandColor={menu.brandColor}
        venueName={menu.venueName}
      />
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent />
    </Suspense>
  );
}

