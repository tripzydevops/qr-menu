import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      name,
      address,
      coverImageUrl,
      phone,
      operatingHours,
      currency,
      defaultLocale,
      supportedLocales,
    } = body;

    if (!organizationId || !name) {
      return NextResponse.json(
        { detail: "organizationId and name are required" },
        { status: 400 }
      );
    }

    // Check if organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      return NextResponse.json(
        { detail: "Organization not found" },
        { status: 404 }
      );
    }

    const venue = await prisma.venue.create({
      data: {
        organizationId,
        name,
        address: address || null,
        coverImageUrl: coverImageUrl || null,
        phone: phone || null,
        operatingHours: operatingHours || null,
        currency: currency || "TRY",
        defaultLocale: defaultLocale || "tr",
        supportedLocales: supportedLocales || ["tr", "en"],
      },
    });

    return NextResponse.json(venue, { status: 201 });
  } catch (error: any) {
    console.error("Error creating venue: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
