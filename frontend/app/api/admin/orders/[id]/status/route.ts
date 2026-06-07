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

    if (!["pending", "preparing", "ready", "served", "completed", "cancelled"].includes(status)) {
      return NextResponse.json(
        { detail: "Invalid status value" },
        { status: 400 }
      );
    }

    const updateData: any = { status };
    if (status === "completed") {
      updateData.paidAt = new Date();
      updateData.paymentMethod = "cash"; // default fallback for manual dashboard completions
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    const mappedOrder = {
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
    };

    return NextResponse.json(mappedOrder);
  } catch (error: any) {
    console.error("Error updating order status: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
