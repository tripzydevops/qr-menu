export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { detail: "status is required" },
        { status: 400 }
      );
    }

    if (!["pending", "completed"].includes(status)) {
      return NextResponse.json(
        { detail: "Invalid status value" },
        { status: 400 }
      );
    }

    const req = await prisma.waiterRequest.update({
      where: { id },
      data: { status },
      include: {
        table: true,
      },
    });

    const mappedRequest = {
      id: req.id,
      venueId: req.venueId,
      tableId: req.tableId,
      tableName: req.table?.name || null,
      areaName: req.table?.areaName || null,
      type: req.type,
      status: req.status,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
    };

    return NextResponse.json(mappedRequest);
  } catch (error: any) {
    console.error("Error updating waiter request status: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
