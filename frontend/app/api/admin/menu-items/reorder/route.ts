import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    const itemIds = await request.json();

    if (!Array.isArray(itemIds)) {
      return NextResponse.json(
        { detail: "RequestBody must be an array of menu item IDs" },
        { status: 400 }
      );
    }

    // Perform bulk updates in a transaction
    await prisma.$transaction(
      itemIds.map((id, index) =>
        prisma.menuItem.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error reordering menu items: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
