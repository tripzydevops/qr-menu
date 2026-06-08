import { prisma } from "@/lib/prisma";

export async function deductStockFromOrder(orderId: string, tx: any = prisma) {
  // 1. Get the order with items
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          menuItem: {
            include: {
              recipe: {
                include: {
                  ingredients: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) return;

  // 2. Check venue deduction rule
  const rule = await tx.pricingAlertRule.findUnique({
    where: { venueId: order.venueId },
  });
  if (rule && rule.stockDeductionMode === "manual") {
    return;
  }

  for (const item of order.items) {
    const recipe = item.menuItem?.recipe;
    if (!recipe) continue;

    const qty = Number(item.quantity);

    for (const ri of recipe.ingredients) {
      const ingredient = await tx.ingredient.findUnique({
        where: { id: ri.ingredientId },
      });
      if (!ingredient) continue;

      const deduction = Number(ri.amountUsed) * qty;
      const newStock = Number(ingredient.currentStock) - deduction;

      await tx.ingredient.update({
        where: { id: ingredient.id },
        data: {
          currentStock: newStock,
          updatedAt: new Date(),
        },
      });
    }
  }
}

export async function emitOrderSignals(orderId: string, tx: any = prisma) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          menuItem: {
            include: {
              dietaryLabels: true,
            },
          },
        },
      },
    },
  });

  if (!order) return;

  const itemsSummary = [];
  const dietaryLabelsFound = new Set<string>();
  const allergensFound = new Set<string>();

  for (const item of order.items) {
    if (item.menuItem) {
      itemsSummary.push({
        itemId: item.menuItem.id,
        nameEn: item.menuItem.nameEn,
        price: String(item.price),
        quantity: item.quantity,
      });

      for (const label of item.menuItem.dietaryLabels) {
        dietaryLabelsFound.add(label.key);
      }

      if (item.menuItem.allergens) {
        for (const allergen of item.menuItem.allergens) {
          allergensFound.add(allergen);
        }
      }
    }
  }

  const sessionId = `session-order-${order.id}`;

  // 1. order_placed
  await tx.userSignal.create({
    data: {
      sessionId,
      venueId: order.venueId,
      tableId: order.tableId,
      eventType: "order_placed",
      eventData: {
        orderId: order.id,
        totalAmount: String(order.totalAmount),
        paymentMethod: order.paymentMethod || "unknown",
        items: itemsSummary,
        timestamp: order.paidAt ? order.paidAt.toISOString() : new Date().toISOString(),
      },
    },
  });

  // 2. implicit_dietary_preference
  if (dietaryLabelsFound.size > 0) {
    await tx.userSignal.create({
      data: {
        sessionId,
        venueId: order.venueId,
        tableId: order.tableId,
        eventType: "implicit_dietary_preference",
        eventData: {
          orderId: order.id,
          dietaryLabels: Array.from(dietaryLabelsFound),
          allergens: Array.from(allergensFound),
        },
      },
    });
  }

  // 3. spending_bracket
  const totalVal = Number(order.totalAmount);
  let priceLevel = "low";
  if (totalVal > 1000) {
    priceLevel = "high";
  } else if (totalVal > 400) {
    priceLevel = "medium";
  }

  await tx.userSignal.create({
    data: {
      sessionId,
      venueId: order.venueId,
      tableId: order.tableId,
      eventType: "spending_bracket",
      eventData: {
        orderId: order.id,
        amount: totalVal,
        bracket: priceLevel,
      },
    },
  });
}
