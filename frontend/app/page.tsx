"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  QrCode, 
  Utensils, 
  Hotel, 
  ArrowRight, 
  Settings, 
  Smartphone, 
  Award, 
  ShieldCheck, 
  Globe, 
  ShieldAlert,
  Sparkles,
  Zap,
  TrendingUp,
  Coins,
  Check,
  X,
  Lock,
  Mail,
  HelpCircle,
  Eye,
  Info,
  ChevronRight,
  Database,
  BarChart3,
  Bot,
  ArrowUpRight
} from "lucide-react";

export default function Home() {
  const router = useRouter();

  // State for Login Modal
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginRole, setLoginRole] = useState("admin"); // 'guest_k1', 'guest_k3', 'admin', 'super_admin'
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // State for Competitor ROI Calculator
  const [segment, setSegment] = useState<"restaurant" | "hotel">("restaurant");
  const [venues, setVenues] = useState(1);
  const [tables, setTables] = useState(25);
  const [avgTicket, setAvgTicket] = useState(350); // TL
  const [monthlyOrders, setMonthlyOrders] = useState(1200);

  // State for Visual Demo Tabs
  const [activeDemoTab, setActiveDemoTab] = useState<"guest" | "admin" | "super">("guest");

  // State for competitor checklist toggle
  const [compSearchQuery, setCompSearchQuery] = useState("");

  // Automated typing state for mock login
  const triggerMockLogin = (role: string) => {
    setIsLoading(true);
    setLoginRole(role);
    
    // Simulate API request
    setTimeout(() => {
      setIsLoading(false);
      setLoginSuccess(true);
      
      setTimeout(() => {
        setIsLoginOpen(false);
        setLoginSuccess(false);
        
        // Redirect to target route
        if (role === "guest_k1") {
          router.push("/menu?token=k1");
        } else if (role === "guest_k3") {
          router.push("/menu?token=k3");
        } else if (role === "admin") {
          router.push("/admin");
        } else if (role === "super_admin") {
          router.push("/super-admin");
        }
      }, 1000);
    }, 1200);
  };

  // ROI Math
  // Competitor average pricing models (monthly estimation)
  const getCompetitorCost = () => {
    if (segment === "restaurant") {
      // Simpra/Menulux average is around 750 TL base + 30 TL per table
      return (750 + (tables * 30)) * venues;
    } else {
      // Protel/icibot average is around 3500 TL base + 50 TL per room/table
      return (3500 + (tables * 50)) * venues;
    }
  };

  const getTripzyCost = () => {
    if (segment === "restaurant") {
      // Pro Plan: 599 TL flat up to 40 tables, Premium with AI: 999 TL flat
      return tables <= 40 ? 599 * venues : 999 * venues;
    } else {
      return tables <= 50 ? 1499 * venues : 2499 * venues;
    }
  };

  // AI-Driven upsell calculation (15% average order value increase on 22% of orders handled by AI recommendations)
  const getAiRevenueUplift = () => {
    const ordersInfluencedByRecommendation = monthlyOrders * 0.25; // 25% of diners engage with recommendations
    const averageUpsellAmount = avgTicket * 0.18; // 18% ticket value growth
    return Math.round(ordersInfluencedByRecommendation * averageUpsellAmount * venues);
  };

  const netMonthlyBenefit = getAiRevenueUplift() + (getCompetitorCost() - getTripzyCost());

  // Competitor data definitions
  const competitors = [
    {
      name: "Simpra (POS)",
      focus: "restaurant",
      pricing: "Yüksek (Masa Başı Lisans)",
      aiRec: "Yok (Statik Eşleştirme)",
      coldStart: "Hayır",
      pwaOffline: "Kısmi",
      pmsSync: "Desteklenmiyor",
      setupFriction: "Yüksek (Kurulum Gerekli)"
    },
    {
      name: "Menulux",
      focus: "restaurant",
      pricing: "Orta (Yıllık Paket)",
      aiRec: "Yok",
      coldStart: "Hayır",
      pwaOffline: "Hayır",
      pmsSync: "Desteklenmiyor",
      setupFriction: "Orta"
    },
    {
      name: "icibot",
      focus: "hotel",
      pricing: "Yüksek (Oda Başı Ücret)",
      aiRec: "Kısıtlı Asistan",
      coldStart: "Hayır",
      pwaOffline: "Hayır (Uygulama İndirme)",
      pmsSync: "Var (Opera Sync)",
      setupFriction: "Yüksek"
    },
    {
      name: "Protel",
      focus: "hotel",
      pricing: "Çok Yüksek (Kurumsal)",
      aiRec: "Yok",
      coldStart: "Hayır",
      pwaOffline: "Hayır",
      pmsSync: "Var (Gelişmiş)",
      setupFriction: "Çok Yüksek"
    },
    {
      name: "Tripzy QR Menu",
      focus: "all",
      pricing: "Ekonomik (Flat SaaS)",
      aiRec: "Gemini AI Sommelier & Waiter",
      coldStart: "Evet (Lifestyle & Çapraz Domain)",
      pwaOffline: "Evet (PWA & Offline Fallback)",
      pmsSync: "Evet (Rezervasyon & Profil Aktarımı)",
      setupFriction: "Sıfır Sürtünme (Web-Tabanlı)"
    }
  ];

  const filteredCompetitors = competitors.filter(c => 
    c.name.toLowerCase().includes(compSearchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0A0B0E] text-[#E2E8F0] min-h-screen font-sans antialiased overflow-x-hidden selection:bg-[#DFBA73] selection:text-[#0A0B0E]">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#5C1D24]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[700px] h-[700px] bg-[#DFBA73]/5 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#0A0B0E]/75 backdrop-blur-lg border-b border-white/[0.04] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="h-10 w-10 bg-gradient-to-tr from-[#5C1D24] to-[#DFBA73] rounded-xl flex items-center justify-center shadow-lg shadow-[#5C1D24]/15 border border-[#DFBA73]/20 group-hover:scale-105 transition-transform duration-300">
              <QrCode className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-serif font-bold text-xl tracking-wide text-white group-hover:text-glow transition-all">Tripzy</span>
              <span className="text-[#DFBA73] font-mono text-[9px] block tracking-widest uppercase -mt-1 font-bold">QR MENU SaaS</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <a href="#features" className="relative py-1 hover:text-white transition-colors group">
              Özellikler
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#DFBA73] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            </a>
            <a href="#competitors" className="relative py-1 hover:text-white transition-colors group">
              Rakip Analizi
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#DFBA73] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            </a>
            <a href="#roi-calculator" className="relative py-1 hover:text-white transition-colors group">
              Kazanç Hesaplayıcı
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#DFBA73] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            </a>
            <a href="#demos" className="relative py-1 hover:text-white transition-colors group">
              Demos & Test
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#DFBA73] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsLoginOpen(true)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-[#DFBA73] border border-white/[0.08] hover:border-transparent text-white hover:text-[#0A0B0E] font-semibold text-xs transition-all duration-300 backdrop-blur-md shadow-lg"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Giriş Yap (Dev Bypass)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-20 md:pt-24 md:pb-32 max-w-7xl mx-auto text-center z-10">
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#5C1D24]/10 border border-[#DFBA73]/20 text-xs text-[#DFBA73] font-semibold tracking-wide animate-pulse">
            <Award className="h-4 w-4" />
            <span>Türkiye'nin İlk Entegre Turizm QR Menü Platformu</span>
          </div>
        </div>

        <h1 className="text-4xl md:text-7xl font-bold font-serif tracking-tight leading-tight max-w-4xl mx-auto mb-6">
          Restoran ve Oteller İçin <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFBA73] via-[#FFF5D6] to-[#DFBA73] text-glow">
            Yapay Zeka Destekli
          </span>{" "}
          Geleceğin Menüsü
        </h1>

        <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Statik QR kodları unutun. Tripzy, misafirlerinizi tanıyarak <strong>Cold Start (İlk Sipariş)</strong> sorununu çözer, 
          yerel dil algılaması (i18n), PWA çevrimdışı modu ve otonom sommelier/garson yapay zekasıyla sepet büyüklüğünü %22 artırır.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
          <a
            href="#demos"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#DFBA73] to-[#DFBA73]/85 text-[#0A0B0E] font-bold text-sm hover:scale-102 hover:shadow-lg hover:shadow-[#DFBA73]/25 transition-all duration-300"
          >
            <span>Canlı Demoları İncele</span>
            <ArrowRight className="h-4.5 w-4.5" />
          </a>
          <button
            onClick={() => setIsLoginOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] text-white hover:bg-white/[0.05] font-semibold text-sm transition-all duration-300"
          >
            <span>Yönetim Paneline Git</span>
          </button>
        </div>

        {/* Dashboard Mockup Showcase */}
        <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden border border-white/[0.05] bg-[#0A0B0E]/60 p-2 shadow-2xl shadow-black/95 backdrop-blur-xl">
          {/* macOS window controls header */}
          <div className="flex items-center space-x-2 px-4 py-3 border-b border-white/[0.04] bg-white/[0.02] rounded-t-xl">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]/80" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]/80" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F]/80" />
            <span className="text-[10px] text-gray-500 font-mono pl-4">tripzy.travel/dashboard/karakoy-lokantasi</span>
          </div>

          <div className="p-6 md:p-8 text-left bg-gradient-to-b from-transparent to-white/[0.01]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Stats & AI Terminal */}
              <div className="md:col-span-2 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.04] pb-4 gap-4">
                  <div>
                    <h4 className="text-xl font-bold font-serif text-white">Karaköy Lokantası</h4>
                    <p className="text-xs text-[#DFBA73] font-mono tracking-wider">PREMIUM DINING • İSTANBUL</p>
                  </div>
                  <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold tracking-wider flex items-center space-x-1.5 uppercase font-mono animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Canlı Masa Servisi Aktif</span>
                  </span>
                </div>

                {/* 4 Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#0A0B0E]/70 border border-white/[0.03] p-4 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 text-white/[0.02] group-hover:text-[#DFBA73]/5 transition-colors pointer-events-none">
                      <Utensils className="h-8 w-8" />
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1 font-semibold">Toplam Masa</span>
                    <span className="text-2xl font-bold tracking-tight text-white font-mono">32</span>
                  </div>

                  <div className="bg-[#0A0B0E]/70 border border-white/[0.03] p-4 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 text-white/[0.02] group-hover:text-[#DFBA73]/5 transition-colors pointer-events-none">
                      <QrCode className="h-8 w-8" />
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1 font-semibold">Aktif Sipariş</span>
                    <span className="text-2xl font-bold tracking-tight text-[#DFBA73] font-mono">8</span>
                  </div>

                  <div className="bg-[#0A0B0E]/70 border border-white/[0.03] p-4 rounded-2xl relative overflow-hidden group hidden lg:block">
                    <div className="absolute top-0 right-0 p-3 text-white/[0.02] group-hover:text-[#DFBA73]/5 transition-colors pointer-events-none">
                      <Bot className="h-8 w-8" />
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1 font-semibold">AI Sommelier</span>
                    <span className="text-2xl font-bold tracking-tight text-indigo-400 font-mono">89%</span>
                  </div>

                  <div className="bg-[#0A0B0E]/70 border border-white/[0.03] p-4 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 text-white/[0.02] group-hover:text-[#DFBA73]/5 transition-colors pointer-events-none">
                      <TrendingUp className="h-8 w-8" />
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1 font-semibold">Sepet Artışı</span>
                    <span className="text-2xl font-bold tracking-tight text-emerald-400 font-mono">+22.4%</span>
                  </div>
                </div>

                {/* SVG Graph Visualization */}
                <div className="bg-[#0A0B0E]/60 border border-white/[0.03] p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-400">Yapay Zeka Upsell Katkısı (Aylık Trend)</span>
                    <span className="text-[10px] font-mono text-[#DFBA73] bg-[#DFBA73]/10 px-2 py-0.5 rounded">AI Destekli Sipariş Hacmi</span>
                  </div>
                  <div className="h-24 w-full flex items-end justify-between pt-4">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 80">
                      <defs>
                        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#DFBA73" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#DFBA73" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,70 Q40,65 80,55 T160,58 T240,40 T320,30 T400,10"
                        fill="none"
                        stroke="#DFBA73"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M0,70 Q40,65 80,55 T160,58 T240,40 T320,30 T400,10 L400,80 L0,80 Z"
                        fill="url(#chartGlow)"
                      />
                      <circle cx="400" cy="10" r="4" fill="#DFBA73" className="animate-ping" />
                      <circle cx="400" cy="10" r="3" fill="#DFBA73" />
                      {/* Grid lines */}
                      <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(255,255,255,0.02)" strokeDasharray="3,3" />
                      <line x1="0" y1="75" x2="400" y2="75" stroke="rgba(255,255,255,0.02)" />
                    </svg>
                  </div>
                </div>

                {/* AI Reasoning log preview */}
                <div className="bg-gradient-to-r from-indigo-950/20 to-indigo-900/5 border border-indigo-950/50 rounded-2xl p-4 flex items-start space-x-3.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                  <div className="h-8 w-8 rounded-lg bg-indigo-950 border border-indigo-800/40 flex items-center justify-center shrink-0">
                    <Bot className="h-4.5 w-4.5 text-indigo-400 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono tracking-wider font-bold text-indigo-300 uppercase block mb-1">Otonom Akıl Yürütme Motoru (Gemini Pro)</span>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-mono">
                      "Berlin'den giriş yapıldı. Misafir profili: Vegan + Şarap Eğilimi. Fırınlanmış Enginar ile organik Narince beyaz şarap eşleştirildi. Açıklama: Narince zeytinyağlı enginarın asiditesini dengeliyor."
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Customer Phone Simulator Redesign */}
              <div className="border border-white/[0.04] bg-[#0A0B0E]/80 rounded-2xl p-5 flex flex-col justify-between space-y-5 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#DFBA73]/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="border-b border-white/[0.04] pb-4">
                  <span className="text-[9px] text-gray-500 font-mono tracking-wider block mb-2 uppercase">Müşteri Arayüz Simülatörü</span>
                  <div className="bg-[#12141A] p-2.5 rounded-xl border border-[#DFBA73]/20 flex items-center space-x-2">
                    <Smartphone className="h-4 w-4 text-[#DFBA73]" />
                    <span className="text-[11px] font-semibold text-white font-mono">k1.tripzy.travel (Masa 1)</span>
                  </div>
                </div>

                {/* Simulated luxury menu item */}
                <div className="space-y-4 flex-1">
                  <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider block">Öne Çıkan Yapay Zeka Önerisi</span>
                  
                  <div className="bg-[#12141A] rounded-xl overflow-hidden border border-white/[0.03] group hover:border-[#DFBA73]/30 transition-all duration-300">
                    {/* Simulated dish banner with gradient representing food photography */}
                    <div className="h-24 bg-gradient-to-br from-[#4A151B] to-[#12141A] p-3 flex flex-col justify-between relative">
                      <span className="self-start bg-[#DFBA73]/90 text-[#0A0B0E] text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        ★ Sommelier Tavsiyesi
                      </span>
                      <div className="absolute bottom-2 right-2 h-7 w-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <Utensils className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    
                    <div className="p-3.5 space-y-2">
                      <div className="flex justify-between items-start">
                        <h5 className="font-bold text-xs text-white">Fırınlanmış Enginar & Levrek</h5>
                        <span className="font-mono text-xs font-bold text-[#DFBA73]">420 TL</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed font-light">
                        Taze Ege enginarı yatağında, özel sosla fırınlanmış deniz levreği.
                      </p>
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        <span className="text-[8px] bg-white/[0.04] text-gray-400 px-2 py-0.5 rounded border border-white/[0.02]">Glutensiz</span>
                        <span className="text-[8px] bg-[#DFBA73]/10 text-[#DFBA73] px-2 py-0.5 rounded border border-[#DFBA73]/10">Özel Şarap Eşleşmeli</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link 
                    href="/menu?token=k1"
                    target="_blank"
                    className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-[#5C1D24] hover:bg-[#5C1D24]/85 text-white font-bold text-xs transition-colors shadow-lg shadow-[#5C1D24]/10 border border-[#DFBA73]/15"
                  >
                    <span>Müşteri Menüsünü Aç</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Unique Capabilities / Features Grid */}
      <section id="features" className="px-6 py-24 bg-[#0A0B0E] border-y border-white/[0.04] relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-[10px] text-[#DFBA73] font-mono tracking-widest uppercase block mb-2 font-bold">Tripzy Farkı</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white">Neden Klasik QR Menü Değil?</h2>
            <p className="text-xs md:text-sm text-gray-400 max-w-xl mx-auto mt-4 leading-relaxed font-light">
              Konuk ağırlama sektörünün (HoReCa) gerçek sorunlarını, gelişmiş teknoloji ve otonom akıl yürütmeyle çözüyoruz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass-card glass-card-hover p-8 rounded-2xl relative group">
              <div className="h-12 w-12 bg-[#5C1D24]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#5C1D24]/20 transition-colors border border-[#DFBA73]/20">
                <Sparkles className="h-5 w-5 text-[#DFBA73]" />
              </div>
              <h3 className="text-lg font-bold font-serif mb-3 text-white">Cold Start Sorununu Çözer</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                Müşteriniz restorana ilk kez gelse bile, genel lifestyle sinyallerini (zaman dilimi, seyahat modu, hava durumu, bütçe aralığı) analiz ederek kişiselleştirilmiş menü sıralaması ve tavsiyeler sunar.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card glass-card-hover p-8 rounded-2xl relative group">
              <div className="h-12 w-12 bg-[#DFBA73]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#DFBA73]/20 transition-colors border border-[#DFBA73]/20">
                <Bot className="h-5 w-5 text-[#DFBA73]" />
              </div>
              <h3 className="text-lg font-bold font-serif mb-3 text-white">Otonom Sommelier & Garson</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                Gemini tabanlı entegre akıl yürütme motoru, misafirlere *"Hangi mezeleriniz glutensiz?"* veya *"Bu yemeğin yanında hangi şarabı önerirsiniz?"* gibi sorulara detaylı açıklamalarla cevap verir.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card glass-card-hover p-8 rounded-2xl relative group">
              <div className="h-12 w-12 bg-indigo-600/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600/20 transition-colors border border-indigo-600/20">
                <Hotel className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold font-serif mb-3 text-white">Çapraz Domain Profil Aktarımı</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                Otelle entegre çalışan sistemimiz, misafirin PMS (Property Management System) üzerindeki tercihlerini (örneğin alerji, veganlık) restorandaki QR menüye otomatik yansıtarak kusursuz bir deneyim sunar.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card glass-card-hover p-8 rounded-2xl relative group">
              <div className="h-12 w-12 bg-white/[0.04] rounded-xl flex items-center justify-center mb-6 group-hover:bg-white/[0.08] transition-colors border border-white/[0.06]">
                <Smartphone className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold font-serif mb-3 text-white">PWA & Çevrimdışı Çalışma</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                İnternet bağlantısı koptuğunda dahi çalışan gelişmiş Service Worker yapısı ve local-storage entegrasyonu sayesinde sipariş ve menü akışı kesintiye uğramaz.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-card glass-card-hover p-8 rounded-2xl relative group">
              <div className="h-12 w-12 bg-[#DFBA73]/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#DFBA73]/15 transition-colors border border-white/[0.05]">
                <Globe className="h-5 w-5 text-[#DFBA73]" />
              </div>
              <h3 className="text-lg font-bold font-serif mb-3 text-white">i18n Akıllı Dil Algılama</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                Turistin cihaz dilini otomatik analiz ederek anında Türkçe, İngilizce veya Almanca menü sunumuna geçer. Çeviri hatalarını ve karmaşayı ortadan kaldırır.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-card glass-card-hover p-8 rounded-2xl relative group">
              <div className="h-12 w-12 bg-emerald-600/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-600/20 transition-colors border border-emerald-600/20">
                <Database className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold font-serif mb-3 text-white">Supabase & pgvector Hızı</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                Vektör araması ile yemekleri isimleriyle değil içerikleriyle arayın. *"Hafif, acısız ve zeytinyağlı ne var?"* araması milisaniyeler içinde Supabase pgvector ile eşleşir.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Competitor Analysis Dashboard */}
      <section id="competitors" className="px-6 py-24 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <span className="text-[10px] text-[#DFBA73] font-mono tracking-widest uppercase block mb-2 font-bold">Detaylı Karşılaştırma</span>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white">Rakiplerimiz ve Tripzy Farkı</h2>
          <p className="text-xs md:text-sm text-gray-400 max-w-xl mx-auto mt-4 leading-relaxed font-light">
            Türkiye pazarındaki HoReCa yazılımları ile Tripzy QR Menu SaaS özelliklerini şeffaf olarak kıyaslayın.
          </p>
        </div>

        {/* Competitor Search & Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="relative max-w-md w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-500 text-xs font-mono">
              ARA:
            </span>
            <input
              type="text"
              placeholder="Simpra, icibot..."
              value={compSearchQuery}
              onChange={(e) => setCompSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.08] focus:border-[#DFBA73]/50 focus:outline-none text-xs font-semibold placeholder-gray-600 text-white font-mono transition-all duration-300"
            />
          </div>
          <div className="flex space-x-2 bg-white/[0.02] p-1.5 rounded-xl border border-white/[0.05] backdrop-blur-md">
            <button
              onClick={() => setSegment("restaurant")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                segment === "restaurant" ? "bg-[#5C1D24] text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              Restoran / Kafe
            </button>
            <button
              onClick={() => setSegment("hotel")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                segment === "hotel" ? "bg-[#5C1D24] text-white shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              Otel / Resort
            </button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] text-gray-400 uppercase font-mono tracking-wider text-[9px] border-b border-white/[0.04]">
                <tr>
                  <th className="p-4 md:p-6 font-semibold">Platform Adı</th>
                  <th className="p-4 font-semibold">Fiyatlandırma Modeli</th>
                  <th className="p-4 font-semibold">Yapay Zeka (AI) Desteği</th>
                  <th className="p-4 font-semibold">Cold Start Çözümü</th>
                  <th className="p-4 font-semibold">Çevrimdışı PWA</th>
                  <th className="p-4 font-semibold">Hotel PMS Entegrasyonu</th>
                  <th className="p-4 font-semibold">Aktivasyon Süresi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredCompetitors.map((comp, idx) => {
                  const isTripzy = comp.name.includes("Tripzy");
                  return (
                    <tr 
                      key={idx}
                      className={`transition-colors ${
                        isTripzy 
                          ? "bg-[#5C1D24]/10 text-white font-semibold border-l-4 border-[#DFBA73]" 
                          : "text-gray-400 hover:bg-white/[0.01]"
                      }`}
                    >
                      <td className="p-4 md:p-6 font-medium text-white flex items-center space-x-2">
                        {isTripzy && <Zap className="h-4 w-4 text-[#DFBA73] animate-pulse" />}
                        <span>{comp.name}</span>
                      </td>
                      <td className="p-4 font-mono text-gray-300">{comp.pricing}</td>
                      <td className="p-4">
                        <span className={isTripzy ? "text-[#DFBA73] font-semibold" : "font-light"}>{comp.aiRec}</span>
                      </td>
                      <td className="p-4">
                        {comp.coldStart === "Evet (Lifestyle & Çapraz Domain)" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-semibold tracking-wider font-mono">DESTEKLİ</span>
                        ) : (
                          <span className="text-gray-600 font-light">Hayır</span>
                        )}
                      </td>
                      <td className="p-4">
                        {comp.pwaOffline.startsWith("Evet") ? (
                          <span className="text-emerald-400 flex items-center space-x-1 font-semibold"><Check className="h-4 w-4" /> <span>Evet</span></span>
                        ) : comp.pwaOffline.startsWith("Kısmi") ? (
                          <span className="text-yellow-500">Kısmi</span>
                        ) : (
                          <span className="text-gray-600 flex items-center space-x-1 font-light"><X className="h-4 w-4 text-red-500/50" /> <span>Hayır</span></span>
                        )}
                      </td>
                      <td className="p-4">
                        {comp.pmsSync.startsWith("Evet") || comp.pmsSync.startsWith("Var") ? (
                          <span className="text-emerald-400 font-semibold">{comp.pmsSync}</span>
                        ) : (
                          <span className="text-gray-600 font-light">Desteklemiyor</span>
                        )}
                      </td>
                      <td className="p-4 font-light text-gray-300">{comp.setupFriction}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ROI / Pricing Calculator */}
      <section id="roi-calculator" className="px-6 py-24 bg-[#0A0B0E] border-y border-white/[0.04] relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[10px] text-[#DFBA73] font-mono tracking-widest uppercase block mb-2 font-bold">Yatırım Geri Dönüşü (ROI)</span>
              <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6 text-white">Maliyetlerinizi Düşürün, Satışları Katlayın</h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-8 font-light">
                Tripzy'nin sabit ücretli SaaS altyapısı, masa başı ek lisanslar veya fahiş donanım/kurulum ücretleri talep etmez. 
                Aynı zamanda Gemini AI entegre sommelier ve yemek öneri asistanı sayesinde ortalama sepet büyüklüğünü kanıtlanmış bir şekilde %15-22 oranında artırır.
              </p>

              {/* Slider Inputs */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-gray-300">Mekan / Şube Sayısı:</span>
                    <span className="text-[#DFBA73] font-mono">{venues} Şube</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={venues}
                    onChange={(e) => setVenues(parseInt(e.target.value))}
                    className="w-full accent-[#DFBA73] bg-white/[0.05] rounded-lg appearance-none h-1.5 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-gray-300">{segment === "restaurant" ? "Masa" : "Oda/Kabin"} Sayısı:</span>
                    <span className="text-[#DFBA73] font-mono">{tables} Ünite</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    step="5"
                    value={tables}
                    onChange={(e) => setTables(parseInt(e.target.value))}
                    className="w-full accent-[#DFBA73] bg-white/[0.05] rounded-lg appearance-none h-1.5 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-gray-300">Aylık Ortalama Sipariş:</span>
                    <span className="text-[#DFBA73] font-mono">{monthlyOrders} Sipariş</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={monthlyOrders}
                    onChange={(e) => setMonthlyOrders(parseInt(e.target.value))}
                    className="w-full accent-[#DFBA73] bg-white/[0.05] rounded-lg appearance-none h-1.5 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-gray-300">Ortalama Adisyon/Sipariş Tutarı:</span>
                    <span className="text-[#DFBA73] font-mono">{avgTicket} TL</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="1500"
                    step="50"
                    value={avgTicket}
                    onChange={(e) => setAvgTicket(parseInt(e.target.value))}
                    className="w-full accent-[#DFBA73] bg-white/[0.05] rounded-lg appearance-none h-1.5 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Math Output Panel */}
            <div className="glass-card p-8 rounded-2xl border border-white/[0.06] shadow-2xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#DFBA73]/5 rounded-full blur-2xl pointer-events-none" />
              
              <h4 className="text-lg font-bold font-serif border-b border-white/[0.04] pb-4 flex items-center space-x-2 text-white">
                <Coins className="h-5 w-5 text-[#DFBA73]" />
                <span>Simüle Edilen Aylık Kazanç Analizi</span>
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase block mb-1 font-semibold">Klasik Sistem Maliyeti</span>
                  <span className="text-lg font-mono font-bold text-red-400">
                    {getCompetitorCost().toLocaleString("tr-TR")} TL
                  </span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl">
                  <span className="text-[10px] text-gray-500 uppercase block mb-1 font-semibold">Tripzy SaaS Maliyeti</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">
                    {getTripzyCost().toLocaleString("tr-TR")} TL
                  </span>
                </div>
              </div>

              <div className="bg-[#5C1D24]/10 border border-[#DFBA73]/20 p-5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#DFBA73] uppercase tracking-wider block mb-1 font-bold">Aylık Ek AI Satış Geliri</span>
                  <span className="text-xs text-gray-500 leading-normal block max-w-xs font-light">
                    Garson tavsiyeleri ile ortalama sepette %18 artış simüle edilmiştir.
                  </span>
                </div>
                <span className="text-xl md:text-2xl font-mono font-bold text-[#DFBA73]">
                  +{getAiRevenueUplift().toLocaleString("tr-TR")} TL
                </span>
              </div>

              <div className="bg-gradient-to-tr from-[#5C1D24]/30 to-[#DFBA73]/10 border border-[#DFBA73]/25 p-6 rounded-2xl text-center space-y-2 relative overflow-hidden shadow-xl">
                <span className="text-xs text-[#DFBA73] font-semibold uppercase tracking-widest block">Net Aylık Finansal Fayda</span>
                <span className="text-3xl md:text-4xl font-mono font-bold tracking-tight text-white text-glow block">
                  {netMonthlyBenefit > 0 ? `+${netMonthlyBenefit.toLocaleString("tr-TR")}` : netMonthlyBenefit.toLocaleString("tr-TR")} TL
                </span>
                <p className="text-[10px] text-gray-400 font-light">
                  (Tripzy Tasarrufu + AI Satış Artışı dahil tahmini kazançtır)
                </p>
              </div>

              <div className="text-[10px] text-gray-500 flex items-center space-x-1.5 justify-center">
                <Info className="h-3.5 w-3.5 text-gray-500" />
                <span>Hesaplamalar Türkiye HoReCa 2026 ortalama verilerine dayanmaktadır.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demos & Test Simulator Section */}
      <section id="demos" className="px-6 py-24 max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase block mb-2 font-bold">Canlı Simülasyon Konsolu</span>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white">Uygulamayı Canlı Test Edin</h2>
          <p className="text-xs md:text-sm text-gray-400 max-w-xl mx-auto mt-4 leading-relaxed font-light">
            Menü SaaS projesinin tüm katmanlarını aşağıdaki hızlı erişim butonları veya simulator ekranı üzerinden anında deneyimleyin.
          </p>
        </div>

        {/* Dashboard Tabs for Demos */}
        <div className="flex justify-center space-x-3 mb-12">
          <button
            onClick={() => setActiveDemoTab("guest")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeDemoTab === "guest" 
                ? "bg-[#5C1D24] text-white border border-[#DFBA73]/30 shadow-lg" 
                : "bg-white/[0.02] text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Misafir QR Menü (`/menu`)</span>
          </button>

          <button
            onClick={() => setActiveDemoTab("admin")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeDemoTab === "admin" 
                ? "bg-[#5C1D24] text-white border border-[#DFBA73]/30 shadow-lg" 
                : "bg-white/[0.02] text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Mekan Yönetim (`/admin`)</span>
          </button>

          <button
            onClick={() => setActiveDemoTab("super")}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeDemoTab === "super" 
                ? "bg-indigo-900/60 text-white border border-indigo-500/35 shadow-lg" 
                : "bg-white/[0.02] text-gray-400 hover:text-white border border-transparent"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Süper Yönetici (`/super-admin`)</span>
          </button>
        </div>

        {/* Tab content renders */}
        <div className="bg-white/[0.01] border border-white/[0.05] p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur-md">
          {activeDemoTab === "guest" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h4 className="text-xl font-bold font-serif mb-4 text-[#DFBA73]">Diner / Müşteri QR Menü Önizlemesi</h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-6 font-light">
                  Farklı masalar için atanmış QR kod token'larını simüle ederek dijital menümüzü hemen test edin. 
                  Bu menüde i18n otomatik dil tespiti, PWA mod desteği, alerjen filtreleri ve otonom Gemini AI garson asistanı aktiftir.
                </p>

                <div className="space-y-4">
                  <div className="bg-white/[0.01] p-4 rounded-xl border border-white/[0.04] hover:border-[#DFBA73]/30 transition-all flex justify-between items-center group">
                    <div>
                      <p className="font-bold text-sm text-white">Karaköy Lokantası (Masa 1)</p>
                      <p className="text-[10px] text-gray-500 font-mono">Token: k1 • Meze ve Ana Yemek Ağırlıklı</p>
                    </div>
                    <Link
                      href="/menu?token=k1"
                      target="_blank"
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-[#DFBA73] group-hover:bg-[#DFBA73] group-hover:text-black transition-all"
                    >
                      <span>Menüyü Aç</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="bg-white/[0.01] p-4 rounded-xl border border-white/[0.04] hover:border-[#DFBA73]/30 transition-all flex justify-between items-center group">
                    <div>
                      <p className="font-bold text-sm text-white">Teras Masa 3 (Canlı Çağrı Desteği)</p>
                      <p className="text-[10px] text-gray-500 font-mono">Token: k3 • Teras Bölgesi Özel Servis</p>
                    </div>
                    <Link
                      href="/menu?token=k3"
                      target="_blank"
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-[#DFBA73] group-hover:bg-[#DFBA73] group-hover:text-black transition-all"
                    >
                      <span>Menüyü Aç</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="bg-white/[0.01] p-4 rounded-xl border border-white/[0.04] hover:border-[#DFBA73]/30 transition-all flex justify-between items-center group">
                    <div>
                      <p className="font-bold text-sm text-white">Masa 5 (Tatlı ve İçecek Ağırlıklı)</p>
                      <p className="text-[10px] text-gray-500 font-mono">Token: k5 • Tatlı Filtreleri Aktif</p>
                    </div>
                    <Link
                      href="/menu?token=k5"
                      target="_blank"
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-[#DFBA73] group-hover:bg-[#DFBA73] group-hover:text-black transition-all"
                    >
                      <span>Menüyü Aç</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="relative border-8 border-[#1A1C23] rounded-[2.5rem] w-64 h-[440px] bg-[#0A0B0E] shadow-2xl overflow-hidden flex flex-col justify-between">
                  <div className="bg-[#12141A] p-3 border-b border-white/[0.04] flex justify-between items-center">
                    <span className="text-[9px] font-mono text-gray-400">12:30 PM</span>
                    <span className="text-[9px] font-mono text-[#DFBA73] font-semibold">TR 🇹🇷</span>
                  </div>

                  <div className="p-4 flex-1 space-y-4 overflow-y-auto no-scrollbar">
                    <div className="text-center">
                      <h5 className="font-serif font-bold text-sm text-[#DFBA73]">Karaköy Lokantası</h5>
                      <p className="text-[9px] text-gray-500">Masa 1 Menüsü</p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] text-gray-400 uppercase font-mono block">Popüler Lezzetler</span>
                      <div className="bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-white">
                          <span>Humus (Pastırmalı)</span>
                          <span className="font-mono text-[#DFBA73]">210 TL</span>
                        </div>
                        <p className="text-[8px] text-gray-500 leading-normal font-light">Fırınlanmış sıcak zeytinyağlı humus mezesi.</p>
                      </div>

                      <div className="bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-white">
                          <span>Yaprak Ciğer</span>
                          <span className="font-mono text-[#DFBA73]">320 TL</span>
                        </div>
                        <p className="text-[8px] text-gray-500 leading-normal font-light">Edirne usulü tereyağlı tavada yaprak ciğer.</p>
                      </div>
                    </div>

                    <div className="bg-indigo-950/20 border border-indigo-900/35 p-2.5 rounded-xl space-y-1.5">
                      <div className="flex items-center space-x-1">
                        <Bot className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="text-[9px] font-bold text-indigo-300">Sommelier AI Önerisi</span>
                      </div>
                      <p className="text-[8px] text-gray-400 leading-relaxed font-mono">
                        Yaprak ciğerin yanında yerli asiditesi yüksek Boğazkere kırmızı şarabını denemenizi öneririm.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#12141A] p-3 flex justify-around border-t border-white/[0.04]">
                    <div className="text-center opacity-50"><Utensils className="h-4.5 w-4.5 mx-auto text-white" /><span className="text-[7px] block text-white">Menü</span></div>
                    <div className="text-center text-[#DFBA73]"><Bot className="h-4.5 w-4.5 mx-auto" /><span className="text-[7px] block">Asistan</span></div>
                    <div className="text-center opacity-50"><Settings className="h-4.5 w-4.5 mx-auto text-white" /><span className="text-[7px] block text-white">Çağrı</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDemoTab === "admin" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h4 className="text-xl font-bold font-serif mb-4 text-[#DFBA73]">Mekan Yönetici Paneli</h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-6 font-light">
                  Restoran sahipleri ve otel müdürlerinin kullandığı yönetim ekranı. Buradan menü kalemleri CRUD işlemleri yapılabilir, 
                  fiziksel masalar için benzersiz QR kod etiketleri indirilip yazdırılabilir ve canlı sipariş akışı yönetilebilir.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <Check className="h-4 w-4 text-[#DFBA73]" />
                    <span>Canlı Garson Çağrısı ve Adisyon Yönetim Sayfası</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <Check className="h-4 w-4 text-[#DFBA73]" />
                    <span>Dinamik Menü Kategorileri ve Fiyat Güncelleyici</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <Check className="h-4 w-4 text-[#DFBA73]" />
                    <span>Alerjen ve Diyet Etiketleri (Vegan, Çölyak vb.) Belirleme</span>
                  </div>
                </div>

                <div className="mt-8 flex space-x-3">
                  <Link
                    href="/admin"
                    className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#5C1D24] hover:bg-[#5C1D24]/85 text-white text-xs font-semibold transition-colors"
                  >
                    <span>Yönetici Panelini Aç</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => triggerMockLogin("admin")}
                    className="px-5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] text-gray-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    <span>Test Kullanıcısı Olarak Giriş Yap</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#0A0B0E] border border-white/[0.04] p-5 rounded-2xl font-mono text-[11px] text-gray-400 space-y-4 shadow-xl">
                <div className="border-b border-white/[0.04] pb-2.5 flex justify-between items-center">
                  <span className="text-white font-bold font-serif">Karaköy Lokantası - Mutfak Monitörü</span>
                  <span className="text-green-400 text-[9px] uppercase tracking-wider">● AKTİF</span>
                </div>
                <div className="space-y-2.5">
                  <div className="bg-white/[0.01] p-3 rounded-xl border-l-4 border-[#DFBA73] border border-white/[0.03]">
                    <div className="flex justify-between items-center text-white font-bold mb-1">
                      <span>Masa 3 (Teras)</span>
                      <span>12:28</span>
                    </div>
                    <p className="text-[10px] text-[#DFBA73]">⚡ TALEP: Garson Çağrısı (Hesap İstiyor)</p>
                  </div>

                  <div className="bg-white/[0.01] p-3 rounded-xl border-l-4 border-indigo-500 border border-white/[0.03]">
                    <div className="flex justify-between items-center text-white font-bold mb-1">
                      <span>Masa 1</span>
                      <span>12:26</span>
                    </div>
                    <p className="text-[10px]">1x Enginarlı Levrek, 1x Narince Şarap (Hazırlanıyor)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDemoTab === "super" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h4 className="text-xl font-bold font-serif mb-4 text-indigo-400">Süper Yönetici (SaaS Platform) Paneli</h4>
                <p className="text-xs text-gray-400 leading-relaxed mb-6 font-light">
                  SaaS platformu sahiplerinin üye otel ve restoranları denetlediği, paket abonelik limitlerini belirlediği, 
                  ve platform genelindeki gelir ile QR tarama hacimlerini izlediği kurumsal dashboard.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <Check className="h-4 w-4 text-indigo-400" />
                    <span>Üyelik Paketleri (Free, Pro, Premium) CRUD Yönetimi</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <Check className="h-4 w-4 text-indigo-400" />
                    <span>Yeni Organizasyon ve Bayi Onboarding Sistemi</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <Check className="h-4 w-4 text-indigo-400" />
                    <span>Sistem İçi API Hataları ve Performans İzleme Metrikleri</span>
                  </div>
                </div>

                <div className="mt-8 flex space-x-3">
                  <Link
                    href="/super-admin"
                    className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-indigo-900/70 hover:bg-indigo-900 text-white text-xs font-semibold transition-colors"
                  >
                    <span>Süper Yönetici Panelini Aç</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => triggerMockLogin("super_admin")}
                    className="px-5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] text-gray-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    <span>Süper Admin Olarak Giriş Yap</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#0A0B0E] border border-indigo-950 p-5 rounded-2xl space-y-4 shadow-xl">
                <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-mono block">Platform Sağlık Raporu</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.01] p-3 rounded-xl border border-white/[0.03]">
                    <span className="text-[9px] text-gray-500 uppercase block mb-1">Toplam Organizasyon</span>
                    <span className="text-base font-bold font-mono text-white">148 Restoran / Otel</span>
                  </div>
                  <div className="bg-white/[0.01] p-3 rounded-xl border border-white/[0.03]">
                    <span className="text-[9px] text-gray-500 uppercase block mb-1">Aylık QR Tarama</span>
                    <span className="text-base font-bold font-mono text-white">84.2K Tarama</span>
                  </div>
                </div>

                <div className="bg-indigo-950/10 border border-indigo-900/35 p-3.5 rounded-xl">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-300 mb-1.5">
                    <span>Abonelik Dağılımı</span>
                    <span className="text-[10px] font-mono text-indigo-300">MRR: 124,500 TL</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden flex">
                    <div className="bg-[#DFBA73] h-full" style={{ width: "45%" }} title="Premium %45" />
                    <div className="bg-[#5C1D24] h-full" style={{ width: "35%" }} title="Pro %35" />
                    <div className="bg-gray-600 h-full" style={{ width: "20%" }} title="Free %20" />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-500 mt-2 font-mono">
                    <span className="text-[#DFBA73]">● Premium %45</span>
                    <span className="text-[#5C1D24]">● Pro %35</span>
                    <span>● Free %20</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0B0E] border-t border-white/[0.04] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
              <div className="h-6 w-6 bg-gradient-to-tr from-[#5C1D24] to-[#DFBA73] rounded-lg flex items-center justify-center text-xs text-white">T</div>
              <span className="font-serif font-bold text-sm tracking-widest text-white uppercase">Tripzy QR Menu</span>
            </div>
            <p className="text-[10px] text-gray-600 font-mono">
              Tripzy.travel Ecosystem. All rights reserved. 2026.
            </p>
          </div>

          <div className="text-[10px] text-gray-500 font-mono leading-relaxed max-w-sm">
            <p>Masa QR kod test token'ları: <span className="bg-white/[0.02] border border-white/[0.05] px-1.5 py-0.5 rounded text-[#DFBA73]">k1</span>, <span className="bg-white/[0.02] border border-white/[0.05] px-1.5 py-0.5 rounded text-[#DFBA73]">k2</span>, <span className="bg-white/[0.02] border border-white/[0.05] px-1.5 py-0.5 rounded text-[#DFBA73]">k3</span>, <span className="bg-white/[0.02] border border-white/[0.05] px-1.5 py-0.5 rounded text-[#DFBA73]">k4</span>, <span className="bg-white/[0.02] border border-white/[0.05] px-1.5 py-0.5 rounded text-[#DFBA73]">k5</span></p>
          </div>
        </div>
      </footer>

      {/* Premium Mock Login Modal (Bypassed for Testing) */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsLoginOpen(false)} />
          
          <div className="relative bg-[#0A0B0E] border border-white/[0.08] rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            {/* Ambient gold glow in modal */}
            <div className="absolute top-[-10%] right-[-10%] w-[180px] h-[180px] bg-[#DFBA73]/5 rounded-full blur-[40px] pointer-events-none" />

            <div className="flex justify-between items-center border-b border-white/[0.04] pb-4 mb-6">
              <div className="flex items-center space-x-2.5">
                <Lock className="h-4.5 w-4.5 text-[#DFBA73]" />
                <h3 className="font-serif font-bold text-lg text-white">Sisteme Giriş Yap</h3>
              </div>
              <button 
                onClick={() => setIsLoginOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.05] text-gray-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loginSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="h-12 w-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400 animate-bounce">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="font-serif font-bold text-white text-base">Giriş Başarılı!</h4>
                <p className="text-xs text-gray-400">Yönlendiriliyorsunuz...</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Information Alert about Dev Bypass */}
                <div className="bg-[#5C1D24]/10 border border-[#DFBA73]/20 rounded-2xl p-4 flex items-start space-x-3">
                  <Info className="h-4.5 w-4.5 text-[#DFBA73] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-[#DFBA73] block mb-0.5 font-mono">TEST AŞAMASI BİLDİRİMİ</span>
                    <p className="text-[10px] text-gray-400 leading-normal font-light">
                      Uygulama şu anda test aşamasındadır. Şifre doğrulama devre dışı bırakılmıştır. 
                      Aşağıdaki <strong>Hızlı Giriş Seçenekleri</strong> panelini kullanarak dilediğiniz role anında bürünebilirsiniz.
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1.5 font-mono tracking-wider">E-Posta Adresi</label>
                    <div className="relative">
                      <Mail className="absolute inset-y-0 left-0 pl-3.5 flex items-center h-full text-gray-600 w-4.5 pointer-events-none" />
                      <input
                        type="email"
                        placeholder="demo@tripzy.travel"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/[0.01] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-xs focus:border-[#DFBA73]/50 focus:outline-none text-white font-semibold transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1.5 font-mono tracking-wider">Parola</label>
                    <div className="relative">
                      <Lock className="absolute inset-y-0 left-0 pl-3.5 flex items-center h-full text-gray-600 w-4.5 pointer-events-none" />
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/[0.01] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-xs focus:border-[#DFBA73]/50 focus:outline-none text-white font-semibold transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Standard Submit Button */}
                <button
                  onClick={() => triggerMockLogin(loginRole)}
                  disabled={isLoading}
                  className="w-full py-3 bg-[#5C1D24] hover:bg-[#5C1D24]/85 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 border border-[#DFBA73]/25 shadow-lg transition-colors"
                >
                  {isLoading ? (
                    <div className="w-4.5 h-4.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Normal Giriş Yap</span>
                  )}
                </button>

                {/* Developer Quick Access Options (User Request Spec) */}
                <div className="border-t border-white/[0.04] pt-5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-3 font-mono">
                    Hızlı Giriş Seçenekleri (Dev Mode)
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => triggerMockLogin("guest_k1")}
                      className="p-3 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl border border-white/[0.08] hover:border-[#DFBA73]/20 text-left transition-all group"
                    >
                      <span className="text-[11px] font-bold text-[#DFBA73] block mb-0.5">Masa 1 Müşteri</span>
                      <span className="text-[9px] text-gray-500 block leading-normal font-light">Müşteri menüsü k1</span>
                    </button>

                    <button
                      onClick={() => triggerMockLogin("guest_k3")}
                      className="p-3 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl border border-white/[0.08] hover:border-[#DFBA73]/20 text-left transition-all group"
                    >
                      <span className="text-[11px] font-bold text-[#DFBA73] block mb-0.5">Masa 3 Müşteri</span>
                      <span className="text-[9px] text-gray-500 block leading-normal font-light">Müşteri menüsü k3</span>
                    </button>

                    <button
                      onClick={() => triggerMockLogin("admin")}
                      className="p-3 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl border border-white/[0.08] hover:border-[#DFBA73]/20 text-left transition-all group"
                    >
                      <span className="text-[11px] font-bold text-white block mb-0.5">Mekan Yöneticisi</span>
                      <span className="text-[9px] text-gray-500 block leading-normal font-light">/admin paneli</span>
                    </button>

                    <button
                      onClick={() => triggerMockLogin("super_admin")}
                      className="p-3 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl border border-white/[0.08] hover:border-indigo-500/20 text-left transition-all group"
                    >
                      <span className="text-[11px] font-bold text-indigo-400 block mb-0.5">Süper Admin</span>
                      <span className="text-[9px] text-gray-500 block leading-normal font-light">/super-admin paneli</span>
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
