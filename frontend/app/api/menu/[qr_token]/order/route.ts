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
    const { items } = body; // Array of { menuItemId: string, quantity: number, notes: string | null }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { detail: "Order items cannot be empty." },
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

    // 2. Verify items and calculate total amount
    let totalAmount = 0;
    const verifiedItems = [];

    for (const itemIn of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: itemIn.menuItemId },
      });

      if (!menuItem) {
        return NextResponse.json(
          { detail: `Menu item ${itemIn.menuItemId} not found.` },
          { status: 404 }
        );
      }

      if (!menuItem.isAvailable) {
        return NextResponse.json(
          { detail: `Menu item ${menuItem.nameEn} is not available.` },
          { status: 400 }
        );
      }

      const itemTotal = Number(menuItem.price) * itemIn.quantity;
      totalAmount += itemTotal;

      verifiedItems.push({
        menuItemId: itemIn.menuItemId,
        quantity: itemIn.quantity,
        price: menuItem.price, // Prisma Decimal type
        notes: itemIn.notes || null,
      });
    }

    // 3. Create Order and OrderItems in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const dbOrder = await tx.order.create({
        data: {
          venueId: table.venueId,
          tableId: table.id,
          status: "pending",
          totalAmount,
          items: {
            create: verifiedItems.map((v) => ({
              menuItemId: v.menuItemId,
              quantity: v.quantity,
              price: v.price,
              notes: v.notes,
            })),
          },
        },
        include: {
          items: true,
        },
      });
      return dbOrder;
    });

    return NextResponse.json(
      {
        id: order.id,
        venueId: order.venueId,
        tableId: order.tableId,
        tableName: table.name,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((i) => ({
          id: i.id,
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          price: Number(i.price),
          notes: i.notes,
        })),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating order: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
