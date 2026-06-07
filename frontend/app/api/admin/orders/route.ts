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

    const orders = await prisma.order.findMany({
      where: { venueId },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mappedOrders = orders.map((order) => ({
      id: order.id,
      venueId: order.venueId,
      tableId: order.tableId,
      tableName: order.table?.name || null,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: Number(item.price),
        notes: item.notes,
        menuItemNameTr: item.menuItem?.nameTr || null,
        menuItemNameEn: item.menuItem?.nameEn || null,
      })),
    }));

    return NextResponse.json(mappedOrders);
  } catch (error: any) {
    console.error("Error listing orders: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
