import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { detail: "role is required" },
        { status: 400 }
      );
    }

    if (!["SUPER_ADMIN", "ORGANIZATION_ADMIN", "VENUE_MANAGER"].includes(role)) {
      return NextResponse.json(
        { detail: "Invalid user role" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ detail: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating user role: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
