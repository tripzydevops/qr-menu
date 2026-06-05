import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { email, firstName, lastName, role, organizationId, isActive } = body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ detail: "User not found" }, { status: 404 });
    }

    if (role && !["SUPER_ADMIN", "ORGANIZATION_ADMIN", "VENUE_MANAGER"].includes(role)) {
      return NextResponse.json(
        { detail: "Invalid user role" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        email: email !== undefined ? email : user.email,
        firstName: firstName !== undefined ? firstName : user.firstName,
        lastName: lastName !== undefined ? lastName : user.lastName,
        role: role !== undefined ? role : user.role,
        organizationId: organizationId !== undefined ? (organizationId || null) : user.organizationId,
        isActive: isActive !== undefined ? isActive : user.isActive,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating user: ", error);
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

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ detail: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error deleting user: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
