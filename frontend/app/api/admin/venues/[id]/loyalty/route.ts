export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const venueId = params.id;
    const body = await request.json();
    const { phone, name, externalUserId } = body;

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { detail: "Telefon numarası gereklidir." },
        { status: 400 }
      );
    }

    const trimmedPhone = phone.trim();

    // Check if account already exists under this venue
    const existing = await prisma.loyaltyAccount.findFirst({
      where: {
        venueId,
        phone: trimmedPhone,
      },
    });

    if (existing) {
      return NextResponse.json(
        { detail: "Bu telefon numarası ile kayıtlı bir hesap zaten var." },
        { status: 400 }
      );
    }

    const loyalty = await prisma.loyaltyAccount.create({
      data: {
        venueId,
        phone: trimmedPhone,
        name: name || "Misafir",
        externalUserId: externalUserId || null,
        points: 0,
      },
    });

    return NextResponse.json({
      id: loyalty.id,
      phone: loyalty.phone,
      name: loyalty.name,
      points: loyalty.points,
      externalUserId: loyalty.externalUserId,
      venueId: loyalty.venueId,
      createdAt: loyalty.createdAt.toISOString(),
      updatedAt: loyalty.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating loyalty account: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
