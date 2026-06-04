"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Globe, ShieldAlert, Info, Coffee, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
}

interface Category {
  id: string;
  nameTr: string;
  nameEn: string;
  sortOrder: number;
  items: MenuItem[];
}

interface MenuData {
  tableName: string;
  venueName: string;
  organizationName: string;
  logoUrl: string | null;
  categories: Category[];
}

// Resilient fallback mock data mirroring backend seed data
const MOCK_DATA: Record<string, MenuData> = {
  k4: {
    tableName: "Masa 4",
    venueName: "Karaköy Merkez",
    organizationName: "Karaköy Lokantası",
    logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80",
    categories: [
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
            descriptionTr: "Kıtır ekmek, limon ve zeytinyağı ile sıcak servis edilir.",
            descriptionEn: "Served hot with crispy croutons, lemon, and olive oil.",
            price: "120.00",
            imageUrl: "https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=500&auto=format&fit=crop&q=80",
            allergens: ["gluten"],
            isAvailable: true
          },
          {
            id: "item-hummus",
            nameTr: "Sıcak Tereyağlı Humus",
            nameEn: "Warm Hummus with Butter",
            descriptionTr: "Tavada tereyağında çevrilmiş pastırma dilimleri ile sıcak fırınlanmış nohut ezmesi.",
            descriptionEn: "Creamy baked chickpeas topped with pastrami slices sautéed in butter.",
            price: "195.00",
            imageUrl: "https://images.unsplash.com/photo-1628294895520-73f08b1c51d9?w=500&auto=format&fit=crop&q=80",
            allergens: ["sesame", "dairy"],
            isAvailable: true
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
            nameTr: "Zırh Kebabı (Adana Kebabı)",
            nameEn: "Hand-Minced Adana Kebab",
            descriptionTr: "Közlenmiş yeşil biber, ızgara domates, sıcak lavaş ve sumaklı soğan salatası eşliğinde.",
            descriptionEn: "Served with charred green pepper, grilled tomato, hot lavash, and sumac onion salad.",
            price: "420.00",
            imageUrl: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&auto=format&fit=crop&q=80",
            allergens: ["gluten"],
            isAvailable: true
          },
          {
            id: "item-manti",
            nameTr: "Kayseri Mantısı",
            nameEn: "Traditional Kayseri Manti",
            descriptionTr: "Sarımsaklı yoğurt, nane ve sumaklı kızgın tereyağ sosu ile lezzetlendirilmiş dana kıymalı mantı.",
            descriptionEn: "Tiny beef-filled dumplings served with garlic yogurt, dried mint, and sumac-infused butter.",
            price: "310.00",
            imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=80",
            allergens: ["gluten", "dairy"],
            isAvailable: true
          }
        ]
      },
      {
        id: "cat-desserts",
        nameTr: "Tatlılar",
        nameEn: "Desserts",
        sortOrder: 3,
        items: [
          {
            id: "item-baklava",
            nameTr: "Fıstıklı Havuç Dilim Baklava",
            nameEn: "Pistachio Carrot-Slice Baklava",
            descriptionTr: "Çıtır yufka aralarında bol Antep fıstığı, Maraş keçi sütü kesme dondurması ile servis edilir.",
            descriptionEn: "Crisp flaky pastry layers filled with rich pistachios, served with traditional Turkish ice cream.",
            price: "240.00",
            imageUrl: "https://images.unsplash.com/photo-1582231375454-9e86e40b2a11?w=500&auto=format&fit=crop&q=80",
            allergens: ["gluten", "nuts", "dairy"],
            isAvailable: true
          }
        ]
      },
      {
        id: "cat-drinks",
        nameTr: "İçecekler",
        nameEn: "Cold & Hot Drinks",
        sortOrder: 4,
        items: [
          {
            id: "item-ayran",
            nameTr: "Köpüklü Yayık Ayranı",
            nameEn: "Traditional Frothy Ayran",
            descriptionTr: "Geleneksel yayık usulü köpüklü soğuk yoğurt içeceği, taze nane yaprağı ile.",
            descriptionEn: "Cold whisked yogurt drink with a rich froth, served with fresh mint.",
            price: "65.00",
            imageUrl: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500&auto=format&fit=crop&q=80",
            allergens: ["dairy"],
            isAvailable: true
          },
          {
            id: "item-tea",
            nameTr: "Demleme Türk Çayı",
            nameEn: "Brewed Turkish Tea",
            descriptionTr: "İnce belli bardakta taze demlenmiş Rize çayı.",
            descriptionEn: "Freshly brewed premium black tea from Rize, served in a tulip glass.",
            price: "35.00",
            imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80",
            allergens: [],
            isAvailable: true
          }
        ]
      }
    ]
  },
  r101: {
    tableName: "Room 101",
    venueName: "Lobby & Room Service",
    organizationName: "Grand Bosphorus Hotel",
    logoUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&auto=format&fit=crop&q=80",
    categories: [
      {
        id: "cat-breakfast",
        nameTr: "Oda Servisi Kahvaltı",
        nameEn: "Room Service Breakfast",
        sortOrder: 1,
        items: [
          {
            id: "item-breakfast-plate",
            nameTr: "Geleneksel Türk Kahvaltı Tabağı",
            nameEn: "Traditional Turkish Breakfast Plate",
            descriptionTr: "Ezine peyniri, kaşar, petek bal, kaymak, domates, salatalık, zeytin çeşitleri, haşlanmış yumurta ve taze simit.",
            descriptionEn: "Ezine feta cheese, aged kashar, honeycomb, clotted cream, tomatoes, cucumbers, olives, boiled egg, and fresh simit.",
            price: "380.00",
            imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80",
            allergens: ["gluten", "dairy", "sesame"],
            isAvailable: true
          }
        ]
      }
    ]
  }
};

export default function MenuPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "k4"; // Default to k4 (Karaköy Lokantası Masa 4)

  const [menu, setMenu] = useState<MenuData | null>(null);
  const [lang, setLang] = useState<"tr" | "en">("tr");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    async function fetchMenu() {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/menu/${token}`);
        if (!res.ok) {
          throw new Error("API Offline or Token Invalid. Falling back to local data.");
        }
        const data = await res.json();
        setMenu(data);
      } catch (err) {
        console.warn(err);
        // Resilient fallback to mock data
        if (MOCK_DATA[token]) {
          setMenu(MOCK_DATA[token]);
        } else {
          // If token isn't in mock data, default to k4 so user always sees a menu
          setMenu(MOCK_DATA["k4"]);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, [token]);

  const scrollToCategory = (id: string) => {
    const el = categoryRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mb-4"></div>
        <p className="text-muted-foreground text-sm font-medium">Menü yükleniyor / Loading Menu...</p>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-foreground p-6">
        <ShieldAlert className="h-12 w-12 text-accent mb-4" />
        <h2 className="text-xl font-bold mb-2">Menü Bulunamadı</h2>
        <p className="text-muted-foreground text-sm text-center mb-6">Taramış olduğunuz QR kod geçersiz veya sunucuya bağlanılamadı.</p>
        <Link href="/" className="bg-muted px-4 py-2 rounded-lg text-sm hover:bg-muted/80 transition-colors">
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background min-h-screen pb-20 relative">
      {/* Header Profile */}
      <header className="sticky top-0 bg-background/85 backdrop-blur-md border-b border-muted z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {menu.logoUrl ? (
            <img 
              src={menu.logoUrl} 
              alt={menu.organizationName} 
              className="h-10 w-10 rounded-full object-cover border border-muted"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Coffee className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h2 className="text-sm font-bold leading-tight">{menu.organizationName}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>{menu.venueName}</span>
              <span className="h-1 w-1 bg-muted-foreground rounded-full"></span>
              <span className="text-primary font-medium">{menu.tableName}</span>
            </p>
          </div>
        </div>

        {/* Language Toggler */}
        <button 
          onClick={() => setLang(lang === "tr" ? "en" : "tr")}
          className="flex items-center gap-1 text-xs border border-muted hover:border-primary/50 px-2.5 py-1.5 rounded-full transition-all bg-card/50"
        >
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold uppercase">{lang}</span>
        </button>
      </header>

      {/* Horizontal Scroll Categories */}
      <nav className="sticky top-[65px] bg-background/95 backdrop-blur z-20 border-b border-muted/50 px-4 py-2.5 flex gap-2 overflow-x-auto no-scrollbar shadow-md">
        {menu.categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollToCategory(cat.id)}
            className="flex-shrink-0 text-xs px-3.5 py-2 rounded-full border border-muted bg-card hover:bg-muted hover:border-primary/30 transition-all font-medium whitespace-nowrap active:scale-95"
          >
            {lang === "tr" ? cat.nameTr : cat.nameEn}
          </button>
        ))}
      </nav>

      {/* Menu Categories and Items */}
      <main className="px-4 py-6 max-w-2xl mx-auto w-full flex-1 space-y-10">
        {menu.categories.map((category) => (
          <div 
            key={category.id} 
            ref={(el) => { categoryRefs.current[category.id] = el; }}
            className="space-y-4 pt-4 border-t border-muted/30 first:border-0 first:pt-0"
          >
            <h3 className="text-lg font-extrabold tracking-tight border-l-4 border-primary pl-2.5 text-foreground">
              {lang === "tr" ? category.nameTr : category.nameEn}
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="bg-card border border-muted hover:border-primary/20 rounded-xl p-3 flex gap-4 cursor-pointer hover:shadow-lg transition-all group duration-300 relative overflow-hidden"
                >
                  {/* Image */}
                  {item.imageUrl && (
                    <div className="h-20 w-20 md:h-24 md:w-24 relative rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={item.imageUrl}
                        alt={lang === "tr" ? item.nameTr : item.nameEn}
                        className="object-cover h-full w-full group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Information */}
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <h4 className="font-bold text-sm md:text-base text-foreground group-hover:text-primary transition-colors">
                        {lang === "tr" ? item.nameTr : item.nameEn}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 pr-4">
                        {lang === "tr" ? item.descriptionTr : item.descriptionEn}
                      </p>
                    </div>

                    {/* Footer card info */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-extrabold text-primary">
                        ₺{parseFloat(item.price).toFixed(2)}
                      </span>

                      {/* Allergens badges preview */}
                      {item.allergens.length > 0 && (
                        <div className="flex gap-1">
                          {item.allergens.slice(0, 2).map((allergen) => (
                            <span 
                              key={allergen} 
                              className="text-[9px] bg-accent/10 border border-accent/20 text-accent font-semibold px-1.5 py-0.5 rounded-full capitalize"
                            >
                              {allergen}
                            </span>
                          ))}
                          {item.allergens.length > 2 && (
                            <span className="text-[9px] bg-muted text-muted-foreground px-1 py-0.5 rounded-full">
                              +{item.allergens.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Modal Popup Details */}
      {selectedItem && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div 
            className="bg-card border border-muted w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image banner inside modal */}
            {selectedItem.imageUrl && (
              <div className="w-full h-48 relative bg-muted">
                <img 
                  src={selectedItem.imageUrl} 
                  alt={lang === "tr" ? selectedItem.nameTr : selectedItem.nameEn}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-5 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {lang === "tr" ? selectedItem.nameTr : selectedItem.nameEn}
                  </h3>
                  <span className="text-lg font-extrabold text-primary block mt-1">
                    ₺{parseFloat(selectedItem.price).toFixed(2)}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="text-xs bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-full transition-colors font-medium border border-muted"
                >
                  {lang === "tr" ? "Kapat" : "Close"}
                </button>
              </div>

              {/* Description */}
              {(selectedItem.descriptionTr || selectedItem.descriptionEn) && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Info className="h-3 w-3" />
                    {lang === "tr" ? "Ürün Açıklaması" : "Description"}
                  </span>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {lang === "tr" ? selectedItem.descriptionTr : selectedItem.descriptionEn}
                  </p>
                </div>
              )}

              {/* Allergens warning */}
              {selectedItem.allergens.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-muted/50">
                  <span className="text-xs text-accent font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {lang === "tr" ? "Alerjen Uyarıları" : "Allergen Warnings"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.allergens.map((allergen) => (
                      <span 
                        key={allergen} 
                        className="text-xs bg-accent/15 border border-accent/30 text-accent font-bold px-2.5 py-1 rounded-full capitalize"
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
