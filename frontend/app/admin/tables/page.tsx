"use client";

import React, { useEffect, useState } from "react";
import { 
  Plus, 
  Trash2, 
  Download, 
  ExternalLink, 
  QrCode, 
  Loader2, 
  Printer,
  Copy,
  Check
} from "lucide-react";
import Link from "next/link";

interface Table {
  id: string;
  name: string;
  areaName: string | null;
  qrToken: string;
  venueId: string;
}

export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form state
  const [tableName, setTableName] = useState("");
  const [areaName, setAreaName] = useState("Bahçe");
  const [qrToken, setQrToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const venueId = "venue-karakoy-main";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://hotelplus:8080";
  // The live url format the QR code maps to
  const getGuestMenuUrl = (token: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/menu?token=${token}`;
    }
    return `/menu?token=${token}`;
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/admin/tables?venueId=${venueId}`);
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName) return;

    // Generate unique token if empty
    const token = qrToken || `tbl_${Math.random().toString(36).substring(2, 8)}`;

    try {
      setIsSubmitting(true);
      const res = await fetch(`${apiUrl}/api/admin/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          name: tableName,
          areaName: areaName || null,
          qrToken: token
        })
      });

      if (res.ok) {
        setTableName("");
        setQrToken("");
        fetchTables();
      } else {
        const err = await res.json();
        alert(err.detail || "Error adding table.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm("Are you sure you want to delete this table? The QR code will no longer function.")) return;

    try {
      const res = await fetch(`${apiUrl}/api/admin/tables/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchTables();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = getGuestMenuUrl(token);
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handlePrintQR = (table: Table) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(getGuestMenuUrl(table.qrToken))}`;
    
    // Create new printable window
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Tag - ${table.name}</title>
          <style>
            body {
              font-family: 'Inter', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 90vh;
              margin: 0;
              text-align: center;
              background-color: white;
              color: #1C1C28;
            }
            .container {
              border: 4px double #C9A84C;
              padding: 40px;
              border-radius: 20px;
              width: 320px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            }
            h1 {
              font-size: 28px;
              margin: 0 0 10px 0;
              font-family: 'Georgia', serif;
              font-weight: bold;
            }
            p {
              font-size: 14px;
              color: #666;
              margin: 0 0 30px 0;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            img {
              width: 250px;
              height: 250px;
              margin-bottom: 30px;
            }
            .footer {
              font-size: 10px;
              color: #C9A84C;
              font-weight: bold;
              letter-spacing: 3px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${table.name}</h1>
            <p>${table.areaName || 'MASA'}</p>
            <img src="${qrUrl}" alt="QR Code" />
            <div class="footer">TRIPZY.TRAVEL</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl font-bold">Masalar ve QR Kodları</h2>
        <p className="text-xs text-gray-400 mt-1">Mekanınızdaki masaları yönetin, QR kodlarını indirin veya yazdırın.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Table form card */}
        <div className="bg-[#16213E]/50 border border-gray-800/40 p-6 rounded-2xl h-fit space-y-4 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-white flex items-center space-x-2">
            <span>➕</span>
            <span>Masa Ekle</span>
          </h3>
          
          <form onSubmit={handleAddTable} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Masa Adı / No</label>
              <input 
                type="text" 
                required
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#C9A84C]/50 focus:outline-none"
                placeholder="örn. Masa 12, Oda 305"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Bölge (Opsiyonel)</label>
              <select 
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#C9A84C]/50 focus:outline-none"
              >
                <option value="Bahçe">Bahçe</option>
                <option value="Teras">Teras</option>
                <option value="İç Mekan">İç Mekan</option>
                <option value="Havuz Başı">Havuz Başı</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">QR Token (Opsiyonel)</label>
              <input 
                type="text" 
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                className="w-full bg-[#1C1C28] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-[#C9A84C]/50 focus:outline-none"
                placeholder="Boş bırakırsanız otomatik üretilir"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-1.5 py-3 rounded-xl bg-gradient-to-r from-[#722F37] to-[#C9A84C]/80 hover:to-[#C9A84C] text-white font-semibold text-sm transition-all shadow-md shadow-[#722F37]/15"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Masayı Kaydet</span>
            </button>
          </form>
        </div>

        {/* Tables list grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-serif text-lg font-bold text-white">Aktif Masalar ({tables.length})</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map((table) => {
              const menuUrl = getGuestMenuUrl(table.qrToken);
              const qrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=4&data=${encodeURIComponent(menuUrl)}`;
              const isCopied = copiedToken === table.qrToken;
              
              return (
                <div key={table.id} className="bg-[#16213E]/50 border border-gray-800/40 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-4">
                    {/* QR Preview Box */}
                    <div className="w-16 h-16 rounded-xl bg-white border border-[#C9A84C]/20 overflow-hidden flex-shrink-0 p-1 flex items-center justify-center">
                      <img src={qrCodeImage} alt="QR" className="w-full h-full object-contain" />
                    </div>

                    <div>
                      <h4 className="font-serif text-[15px] font-bold text-white flex items-center space-x-1.5">
                        <span>{table.name}</span>
                        {table.areaName && (
                          <span className="text-[10px] bg-[#2A2A3D] text-gray-400 font-sans font-medium px-2 py-0.5 rounded border border-gray-800/50">
                            {table.areaName}
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5 select-all">Token: {table.qrToken}</p>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col space-y-1.5 items-end pl-3">
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => handleCopyLink(table.qrToken)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isCopied 
                            ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" 
                            : "bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white border-gray-800/50"
                        }`}
                        title="Bağlantıyı Kopyala"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>

                      <button 
                        onClick={() => handlePrintQR(table)}
                        className="p-1.5 rounded-lg bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800/50 transition-colors"
                        title="QR Etiketi Yazdır"
                      >
                        <Printer className="h-3.5 w-3.5 text-[#C9A84C]" />
                      </button>

                      <button 
                        onClick={() => handleDeleteTable(table.id)}
                        className="p-1.5 rounded-lg bg-red-950/10 hover:bg-red-950/40 text-red-400 border border-red-950/20 transition-colors"
                        title="Masayı Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <Link 
                      href={`/menu?token=${table.qrToken}`}
                      target="_blank"
                      className="text-[10px] font-semibold text-gray-400 hover:text-[#C9A84C] flex items-center space-x-0.5 mt-1 transition-colors"
                    >
                      <span>Menüyü Aç</span>
                      <ExternalLink className="h-2 w-2" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
