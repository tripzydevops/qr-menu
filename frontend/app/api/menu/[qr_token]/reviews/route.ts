export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET reviews for a menu item or venue
export async function GET(
  request: NextRequest,
  { params }: { params: { qr_token: string } }
) {
  try {
    const { qr_token } = params;
    const { searchParams } = new URL(request.url);
    const menuItemId = searchParams.get("menuItemId");

    // 1. Resolve Table
    const table = await prisma.table.findUnique({
      where: { qrToken: qr_token },
    });

    if (!table) {
      return NextResponse.json(
        { detail: "Table/QR Code not found." },
        { status: 404 }
      );
    }

    // 2. Get Venue and check if reviews are enabled
    const venue = await prisma.venue.findUnique({
      where: { id: table.venueId },
    });

    if (!venue) {
      return NextResponse.json(
        { detail: "Associated venue not found." },
        { status: 404 }
      );
    }

    if (!venue.reviewsEnabled) {
      return NextResponse.json(
        { detail: "Reviews are disabled for this venue.", reviews: [] },
        { status: 200 }
      );
    }

    // 3. Fetch reviews
    const reviews = await prisma.review.findMany({
      where: menuItemId ? {
        menuItemId: menuItemId,
        menuItem: {
          category: {
            venueId: venue.id
          }
        }
      } : {
        menuItem: {
          category: {
            venueId: venue.id
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(reviews);
  } catch (error: any) {
    console.error("Error fetching reviews: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

// POST a new review
export async function POST(
  request: NextRequest,
  { params }: { params: { qr_token: string } }
) {
  try {
    const { qr_token } = params;
    const body = await request.json();
    const { menuItemId, rating, comment, guestName } = body;

    // Validate request body
    if (!menuItemId) {
      return NextResponse.json(
        { detail: "menuItemId is required." },
        { status: 400 }
      );
    }

    if (rating === undefined || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { detail: "Rating must be a number between 1 and 5." },
        { status: 400 }
      );
    }

    // 1. Resolve Table
    const table = await prisma.table.findUnique({
      where: { qrToken: qr_token },
    });

    if (!table) {
      return NextResponse.json(
        { detail: "Table/QR Code not found." },
        { status: 404 }
      );
    }

    // 2. Get Venue and check if reviews are enabled
    const venue = await prisma.venue.findUnique({
      where: { id: table.venueId },
    });

    if (!venue) {
      return NextResponse.json(
        { detail: "Associated venue not found." },
        { status: 404 }
      );
    }

    if (!venue.reviewsEnabled) {
      return NextResponse.json(
        { detail: "Reviews are disabled for this venue." },
        { status: 400 }
      );
    }

    // 3. Verify MenuItem exists and belongs to this venue
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        category: true
      }
    });

    if (!menuItem || menuItem.category.venueId !== venue.id || menuItem.isDeleted) {
      return NextResponse.json(
        { detail: "Menu item not found for this venue." },
        { status: 404 }
      );
    }

    // 4. Create review
    const review = await prisma.review.create({
      data: {
        menuItemId,
        rating: Math.round(rating),
        comment: comment || null,
        guestName: guestName || "Guest",
      }
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error: any) {
    console.error("Error creating review: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
