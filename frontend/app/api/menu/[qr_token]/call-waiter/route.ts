export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { qr_token: string } }
) {
  try {
    const { qr_token } = params;
    const body = await request.json();
    const { type } = body; // "waiter" | "bill"

    if (!type || (type !== "waiter" && type !== "bill")) {
      return NextResponse.json(
        { detail: "Invalid request type." },
        { status: 400 }
      );
    }

    // 1. Resolve Table
    const table = await prisma.table.findUnique({
      where: { qrToken: qr_token },
    });

    if (!table) {
      return NextResponse.json(
        { detail: "Table/QR Code not found." },
        { status: 404 }
      );
    }

    // 2. Create Waiter Request
    const waiterRequest = await prisma.waiterRequest.create({
      data: {
        venueId: table.venueId,
        tableId: table.id,
        type,
        status: "pending",
      },
    });

    return NextResponse.json(
      {
        id: waiterRequest.id,
        venueId: waiterRequest.venueId,
        tableId: waiterRequest.tableId,
        tableName: table.name,
        areaName: table.areaName,
        type: waiterRequest.type,
        status: waiterRequest.status,
        createdAt: waiterRequest.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating waiter request: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
