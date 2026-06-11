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

    // 1. Fetch active orders
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

    // 2. Run Validation Logic
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
        discountAmount = Math.min(Number(coupon.value), subtotal);
        message = `Kupon uygulandı: -${coupon.value} ₺`;
      }
    } else if (loyaltyPhone) {
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

      const maxDiscountFromPoints = loyalty.points / 10;
      discountAmount = Math.min(maxDiscountFromPoints, subtotal);
      message = `Sadakat puanları uygulandı: -${discountAmount.toFixed(2)} ₺ (${Math.round(
        discountAmount * 10
      )} Puan)`;
    } else if (
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

    // 3. Apply Discount via Prisma Transaction
    let remainingDiscount = discountAmount;

    const updatedOrders = await prisma.$transaction(async (tx) => {
      for (let i = 0; i < activeOrders.length; i++) {
        const order = activeOrders[i];
        let orderDiscount = 0;

        if (i === activeOrders.length - 1) {
          orderDiscount = remainingDiscount;
        } else {
          const orderAmount = Number(order.totalAmount);
          orderDiscount = Math.round((discountAmount * (orderAmount / subtotal)) * 100) / 100;
          remainingDiscount = Math.round((remainingDiscount - orderDiscount) * 100) / 100;
        }

        const netAmount = Math.max(0, Number(order.totalAmount) - orderDiscount);

        await tx.order.update({
          where: { id: order.id },
          data: {
            discountAmount: orderDiscount,
            discountType,
            discountRef,
            netAmount,
          },
        });
      }

      // If it's a coupon, increment the usageCount
      if (discountType === "COUPON" && discountRef) {
        const coupon = await tx.coupon.findFirst({
          where: {
            code: {
              equals: discountRef,
              mode: "insensitive",
            },
          },
        });
        if (coupon) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: {
              usageCount: {
                increment: 1,
              },
            },
          });
        }
      }

      // Fetch the updated orders
      const finalOrders = await tx.order.findMany({
        where: {
          tableId,
          status: {
            in: ["pending", "preparing", "ready", "served"],
          },
        },
        include: {
          table: true,
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      return finalOrders;
    });

    const mappedOrders = updatedOrders.map((order) => ({
      id: order.id,
      venueId: order.venueId,
      tableId: order.tableId,
      tableName: order.table?.name || null,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      discountAmount: Number(order.discountAmount),
      discountType: order.discountType,
      discountRef: order.discountRef,
      netAmount: Number(order.netAmount),
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt ? order.paidAt.toISOString() : null,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: Number(item.price),
        notes: item.notes,
        menuItemNameTr: item.menuItem?.nameTr || null,
        menuItemNameEn: item.menuItem?.nameEn || null,
      })),
    }));

    return NextResponse.json(mappedOrders);
  } catch (error: any) {
    console.error("Error applying discount: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
