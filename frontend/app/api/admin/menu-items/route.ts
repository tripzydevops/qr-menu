import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
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

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return NextResponse.json({ detail: "Category not found" }, { status: 404 });
    }

    // Create item, translations and connect dietary labels
    const menuItem = await prisma.menuItem.create({
      data: {
        categoryId,
        nameTr,
        nameEn,
        descriptionTr: descriptionTr || null,
        descriptionEn: descriptionEn || null,
        price,
        imageUrl: imageUrl || null,
        allergens: allergens || [],
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        sortOrder: sortOrder || 0,
        calories: calories || null,
        translations: {
          create: [
            { locale: "tr", name: nameTr, description: descriptionTr || null },
            { locale: "en", name: nameEn, description: descriptionEn || null },
          ],
        },
        dietaryLabels: dietaryLabelIds && dietaryLabelIds.length > 0
          ? { connect: dietaryLabelIds.map((id: string) => ({ id })) }
          : undefined,
      },
      include: {
        translations: true,
        dietaryLabels: true,
      },
    });

    return NextResponse.json(
      {
        ...menuItem,
        price: Number(menuItem.price),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating menu item: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
