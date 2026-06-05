export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { qr_token: string } }
) {
  try {
    const { qr_token } = params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || undefined;

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

    // 2. Get Venue and Organization details
    const venue = await prisma.venue.findUnique({
      where: { id: table.venueId },
      include: {
        organization: true,
      },
    });

    if (!venue) {
      return NextResponse.json(
        { detail: "Associated venue not found." },
        { status: 404 }
      );
    }

    const org = venue.organization;

    // Log analytics event asynchronously
    const userAgent = request.headers.get("user-agent") || null;
    prisma.analyticsEvent
      .create({
        data: {
          venueId: venue.id,
          tableId: table.id,
          locale: locale || null,
          path: `/menu/${qr_token}`,
          userAgent,
        },
      })
      .catch((err) => {
        console.error("Failed to log view: ", err);
      });

    // 3. Get Active Scheduled Menu Categories
    const now = new Date();
    const currentDay = (now.getDay() + 6) % 7; // Map: 0 = Monday, 6 = Sunday (like python weekday)
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMin = now.getMinutes().toString().padStart(2, "0");
    const currentTimeStr = `${currentHour}:${currentMin}`;

    const menus = await prisma.menu.findMany({
      where: {
        venueId: venue.id,
        isActive: true,
      },
      include: {
        schedules: true,
      },
    });

    const activeMenuIds: string[] = [];

    for (const menu of menus) {
      if (menu.schedules.length === 0) {
        activeMenuIds.push(menu.id);
        continue;
      }

      let isScheduledActive = false;
      for (const sched of menu.schedules) {
        if (sched.dayOfWeek !== null && sched.dayOfWeek !== currentDay) {
          continue;
        }
        if (sched.startTime && sched.endTime) {
          if (
            !(sched.startTime <= currentTimeStr && currentTimeStr <= sched.endTime)
          ) {
            continue;
          }
        }
        if (sched.startDate && now < new Date(sched.startDate)) {
          continue;
        }
        if (sched.endDate && now > new Date(sched.endDate)) {
          continue;
        }
        isScheduledActive = true;
        break;
      }

      if (isScheduledActive) {
        activeMenuIds.push(menu.id);
      }
    }

    // 4. Get Categories
    const categories = await prisma.category.findMany({
      where: {
        venueId: venue.id,
        OR: [
          { menuId: null },
          { menuId: { in: activeMenuIds } },
        ],
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        items: {
          where: {
            isAvailable: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            dietaryLabels: true,
          },
        },
      },
    });

    // Map Categories & items to serialize Decimal type
    const mappedCategories = categories.map((cat) => ({
      id: cat.id,
      nameTr: cat.nameTr,
      nameEn: cat.nameEn,
      iconName: cat.iconName,
      sortOrder: cat.sortOrder,
      venueId: cat.venueId,
      menuId: cat.menuId,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
      items: cat.items.map((item) => ({
        id: item.id,
        nameTr: item.nameTr,
        nameEn: item.nameEn,
        descriptionTr: item.descriptionTr,
        descriptionEn: item.descriptionEn,
        price: Number(item.price), // Convert Decimal to number
        imageUrl: item.imageUrl,
        allergens: item.allergens,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
        calories: item.calories,
        categoryId: item.categoryId,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        dietaryLabels: item.dietaryLabels.map((lbl) => ({
          id: lbl.id,
          key: lbl.key,
          icon: lbl.icon,
        })),
      })),
    }));

    return NextResponse.json({
      tableName: table.name,
      areaName: table.areaName,
      venueId: venue.id,
      venueName: venue.name,
      coverImageUrl: venue.coverImageUrl,
      phone: venue.phone,
      operatingHours: venue.operatingHours,
      currency: venue.currency,
      defaultLocale: venue.defaultLocale,
      supportedLocales: venue.supportedLocales,
      organizationName: org.name,
      logoUrl: org.logoUrl,
      brandColor: org.brandColor,
      categories: mappedCategories,
    });
  } catch (error: any) {
    console.error("Error fetching guest menu: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
