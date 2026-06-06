import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      name,
      address,
      coverImageUrl,
      phone,
      operatingHours,
      currency,
      defaultLocale,
      supportedLocales,
      brandColor,
      premiumMenuSelected,
    } = body;

    const venue = await prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      return NextResponse.json({ detail: "Venue not found" }, { status: 404 });
    }

    const [updatedVenue] = await prisma.$transaction([
      prisma.venue.update({
        where: { id },
        data: {
          name: name !== undefined ? name : venue.name,
          address: address !== undefined ? address : venue.address,
          coverImageUrl: coverImageUrl !== undefined ? coverImageUrl : venue.coverImageUrl,
          phone: phone !== undefined ? phone : venue.phone,
          operatingHours: operatingHours !== undefined ? operatingHours : venue.operatingHours,
          currency: currency !== undefined ? currency : venue.currency,
          defaultLocale: defaultLocale !== undefined ? defaultLocale : venue.defaultLocale,
          supportedLocales: supportedLocales !== undefined ? supportedLocales : venue.supportedLocales,
        },
      }),
      ...(brandColor !== undefined || premiumMenuSelected !== undefined
        ? [
            prisma.organization.update({
              where: { id: venue.organizationId },
              data: {
                ...(brandColor !== undefined ? { brandColor } : {}),
                ...(premiumMenuSelected !== undefined ? { premiumMenuSelected } : {}),
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json(updatedVenue);
  } catch (error: any) {
    console.error("Error updating venue: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
