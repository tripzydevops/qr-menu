"use client";

import React, { useState } from "react";
import {
  X,
  Tag,
  Phone,
  Percent,
  Check,
  Loader2,
  AlertCircle,
  Gift,
  Coins
} from "lucide-react";

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableName: string;
  totalBill: number;
  apiUrl: string;
  onDiscountApplied: (
    discountAmount: number,
    discountType: string | null,
    discountRef: string | null,
    message: string
  ) => void;
}

type DiscountTab = "coupon" | "loyalty" | "manual";

export default function DiscountModal({
  isOpen,
  onClose,
  tableId,
  tableName,
  totalBill,
  apiUrl,
  onDiscountApplied
}: DiscountModalProps) {
  const [activeTab, setActiveTab] = useState<DiscountTab>("coupon");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States
  const [couponCode, setCouponCode] = useState("");
  const [loyaltyPhone, setLoyaltyPhone] = useState("");
  const [loyaltyProfile, setLoyaltyProfile] = useState<{ name: string; points: number } | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [manualType, setManualType] = useState<"percentage" | "amount">("percentage");
  const [manualValue, setManualValue] = useState("");
  const [manualReason, setManualReason] = useState("");

  const [preview, setPreview] = useState<{
    subtotal: number;
    discountAmount: number;
    netAmount: number;
    message: string;
    discountType: string;
    discountRef: string;
  } | null>(null);

  if (!isOpen) return null;

  // 1. Search loyalty account by phone
  const handleSearchLoyalty = async () => {
    if (!loyaltyPhone.trim()) return;
    setError(null);
    setLoading(true);
    setLoyaltyProfile(null);
    setPreview(null);
    try {
      const res = await fetch(`${apiUrl}/api/admin/venues/v1/loyalty/${loyaltyPhone.trim()}`);
      if (!res.ok) {
        if (res.status === 404) {
          // Offer to register
          if (confirm("Bu telefon numarasına ait bir hesap bulunamadı. Yeni bir sadakat hesabı oluşturulsun mu?")) {
            const regRes = await fetch(`${apiUrl}/api/admin/venues/v1/loyalty`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                phone: loyaltyPhone.trim(),
                name: "Misafir"
              })
            });
            if (regRes.ok) {
              const newAcc = await regRes.json();
              setLoyaltyProfile({ name: newAcc.name || "Misafir", points: newAcc.points || 0 });
              return;
            }
          }
        }
        throw new Error("Hesap arama hatası.");
      }
      const data = await res.json();
      setLoyaltyProfile({ name: data.name || "Misafir", points: data.points || 0 });
    } catch (err: any) {
      setError(err.message || "Sadakat programı araması başarısız oldu.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Validate Discount (Preview)
  const handleValidate = async () => {
    setError(null);
    setPreview(null);
    setLoading(true);

    try {
      const body: any = {};
      if (activeTab === "coupon") {
        if (!couponCode.trim()) throw new Error("Kupon kodu giriniz.");
        body.couponCode = couponCode.trim();
      } else if (activeTab === "loyalty") {
        if (!loyaltyPhone.trim()) throw new Error("Telefon numarası giriniz.");
        if (!redeemPoints) throw new Error("Ödemede puan kullanmayı işaretleyin.");
        body.loyaltyPhone = loyaltyPhone.trim();
      } else if (activeTab === "manual") {
        if (!manualValue) throw new Error("Değer giriniz.");
        const val = parseFloat(manualValue);
        if (isNaN(val) || val <= 0) throw new Error("Geçerli bir sayı giriniz.");
        if (manualType === "percentage") {
          body.manualDiscountPercentage = val;
        } else {
          body.manualDiscountAmount = val;
        }
        body.manualReason = manualReason.trim() || "Kasiyer İndirimi";
      }

      const res = await fetch(`${apiUrl}/api/admin/tables/${tableId}/validate-discount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "İndirim doğrulanamadı.");
      }

      const data = await res.json();
      setPreview(data);
    } catch (err: any) {
      setError(err.message || "İndirim doğrulanırken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Apply Discount
  const handleApply = async () => {
    if (!preview) return;
    setError(null);
    setLoading(true);

    try {
      const body: any = {};
      if (preview.discountType === "COUPON") {
        body.couponCode = preview.discountRef;
      } else if (preview.discountType === "LOYALTY") {
        body.loyaltyPhone = preview.discountRef;
      } else if (preview.discountType === "MANUAL") {
        if (manualType === "percentage") {
          body.manualDiscountPercentage = parseFloat(manualValue);
        } else {
          body.manualDiscountAmount = parseFloat(manualValue);
        }
        body.manualReason = manualReason.trim() || "Kasiyer İndirimi";
      }

      const res = await fetch(`${apiUrl}/api/admin/tables/${tableId}/apply-discount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "İndirim uygulanamadı.");
      }

      onDiscountApplied(
        preview.discountAmount,
        preview.discountType,
        preview.discountRef,
        preview.message
      );
      setSuccessMsg("İndirim başarıyla masaya uygulandı!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "İndirim uygulaması başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="bg-[#16213E] w-full max-w-md mx-4 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800/60 bg-[#1a2646]">
          <div>
            <h3 className="font-bold text-white text-base">İndirim & Sadakat Kartı</h3>
            <p className="text-gray-400 text-xs mt-0.5">{tableName} · Toplam Hesap: {totalBill.toFixed(2)} ₺</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800/60">
          <button
            onClick={() => { setActiveTab("coupon"); setError(null); setPreview(null); }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === "coupon"
                ? "text-[#C9A84C] border-[#C9A84C] bg-[#C9A84C]/5"
                : "text-gray-400 hover:text-white border-transparent"
            }`}
          >
            <Tag className="h-4 w-4 inline mr-1.5" />
            <span>Kupon Kodu</span>
          </button>
          <button
            onClick={() => { setActiveTab("loyalty"); setError(null); setPreview(null); }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === "loyalty"
                ? "text-[#C9A84C] border-[#C9A84C] bg-[#C9A84C]/5"
                : "text-gray-400 hover:text-white border-transparent"
            }`}
          >
            <Coins className="h-4 w-4 inline mr-1.5" />
            <span>Sadakat Kartı</span>
          </button>
          <button
            onClick={() => { setActiveTab("manual"); setError(null); setPreview(null); }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === "manual"
                ? "text-[#C9A84C] border-[#C9A84C] bg-[#C9A84C]/5"
                : "text-gray-400 hover:text-white border-transparent"
            }`}
          >
            <Percent className="h-4 w-4 inline mr-1.5" />
            <span>Manuel İndirim</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4 max-h-[350px] overflow-y-auto">
          {successMsg ? (
            <div className="py-8 text-center text-green-400 space-y-3">
              <Check className="h-12 w-12 mx-auto bg-green-500/15 border border-green-500/30 p-2.5 rounded-full" />
              <div className="font-semibold">{successMsg}</div>
            </div>
          ) : (
            <>
              {/* --- COUPON TAB --- */}
              {activeTab === "coupon" && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-300">Kupon Kodu</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Örn: SAVE10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-[#1F2E54] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#C9A84C]/60"
                    />
                  </div>
                </div>
              )}

              {/* --- LOYALTY TAB --- */}
              {activeTab === "loyalty" && (
                <div className="space-y-3.5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-300">Telefon Numarası</label>
                    <div className="flex space-x-2">
                      <input
                        type="tel"
                        placeholder="Örn: 05551234567"
                        value={loyaltyPhone}
                        onChange={(e) => setLoyaltyPhone(e.target.value)}
                        className="flex-1 bg-[#1F2E54] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#C9A84C]/60"
                      />
                      <button
                        onClick={handleSearchLoyalty}
                        disabled={loading}
                        className="px-4 bg-[#2A3F75] hover:bg-[#344D8E] text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sorgula"}
                      </button>
                    </div>
                  </div>

                  {loyaltyProfile && (
                    <div className="bg-[#1f2d50] p-4 rounded-xl border border-gray-800 space-y-3 text-xs">
                      <div className="flex justify-between items-center text-white">
                        <span className="font-semibold flex items-center"><Gift className="h-4 w-4 text-[#C9A84C] mr-1" /> Müşteri:</span>
                        <span>{loyaltyProfile.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-white">
                        <span className="font-semibold">Bakiye Puanı:</span>
                        <span className="font-bold text-[#C9A84C] font-mono">{loyaltyProfile.points} Puan</span>
                      </div>
                      <div className="flex justify-between items-center text-[#C9A84C] text-[10px] italic">
                        <span>(10 Puan = 1.00 ₺)</span>
                        <span>Kullanılabilir: {(loyaltyProfile.points / 10).toFixed(2)} ₺</span>
                      </div>

                      {loyaltyProfile.points > 0 ? (
                        <label className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-800/40 text-gray-300 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={redeemPoints}
                            onChange={(e) => { setRedeemPoints(e.target.checked); setPreview(null); }}
                            className="rounded border-gray-600 bg-gray-700 text-[#C9A84C] focus:ring-0"
                          />
                          <span>Ödemede puanları indirim olarak kullan</span>
                        </label>
                      ) : (
                        <div className="text-gray-500 text-[10px] mt-1">
                          Hesabın puanı bulunmuyor. Bu ödeme tamamlandığında puan yüklenecektir.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* --- MANUAL TAB --- */}
              {activeTab === "manual" && (
                <div className="space-y-3">
                  <div className="flex space-x-3 mb-1">
                    <button
                      onClick={() => { setManualType("percentage"); setPreview(null); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                        manualType === "percentage"
                          ? "bg-[#C9A84C]/10 border-[#C9A84C] text-[#C9A84C]"
                          : "bg-[#1F2E54] border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      Oransal (%)
                    </button>
                    <button
                      onClick={() => { setManualType("amount"); setPreview(null); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                        manualType === "amount"
                          ? "bg-[#C9A84C]/10 border-[#C9A84C] text-[#C9A84C]"
                          : "bg-[#1F2E54] border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      Tutar (₺)
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Miktar</label>
                      <input
                        type="number"
                        placeholder={manualType === "percentage" ? "10" : "50"}
                        value={manualValue}
                        onChange={(e) => { setManualValue(e.target.value); setPreview(null); }}
                        className="w-full bg-[#1F2E54] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/60"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">Neden / Açıklama</label>
                      <input
                        type="text"
                        placeholder="Örn: İkram, Masa Yuvarlama"
                        value={manualReason}
                        onChange={(e) => { setManualReason(e.target.value); setPreview(null); }}
                        className="w-full bg-[#1F2E54] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/60"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-start space-x-2 text-xs">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Preview Box */}
              {preview && (
                <div className="p-3.5 rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 text-xs space-y-2.5 animate-scale-in">
                  <div className="font-bold text-[#C9A84C] flex items-center justify-between border-b border-[#C9A84C]/20 pb-1.5">
                    <span>Hesap Özeti</span>
                    <span className="bg-[#C9A84C]/10 px-2 py-0.5 rounded font-normal text-[10px]">{preview.message}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-300">
                    <span>Brüt Tutar:</span>
                    <span className="font-mono">{preview.subtotal.toFixed(2)} ₺</span>
                  </div>
                  <div className="flex justify-between items-center text-green-400">
                    <span>Toplam İndirim:</span>
                    <span className="font-mono font-semibold">-{preview.discountAmount.toFixed(2)} ₺</span>
                  </div>
                  <div className="flex justify-between items-center text-white border-t border-gray-800/60 pt-2 font-bold text-sm">
                    <span>Net Ödenecek:</span>
                    <span className="font-mono text-[#C9A84C]">{preview.netAmount.toFixed(2)} ₺</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!successMsg && (
          <div className="p-5 border-t border-gray-800/60 flex items-center space-x-3 bg-[#131b32]">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-semibold transition-colors"
            >
              İptal
            </button>
            {preview ? (
              <button
                onClick={handleApply}
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-1.5 py-3 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#B8963E] text-black font-bold text-sm shadow-lg hover:from-[#D4B35A] hover:to-[#C9A84C] active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "İndirimi Uygula"}
              </button>
            ) : (
              <button
                onClick={handleValidate}
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-1.5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Doğrula & Hesapla"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
