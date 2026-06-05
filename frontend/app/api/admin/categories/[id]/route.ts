import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { nameTr, nameEn, iconName, sortOrder, menuId } = body;

    if (!nameTr || !nameEn) {
      return NextResponse.json(
        { detail: "nameTr and nameEn are required" },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { detail: "Category not found" },
        { status: 404 }
      );
    }

    // Update category and upsert translations in a transaction
    const updatedCategory = await prisma.$transaction(async (tx) => {
      const cat = await tx.category.update({
        where: { id },
        data: {
          nameTr,
          nameEn,
          iconName: iconName !== undefined ? iconName : category.iconName,
          sortOrder: sortOrder !== undefined ? sortOrder : category.sortOrder,
          menuId: menuId !== undefined ? menuId : category.menuId,
        },
      });

      await tx.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: id, locale: "tr" } },
        update: { name: nameTr },
        create: { categoryId: id, locale: "tr", name: nameTr },
      });

      await tx.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: id, locale: "en" } },
        update: { name: nameEn },
        create: { categoryId: id, locale: "en", name: nameEn },
      });

      return cat;
    });

    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error("Error updating category: ", error);
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

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { detail: "Category not found" },
        { status: 404 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error deleting category: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
