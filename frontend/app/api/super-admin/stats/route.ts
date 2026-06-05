export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const totalOrgs = await prisma.organization.count();
    const activeOrgs = await prisma.organization.count({
      where: { status: "active" },
    });
    const totalVenues = await prisma.venue.count();
    const totalTables = await prisma.table.count();
    const totalViews = await prisma.analyticsEvent.count();

    // 1. Views by locale
    const localeStats = await prisma.analyticsEvent.groupBy({
      by: ["locale"],
      _count: {
        id: true,
      },
    });

    const viewsByLocale: Record<string, number> = {};
    for (const stat of localeStats) {
      if (stat.locale) {
        viewsByLocale[stat.locale] = stat._count.id;
      }
    }

    // 2. Organization plan distribution
    const planStats = await prisma.organization.groupBy({
      by: ["subscriptionTier"],
      _count: {
        id: true,
      },
    });

    const planDist: Record<string, number> = { free: 0, pro: 0, premium: 0 };
    for (const stat of planStats) {
      const plan = stat.subscriptionTier || "free";
      planDist[plan] = stat._count.id;
    }

    // 3. Views by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const recentEvents = await prisma.analyticsEvent.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    const viewsByDay: Record<string, number> = {};
    // Initialize last 7 days with 0
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      viewsByDay[dateStr] = 0;
    }

    for (const event of recentEvents) {
      const dateStr = event.createdAt.toISOString().split("T")[0];
      if (viewsByDay[dateStr] !== undefined) {
        viewsByDay[dateStr]++;
      }
    }

    return NextResponse.json({
      totalOrganizations: totalOrgs,
      activeOrganizations: activeOrgs,
      totalVenues: totalVenues,
      totalTables: totalTables,
      totalViews: totalViews,
      viewsByLocale,
      viewsByDay,
      organizationPlanDistribution: planDist,
    });
  } catch (error: any) {
    console.error("Error getting super-admin stats: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
