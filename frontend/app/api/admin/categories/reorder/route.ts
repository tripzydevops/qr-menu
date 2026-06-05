import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    const categoryIds = await request.json();

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json(
        { detail: "RequestBody must be an array of category IDs" },
        { status: 400 }
      );
    }

    // Perform bulk updates in a transaction
    await prisma.$transaction(
      categoryIds.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error reordering categories: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
