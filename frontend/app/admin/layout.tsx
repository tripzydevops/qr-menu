"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Utensils, 
  QrCode, 
  Settings, 
  BarChart3, 
  Eye, 
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  ClipboardList,
  Monitor
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgName, setOrgName] = useState("Karaköy Lokantası");
  const [venueName, setVenueName] = useState("Karaköy Merkez");
  const [kdsEnabled, setKdsEnabled] = useState(false);

  // Load organization brand info from local storage or api if needed, default to Karaköy
  useEffect(() => {
    async function loadConfig() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${apiUrl}/api/menu/k1`);
        if (res.ok) {
          const data = await res.json();
          setOrgName(data.organizationName || "Karaköy Lokantası");
          setVenueName(data.venueName || "Karaköy Merkez");
          setKdsEnabled(data.kdsEnabled || false);
        }
      } catch (err) {
        console.error("Failed to load admin layout organization config", err);
      }
    }
    loadConfig();
  }, []);

  const navItems = [
    { name: "Siparişler & İstekler", path: "/admin/orders", icon: ClipboardList },
  ];

  if (kdsEnabled) {
    navItems.push({ name: "Mutfak Ekranı (KDS)", path: "/admin/kds", icon: Monitor });
  }

  navItems.push(
    { name: "Menü Yönetimi", path: "/admin/menu", icon: Utensils },
    { name: "QR & Masalar", path: "/admin/tables", icon: QrCode },
    { name: "Restoran Ayarları", path: "/admin/settings", icon: Settings },
    { name: "İstatistikler", path: "/admin/analytics", icon: BarChart3 }
  );

  return (
    <div className="min-h-screen bg-[#1C1C28] text-white flex flex-col font-sans select-none antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 h-16 bg-[#16213E]/90 backdrop-blur-md border-b border-gray-800/40 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Mobile menu trigger */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#2A2A3D]"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo symbol */}
          <div className="h-9 w-9 rounded-xl bg-[#722F37] border border-[#C9A84C]/25 flex items-center justify-center font-bold text-white tracking-wider text-base shadow-lg shadow-[#722F37]/15">
            T
          </div>
          <div>
            <span className="font-semibold text-sm block tracking-wide text-white leading-tight">
              {orgName}
            </span>
            <span className="text-[10px] text-gray-400 font-mono tracking-wider block">
              {venueName}
            </span>
          </div>
        </div>

        {/* View guest menu button */}
        <div className="flex items-center space-x-2">
          <Link 
            href="/menu?token=k1&preview=true" 
            target="_blank" 
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#2A2A3D] border border-gray-800 hover:border-[#C9A84C]/30 text-xs font-semibold hover:bg-gray-800 transition-all text-white"
          >
            <Eye className="h-3.5 w-3.5 text-[#C9A84C]" />
            <span>Önizleme</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-50" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-grow flex relative">
        {/* Sidebar Container */}
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/60 md:hidden backdrop-blur-sm"
          />
        )}
        
        <aside 
          className={`fixed md:sticky top-16 bottom-0 left-0 w-64 bg-[#16213E] border-r border-gray-800/40 z-20 flex flex-col justify-between py-6 transition-transform duration-300 md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:block"
          }`}
        >
          {/* Navigation Items */}
          <nav className="px-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-[13px] font-semibold transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-[#722F37]/90 to-[#722F37]/35 text-white border-l-4 border-[#C9A84C] pl-3"
                      : "text-gray-400 hover:text-white hover:bg-[#2A2A3D]/40 border-l-4 border-transparent"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4.5 w-4.5 ${isActive ? "text-[#C9A84C]" : "text-gray-400"}`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-40" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer info */}
          <div className="px-6 border-t border-gray-800/40 pt-4 mt-6">
            <span className="text-[10px] text-gray-500 font-mono tracking-widest block uppercase">
              Tripzy.travel
            </span>
            <span className="text-[9px] text-gray-500 block mt-0.5">
              QR Menu SaaS v1.0 (Phase 1)
            </span>
          </div>
        </aside>

        {/* Client View Panel */}
        <main className="flex-grow p-4 md:p-8 overflow-x-hidden min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
