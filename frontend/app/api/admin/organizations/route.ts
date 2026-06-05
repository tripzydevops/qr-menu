import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, logoUrl, brandColor, subscriptionTier } = body;

    if (!name) {
      return NextResponse.json(
        { detail: "name is required" },
        { status: 400 }
      );
    }

    const org = await prisma.organization.create({
      data: {
        name,
        logoUrl: logoUrl || null,
        brandColor: brandColor || null,
        subscriptionTier: subscriptionTier || "free",
      },
    });

    return NextResponse.json(org, { status: 201 });
  } catch (error: any) {
    console.error("Error creating organization: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
