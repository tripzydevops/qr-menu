export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tableId = params.id;
    const body = await request.json();
    const {
      couponCode,
      loyaltyPhone,
      manualDiscountAmount,
      manualDiscountPercentage,
      manualReason,
    } = body;

    // Fetch active orders
    const activeOrders = await prisma.order.findMany({
      where: {
        tableId,
        status: {
          in: ["pending", "preparing", "ready", "served"],
        },
      },
    });

    if (activeOrders.length === 0) {
      return NextResponse.json(
        { detail: "Masa için aktif sipariş bulunamadı." },
        { status: 404 }
      );
    }

    const subtotal = activeOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );

    let discountAmount = 0;
    let discountType: string | null = null;
    let discountRef: string | null = null;
    let message = "Geçerli indirim bulunamadı.";

    const now = new Date();

    // 1. Coupon Code Validation
    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: {
            equals: couponCode.trim(),
            mode: "insensitive",
          },
        },
      });

      if (!coupon) {
        return NextResponse.json(
          { detail: "Kupon kodu bulunamadı." },
          { status: 404 }
        );
      }

      if (!coupon.isActive) {
        return NextResponse.json(
          { detail: "Bu kupon artık aktif değil." },
          { status: 400 }
        );
      }

      if (coupon.startsAt && new Date(coupon.startsAt) > now) {
        return NextResponse.json(
          { detail: "Kupon kullanım süresi henüz başlamadı." },
          { status: 400 }
        );
      }

      if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
        return NextResponse.json(
          { detail: "Kuponun son kullanma tarihi geçmiş." },
          { status: 400 }
        );
      }

      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        return NextResponse.json(
          { detail: "Bu kuponun kullanım sınırı aşılmış." },
          { status: 400 }
        );
      }

      if (subtotal < Number(coupon.minSubtotal)) {
        return NextResponse.json(
          {
            detail: `Kuponu uygulamak için minimum sepet tutarı ${Number(
              coupon.minSubtotal
            )} ₺ olmalıdır.`,
          },
          { status: 400 }
        );
      }

      discountType = "COUPON";
      discountRef = coupon.code;

      if (coupon.type === "PERCENTAGE") {
        let pctDiscount = subtotal * (Number(coupon.value) / 100);
        if (coupon.maxDiscountAmount !== null) {
          pctDiscount = Math.min(pctDiscount, Number(coupon.maxDiscountAmount));
        }
        discountAmount = pctDiscount;
        message = `Kupon uygulandı: %${coupon.value}`;
      } else {
        // FIXED
        discountAmount = Math.min(Number(coupon.value), subtotal);
        message = `Kupon uygulandı: -${coupon.value} ₺`;
      }
    }
    // 2. Loyalty account validation
    else if (loyaltyPhone) {
      const loyalty = await prisma.loyaltyAccount.findFirst({
        where: {
          phone: loyaltyPhone.trim(),
        },
      });

      if (!loyalty) {
        return NextResponse.json(
          { detail: "Sadakat programı hesabı bulunamadı." },
          { status: 404 }
        );
      }

      discountType = "LOYALTY";
      discountRef = loyalty.phone;

      // 10 points = 1 ₺
      const maxDiscountFromPoints = loyalty.points / 10;
      discountAmount = Math.min(maxDiscountFromPoints, subtotal);
      message = `Sadakat puanları uygulandı: -${discountAmount.toFixed(2)} ₺ (${Math.round(
        discountAmount * 10
      )} Puan)`;
    }
    // 3. Manual discount validation
    else if (
      manualDiscountAmount !== undefined &&
      manualDiscountAmount !== null ||
      manualDiscountPercentage !== undefined &&
      manualDiscountPercentage !== null
    ) {
      discountType = "MANUAL";
      discountRef = manualReason || "Kasiyer İndirimi";

      if (manualDiscountPercentage !== undefined && manualDiscountPercentage !== null) {
        discountAmount = subtotal * (Number(manualDiscountPercentage) / 100);
      } else if (manualDiscountAmount !== undefined && manualDiscountAmount !== null) {
        discountAmount = Math.min(Number(manualDiscountAmount), subtotal);
      }

      message = `Manuel indirim uygulandı: -${discountAmount.toFixed(2)} ₺`;
    }

    const netAmount = Math.max(0, subtotal - discountAmount);

    return NextResponse.json({
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
      message,
      discountType,
      discountRef,
    });
  } catch (error: any) {
    console.error("Error validating discount: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
