export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orgs);
  } catch (error: any) {
    console.error("Error listing organizations: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      adminEmail,
      adminFirstName,
      adminLastName,
      adminUserId,
      subscriptionTier,
    } = body;

    if (!name || !adminEmail || !adminUserId) {
      return NextResponse.json(
        { detail: "name, adminEmail, and adminUserId are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: adminUserId },
    });
    if (existingUser) {
      return NextResponse.json(
        { detail: "User already registered" },
        { status: 400 }
      );
    }

    // Perform onboarding in a transaction
    const organization = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name,
          subscriptionTier: subscriptionTier || "free",
          status: "active",
        },
      });

      // 2. Create Default Venue
      const venueId = `venue-${crypto.randomUUID().substring(0, 8)}`;
      await tx.venue.create({
        data: {
          id: venueId,
          name: `${name} Main`,
          organizationId: org.id,
          currency: "TRY",
          defaultLocale: "tr",
          supportedLocales: ["tr", "en"],
        },
      });

      // 3. Create Admin User
      await tx.user.create({
        data: {
          id: adminUserId,
          email: adminEmail,
          firstName: adminFirstName || null,
          lastName: adminLastName || null,
          role: "ORGANIZATION_ADMIN",
          organizationId: org.id,
          isActive: true,
        },
      });

      return org;
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error: any) {
    console.error("Error onboarding organization: ", error);
    return NextResponse.json(
      { detail: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
