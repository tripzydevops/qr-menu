export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const sessionId = searchParams.get("sessionId") || "";
    const date = searchParams.get("date") || "";

    if (!venueId) {
      return NextResponse.json(
        { detail: "venueId query param is required" },
        { status: 400 }
      );
    }

    let targetUrl = `${BACKEND_URL}/api/admin/cashier/summary?venueId=${venueId}`;
    if (sessionId) targetUrl += `&sessionId=${sessionId}`;
    if (date) targetUrl += `&date=${date}`;

    console.log(`[Proxy] Routing GET request to: ${targetUrl}`);

    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { detail: errorText || `Backend returned error ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Proxy] Error getting cashier summary: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
