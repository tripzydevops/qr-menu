import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT to edit a review
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { rating, comment, guestName } = body;

    // Validate inputs if provided
    if (rating !== undefined && (typeof rating !== "number" || rating < 1 || rating > 5)) {
      return NextResponse.json(
        { detail: "Rating must be a number between 1 and 5." },
        { status: 400 }
      );
    }

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json(
        { detail: "Review not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        rating: rating !== undefined ? Math.round(rating) : review.rating,
        comment: comment !== undefined ? comment : review.comment,
        guestName: guestName !== undefined ? guestName : review.guestName,
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`Error updating review ${params.id}: `, error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE a review
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json(
        { detail: "Review not found." },
        { status: 404 }
      );
    }

    await prisma.review.delete({
      where: { id },
    });

    return NextResponse.json({ detail: "Review deleted successfully." });
  } catch (error: any) {
    console.error(`Error deleting review ${params.id}: `, error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
