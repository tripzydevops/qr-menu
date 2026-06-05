"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, 
  Settings, 
  Loader2, 
  AlertCircle,
  ShieldCheck,
  UserCheck
} from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  organizationId: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://hotelplus:8080";

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/super-admin/users`);
      if (!res.ok) throw new Error("Failed to fetch users list");
      const data = await res.json();
      setUsers(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === "VENUE_MANAGER" 
      ? "ORGANIZATION_ADMIN" 
      : currentRole === "ORGANIZATION_ADMIN" 
        ? "SUPER_ADMIN" 
        : "VENUE_MANAGER";

    const confirmMsg = `Kullanıcı rolünü "${nextRole}" olarak güncellemek istediğinize emin misiniz?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${apiUrl}/api/super-admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole })
      });

      if (res.ok) {
        fetchUsers();
      } else {
        alert("Rol güncellenemedi.");
      }
    } catch (e) {
      console.error(e);
      alert("Hata oluştu.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2C2C4E]/20 pb-5">
        <div>
          <h2 className="text-xl font-bold font-serif text-white flex items-center space-x-2">
            <Users className="h-5 w-5 text-[#C9A84C]" />
            <span>Kullanıcı Yetkilendirme Paneli</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">SaaS platformundaki tüm hesapları listeyin ve rollerini/yetkilerini düzenleyin.</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C] mb-4" />
          <p className="text-xs">Kullanıcı verileri yükleniyor...</p>
        </div>
      ) : error ? (
        <div className="flex items-center space-x-3 bg-red-950/20 border border-red-900/40 p-4 rounded-xl text-xs text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>Hata: {error}</span>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 bg-[#16162a]/30 border border-dashed border-[#2C2C4E]/30 rounded-2xl">
          <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-sm text-gray-400">Sistemde henüz kayıtlı kullanıcı bulunmuyor.</p>
        </div>
      ) : (
        /* Data table */
        <div className="bg-[#16162a]/60 border border-[#2C2C4E]/25 rounded-2xl overflow-hidden shadow-lg animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#121224]/75 border-b border-[#2C2C4E]/30 text-xs font-semibold text-[#C9A84C] uppercase tracking-wider">
                  <th className="py-4 px-6">Ad Soyad / E-posta</th>
                  <th className="py-4 px-6">Auth ID (Supabase)</th>
                  <th className="py-4 px-6">Platform Yetki Rolü</th>
                  <th className="py-4 px-6">Bağlı İşletme</th>
                  <th className="py-4 px-6 text-right">Rol Değiştir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C2C4E]/20 text-xs text-gray-300">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#1D1D3A]/20 transition-colors">
                    <td className="py-4.5 px-6">
                      <div className="font-semibold text-white">
                        {user.firstName || user.lastName 
                          ? `${user.firstName || ""} ${user.lastName || ""}`
                          : "Belirtilmemiş"
                        }
                      </div>
                      <div className="text-gray-400 text-[11px] mt-0.5 font-mono">{user.email}</div>
                    </td>
                    <td className="py-4.5 px-6 font-mono text-gray-500">{user.id}</td>
                    <td className="py-4.5 px-6">
                      <span className={`px-2.5 py-1 rounded-full font-serif font-bold text-[9px] uppercase border tracking-wide ${
                        user.role === "SUPER_ADMIN"
                          ? "bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/25"
                          : user.role === "ORGANIZATION_ADMIN"
                            ? "bg-[#6366F1]/10 text-indigo-400 border-[#6366F1]/25"
                            : "bg-[#2A2A3D]/80 text-gray-400 border-gray-700/30"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 font-mono text-gray-400">
                      {user.organizationId ? user.organizationId : "Tüm Platform (Global)"}
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      <button 
                        onClick={() => handleChangeRole(user.id, user.role)}
                        title="Rolü Değiştir"
                        className="p-1.5 rounded-lg border border-[#2C2C4E]/40 bg-[#121224] text-gray-400 hover:text-white hover:border-[#C9A84C]/40 transition-colors inline-flex items-center space-x-1"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-semibold px-1">Rolü Değiştir</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
