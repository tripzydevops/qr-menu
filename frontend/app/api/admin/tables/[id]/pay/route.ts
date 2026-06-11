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
    const { paymentMethod, loyaltyPhone } = body;

    if (!paymentMethod || !["cash", "card", "online"].includes(paymentMethod)) {
      return NextResponse.json(
        { detail: "Geçersiz veya eksik ödeme yöntemi." },
        { status: 400 }
      );
    }

    // Use a transaction to update orders, waiter requests, loyalty points, and create payment safely
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

      if (activeOrders.length === 0) {
        throw new Error("Bu masa için aktif sipariş bulunamadı.");
      }

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

      // 4. Calculate net total paid and discount amounts
      const totalPaidAmount = activeOrders.reduce((sum, order) => {
        const net = Number(order.netAmount);
        return sum + (net > 0 ? net : Number(order.totalAmount));
      }, 0);
      
      const discountAmount = activeOrders.reduce(
        (sum, order) => sum + Number(order.discountAmount),
        0
      );

      // 5. Check if loyalty discount was applied
      let loyaltyRef: string | null = null;
      for (const order of activeOrders) {
        if (order.discountType === "LOYALTY" && order.discountRef) {
          loyaltyRef = order.discountRef;
          break;
        }
      }

      // 6. Process Loyalty points earn and burn logic
      const targetLoyaltyPhone = loyaltyPhone || loyaltyRef;
      if (targetLoyaltyPhone) {
        const loyalty = await tx.loyaltyAccount.findFirst({
          where: {
            phone: targetLoyaltyPhone.trim(),
          },
        });

        if (loyalty) {
          // A. Deduct points if points were redeemed
          if (loyaltyRef) {
            const pointsToDeduct = Math.round(discountAmount * 10);
            const newPoints = Math.max(0, loyalty.points - pointsToDeduct);
            
            await tx.loyaltyAccount.update({
              where: { id: loyalty.id },
              data: { points: newPoints },
            });

            await tx.loyaltyHistory.create({
              data: {
                loyaltyAccountId: loyalty.id,
                points: -pointsToDeduct,
                reason: `Ödeme sırasında sadakat puanı kullanıldı. Masa: ${tableId}`,
              },
            });
          }

          // B. Earn points based on net total (1 point per 10 TL)
          const pointsEarned = Math.floor(totalPaidAmount / 10);
          if (pointsEarned > 0) {
            await tx.loyaltyAccount.update({
              where: { id: loyalty.id },
              data: {
                points: {
                  increment: pointsEarned,
                },
              },
            });

            await tx.loyaltyHistory.create({
              data: {
                loyaltyAccountId: loyalty.id,
                points: pointsEarned,
                reason: `Sipariş ödemesinden kazanıldı. Masa: ${tableId}`,
              },
            });
          }
        }
      }

      // 7. Create Payment record
      if (activeOrders.length > 0) {
        await tx.payment.create({
          data: {
            venueId: activeOrders[0].venueId,
            tableId,
            amount: totalPaidAmount,
            paymentMethod,
            splitMode: "full",
            orderIds,
            orderItemIds: [],
          },
        });
      }

      // 8. Fetch the fully updated orders to return
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
      discountAmount: Number(order.discountAmount),
      discountType: order.discountType,
      discountRef: order.discountRef,
      netAmount: Number(order.netAmount),
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
      { detail: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
