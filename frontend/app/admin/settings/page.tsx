"use client";

import React, { useEffect, useState } from "react";
import { 
  Save, 
  Upload, 
  Loader2, 
  MapPin, 
  Phone, 
  Clock, 
  DollarSign, 
  Globe,
  Image as ImageIcon
} from "lucide-react";

interface SettingsVenue {
  id: string;
  name: string;
  address: string | null;
  coverImageUrl: string | null;
  phone: string | null;
  operatingHours: Record<string, { open: string; close: string }> | null;
  currency: string;
  defaultLocale: string;
  supportedLocales: string[];
}

export default function AdminSettingsPage() {
  const [venue, setVenue] = useState<SettingsVenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [defaultLocale, setDefaultLocale] = useState("tr");
  
  // Operating Hours states
  const [hours, setHours] = useState<Record<string, { open: string; close: string }>>({
    monday: { open: "09:00", close: "22:00" },
    tuesday: { open: "09:00", close: "22:00" },
    wednesday: { open: "09:00", close: "22:00" },
    thursday: { open: "09:00", close: "22:00" },
    friday: { open: "09:00", close: "23:00" },
    saturday: { open: "09:00", close: "23:00" },
    sunday: { open: "10:00", close: "22:00" }
  });

  const venueId = "venue-karakoy-main";
  const organizationId = "org-karakoy";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        // Note: the venue fetch endpoint on backend is not explicitly implemented as GET /api/venues/{id}
        // but wait! The API GET /api/menu/{token} contains the full venue details!
        // We can fetch from GET /api/menu/k1 which is open/demo and load the details!
        const res = await fetch(`${apiUrl}/api/menu/k1`);
        if (res.ok) {
          const data = await res.json();
          setName(data.venueName);
          setAddress(data.address || "Kemankeş Karamustafa Paşa Mh., Beyoğlu, İstanbul");
          setPhone(data.phone || "+90 212 292 44 55");
          setCurrency(data.currency || "TRY");
          setCoverImageUrl(data.coverImageUrl || "");
          setDefaultLocale(data.defaultLocale || "tr");
          if (data.operatingHours) {
            setHours(data.operatingHours);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      const res = await fetch(`${apiUrl}/api/admin/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setCoverImageUrl(data.url);
      } else {
        alert("Upload failed.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch(`${apiUrl}/api/admin/venues/${venueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name,
          address,
          phone,
          coverImageUrl: coverImageUrl || null,
          currency,
          defaultLocale,
          supportedLocales: ["tr", "en"],
          operatingHours: hours
        })
      });

      if (res.ok) {
        alert("Restoran ayarları başarıyla güncellendi.");
      } else {
        alert("Ayarlar güncellenirken hata oluştu.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const updateDayHour = (day: string, field: "open" | "close", val: string) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: val
      }
    }));
  };

  const days = [
    { key: "monday", label: "Pazartesi" },
    { key: "tuesday", label: "Salı" },
    { key: "wednesday", label: "Çarşamba" },
    { key: "thursday", label: "Perşembe" },
    { key: "friday", label: "Cuma" },
    { key: "saturday", label: "Cumartesi" },
    { key: "sunday", label: "Pazar" }
  ];

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-serif text-2xl font-bold">Mekan Ayarları</h2>
        <p className="text-xs text-gray-400 mt-1">Restoranınızın genel profili, çalışma saatleri ve para birimini yönetin.</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Cover Image Upload Header */}
        <div className="bg-[#16213E]/50 border border-gray-800/40 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
            <span>🖼️</span>
            <span>Kapak Görseli</span>
          </h3>
          
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 items-center">
            <div className="w-full md:w-64 h-36 rounded-xl bg-[#1C1C28] border border-gray-800 flex-shrink-0 relative overflow-hidden flex items-center justify-center">
              {coverImageUrl ? (
                <img src={coverImageUrl} alt="Kapak" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-500">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-xs">Görsel Yüklenmedi</span>
                </div>
              )}
            </div>
            
            <div className="flex-grow space-y-3 w-full">
              <input 
                type="text" 
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#C9A84C]/50 focus:outline-none"
                placeholder="Kapak resmi URL girin veya bilgisayarınızdan yükleyin"
              />
              
              <label className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-white border border-gray-700/50 w-fit cursor-pointer transition-colors">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Resim Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Dosya Seç & Yükle</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
              </label>
            </div>
          </div>
        </div>

        {/* General Details info card */}
        <div className="bg-[#16213E]/50 border border-gray-800/40 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
            <span>ℹ️</span>
            <span>Genel Bilgiler</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Mekan Adı</label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#C9A84C]/50 focus:outline-none"
                />
                <Clock className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Telefon Numarası</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono focus:border-[#C9A84C]/50 focus:outline-none"
                />
                <Phone className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Restoran Adresi</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#C9A84C]/50 focus:outline-none"
                />
                <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Para Birimi</label>
              <div className="relative">
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#C9A84C]/50 focus:outline-none"
                >
                  <option value="TRY">Türk Lirası (₺)</option>
                  <option value="USD">Amerikan Doları ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">Sterlin (£)</option>
                </select>
                <DollarSign className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Varsayılan Dil (i18n)</label>
              <div className="relative">
                <select 
                  value={defaultLocale}
                  onChange={(e) => setDefaultLocale(e.target.value)}
                  className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#C9A84C]/50 focus:outline-none"
                >
                  <option value="tr">Türkçe (tr)</option>
                  <option value="en">English (en)</option>
                </select>
                <Globe className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Operating Hours card */}
        <div className="bg-[#16213E]/50 border border-gray-800/40 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
            <span>⏰</span>
            <span>Çalışma Saatleri</span>
          </h3>

          <div className="space-y-3">
            {days.map((day) => (
              <div key={day.key} className="flex justify-between items-center py-2 border-b border-gray-800/30 last:border-0">
                <span className="text-xs font-semibold text-gray-300 w-28">{day.label}</span>
                
                <div className="flex items-center space-x-3">
                  <input 
                    type="text" 
                    value={hours[day.key]?.open || "09:00"}
                    onChange={(e) => updateDayHour(day.key, "open", e.target.value)}
                    className="bg-[#1C1C28] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono text-center w-20 focus:outline-none focus:border-[#C9A84C]/35"
                  />
                  <span className="text-gray-650 text-xs">-</span>
                  <input 
                    type="text" 
                    value={hours[day.key]?.close || "22:00"}
                    onChange={(e) => updateDayHour(day.key, "close", e.target.value)}
                    className="bg-[#1C1C28] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono text-center w-20 focus:outline-none focus:border-[#C9A84C]/35"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-sm transition-all shadow-lg shadow-[#722F37]/15"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Değişiklikleri Kaydet</span>
          </button>
        </div>
      </form>
    </div>
  );
}
