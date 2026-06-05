import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, logoUrl, brandColor, subscriptionTier, status } = body;

    if (!name) {
      return NextResponse.json(
        { detail: "name is required" },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      return NextResponse.json({ detail: "Organization not found" }, { status: 404 });
    }

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        name,
        logoUrl: logoUrl !== undefined ? logoUrl : null,
        brandColor: brandColor !== undefined ? brandColor : null,
        subscriptionTier: subscriptionTier !== undefined ? subscriptionTier : "free",
        status: status !== undefined ? status : "active",
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      return NextResponse.json({ detail: "Organization not found" }, { status: 404 });
    }

    await prisma.organization.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error deleting organization: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
