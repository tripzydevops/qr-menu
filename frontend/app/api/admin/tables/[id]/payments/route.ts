export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tableId = params.id;

    const payments = await prisma.payment.findMany({
      where: {
        tableId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Map Decimal values to numbers for JSON serialization
    const mappedPayments = payments.map((payment) => ({
      id: payment.id,
      venueId: payment.venueId,
      tableId: payment.tableId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      splitMode: payment.splitMode,
      label: payment.label || null,
      orderIds: payment.orderIds,
      orderItemIds: payment.orderItemIds,
      createdAt: payment.createdAt.toISOString(),
    }));

    return NextResponse.json(mappedPayments);
  } catch (error: any) {
    console.error("Error fetching table payments: ", error);
    return NextResponse.json(
      { detail: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
