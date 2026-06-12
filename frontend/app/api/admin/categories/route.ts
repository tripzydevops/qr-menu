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

    const userRole = request.headers.get("x-user-role");
    const showDeleted = userRole === "SUPER_ADMIN";

    const categories = await prisma.category.findMany({
      where: { venueId },
      orderBy: { sortOrder: "asc" },
      include: {
        translations: true,
        items: {
          where: showDeleted ? undefined : { isDeleted: false },
          orderBy: { sortOrder: "asc" },
          include: {
            translations: true,
            dietaryLabels: true,
          },
        },
      },
    });

    // Convert Decimal price to number in items
    const mappedCategories = categories.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({
        ...item,
        price: Number(item.price), // Convert Decimal to number
      })),
    }));

    return NextResponse.json(mappedCategories);
  } catch (error: any) {
    console.error("Error listing categories: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { venueId, nameTr, nameEn, iconName, sortOrder, menuId } = body;

    if (!venueId || !nameTr || !nameEn) {
      return NextResponse.json(
        { detail: "venueId, nameTr, and nameEn are required" },
        { status: 400 }
      );
    }

    // Check if venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
    });
    if (!venue) {
      return NextResponse.json({ detail: "Venue not found" }, { status: 404 });
    }

    const category = await prisma.category.create({
      data: {
        venueId,
        nameTr,
        nameEn,
        iconName: iconName || null,
        sortOrder: sortOrder || 0,
        menuId: menuId || null,
        translations: {
          create: [
            { locale: "tr", name: nameTr },
            { locale: "en", name: nameEn },
          ],
        },
      },
      include: {
        translations: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error("Error creating category: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
