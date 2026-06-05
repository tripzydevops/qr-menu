import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { venueId, tableId, locale, path } = body;

    if (!venueId) {
      return NextResponse.json(
        { detail: "venueId is required" },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get("user-agent") || null;

    await prisma.analyticsEvent.create({
      data: {
        venueId,
        tableId: tableId || null,
        locale: locale || null,
        path: path || null,
        userAgent,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error recording guest view: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
