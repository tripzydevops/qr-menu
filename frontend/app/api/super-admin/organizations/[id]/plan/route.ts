import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { subscriptionTier } = body;

    if (!subscriptionTier) {
      return NextResponse.json(
        { detail: "subscriptionTier is required" },
        { status: 400 }
      );
    }

    if (!["free", "pro", "premium", "enterprise"].includes(subscriptionTier)) {
      return NextResponse.json(
        { detail: "Invalid subscription tier" },
        { status: 400 }
      );
    }

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
      data: { subscriptionTier },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating organization plan: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
