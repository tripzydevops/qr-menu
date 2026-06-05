import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, logoUrl, brandColor, subscriptionTier } = body;

    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      return NextResponse.json(
        { detail: "Organization not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        name: name !== undefined ? name : org.name,
        logoUrl: logoUrl !== undefined ? logoUrl : org.logoUrl,
        brandColor: brandColor !== undefined ? brandColor : org.brandColor,
        subscriptionTier:
          subscriptionTier !== undefined ? subscriptionTier : org.subscriptionTier,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating organization: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
