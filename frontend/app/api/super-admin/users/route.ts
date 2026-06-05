export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error listing users: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, firstName, lastName, role, organizationId, isActive } = body;

    if (!id || !email) {
      return NextResponse.json(
        { detail: "id and email are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const user = await prisma.user.create({
      data: {
        id,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role || "VENUE_MANAGER",
        organizationId: organizationId || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
