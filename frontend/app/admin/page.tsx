"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/admin/menu");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#1C1C28] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#C9A84C]"></div>
    </div>
  );
}

