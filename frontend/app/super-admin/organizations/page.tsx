"use client";

import React, { useEffect, useState } from "react";
import { 
  Building2, 
  Plus, 
  Trash2, 
  Settings2,
  Check, 
  X, 
  Loader2, 
  Users, 
  TrendingUp, 
  AlertCircle 
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  logoUrl: string | null;
  brandColor: string | null;
  subscriptionTier: string;
  status: string;
  createdAt: string;
}

export default function SuperAdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [orgName, setOrgName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [planTier, setPlanTier] = useState("free");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/super-admin/organizations`);
      if (!res.ok) throw new Error("Failed to fetch organizations list");
      const data = await res.json();
      setOrganizations(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleOpenModal = () => {
    // Generate a pseudo-random user ID mimicking a Supabase sign-up ID
    const randomId = "usr_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setAdminUserId(randomId);
    setOrgName("");
    setAdminEmail("");
    setAdminFirstName("");
    setAdminLastName("");
    setPlanTier("free");
    setModalOpen(true);
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !adminEmail || !adminUserId) {
      alert("Lütfen zorunlu alanları doldurun.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${apiUrl}/api/super-admin/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName,
          adminEmail,
          adminFirstName,
          adminLastName,
          adminUserId,
          subscriptionTier: planTier
        })
      });

      if (res.ok) {
        setModalOpen(false);
        fetchOrganizations();
      } else {
        const data = await res.json();
        alert(`Onboarding Hatası: ${data.detail || "İşlem başarısız."}${data.error ? "\nDetay: " + data.error : ""}`);
      }
    } catch (e: any) {
      console.error(e);
      alert("Hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    const confirmMsg = nextStatus === "suspended" 
      ? "Bu işletmeyi askıya almak istediğinizden emin misiniz? İşletme altındaki tüm restoranların menü erişimi durdurulacaktır."
      : "Bu işletmeyi tekrar aktif etmek istiyor musunuz?";
    
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${apiUrl}/api/super-admin/organizations/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchOrganizations();
      } else {
        alert("Durum güncellenemedi.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangePlan = async (id: string, currentPlan: string) => {
    const nextPlan = currentPlan === "free" 
      ? "pro" 
      : currentPlan === "pro" 
        ? "premium" 
        : "free";

    try {
      const res = await fetch(`${apiUrl}/api/super-admin/organizations/${id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionTier: nextPlan })
      });
      if (res.ok) {
        fetchOrganizations();
      } else {
        alert("Plan değiştirilemedi.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex items-center justify-between border-b border-[#2C2C4E]/20 pb-5">
        <div>
          <h2 className="text-xl font-bold font-serif text-white flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-[#C9A84C]" />
            <span>Üye İşletme Yönetimi (Tenants)</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">SaaS sisteminde kayıtlı olan tüm otelleri ve restoran gruplarını yönetin.</p>
        </div>

        <button 
          onClick={handleOpenModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-xs shadow-lg transition-all duration-300 transform active:scale-98"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni İşletme Onboard Et</span>
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C] mb-4" />
          <p className="text-xs">Üye listesi güncelleniyor...</p>
        </div>
      ) : error ? (
        <div className="flex items-center space-x-3 bg-red-950/20 border border-red-900/40 p-4 rounded-xl text-xs text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>Hata: {error}</span>
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-16 bg-[#16162a]/30 border border-dashed border-[#2C2C4E]/30 rounded-2xl">
          <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-sm text-gray-400">Sistemde henüz kayıtlı işletme bulunmuyor.</p>
        </div>
      ) : (
        /* Data table */
        <div className="bg-[#16162a]/60 border border-[#2C2C4E]/25 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#121224]/75 border-b border-[#2C2C4E]/30 text-xs font-semibold text-[#C9A84C] uppercase tracking-wider">
                  <th className="py-4 px-6">İşletme Adı</th>
                  <th className="py-4 px-6">Onboarding ID</th>
                  <th className="py-4 px-6">SaaS Üyelik Planı</th>
                  <th className="py-4 px-6">Hesap Durumu</th>
                  <th className="py-4 px-6 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C2C4E]/20 text-xs text-gray-300">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-[#1D1D3A]/20 transition-colors">
                    <td className="py-4.5 px-6 font-medium text-white flex items-center space-x-3.5">
                      <div className="h-8.5 w-8.5 bg-[#121224] border border-[#2C2C4E]/40 rounded-lg flex items-center justify-center font-bold text-[#C9A84C] uppercase">
                        {org.name.slice(0, 2)}
                      </div>
                      <span>{org.name}</span>
                    </td>
                    <td className="py-4.5 px-6 font-mono text-gray-400">{org.id}</td>
                    <td className="py-4.5 px-6">
                      <button 
                        onClick={() => handleChangePlan(org.id, org.subscriptionTier)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-serif font-bold text-[10px] uppercase border transition-all duration-300 ${
                          org.subscriptionTier === "premium"
                            ? "bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20"
                            : org.subscriptionTier === "pro"
                              ? "bg-[#6366F1]/10 text-indigo-400 border-[#6366F1]/20"
                              : "bg-gray-800/50 text-gray-400 border-gray-700/30"
                        }`}
                      >
                        <TrendingUp className="h-3 w-3" />
                        <span>{org.subscriptionTier}</span>
                      </button>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] uppercase ${
                        org.status === "active"
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/30"
                          : "bg-red-950/60 text-red-400 border border-red-900/30"
                      }`}>
                        {org.status === "active" ? "Aktif" : "Askıda"}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2.5">
                        <button 
                          onClick={() => handleToggleStatus(org.id, org.status)}
                          title={org.status === "active" ? "Askıya Al" : "Aktif Et"}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            org.status === "active"
                              ? "bg-red-950/20 text-red-400 border-red-900/30 hover:bg-red-900/30"
                              : "bg-emerald-950/20 text-emerald-400 border-emerald-900/30 hover:bg-emerald-900/30"
                          }`}
                        >
                          {org.status === "active" ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          
          <form 
            onSubmit={handleOnboard}
            className="bg-[#16162a] border border-[#2C2C4E]/40 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10 animate-slide-up"
          >
            <div className="px-6 py-5 border-b border-[#2C2C4E]/30 flex items-center justify-between bg-[#121224]/50">
              <h3 className="font-serif text-[15px] font-bold text-white">Yeni İşletme Onboarding Formu</h3>
              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">İşletme / Restoran Adı <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="örn. Karaköy Lokantası"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Yönetici Adı</label>
                  <input 
                    type="text" 
                    placeholder="Ahmet"
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Yönetici Soyadı</label>
                  <input 
                    type="text" 
                    placeholder="Yılmaz"
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Yönetici E-posta Adresi <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  required
                  placeholder="admin@restoran.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Admin Auth User ID (Supabase UID) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="UUID Formatı"
                  value={adminUserId}
                  onChange={(e) => setAdminUserId(e.target.value)}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white font-mono outline-none focus:border-[#C9A84C]/45 transition-colors"
                />
                <span className="text-[10px] text-gray-500 leading-normal block">
                  İşletme sahibinin kimlik doğrulama hesabı için otomatik atanan UUID. İsteğe bağlı olarak güncellenebilir.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Başlangıç SaaS Planı</label>
                <select 
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value)}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                >
                  <option value="free">Free (Ücretsiz Paket)</option>
                  <option value="pro">Pro (Standart Ücretli)</option>
                  <option value="premium">Premium (Elit Paket)</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#2C2C4E]/20 flex items-center justify-end space-x-3 bg-[#121224]/30">
              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#2C2C4E]/40 hover:bg-[#2C2C4E]/60 text-gray-300 font-semibold text-xs transition-colors"
              >
                İptal
              </button>
              
              <button 
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-xs shadow-lg transition-all duration-300"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Kuruluyor...</span>
                  </>
                ) : (
                  <span>İşletmeyi Onboard Et</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
