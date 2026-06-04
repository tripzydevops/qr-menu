"use client";

import Link from "next/link";
import { QrCode, Utensils, Hotel, ArrowRight, Settings } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden bg-background">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl w-full text-center z-10 flex flex-col items-center">
        {/* Logo Icon */}
        <div className="h-16 w-16 bg-gradient-to-tr from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-8 animate-pulse">
          <QrCode className="h-9 w-9 text-white" />
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
          Tripzy <span className="text-primary">QR Menu</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12">
          Kafe, restoran ve oteller için temassız, hızlı ve göz alıcı dijital menü deneyimi. Müşterileriniz sadece tarasın ve incelesin.
        </p>

        {/* Demo Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-12">
          {/* Restaurant Demo */}
          <div className="bg-card border border-muted p-6 rounded-2xl flex flex-col justify-between items-start text-left hover:border-primary/50 transition-all group duration-300">
            <div>
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Utensils className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Karaköy Lokantası</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Mezeler, ana yemekler ve tatlılardan oluşan geleneksel Türk menüsü. Masa 4 (Masaüstü QR denemesi).
              </p>
            </div>
            <Link 
              href="/menu?token=k4"
              className="flex items-center text-primary font-semibold text-sm group-hover:translate-x-1 transition-transform"
            >
              Menüyü Gör <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          {/* Hotel Room Demo */}
          <div className="bg-card border border-muted p-6 rounded-2xl flex flex-col justify-between items-start text-left hover:border-accent/50 transition-all group duration-300">
            <div>
              <div className="h-10 w-10 bg-accent/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <Hotel className="h-5 w-5 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Oda Servisi (Hotel)</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Otel odasından (Room 101) oda servisi menüsünü dijital inceleme demosu.
              </p>
            </div>
            <Link 
              href="/menu?token=r101"
              className="flex items-center text-accent font-semibold text-sm group-hover:translate-x-1 transition-transform"
            >
              Oda Servisini Gör <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          {/* Admin Dashboard Demo */}
          <div className="bg-card border border-muted p-6 rounded-2xl flex flex-col justify-between items-start text-left hover:border-primary/50 transition-all group duration-300">
            <div>
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Yönetici Paneli</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Menü listesi, stok durumu ve masa QR kodlarını yönettiğiniz admin paneli demosu.
              </p>
            </div>
            <Link 
              href="/admin"
              className="flex items-center text-primary font-semibold text-sm group-hover:translate-x-1 transition-transform"
            >
              Paneli Aç <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-muted-foreground border-t border-muted/50 pt-6 w-full max-w-md">
          <p>Mock QR token'ları: <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">k1</span>, <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">k2</span>, <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">k3</span>, <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">k4</span>, <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">r101</span></p>
        </div>
      </div>
    </main>
  );
}
