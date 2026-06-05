export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json(
        { detail: "venueId query param is required" },
        { status: 400 }
      );
    }

    const tables = await prisma.table.findMany({
      where: { venueId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tables);
  } catch (error: any) {
    console.error("Error listing tables: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { venueId, name, areaName, qrToken } = body;

    if (!venueId || !name || !qrToken) {
      return NextResponse.json(
        { detail: "venueId, name, and qrToken are required" },
        { status: 400 }
      );
    }

    // Check if venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
    });
    if (!venue) {
      return NextResponse.json({ detail: "Venue not found" }, { status: 404 });
    }

    // Check for duplicate qrToken
    const existingTable = await prisma.table.findUnique({
      where: { qrToken },
    });
    if (existingTable) {
      return NextResponse.json(
        { detail: "QR Token already in use" },
        { status: 400 }
      );
    }

    const table = await prisma.table.create({
      data: {
        venueId,
        name,
        areaName: areaName || null,
        qrToken,
      },
    });

    return NextResponse.json(table, { status: 201 });
  } catch (error: any) {
    console.error("Error creating table: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
