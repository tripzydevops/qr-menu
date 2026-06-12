export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { qr_token: string } }
) {
  try {
    const { qr_token } = params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || !query.trim()) {
      return NextResponse.json([]);
    }

    // 1. Resolve Table & Venue
    const table = await prisma.table.findUnique({
      where: { qrToken: qr_token },
    });

    if (!table) {
      return NextResponse.json({ detail: "Table not found" }, { status: 404 });
    }

    const venueId = table.venueId;
    const apiKey = process.env.GEMINI_API_KEY;

    let items: any[] = [];

    if (apiKey) {
      // 2. Perform Real Semantic Search using Gemini Embeddings + pgvector
      try {
        const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
        const embedRes = await fetch(embedUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: {
              parts: [{ text: query }],
            },
          }),
        });

        if (embedRes.ok) {
          const embedData = await embedRes.json();
          const embeddingVector = embedData.embedding.values;
          const queryEmbeddingStr = `[${embeddingVector.join(",")}]`;

          // raw SQL cosine distance query with pgvector
          items = await prisma.$queryRawUnsafe<any[]>(
            `
            SELECT m.id, m."nameTr", m."nameEn", m."descriptionTr", m."descriptionEn", m.price, m."imageUrl", m.allergens, m."isAvailable", m."categoryId"
            FROM "MenuItem" m
            JOIN "Category" c ON m."categoryId" = c.id
            WHERE c."venueId" = $1 AND m."isAvailable" = true AND m."isDeleted" = false
            ORDER BY m.embedding <=> $2::vector ASC
            LIMIT 6
            `,
            venueId,
            queryEmbeddingStr
          );
        } else {
          console.warn("[SemanticSearch] Gemini embeddings API failed. Falling back to ILIKE.");
        }
      } catch (err) {
        console.error("[SemanticSearch] Gemini embeddings API exception. Falling back to ILIKE:", err);
      }
    }

    // 3. Fallback to resilient ILIKE keyword search if API key is missing or failed
    if (items.length === 0) {
      const dbSearchQuery = `%${query}%`;
      items = await prisma.$queryRawUnsafe<any[]>(
        `
        SELECT m.id, m."nameTr", m."nameEn", m."descriptionTr", m."descriptionEn", m.price, m."imageUrl", m.allergens, m."isAvailable", m."categoryId"
        FROM "MenuItem" m
        JOIN "Category" c ON m."categoryId" = c.id
        WHERE c."venueId" = $1 AND m."isAvailable" = true AND m."isDeleted" = false
          AND (
            m."nameTr" ILIKE $2 OR
            m."nameEn" ILIKE $2 OR
            m."descriptionTr" ILIKE $2 OR
            m."descriptionEn" ILIKE $2
          )
        LIMIT 6
        `,
        venueId,
        dbSearchQuery
      );
    }

    const mappedItems = items.map((item) => ({
      id: item.id,
      nameTr: item.nameTr,
      nameEn: item.nameEn,
      descriptionTr: item.descriptionTr,
      descriptionEn: item.descriptionEn,
      price: Number(item.price),
      imageUrl: item.imageUrl,
      allergens: item.allergens || [],
      isAvailable: item.isAvailable,
      categoryId: item.categoryId,
    }));

    return NextResponse.json(mappedItems);
  } catch (error: any) {
    console.error("Error performing menu search: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
