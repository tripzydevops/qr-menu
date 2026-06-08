"use client";

import React, { useEffect, useState } from "react";
import { 
  Star, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  Loader2, 
  AlertCircle,
  Check,
  MessageSquare
} from "lucide-react";

interface SuperAdminReview {
  id: string;
  rating: number;
  comment: string | null;
  guestName: string | null;
  itemName: string;
  venueName: string;
  createdAt: string;
}

export default function SuperAdminReviewsPage() {
  const [reviews, setReviews] = useState<SuperAdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");

  // Editing state
  const [editingReview, setEditingReview] = useState<SuperAdminReview | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [editGuestName, setEditGuestName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiUrl}/api/super-admin/reviews`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const data = await res.json();
      setReviews(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`${apiUrl}/api/super-admin/reviews/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setReviews(prev => prev.filter(r => r.id !== id));
      } else {
        alert("Yorum silinemedi.");
      }
    } catch (e) {
      console.error(e);
      alert("Bir hata oluştu.");
    }
  };

  const handleEditClick = (rev: SuperAdminReview) => {
    setEditingReview(rev);
    setEditRating(rev.rating);
    setEditComment(rev.comment || "");
    setEditGuestName(rev.guestName || "");
    setSaveError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      const res = await fetch(`${apiUrl}/api/super-admin/reviews/${editingReview.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: editRating,
          comment: editComment || null,
          guestName: editGuestName || null
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setReviews(prev => prev.map(r => r.id === editingReview.id ? { 
          ...r, 
          rating: updated.rating, 
          comment: updated.comment, 
          guestName: updated.guestName 
        } : r));
        setEditingReview(null);
      } else {
        const errData = await res.json();
        setSaveError(errData.detail || "Güncelleme başarısız.");
      }
    } catch (err) {
      console.error(err);
      setSaveError("Beklenmeyen bir hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filter & Search logic
  const filteredReviews = reviews.filter((rev) => {
    const matchesRating = ratingFilter === "all" || rev.rating === ratingFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      rev.guestName?.toLowerCase().includes(searchLower) ||
      rev.comment?.toLowerCase().includes(searchLower) ||
      rev.itemName.toLowerCase().includes(searchLower) ||
      rev.venueName.toLowerCase().includes(searchLower);

    return matchesRating && matchesSearch;
  });

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C] mb-4" />
        <p className="text-sm">Yorumlar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in select-none">
      <div className="flex justify-between items-center bg-gradient-to-r from-[#16162a]/95 to-[#121224]/50 border border-[#2C2C4E]/30 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold font-serif text-white tracking-wide flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-[#C9A84C]" />
            <span>Müşteri Değerlendirmeleri Yönetimi</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Tripzy platformunda kayıtlı restoranlar için bırakılan tüm yemek yorumlarını ve yıldız puanlarını buradan inceleyebilir, düzenleyebilir veya silebilirsiniz.
          </p>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#16162a]/60 border border-[#2C2C4E]/25 p-4 rounded-2xl">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Misafir, yemek veya mekan ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121224] border border-[#2C2C4E]/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A84C]/50"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto shrink-0 justify-end">
          <Filter className="h-4.5 w-4.5 text-gray-400" />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="bg-[#121224] border border-[#2C2C4E]/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
          >
            <option value="all">Tüm Puanlar (Filtre Yok)</option>
            <option value="5">5 Yıldız (★★★★★)</option>
            <option value="4">4 Yıldız (★★★★☆)</option>
            <option value="3">3 Yıldız (★★★☆☆)</option>
            <option value="2">2 Yıldız (★★☆☆☆)</option>
            <option value="1">1 Yıldız (★☆☆☆☆)</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/25 p-6 rounded-2xl text-center text-red-400">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-[#16162a]/30 border border-[#2C2C4E]/20 p-12 rounded-2xl text-center text-gray-500">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 text-gray-650 animate-pulse" />
          <p className="text-sm">Kriterlere uygun müşteri yorumu bulunamadı.</p>
        </div>
      ) : (
        <div className="bg-[#16162a]/60 border border-[#2C2C4E]/25 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2C2C4E]/40 bg-[#121224]/40 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-4.5 px-6">Yazan</th>
                  <th className="py-4.5 px-6">Mekan / Şube</th>
                  <th className="py-4.5 px-6">Yemek / Öğe</th>
                  <th className="py-4.5 px-6">Yıldız Puanı</th>
                  <th className="py-4.5 px-6">Yorum / Düşünce</th>
                  <th className="py-4.5 px-6 text-center">Tarih</th>
                  <th className="py-4.5 px-6 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C2C4E]/20 text-xs text-gray-300">
                {filteredReviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">{rev.guestName || "Guest"}</td>
                    <td className="py-4 px-6 text-gray-400 font-serif">{rev.venueName}</td>
                    <td className="py-4 px-6 font-semibold text-[#DFBA73]">{rev.itemName}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center text-[#DFBA73] font-mono font-bold space-x-1">
                        <span>{rev.rating}</span>
                        <span>★</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 max-w-xs truncate italic" title={rev.comment || ""}>
                      {rev.comment || <span className="text-gray-600 font-light">Sadece puanlama yaptı</span>}
                    </td>
                    <td className="py-4 px-6 text-center font-mono text-[11px] text-gray-500">
                      {new Date(rev.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2.5 whitespace-nowrap">
                      <button
                        onClick={() => handleEditClick(rev)}
                        className="p-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 hover:bg-indigo-500/20 hover:text-white transition-all"
                        title="Düzenle"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rev.id)}
                        className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/20 hover:text-white transition-all"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0A0A0B]/85 backdrop-blur-md" onClick={() => setEditingReview(null)} />
          
          <div className="relative w-full max-w-md rounded-2xl border border-[#C9A84C]/35 bg-[#16162a] p-6 shadow-2xl animate-fade-in-up z-10 text-left">
            <h3 className="font-serif text-lg font-bold text-white mb-1">Yorumu Düzenle</h3>
            <p className="text-[11px] text-[#DFBA73] mb-4">Mekan: {editingReview.venueName} • Yemek: {editingReview.itemName}</p>

            {saveError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-xl mb-3">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Misafir İsmi</label>
                <input 
                  type="text" 
                  value={editGuestName}
                  onChange={(e) => setEditGuestName(e.target.value)}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Yıldız Puanı</label>
                <div className="flex space-x-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      className={`text-2xl focus:outline-none transition-transform active:scale-125 ${
                        star <= editRating ? 'text-[#DFBA73]' : 'text-gray-700'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Yazılı Yorum</label>
                <textarea 
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={4}
                  className="w-full bg-[#121224] border border-[#2C2C4E]/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C9A84C]/50 resize-none"
                  placeholder="Yorum yapılmadı..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-4 py-2 rounded-xl border border-gray-800 hover:bg-white/5 text-xs text-gray-400"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Değişiklikleri Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
