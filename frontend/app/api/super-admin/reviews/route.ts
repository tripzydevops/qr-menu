export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all reviews across all venues
export async function GET(request: NextRequest) {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        menuItem: {
          include: {
            category: {
              include: {
                venue: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const mappedReviews = reviews.map((rev) => ({
      id: rev.id,
      rating: rev.rating,
      comment: rev.comment,
      guestName: rev.guestName,
      menuItemId: rev.menuItemId,
      itemName: rev.menuItem.nameTr || rev.menuItem.nameEn,
      itemNameEn: rev.menuItem.nameEn,
      itemNameTr: rev.menuItem.nameTr,
      venueName: rev.menuItem.category.venue.name,
      venueId: rev.menuItem.category.venueId,
      createdAt: rev.createdAt.toISOString(),
    }));

    return NextResponse.json(mappedReviews);
  } catch (error: any) {
    console.error("Error fetching all reviews for super admin: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
