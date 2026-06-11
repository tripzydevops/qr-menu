export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; phone: string } }
) {
  try {
    const venueId = params.id;
    const phone = params.phone.trim();

    if (!phone) {
      return NextResponse.json(
        { detail: "Telefon numarası gereklidir." },
        { status: 400 }
      );
    }

    const loyalty = await prisma.loyaltyAccount.findFirst({
      where: {
        venueId,
        phone,
      },
    });

    if (!loyalty) {
      return NextResponse.json(
        { detail: "Sadakat programı hesabı bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: loyalty.id,
      phone: loyalty.phone,
      name: loyalty.name,
      points: loyalty.points,
      externalUserId: loyalty.externalUserId,
      venueId: loyalty.venueId,
      createdAt: loyalty.createdAt.toISOString(),
      updatedAt: loyalty.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching loyalty account: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
