"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, 
  Settings, 
  Loader2, 
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Plus,
  Trash2,
  Settings2,
  Check,
  X
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
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addRole, setAddRole] = useState("VENUE_MANAGER");
  const [addOrgId, setAddOrgId] = useState("");
  const [addIsActive, setAddIsActive] = useState(true);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRole, setEditRole] = useState("VENUE_MANAGER");
  const [editOrgId, setEditOrgId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

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

  const fetchOrganizations = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/super-admin/organizations`);
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.map((o: any) => ({ id: o.id, name: o.name })));
      }
    } catch (e) {
      console.error("Error fetching organizations: ", e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
  }, []);

  const handleOpenAddModal = () => {
    const randomId = "usr_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setAddUserId(randomId);
    setAddEmail("");
    setAddFirstName("");
    setAddLastName("");
    setAddRole("VENUE_MANAGER");
    setAddOrgId("");
    setAddIsActive(true);
    setAddModalOpen(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserId || !addEmail) {
      alert("Lütfen zorunlu alanları doldurun.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${apiUrl}/api/super-admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: addUserId,
          email: addEmail,
          firstName: addFirstName || null,
          lastName: addLastName || null,
          role: addRole,
          organizationId: addOrgId || null,
          isActive: addIsActive
        })
      });

      if (res.ok) {
        setAddModalOpen(false);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(`Kullanıcı Ekleme Hatası: ${data.detail || "İşlem başarısız."}`);
      }
    } catch (e: any) {
      console.error(e);
      alert("Hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (user: User) => {
    setSelectedUser(user);
    setEditEmail(user.email);
    setEditFirstName(user.firstName || "");
    setEditLastName(user.lastName || "");
    setEditRole(user.role);
    setEditOrgId(user.organizationId || "");
    setEditIsActive(user.isActive);
    setEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editEmail) {
      alert("Lütfen zorunlu alanları doldurun.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${apiUrl}/api/super-admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editEmail,
          firstName: editFirstName || null,
          lastName: editLastName || null,
          role: editRole,
          organizationId: editOrgId || null,
          isActive: editIsActive
        })
      });

      if (res.ok) {
        setEditModalOpen(false);
        fetchUsers();
      } else {
        const data = await res.json();
        alert(`Güncelleme Hatası: ${data.detail || "İşlem başarısız."}`);
      }
    } catch (e: any) {
      console.error(e);
      alert("Hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Bu kullanıcı hesabını silmek istediğinizden emin misiniz?")) return;

    try {
      const res = await fetch(`${apiUrl}/api/super-admin/users/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert("Kullanıcı silinemedi.");
      }
    } catch (e) {
      console.error(e);
      alert("Hata oluştu.");
    }
  };

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

        <button 
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-xs shadow-lg transition-all duration-300 transform active:scale-98"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Kullanıcı Ekle</span>
        </button>
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
                  <th className="py-4 px-6 text-right">İşlemler</th>
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
                      <div className="flex items-center justify-end space-x-2.5">
                        <button 
                          onClick={() => handleOpenEditModal(user)}
                          title="Düzenle"
                          className="p-1.5 rounded-lg border bg-[#121224] text-[#C9A84C] border-[#C9A84C]/30 hover:bg-[#C9A84C]/10 transition-colors"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          title="Sil"
                          className="p-1.5 rounded-lg border bg-red-950/20 text-red-500 border-red-900/30 hover:bg-red-900/30 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add User Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setAddModalOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          
          <form 
            onSubmit={handleAddUser}
            className="bg-[#16162a] border border-[#2C2C4E]/40 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10 animate-slide-up"
          >
            <div className="px-6 py-5 border-b border-[#2C2C4E]/30 flex items-center justify-between bg-[#121224]/50">
              <h3 className="font-serif text-[15px] font-bold text-white">Yeni Kullanıcı Hesabı Ekle</h3>
              <button 
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">User ID (Supabase UID) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="UUID Formatı"
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white font-mono outline-none focus:border-[#C9A84C]/45 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">E-posta Adresi <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  required
                  placeholder="kullanici@tripzy.travel"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Ad</label>
                  <input 
                    type="text" 
                    placeholder="Adı"
                    value={addFirstName}
                    onChange={(e) => setAddFirstName(e.target.value)}
                    className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Soyad</label>
                  <input 
                    type="text" 
                    placeholder="Soyadı"
                    value={addLastName}
                    onChange={(e) => setAddLastName(e.target.value)}
                    className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Platform Yetki Rolü</label>
                <select 
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                >
                  <option value="VENUE_MANAGER">Venue Manager (Restoran Yetkilisi)</option>
                  <option value="ORGANIZATION_ADMIN">Organization Admin (İşletme Sahibi)</option>
                  <option value="SUPER_ADMIN">Super Admin (DevOps/Sistem Yetkilisi)</option>
                </select>
              </div>

              {addRole !== "SUPER_ADMIN" && (
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Bağlı Olduğu İşletme (Tenant)</label>
                  <select 
                    value={addOrgId}
                    onChange={(e) => setAddOrgId(e.target.value)}
                    className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                  >
                    <option value="">İşletme Seçin...</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Hesap Durumu</label>
                <select 
                  value={addIsActive ? "true" : "false"}
                  onChange={(e) => setAddIsActive(e.target.value === "true")}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                >
                  <option value="true">Aktif</option>
                  <option value="false">Pasif (Askıda)</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#2C2C4E]/20 flex items-center justify-end space-x-3 bg-[#121224]/30">
              <button 
                type="button"
                onClick={() => setAddModalOpen(false)}
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
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <span>Kullanıcı Ekle</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setEditModalOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />
          
          <form 
            onSubmit={handleEditUser}
            className="bg-[#16162a] border border-[#2C2C4E]/40 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10 animate-slide-up"
          >
            <div className="px-6 py-5 border-b border-[#2C2C4E]/30 flex items-center justify-between bg-[#121224]/50">
              <h3 className="font-serif text-[15px] font-bold text-white">Kullanıcı Hesabını Düzenle</h3>
              <button 
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">E-posta Adresi <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  required
                  placeholder="kullanici@tripzy.travel"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Ad</label>
                  <input 
                    type="text" 
                    placeholder="Adı"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Soyad</label>
                  <input 
                    type="text" 
                    placeholder="Soyadı"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Platform Yetki Rolü</label>
                <select 
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                >
                  <option value="VENUE_MANAGER">Venue Manager (Restoran Yetkilisi)</option>
                  <option value="ORGANIZATION_ADMIN">Organization Admin (İşletme Sahibi)</option>
                  <option value="SUPER_ADMIN">Super Admin (DevOps/Sistem Yetkilisi)</option>
                </select>
              </div>

              {editRole !== "SUPER_ADMIN" && (
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-semibold">Bağlı Olduğu İşletme (Tenant)</label>
                  <select 
                    value={editOrgId}
                    onChange={(e) => setEditOrgId(e.target.value)}
                    className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                  >
                    <option value="">İşletme Seçin...</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-gray-400 font-semibold">Hesap Durumu</label>
                <select 
                  value={editIsActive ? "true" : "false"}
                  onChange={(e) => setEditIsActive(e.target.value === "true")}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 px-3 py-2.5 rounded-xl text-white outline-none focus:border-[#C9A84C]/45 transition-colors"
                >
                  <option value="true">Aktif</option>
                  <option value="false">Pasif (Askıda)</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#2C2C4E]/20 flex items-center justify-end space-x-3 bg-[#121224]/30">
              <button 
                type="button"
                onClick={() => setEditModalOpen(false)}
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
                    <span>Güncelleniyor...</span>
                  </>
                ) : (
                  <span>Değişiklikleri Kaydet</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
