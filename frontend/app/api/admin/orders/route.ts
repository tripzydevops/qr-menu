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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { venueId, tableId, items } = body;

    if (!venueId) {
      return NextResponse.json(
        { detail: "venueId is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { detail: "Order items cannot be empty." },
        { status: 400 }
      );
    }

    // Optional: Validate Table if tableId is provided
    let table = null;
    if (tableId) {
      table = await prisma.table.findUnique({
        where: { id: tableId },
      });
      if (!table) {
        return NextResponse.json(
          { detail: "Table not found." },
          { status: 404 }
        );
      }
    }

    // Verify items and calculate total amount
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

      const itemTotal = Number(menuItem.price) * itemIn.quantity;
      totalAmount += itemTotal;

      verifiedItems.push({
        menuItemId: itemIn.menuItemId,
        quantity: itemIn.quantity,
        price: menuItem.price, // Prisma Decimal type
        notes: itemIn.notes || null,
      });
    }

    // Create Order and OrderItems in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const dbOrder = await tx.order.create({
        data: {
          venueId: venueId,
          tableId: tableId || null,
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
          table: true,
        },
      });
      return dbOrder;
    });

    return NextResponse.json(
      {
        id: order.id,
        venueId: order.venueId,
        tableId: order.tableId,
        tableName: order.table?.name || null,
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
    console.error("Error creating admin order: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
