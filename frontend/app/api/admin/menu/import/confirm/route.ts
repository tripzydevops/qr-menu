import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { venueId, categories } = body;

    if (!venueId || !categories) {
      return NextResponse.json({ detail: "venueId and categories are required" }, { status: 400 });
    }

    const venue = await prisma.venue.findUnique({
      where: { id: venueId }
    });
    if (!venue) {
      return NextResponse.json({ detail: "Venue not found" }, { status: 404 });
    }

    // Save categories and items in transaction
    await prisma.$transaction(async (tx) => {
      for (let catIdx = 0; catIdx < categories.length; catIdx++) {
        const cat = categories[catIdx];
        
        const dbCat = await tx.category.create({
          data: {
            venueId,
            nameTr: cat.nameTr,
            nameEn: cat.nameEn,
            sortOrder: catIdx,
            translations: {
              create: [
                { locale: "tr", name: cat.nameTr },
                { locale: "en", name: cat.nameEn }
              ]
            }
          }
        });

        for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
          const item = cat.items[itemIdx];
          
          await tx.menuItem.create({
            data: {
              categoryId: dbCat.id,
              nameTr: item.nameTr,
              nameEn: item.nameEn,
              descriptionTr: item.descriptionTr || null,
              descriptionEn: item.descriptionEn || null,
              price: item.price,
              allergens: item.allergens || [],
              calories: item.calories || null,
              sortOrder: itemIdx,
              translations: {
                create: [
                  { locale: "tr", name: item.nameTr, description: item.descriptionTr || null },
                  { locale: "en", name: item.nameEn, description: item.descriptionEn || null }
                ]
              }
            }
          });
        }
      }
    });

    return NextResponse.json({ status: "success", message: "Menu imported successfully." });
  } catch (error: any) {
    console.error("Confirm import failed:", error);
    return NextResponse.json({ detail: "Database save failed", error: error.message }, { status: 500 });
  }
}
