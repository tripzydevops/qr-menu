export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { venueId, tableId, signals } = body;

    if (!venueId || !signals || !Array.isArray(signals)) {
      return NextResponse.json(
        { detail: "venueId and signals array are required" },
        { status: 400 }
      );
    }

    const dataToInsert = signals.map((sig: any) => ({
      id: crypto.randomUUID(),
      sessionId: sig.sessionId,
      venueId,
      tableId: tableId || null,
      eventType: sig.eventType,
      eventData: sig.eventData || {},
      createdAt: sig.createdAt ? new Date(sig.createdAt) : new Date(),
    }));

    await prisma.userSignal.createMany({
      data: dataToInsert,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error recording user signals: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
