"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Globe, ShieldAlert, Coffee, ArrowLeft, ShoppingBag, Bell, Receipt, CheckCircle, Home, Search, User, Wine, Sun, Moon, X } from "lucide-react";
import Link from "next/link";

import { useLocale } from "../../i18n/useLocale";
import { Locale } from "../../i18n/config";
import MenuSkeleton from "./components/MenuSkeleton";
import CategoryNav from "./components/CategoryNav";
import DietaryFilter from "./components/DietaryFilter";
import MenuItemCard, { MenuItem } from "./components/MenuItemCard";
import MenuItemCardPremium from "./components/MenuItemCardPremium";
import ItemDetailSheet from "./components/ItemDetailSheet";
import CartDrawer from "./components/CartDrawer";
import { useSignalCollector } from "./hooks/useSignalCollector";
import { usePreferenceResolver } from "./hooks/usePreferenceResolver";

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
  plan?: string | null;
  premiumMenuEnabled?: boolean;
  premiumMenuSelected?: boolean;
  reviewsEnabled?: boolean;
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
    plan: "premium",
    premiumMenuEnabled: true,
    premiumMenuSelected: true,
    reviewsEnabled: true,
    categories: [] // Seeding has them, we'll populate basic items
  }
};

function MenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "k1";
  const isPreview = searchParams.get("preview") === "true" || 
                    (typeof document !== "undefined" && document.referrer.includes("/admin"));

  const { locale, setLocale, t } = useLocale();
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  
  const [cart, setCart] = useState<Record<string, { item: MenuItem; quantity: number; notes: string }>>({});
  const [showCart, setShowCart] = useState<boolean>(false);
  const [hideCartBar, setHideCartBar] = useState<boolean>(false);
  const [serviceStatus, setServiceStatus] = useState<string | null>(null); // "calling", "success_waiter", "success_bill", "error"
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [semanticResults, setSemanticResults] = useState<MenuItem[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSemanticResults([]);
      setSearching(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const response = await fetch(`${apiUrl}/api/menu/${token}/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSemanticResults(data);
        }
      } catch (err) {
        console.error("Semantic search failed", err);
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, token]);

  // Custom User Signal Collection & Cold Start Personalization Hooks
  const signalCollector = useSignalCollector(menu?.venueId, token);
  const preferenceResolver = usePreferenceResolver();

  // Track detail sheet views & implicit reading duration
  const openTimeRef = useRef<number>(0);
  const prevSelectedItemRef = useRef<MenuItem | null>(null);

  useEffect(() => {
    if (selectedItem) {
      openTimeRef.current = Date.now();
      prevSelectedItemRef.current = selectedItem;
      signalCollector.trackExpandItem(selectedItem.id);
      preferenceResolver.registerItemInteraction(selectedItem, "expand");
    } else {
      if (openTimeRef.current > 0 && prevSelectedItemRef.current) {
        const duration = Date.now() - openTimeRef.current;
        if (duration >= 500) {
          signalCollector.trackViewItem(prevSelectedItemRef.current.id, duration);
          preferenceResolver.registerItemInteraction(prevSelectedItemRef.current, "view");
        }
        openTimeRef.current = 0;
        prevSelectedItemRef.current = null;
      }
    }
  }, [selectedItem]);

  // Track filter clicks
  useEffect(() => {
    if (activeFilter && activeFilter !== "all") {
      signalCollector.trackClickFilter(activeFilter);
      preferenceResolver.registerDietaryFilterClick(activeFilter);
    }
  }, [activeFilter]);

  // Track scrolls through categories
  useEffect(() => {
    if (activeCategoryId) {
      signalCollector.trackScrollCategory(activeCategoryId);
    }
  }, [activeCategoryId]);

  // Track language settings
  useEffect(() => {
    if (locale) {
      signalCollector.trackLanguageToggle(locale);
    }
  }, [locale]);

  useEffect(() => {
    if (serviceStatus && serviceStatus !== "calling") {
      const timer = setTimeout(() => setServiceStatus(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [serviceStatus]);

  const handleCallService = async (type: "waiter" | "bill") => {
    setServiceStatus("calling");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/menu/${token}/call-waiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      if (!response.ok) throw new Error();
      setServiceStatus(type === "waiter" ? "success_waiter" : "success_bill");
    } catch (err) {
      setServiceStatus("error");
    }
  };

  const handleAddToOrder = (item: MenuItem, quantity: number, notes: string) => {
    setHideCartBar(false);
    signalCollector.trackAddToCart(item.id);
    preferenceResolver.registerItemInteraction(item, "add_to_cart");
    setCart((prev) => {
      const existing = prev[item.id];
      if (existing) {
        return {
          ...prev,
          [item.id]: {
            item,
            quantity: existing.quantity + quantity,
            notes: notes ? (existing.notes ? `${existing.notes}; ${notes}` : notes) : existing.notes
          }
        };
      }
      return {
        ...prev,
        [item.id]: { item, quantity, notes }
      };
    });
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCart((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity: newQty }
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const handleClearCart = () => setCart({});


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
            id: "item-wagyu",
            nameTr: "Wagyu Dana Filet Mignon",
            nameEn: "Wagyu Beef Filet Mignon",
            descriptionTr: "Tava mühürlenmiş A5 Wagyu, trüflü patates püresi, kuşkonmaz, bordelaise sos.",
            descriptionEn: "Pan-seared A5 Wagyu, Truffle Potato Purée, Asparagus, Bordelaise Sauce.",
            price: "2250.00",
            imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
            allergens: ["dairy"],
            isAvailable: true,
            calories: 720,
            dietaryLabels: [{ key: "gluten-free", icon: "🌾" }]
          },
          {
            id: "item-lobster",
            nameTr: "Istakozlu Risotto",
            nameEn: "Lobster Risotto",
            descriptionTr: "Safranlı İtalyan pirinci, tereyağlı istakoz kuyruğu, parmesan peyniri.",
            descriptionEn: "Saffron risotto, butter-poached lobster tail, aged parmesan.",
            price: "1500.00",
            imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80",
            allergens: ["dairy"],
            isAvailable: true,
            calories: 580,
            dietaryLabels: []
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
        const res = await fetch(`${apiUrl}/api/menu/${token}?locale=${locale}`, {
          cache: "no-store",
        });
        
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
  }, [token, locale]);

  // Preload all menu item images to prevent rendering lag on scroll
  useEffect(() => {
    if (!menu || typeof window === "undefined") return;
    menu.categories.forEach((category) => {
      category.items.forEach((item) => {
        if (item.imageUrl) {
          const img = new window.Image();
          img.src = item.imageUrl;
        }
      });
    });
  }, [menu]);

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
      <div className="flex-grow flex flex-col items-center justify-center bg-[#0A0B0E] text-white p-6 min-h-screen">
        <ShieldAlert className="h-14 w-14 text-[#DFBA73] mb-4 animate-bounce" />
        <h2 className="text-2xl font-serif font-bold mb-2">Menü Yüklenemedi</h2>
        <p className="text-gray-400 text-sm text-center mb-6 max-w-sm">Taramış olduğunuz QR kod geçersiz veya sunucuya bağlanılamadı.</p>
        <Link href="/" className="bg-white/[0.02] border border-white/[0.08] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/[0.05] transition-all">
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  // Filter items in memory by live dietary choice
  const getFilteredCategories = () => {
    return menu.categories.map((cat) => {
      const filteredItems = cat.items.filter((item) => {
        // Match active filter
        const matchesFilter = activeFilter === "all" || 
          item.dietaryLabels?.some((lbl) => lbl.key.toLowerCase() === activeFilter.toLowerCase()) ||
          (activeFilter === "gluten-free" && item.id.includes("gluten")) ||
          (activeFilter === "vegan" && item.id.includes("vegan")) ||
          (activeFilter === "vegetarian" && item.id.includes("vege"));

        // Match search query (case-insensitive name and description)
        const nameMatches = (locale === 'en' ? item.nameEn : item.nameTr)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const descMatches = ((locale === 'en' ? item.descriptionEn : item.descriptionTr) || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
          
        return matchesFilter && (nameMatches || descMatches);
      });
      return { ...cat, items: filteredItems };
    }).filter((cat) => cat.items.length > 0);
  };

  const filteredCategories = getFilteredCategories();

  // ── Compute premium state once at page level ──
  const templateParam = searchParams.get("template");
  const isPremiumPlan = menu.premiumMenuEnabled || menu.plan === 'premium' || menu.plan === 'enterprise';
  const showPremium = templateParam === "premium"
    ? true
    : templateParam === "standard"
      ? false
      : (isPremiumPlan && !!menu.premiumMenuSelected);

  const pageClass = [
    'flex-grow flex flex-col min-h-screen pb-28 relative select-none animate-fade-in transition-colors duration-300',
    theme === 'dark' ? 'bg-[#12141C] text-[#E2E8F0]' : 'bg-[#FDFBF7] text-[#1E1214]',
    showPremium && theme === 'dark' ? 'premium-page-glow' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={pageClass}>
      {/* Premium Header Aligned to Mockup */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => {
              if (isPreview) {
                router.push("/admin");
              } else if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            className={`p-2 rounded-full border transition-all ${
              theme === "dark" 
                ? "bg-white/[0.03] hover:bg-white/[0.08] text-white border-white/[0.08]" 
                : "bg-black/[0.03] hover:bg-black/[0.08] text-[#1E1214] border-black/[0.08]"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className={`font-serif text-xl font-bold tracking-widest uppercase text-glow transition-colors ${
            theme === "dark" ? "text-[#DFBA73]" : "text-[#5C1D24]"
          }`}>
            {menu.venueName === "Karaköy Merkez" ? "SAVOR" : menu.venueName.toUpperCase()}
          </h1>
        </div>
        
        {/* Right side: Language selection, Theme Toggle & Profile */}
        <div className="flex items-center space-x-2.5">
          {/* Theme Toggle Button */}
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`p-2 rounded-full border transition-all ${
              theme === "dark" 
                ? "bg-white/[0.03] text-amber-400 border-white/[0.08] hover:bg-white/[0.08]" 
                : "bg-black/[0.03] text-[#5C1D24] border-black/[0.08] hover:bg-black/[0.08]"
            }`}
            title={theme === "dark" ? "Light Mode" : "Dark Mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Active Locale dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border transition-all font-semibold uppercase text-xs ${
                theme === "dark" 
                  ? "bg-white/[0.03] text-white border-white/[0.08] hover:border-[#DFBA73]/40" 
                  : "bg-black/[0.03] text-[#1E1214] border-black/[0.08] hover:border-[#5C1D24]/40"
              }`}
            >
              <Globe className={`h-3.5 w-3.5 ${theme === "dark" ? "text-[#DFBA73]" : "text-[#5C1D24]"}`} />
              <span>{locale}</span>
            </button>
            {showLangMenu && (
              <div className={`absolute right-0 mt-2 w-28 border rounded-xl overflow-hidden shadow-2xl z-55 ${
                theme === "dark" ? "bg-[#0A0B0E] border-white/[0.08]" : "bg-white border-black/[0.08]"
              }`}>
                <button 
                  onClick={() => { setLocale('tr'); setShowLangMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold border-b ${
                    theme === "dark" 
                      ? "hover:bg-white/[0.02] text-white border-white/[0.04]" 
                      : "hover:bg-black/[0.02] text-[#1E1214] border-black/[0.04]"
                  }`}
                >
                  Türkçe
                </button>
                <button 
                  onClick={() => { setLocale('en'); setShowLangMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold ${
                    theme === "dark" ? "hover:bg-white/[0.02] text-white" : "hover:bg-black/[0.02] text-[#1E1214]"
                  }`}
                >
                  English
                </button>
              </div>
            )}
          </div>

          <div 
            onClick={() => router.push("/admin")}
            className={`h-9 w-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              theme === "dark" 
                ? "bg-[#DFBA73]/15 border-[#DFBA73]/30 text-[#DFBA73] hover:bg-[#DFBA73]/30" 
                : "bg-[#5C1D24]/10 border-[#5C1D24]/20 text-[#5C1D24] hover:bg-[#5C1D24]/20"
            }`}
          >
            <User className="h-4 w-4" />
          </div>
        </div>
      </header>

      {/* Dynamic Search Bar */}
      <div className="px-6 mb-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-500">
            <Search className="h-4 w-4 text-gray-500" />
          </span>
          <input
            type="text"
            placeholder={locale === "en" ? "Search dishes..." : "Yemeklerde ara..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none text-xs font-medium transition-all duration-300 ${
              theme === "dark" 
                ? "bg-white/[0.03] border-white/[0.08] focus:border-[#DFBA73]/40 text-white placeholder-gray-500" 
                : "bg-black/[0.02] border-black/[0.08] focus:border-[#5C1D24]/40 text-[#1E1214] placeholder-gray-400"
            }`}
          />
        </div>
      </div>

      {/* Offline Mode Banner */}
      {isOffline && (
        <div className="mx-6 bg-amber-950/40 border border-amber-800/40 px-4 py-2.5 rounded-xl text-xs text-amber-300 flex items-center space-x-2 mb-4 animate-pulse">
          <span className="text-base">⚠️</span>
          <span>{t('menu.offlineMode')}</span>
        </div>
      )}

      {/* Premium Experience Badge */}
      {showPremium && (
        <div className="px-6 mb-3">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] ${
            theme === 'dark'
              ? 'bg-[#C9A84C]/10 text-[#DFBA73] border border-[#C9A84C]/20'
              : 'bg-[#5C1D24]/10 text-[#5C1D24] border border-[#5C1D24]/15'
          }`}>
            <span className="animate-gold-pulse">✦</span>
            <span>{locale === 'tr' ? 'Premium Deneyim' : 'Premium Experience'}</span>
          </div>
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
          theme={theme}
        />
      )}

      {/* Dietary Filters */}
      <div className="px-4">
        <DietaryFilter 
          activeFilter={activeFilter} 
          onFilterChange={setActiveFilter} 
          t={t}
          brandColor={menu.brandColor}
          theme={theme}
        />
      </div>

      <main className={`px-4 max-w-2xl mx-auto w-full flex-grow ${showPremium ? 'space-y-14' : 'space-y-10'}`}>
        {searchQuery ? (
          <div className="space-y-6">
            {/* Search Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }}>
              <div className="flex items-center space-x-2">
                <span className="text-base animate-pulse">✨</span>
                <h3 className={`font-serif text-sm font-bold tracking-wide ${theme === "dark" ? "text-white" : "text-[#1E1214]"}`}>
                  {locale === 'en' ? 'AI Semantic Search Results' : 'AI Semantik Arama Sonuçları'}
                </h3>
              </div>
              {searching && (
                <span className={`text-[10px] font-mono tracking-widest uppercase animate-pulse ${theme === "dark" ? "text-amber-400" : "text-[#5C1D24]"}`}>
                  {locale === 'en' ? 'AI Thinking...' : 'AI Düşünüyor...'}
                </span>
              )}
            </div>

            {searching ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="h-44 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse" />
                <div className="h-44 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse" />
              </div>
            ) : semanticResults.length > 0 ? (
              <div className={showPremium ? "grid grid-cols-1 gap-8 max-w-lg mx-auto" : "grid grid-cols-2 gap-4"}>
                {semanticResults.map((item) => {
                  const CardComponent = showPremium ? MenuItemCardPremium : MenuItemCard;
                  const isRec = preferenceResolver.isHighlyRecommended(item);
                  return (
                    <CardComponent 
                      key={item.id} 
                      item={item} 
                      onClick={setSelectedItem} 
                      onAddDirect={(item) => handleAddToOrder(item, 1, "")}
                      locale={locale} 
                      currency={menu.currency}
                      brandColor={menu.brandColor}
                      theme={theme}
                      isRecommended={isRec}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                <p className={`text-[10px] font-light italic ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {locale === 'en' ? 'No direct AI matches found. Showing keyword matches:' : 'Doğrudan AI eşleşmesi bulunamadı. Kelime eşleşmeleri gösteriliyor:'}
                </p>
                {/* Fallback to standard filtering */}
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <div key={category.id} className="space-y-4 pt-2">
                      <h4 className={`font-serif text-xs font-bold opacity-80 ${theme === "dark" ? "text-gray-300" : "text-gray-800"}`}>
                        {locale === 'en' ? category.nameEn : category.nameTr}
                      </h4>
                      <div className={showPremium ? "grid grid-cols-1 gap-8 max-w-lg mx-auto" : "grid grid-cols-2 gap-4"}>
                        {category.items.map((item) => {
                          const CardComponent = showPremium ? MenuItemCardPremium : MenuItemCard;
                          const isRec = preferenceResolver.isHighlyRecommended(item);
                          return (
                            <CardComponent 
                              key={item.id} 
                              item={item} 
                              onClick={setSelectedItem} 
                              onAddDirect={(item) => handleAddToOrder(item, 1, "")}
                              locale={locale} 
                              currency={menu.currency}
                              brandColor={menu.brandColor}
                              theme={theme}
                              isRecommended={isRec}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="text-3xl mb-2">🔍</span>
                    <p className="text-gray-400 text-sm">{t('menu.noItems') || 'No items match your search.'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <div 
                key={category.id} 
                ref={(el) => { categoryRefs.current[category.id] = el; }}
                className={showPremium ? 'space-y-6 pt-3' : 'space-y-4 pt-2'}
              >
                {/* Category Header — Premium gets gold ornamental dividers */}
                {showPremium ? (
                  <div className="flex items-center gap-4 py-3">
                    <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${theme === 'dark' ? 'rgba(201,168,76,0.3)' : 'rgba(92,29,36,0.2)'})` }} />
                    <h3 
                      className="font-serif text-base md:text-lg font-bold tracking-[0.15em] uppercase text-center whitespace-nowrap"
                      style={{ 
                        color: theme === 'dark' ? '#DFBA73' : '#5C1D24',
                        fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                        textShadow: theme === 'dark' ? '0 0 20px rgba(201,168,76,0.15)' : 'none',
                      }}
                    >
                      {locale === 'en' ? category.nameEn : category.nameTr}
                    </h3>
                    <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${theme === 'dark' ? 'rgba(201,168,76,0.3)' : 'rgba(92,29,36,0.2)'})` }} />
                  </div>
                ) : (
                  <h3 className={`font-serif text-xl font-bold tracking-wide border-b pb-2 transition-colors ${
                    theme === "dark" ? "text-[#E8E8E8] border-gray-800/50" : "text-[#1E1214] border-black/[0.08]"
                  }`}>
                    {locale === 'en' ? category.nameEn : category.nameTr}
                  </h3>
                )}

                {/* Card Grid — Premium: single column, max-w-lg, gap-8 | Standard: 2-col, gap-4 */}
                <div className={showPremium ? "grid grid-cols-1 gap-8 max-w-lg mx-auto" : "grid grid-cols-2 gap-4"}>
                  {category.items.map((item) => {
                    const CardComponent = showPremium ? MenuItemCardPremium : MenuItemCard;
                    const isRec = preferenceResolver.isHighlyRecommended(item);
                    return (
                      <CardComponent 
                        key={item.id} 
                        item={item} 
                        onClick={setSelectedItem} 
                        onAddDirect={(item) => handleAddToOrder(item, 1, "")}
                        locale={locale} 
                        currency={menu.currency}
                        brandColor={menu.brandColor}
                        theme={theme}
                        isRecommended={isRec}
                      />
                    );
                  })}

                  {/* If Main Courses category and no search query, inject the Wine Pairing recommendation */}
                  {category.id === "cat-mains" && !searchQuery && (
                    <div className={`border p-4 rounded-2xl relative overflow-hidden flex gap-4 mt-2 transition-all ${
                      showPremium ? "col-span-1" : "col-span-2"
                    } ${
                      showPremium 
                        ? theme === "dark"
                          ? "premium-glass-card border-[#C9A84C]/20"
                          : "bg-[#FFFDF8] border-[#C9A84C]/15 shadow-lg shadow-[#C9A84C]/5"
                        : theme === "dark" 
                          ? "bg-white/[0.02] border-[#DFBA73]/30" 
                          : "bg-[#F9F6F0] border-[#5C1D24]/20 shadow-md shadow-[#5C1D24]/5"
                    }`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#DFBA73]/5 rounded-full blur-xl pointer-events-none" />
                      
                      {/* Left: Wine Glass Icon & Title */}
                      <div className="flex-grow relative z-10">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <Wine className={`h-4 w-4 animate-pulse ${theme === "dark" ? "text-[#DFBA73]" : "text-[#5C1D24]"}`} />
                          <span className={`text-[9px] font-mono tracking-widest font-bold uppercase ${
                            theme === "dark" ? "text-[#DFBA73]" : "text-[#5C1D24]"
                          }`}>AI SOMMELIER RECOMMENDS</span>
                        </div>
                        <span className={`text-[10px] font-mono block mb-1 ${theme === "dark" ? "text-gray-500" : "text-gray-600"}`}>For Wagyu Filet:</span>
                        <h4 className={`font-serif text-[13px] font-bold mb-0.5 ${theme === "dark" ? "text-white" : "text-[#1E1214]"}`}>Domaine Serene Pinot Noir</h4>
                        <span className={`text-[11px] font-semibold font-mono block mb-1.5 ${theme === "dark" ? "text-[#DFBA73]" : "text-[#5C1D24]"}`}>₺3.900 / $120 Şişe</span>
                        <p className={`text-[10px] leading-relaxed font-light ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                          2018 Pinot Noir - Elegant, complex, hints of cherry & oak. Pairs perfectly.
                        </p>
                      </div>

                      {/* Right: Wine Bottle Image */}
                      <div className={`w-20 h-20 rounded-xl overflow-hidden p-1.5 flex items-center justify-center shrink-0 border transition-all ${
                        theme === "dark" 
                          ? "bg-gradient-to-br from-[#4A151B] to-[#12141A] border-white/[0.05]" 
                          : "bg-gradient-to-br from-[#FDFBF7] to-[#F9F6F0] border-black/[0.04]"
                      }`}>
                        <img 
                          src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format&fit=crop&q=80" 
                          alt="Pinot Noir" 
                          className="h-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-3xl mb-2">🍽️</span>
              <p className="text-gray-400 text-sm">{t('menu.noItems') || 'No items match the filter.'}</p>
            </div>
          )
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
        onAddToOrder={handleAddToOrder}
        theme={theme}
        isPremium={showPremium}
        reviewsEnabled={menu.reviewsEnabled}
        qrToken={token}
      />

      {/* Floating Bottom Cart Bar */}
      {Object.keys(cart).length > 0 && !showCart && !hideCartBar && (
        <div 
          className={`fixed bottom-16 left-1/2 -translate-x-1/2 w-[90%] max-w-md p-4 rounded-2xl flex items-center justify-between shadow-2xl z-40 animate-fade-in-up border transition-all ${
            theme === "dark" 
              ? "bg-[#DFBA73] text-[#0A0B0E] border-[#DFBA73]/50" 
              : "bg-[#5C1D24] text-white border-[#5C1D24]/50"
          }`}
        >
          {/* Clickable Area */}
          <div 
            onClick={() => setShowCart(true)}
            className="flex-grow flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                theme === "dark" ? "bg-[#0A0B0E] text-[#DFBA73]" : "bg-white text-[#5C1D24]"
              }`}>
                {Object.values(cart).reduce((sum, i) => sum + i.quantity, 0)}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-90">{locale === 'en' ? 'View Basket' : 'Sepeti Gör'}</p>
                <p className="text-[11px] opacity-75">{locale === 'en' ? 'Add notes & checkout' : 'Not ekle ve sipariş ver'}</p>
              </div>
            </div>
            <span className="font-mono text-base font-bold mr-4">
              ₺{Object.values(cart).reduce((sum, i) => sum + (Number(i.item.price) * i.quantity), 0).toFixed(2)}
            </span>
          </div>
          
          {/* Close / Dismiss Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setHideCartBar(true);
            }}
            className={`p-1.5 rounded-xl border transition-all ${
              theme === "dark" 
                ? "border-[#0A0B0E]/15 hover:bg-[#0A0B0E]/10 text-[#0A0B0E]" 
                : "border-white/15 hover:bg-white/10 text-white"
            }`}
            title={locale === 'en' ? 'Dismiss' : 'Kapat'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Floating Service Buttons */}
      <div className="fixed right-4 bottom-28 z-40 flex flex-col space-y-3">
        <button 
          onClick={() => handleCallService("waiter")}
          disabled={serviceStatus === "calling"}
          className={`h-12 w-12 rounded-full border flex items-center justify-center shadow-xl backdrop-blur-md transition-all ${
            theme === "dark" 
              ? "bg-[#0A0B0E]/60 border-white/[0.08] hover:border-[#DFBA73]/50 text-white" 
              : "bg-white/80 border-black/[0.08] hover:border-[#5C1D24]/50 text-[#5C1D24]"
          }`}
          title={locale === 'en' ? 'Call Waiter' : 'Garson Çağır'}
        >
          <Bell className={`h-5 w-5 ${theme === "dark" ? "text-[#DFBA73]" : "text-[#5C1D24]"}`} />
        </button>
        <button 
          onClick={() => handleCallService("bill")}
          disabled={serviceStatus === "calling"}
          className={`h-12 w-12 rounded-full border flex items-center justify-center shadow-xl backdrop-blur-md transition-all ${
            theme === "dark" 
              ? "bg-[#0A0B0E]/60 border-white/[0.08] hover:border-[#DFBA73]/50 text-white" 
              : "bg-white/80 border-black/[0.08] hover:border-[#5C1D24]/50 text-[#5C1D24]"
          }`}
          title={locale === 'en' ? 'Request Bill' : 'Hesap İste'}
        >
          <Receipt className={`h-5 w-5 ${theme === "dark" ? "text-[#DFBA73]" : "text-[#5C1D24]"}`} />
        </button>
      </div>

      {/* Service Request Toasts */}
      {serviceStatus && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-55 w-[85%] max-w-sm border rounded-2xl p-4 shadow-2xl animate-fade-in flex items-center space-x-3 backdrop-blur-md transition-all ${
          theme === "dark" 
            ? "bg-[#0A0B0E]/95 border-white/[0.08] text-white" 
            : "bg-white/95 border-black/[0.08] text-[#1E1214]"
        }`}>
          {serviceStatus === "calling" ? (
            <div className={`h-5 w-5 border-2 rounded-full animate-spin ${
              theme === "dark" ? "border-[#DFBA73] border-t-transparent" : "border-[#5C1D24] border-t-transparent"
            }`} />
          ) : (
            <CheckCircle className="h-5 w-5 text-emerald-500 animate-bounce" />
          )}
          <span className="text-xs font-semibold">
            {serviceStatus === "calling" && (locale === 'en' ? "Sending request..." : "İstek gönderiliyor...")}
            {serviceStatus === "success_waiter" && (locale === 'en' ? "Waiter called. A staff member is on the way!" : "Garson çağrıldı. Görevli masanıza yönlendiriliyor!")}
            {serviceStatus === "success_bill" && (locale === 'en' ? "Bill requested. Waiter will bring the check!" : "Hesap istendi. Garson hesabı getirecektir!")}
            {serviceStatus === "error" && (locale === 'en' ? "Failed to send request. Please ask staff." : "İstek gönderilemedi. Lütfen garsona doğrudan iletiniz.")}
          </span>
        </div>
      )}

      {/* Cart Drawer Sheet */}
      <CartDrawer 
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        token={token}
        locale={locale}
        currency={menu.currency}
        brandColor={menu.brandColor}
        theme={theme}
      />

      {/* Premium Bottom Tab Navigation Bar Aligned to Mockup */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 border-t py-2.5 px-6 flex justify-around items-center backdrop-blur-lg transition-colors duration-300 ${
        theme === "dark" 
          ? "bg-[#0A0B0E]/90 border-white/[0.08]" 
          : "bg-[#FDFBF7]/95 border-black/[0.08] shadow-[0_-4px_12px_rgba(0,0,0,0.02)]"
      }`}>
        {/* Home */}
        <button 
          onClick={() => {
            router.push("/");
          }}
          className={`flex flex-col items-center space-y-1 transition-colors ${
            theme === "dark" ? "text-gray-500 hover:text-white" : "text-gray-500 hover:text-[#1E1214]"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">Home</span>
        </button>
        
        {/* Explore */}
        <button 
          onClick={() => {
            const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (inputEl) inputEl.focus();
          }}
          className={`flex flex-col items-center space-y-1 transition-colors ${
            theme === "dark" ? "text-gray-500 hover:text-white" : "text-gray-500 hover:text-[#1E1214]"
          }`}
        >
          <Search className="h-5 w-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">Explore</span>
        </button>
        
        {/* Sommelier (Highlighted) */}
        <button 
          onClick={() => {
            scrollToCategory("cat-mains");
          }}
          className={`flex flex-col items-center space-y-0.5 relative group focus:outline-none`}
        >
          <div className={`p-1 rounded-xl border transition-all ${
            theme === "dark" 
              ? "bg-[#DFBA73]/10 border-[#DFBA73]/20 hover:bg-[#DFBA73]/20 text-[#DFBA73]" 
              : "bg-[#5C1D24]/10 border-[#5C1D24]/20 hover:bg-[#5C1D24]/20 text-[#5C1D24]"
          }`}>
            <Wine className="h-4.5 w-4.5" />
          </div>
          <span className={`text-[9px] uppercase tracking-wider font-bold mt-0.5 ${
            theme === "dark" ? "text-[#DFBA73]" : "text-[#5C1D24]"
          }`}>Sommelier</span>
          <span className={`absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full animate-pulse ${
            theme === "dark" ? "bg-[#DFBA73]" : "bg-[#5C1D24]"
          }`} />
        </button>
        
        {/* Cart */}
        <button 
          onClick={() => setShowCart(true)} 
          className={`flex flex-col items-center space-y-1 relative transition-colors ${
            theme === "dark" ? "text-gray-500 hover:text-white" : "text-gray-500 hover:text-[#1E1214]"
          }`}
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">Cart</span>
          {Object.keys(cart).length > 0 && (
            <span className={`absolute -top-1 -right-1 h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center ${
              theme === "dark" ? "bg-[#DFBA73] text-[#0A0B0E]" : "bg-[#5C1D24] text-white"
            }`}>
              {Object.values(cart).reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          )}
        </button>
        
        {/* Account */}
        <button 
          onClick={() => router.push("/admin")}
          className={`flex flex-col items-center space-y-1 transition-colors ${
            theme === "dark" ? "text-gray-500 hover:text-white" : "text-gray-500 hover:text-[#1E1214]"
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">Account</span>
        </button>
      </div>
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

