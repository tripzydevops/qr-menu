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
    const { splitMode, payments } = body;

    if (!splitMode || !payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { detail: "Eksik veya geçersiz ödeme parametreleri." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
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

      const venueId = activeOrders[0].venueId;
      const now = new Date();

      // 2. Calculate total bill (after discounts if applied)
      const totalBill = activeOrders.reduce((sum, order) => {
        const net = Number(order.netAmount);
        return sum + (net > 0 ? net : Number(order.totalAmount));
      }, 0);

      // 3. Validate sum of payments
      const paymentSum = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      let isPartial = false;
      if (Math.abs(paymentSum - totalBill) > 0.01) {
        if (splitMode === "by_item" && paymentSum < totalBill) {
          isPartial = true;
        } else {
          throw new Error(
            `Toplam ödeme tutarı (${paymentSum.toFixed(2)} ₺) masa hesabı ile (${totalBill.toFixed(
              2
            )} ₺) eşleşmiyor.`
          );
        }
      }

      const createdPayments = [];
      const ordersToHook: string[] = [];

      if (isPartial) {
        // Partial payment logic: we only complete the items paid for
        for (const p of payments) {
          if (!p.items || !Array.isArray(p.items) || p.items.length === 0) {
            throw new Error("Kısmi ödemede ödenecek ürünlerin belirtilmesi zorunludur.");
          }

          // Create a completed order to hold the paid items
          const dbOrder = await tx.order.create({
            data: {
              venueId,
              tableId,
              status: "completed",
              paymentMethod: "split",
              paidAt: now,
              totalAmount: p.amount,
              netAmount: p.amount,
              createdAt: now,
              updatedAt: now,
            },
          });
          ordersToHook.push(dbOrder.id);

          const orderItemIdsRecorded: string[] = [];

          for (const itemSpec of p.items) {
            const activeItem = await tx.orderItem.findUnique({
              where: { id: itemSpec.orderItemId },
              include: { order: true },
            });

            if (!activeItem) {
              throw new Error(`Sipariş ürünü bulunamadı: ${itemSpec.orderItemId}`);
            }

            // Verify activeItem belongs to one of the active orders of this table
            if (
              activeItem.order.tableId !== tableId ||
              !["pending", "preparing", "ready", "served"].includes(activeItem.order.status)
            ) {
              throw new Error("Seçilen ürün masanın aktif siparişine ait değil.");
            }

            if (activeItem.quantity < itemSpec.quantity) {
              throw new Error(
                `Ödeme yapılmak istenen miktar (${itemSpec.quantity}) kalan miktardan (${activeItem.quantity}) fazla.`
              );
            }

            // Create completed OrderItem
            const completedItem = await tx.orderItem.create({
              data: {
                orderId: dbOrder.id,
                menuItemId: activeItem.menuItemId,
                quantity: itemSpec.quantity,
                price: activeItem.price,
                notes: activeItem.notes,
              },
            });
            orderItemIdsRecorded.push(completedItem.id);

            // Deduct from active item
            const newQty = activeItem.quantity - itemSpec.quantity;
            if (newQty === 0) {
              await tx.orderItem.delete({
                where: { id: activeItem.id },
              });
            } else {
              await tx.orderItem.update({
                where: { id: activeItem.id },
                data: { quantity: newQty },
              });
            }

            // Update parent order amount
            const itemPrice = Number(activeItem.price);
            const deductAmount = itemPrice * itemSpec.quantity;

            const parentOrder = await tx.order.findUnique({
              where: { id: activeItem.orderId },
            });
            if (parentOrder) {
              const newTotalAmount = Math.max(0, Number(parentOrder.totalAmount) - deductAmount);
              const newNetAmount = Math.max(0, Number(parentOrder.netAmount) - deductAmount);

              await tx.order.update({
                where: { id: activeItem.orderId },
                data: {
                  totalAmount: newTotalAmount,
                  netAmount: newNetAmount,
                },
              });
            }
          }

          // Create the Payment record associated with the completed order
          const dbPayment = await tx.payment.create({
            data: {
              venueId,
              tableId,
              amount: p.amount,
              paymentMethod: p.paymentMethod,
              splitMode,
              label: p.label || null,
              orderIds: [dbOrder.id],
              orderItemIds: orderItemIdsRecorded,
            },
          });
          createdPayments.push(dbPayment);
        }

        // Delete any active orders that have become empty
        for (const order of activeOrders) {
          const remainingItemsCount = await tx.orderItem.count({
            where: { orderId: order.id },
          });
          if (remainingItemsCount === 0) {
            await tx.order.delete({
              where: { id: order.id },
            });
          }
        }

        // Resolve pending waiter bill requests
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
      } else {
        // Full settle logic (sum of payments matches bill)
        const orderIds = activeOrders.map((o) => o.id);
        ordersToHook.push(...orderIds);

        for (const p of payments) {
          const dbPayment = await tx.payment.create({
            data: {
              venueId,
              tableId,
              amount: p.amount,
              paymentMethod: p.paymentMethod,
              splitMode,
              label: p.label || null,
              orderIds,
              orderItemIds: p.orderItemIds || [],
            },
          });
          createdPayments.push(dbPayment);
        }

        // Mark all active orders as completed
        await tx.order.updateMany({
          where: {
            id: { in: orderIds },
          },
          data: {
            status: "completed",
            paymentMethod: "split",
            paidAt: now,
          },
        });

        // Resolve pending waiter bill requests
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

        // Process Loyalty points earn and burn logic
        let loyaltyRef: string | null = null;
        const discountAmount = activeOrders.reduce(
          (sum, order) => sum + Number(order.discountAmount),
          0
        );

        for (const order of activeOrders) {
          if (order.discountType === "LOYALTY" && order.discountRef) {
            loyaltyRef = order.discountRef;
            break;
          }
        }

        if (loyaltyRef) {
          const loyalty = await tx.loyaltyAccount.findFirst({
            where: {
              phone: loyaltyRef.trim(),
            },
          });

          if (loyalty) {
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
                reason: `Ödeme sırasında sadakat puanı kullanıldı (Bölünmüş Ödeme). Masa: ${tableId}`,
              },
            });

            const pointsEarned = Math.floor(totalBill / 10);
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
                  reason: `Sipariş ödemesinden kazanıldı (Bölünmüş Ödeme). Masa: ${tableId}`,
                },
              });
            }
          }
        }
      }

      return { createdPayments, ordersToHook };
    });

    // Run stock deduction and signal bridge updates for each completed order
    const { deductStockFromOrder, emitOrderSignals } = await import("@/lib/costing");
    for (const orderId of result.ordersToHook) {
      try {
        await deductStockFromOrder(orderId);
        await emitOrderSignals(orderId);
      } catch (err) {
        console.error(`Failed to run post-payment costing/signal hooks for order ${orderId}:`, err);
      }
    }

    const mappedPayments = result.createdPayments.map((payment) => ({
      id: payment.id,
      venueId: payment.venueId,
      tableId: payment.tableId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      splitMode: payment.splitMode,
      label: payment.label || null,
      orderIds: payment.orderIds,
      orderItemIds: payment.orderItemIds,
      createdAt: payment.createdAt.toISOString(),
    }));

    return NextResponse.json(mappedPayments);
  } catch (error: any) {
    console.error("Error processing split payment: ", error);
    return NextResponse.json(
      { detail: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
