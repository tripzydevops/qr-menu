export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const status = searchParams.get("status") || undefined;

    if (!venueId) {
      return NextResponse.json(
        { detail: "venueId query param is required" },
        { status: 400 }
      );
    }

    const requests = await prisma.waiterRequest.findMany({
      where: {
        venueId,
        ...(status ? { status } : {}),
      },
      include: {
        table: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const mappedRequests = requests.map((req) => ({
      id: req.id,
      venueId: req.venueId,
      tableId: req.tableId,
      tableName: req.table?.name || null,
      areaName: req.table?.areaName || null,
      type: req.type,
      status: req.status,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
    }));

    return NextResponse.json(mappedRequests);
  } catch (error: any) {
    console.error("Error listing waiter requests: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
