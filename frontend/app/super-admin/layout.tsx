"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  ShieldAlert,
  Menu,
  X,
  MessageSquare
} from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navItems = [
    { name: "Platform Analizleri", href: "/super-admin", icon: LayoutDashboard },
    { name: "Üye İşletmeler", href: "/super-admin/organizations", icon: Building2 },
    { name: "Kullanıcı Hesapları", href: "/super-admin/users", icon: Users },
    { name: "Müşteri Değerlendirmeleri", href: "/super-admin/reviews", icon: MessageSquare },
    { name: "SaaS Paket Ayarları", href: "/super-admin/settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-[#0F0F1A] text-[#E8E8E8] overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#16162a] border-r border-[#2C2C4E]/40 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-full ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div>
          {/* Brand Header */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-[#2C2C4E]/30 bg-[#121224]/50">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 bg-gradient-to-tr from-[#6366F1] to-[#C9A84C] rounded-xl flex items-center justify-center shadow-lg shadow-[#6366F1]/10">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-bold text-white tracking-wide font-serif">Tripzy SaaS</h1>
                <span className="text-[10px] text-[#C9A84C] font-semibold tracking-widest uppercase">Super Admin</span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-[#2C2C4E]/50 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 mt-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-[#6366F1]/20 to-[#C9A84C]/10 text-white border-l-4 border-[#C9A84C] shadow-inner shadow-[#6366F1]/5"
                      : "text-gray-400 hover:bg-[#1D1D3A]/50 hover:text-white border-l-4 border-transparent"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? "text-[#C9A84C]" : "text-gray-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#2C2C4E]/20 bg-[#121224]/30">
          <Link
            href="/"
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-red-950/20 hover:border-red-900/30 border border-transparent transition-all duration-300"
          >
            <LogOut className="h-4.5 w-4.5 text-red-500/80" />
            <span>Ana Sayfaya Dön</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 border-b border-[#2C2C4E]/20 bg-[#121224]/70 backdrop-blur-md flex items-center justify-between px-6 z-30">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-[#1D1D3A]/60 border border-[#2C2C4E]/20 text-gray-400 hover:text-white mr-4"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-white tracking-wide font-serif">SaaS Yönetim Paneli</h2>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white block">DevOps Admin</span>
              <span className="text-[10px] text-gray-400">superadmin@tripzy.travel</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#C9A84C] p-0.5 shadow-md shadow-[#6366F1]/10">
              <div className="h-full w-full rounded-[10px] bg-[#16162a] flex items-center justify-center font-bold text-xs text-white">
                SA
              </div>
            </div>
          </div>
        </header>

        {/* Inner page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-gradient-to-b from-[#0F0F1A] to-[#08080E]">
          {children}
        </main>
      </div>
    </div>
  );
}
