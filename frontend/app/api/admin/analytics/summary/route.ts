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

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Total views
    const totalViews = await prisma.analyticsEvent.count({
      where: { venueId },
    });

    // 2. Views today
    const viewsToday = await prisma.analyticsEvent.count({
      where: {
        venueId,
        createdAt: {
          gte: todayStart,
        },
      },
    });

    // 3. Views this week
    const viewsThisWeek = await prisma.analyticsEvent.count({
      where: {
        venueId,
        createdAt: {
          gte: weekStart,
        },
      },
    });

    // 4. Language breakdown
    const langStats = await prisma.analyticsEvent.groupBy({
      by: ["locale"],
      where: { venueId },
      _count: {
        id: true,
      },
    });

    const languages: Record<string, number> = {};
    for (const stat of langStats) {
      const locale = stat.locale || "unknown";
      languages[locale] = stat._count.id;
    }

    // 5. Top items
    const itemVisits = await prisma.analyticsEvent.groupBy({
      by: ["path"],
      where: {
        venueId,
        path: {
          contains: "/menu/item-",
        },
      },
      _count: {
        id: true,
      },
    });

    const topItems: Array<{ name: string; views: number }> = [];

    if (itemVisits.length > 0) {
      // Fetch all menu items to map paths to names
      const items = await prisma.menuItem.findMany();
      const itemMap = new Map<string, string>();
      for (const item of items) {
        itemMap.set(`item-${item.id}`, item.nameTr);
      }

      for (const visit of itemVisits) {
        if (visit.path) {
          const parts = visit.path.split("/");
          const itemId = parts[parts.length - 1];
          const name = itemMap.get(itemId) || itemId;
          topItems.push({
            name,
            views: visit._count.id,
          });
        }
      }

      // Sort and take top 5
      topItems.sort((a, b) => b.views - a.views);
    }

    // Fallback: If no visits recorded, fetch first 5 items from the venue categories
    if (topItems.length === 0) {
      const fallbackItems = await prisma.menuItem.findMany({
        where: {
          category: {
            venueId,
          },
        },
        take: 5,
      });

      for (const item of fallbackItems) {
        topItems.push({
          name: item.nameTr,
          views: 0,
        });
      }
    } else {
      // Limit to top 5
      topItems.splice(5);
    }

    return NextResponse.json({
      totalViews,
      viewsToday,
      viewsThisWeek,
      languages,
      topItems,
    });
  } catch (error: any) {
    console.error("Error getting analytics: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
