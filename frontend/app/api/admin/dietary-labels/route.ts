export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const labels = await prisma.dietaryLabel.findMany({
      orderBy: { key: "asc" },
    });
    return NextResponse.json(labels);
  } catch (error: any) {
    console.error("Error listing dietary labels: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
