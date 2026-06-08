import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      categoryId,
      nameTr,
      nameEn,
      descriptionTr,
      descriptionEn,
      price,
      imageUrl,
      allergens,
      isAvailable,
      sortOrder,
      calories,
      dietaryLabelIds,
    } = body;

    if (!categoryId || !nameTr || !nameEn || price === undefined) {
      return NextResponse.json(
        { detail: "categoryId, nameTr, nameEn, and price are required" },
        { status: 400 }
      );
    }

    const item = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { detail: "Menu Item not found" },
        { status: 404 }
      );
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      const updated = await tx.menuItem.update({
        where: { id },
        data: {
          categoryId,
          nameTr,
          nameEn,
          descriptionTr: descriptionTr !== undefined ? descriptionTr : item.descriptionTr,
          descriptionEn: descriptionEn !== undefined ? descriptionEn : item.descriptionEn,
          price,
          imageUrl: imageUrl !== undefined ? imageUrl : item.imageUrl,
          allergens: allergens !== undefined ? allergens : item.allergens,
          isAvailable: isAvailable !== undefined ? isAvailable : item.isAvailable,
          sortOrder: sortOrder !== undefined ? sortOrder : item.sortOrder,
          calories: calories !== undefined ? calories : item.calories,
          dietaryLabels: dietaryLabelIds !== undefined
            ? { set: dietaryLabelIds.map((lid: string) => ({ id: lid })) }
            : undefined,
        },
        include: {
          translations: true,
          dietaryLabels: true,
        },
      });

      await tx.menuItemTranslation.upsert({
        where: { menuItemId_locale: { menuItemId: id, locale: "tr" } },
        update: { name: nameTr, description: descriptionTr || null },
        create: { menuItemId: id, locale: "tr", name: nameTr, description: descriptionTr || null },
      });

      await tx.menuItemTranslation.upsert({
        where: { menuItemId_locale: { menuItemId: id, locale: "en" } },
        update: { name: nameEn, description: descriptionEn || null },
        create: { menuItemId: id, locale: "en", name: nameEn, description: descriptionEn || null },
      });

      return updated;
    });

    return NextResponse.json({
      ...updatedItem,
      price: Number(updatedItem.price),
    });
  } catch (error: any) {
    console.error("Error updating menu item: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const item = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { detail: "Menu Item not found" },
        { status: 404 }
      );
    }

    await prisma.menuItem.update({
      where: { id },
      data: { isDeleted: true },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error deleting menu item: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
