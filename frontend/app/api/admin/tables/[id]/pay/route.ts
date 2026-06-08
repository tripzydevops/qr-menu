export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tableId = params.id;
    const body = await request.json();
    const { paymentMethod } = body;

    if (!paymentMethod || !["cash", "card", "online"].includes(paymentMethod)) {
      return NextResponse.json(
        { detail: "Invalid or missing payment method" },
        { status: 400 }
      );
    }

    // Use a transaction to update orders and waiter requests safely
    const updatedOrders = await prisma.$transaction(async (tx) => {
      // 1. Get all active orders for this table
      const activeOrders = await tx.order.findMany({
        where: {
          tableId,
          status: {
            in: ["pending", "preparing", "ready", "served"],
          },
        },
      });

      const now = new Date();

      // 2. Update status of active orders
      const orderIds = activeOrders.map((o) => o.id);
      if (orderIds.length > 0) {
        await tx.order.updateMany({
          where: {
            id: { in: orderIds },
          },
          data: {
            status: "completed",
            paymentMethod,
            paidAt: now,
          },
        });
      }

      // 3. Settle waiter bill requests for this table
      await tx.waiterRequest.updateMany({
        where: {
          tableId,
          type: "bill",
          status: "pending",
        },
        data: {
          status: "completed",
        },
      });

      // 4. Fetch the fully updated orders to return
      const completedOrders = await tx.order.findMany({
        where: {
          id: { in: orderIds },
        },
        include: {
          table: true,
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      return completedOrders;
    });

    // Run stock deduction and signal bridge updates for each completed order
    const { deductStockFromOrder, emitOrderSignals } = await import("@/lib/costing");
    for (const order of updatedOrders) {
      try {
        await deductStockFromOrder(order.id);
        await emitOrderSignals(order.id);
      } catch (err) {
        console.error(`Failed to run post-payment costing/signal hooks for order ${order.id}:`, err);
      }
    }

    const mappedOrders = updatedOrders.map((order) => ({
      id: order.id,
      venueId: order.venueId,
      tableId: order.tableId,
      tableName: order.table?.name || null,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
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
    console.error("Error processing table payment: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
