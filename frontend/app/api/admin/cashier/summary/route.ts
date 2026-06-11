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

    // Calculate start of today in UTC (equivalent to python's utcnow().replace(hour=0, minute=0, second=0, microsecond=0))
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Completed orders today (handle null paidAt using createdAt fallback)
    const completedOrders = await prisma.order.findMany({
      where: {
        venueId,
        status: "completed",
        OR: [
          {
            paidAt: {
              gte: todayStart,
            },
          },
          {
            paidAt: null,
            createdAt: {
              gte: todayStart,
            },
          },
        ],
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );
    const orderCount = completedOrders.length;

    // Query payments today for method breakdown (both full and split payments)
    const paymentsToday = await prisma.payment.findMany({
      where: {
        venueId,
        createdAt: {
          gte: todayStart,
        },
      },
    });

    const cashRevenue = paymentsToday
      .filter((p) => p.paymentMethod === "cash")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const cardRevenue = paymentsToday
      .filter((p) => p.paymentMethod === "card")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const onlineRevenue = paymentsToday
      .filter((p) => p.paymentMethod === "online")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const splitRevenue = completedOrders
      .filter((o) => o.paymentMethod === "split")
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const splitOrderCount = completedOrders.filter((o) => o.paymentMethod === "split").length;

    // Active orders count (pending, preparing, ready, served)
    const activeOrdersCount = await prisma.order.count({
      where: {
        venueId,
        status: {
          in: ["pending", "preparing", "ready", "served"],
        },
      },
    });

    // Top selling items today
    const itemMap: Record<
      string,
      { id: string; nameTr: string; nameEn: string; quantity: number; price: number }
    > = {};

    for (const order of completedOrders) {
      for (const item of order.items) {
        const id = item.menuItemId;
        const quantity = item.quantity;
        const price = Number(item.price);
        if (itemMap[id]) {
          itemMap[id].quantity += quantity;
        } else {
          itemMap[id] = {
            id,
            nameTr: item.menuItem?.nameTr || "Ürün",
            nameEn: item.menuItem?.nameEn || "Item",
            quantity,
            price,
          };
        }
      }
    }

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return NextResponse.json({
      totalRevenue,
      orderCount,
      cashRevenue,
      cardRevenue,
      onlineRevenue,
      splitRevenue,
      splitOrderCount,
      activeOrdersCount,
      topItems,
    });
  } catch (error: any) {
    console.error("Error fetching cashier summary: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
