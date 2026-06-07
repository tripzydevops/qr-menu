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

    // Completed orders today
    const completedOrders = await prisma.order.findMany({
      where: {
        venueId,
        status: "completed",
        paidAt: {
          gte: todayStart,
        },
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

    const cashRevenue = completedOrders
      .filter((o) => o.paymentMethod === "cash")
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

    const cardRevenue = completedOrders
      .filter((o) => o.paymentMethod === "card")
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

    const onlineRevenue = completedOrders
      .filter((o) => o.paymentMethod === "online")
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

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
