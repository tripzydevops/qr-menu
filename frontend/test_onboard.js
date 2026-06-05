const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log("Starting debug run...");
    const name = "bispecial";
    const adminEmail = "bispecialmeze@gmail.com";
    const adminFirstName = "gulsah";
    const adminLastName = "alver";
    const adminUserId = "usr_nsqi3m90bdoob0oo1rqrc";
    const subscriptionTier = "free";

    // Try checking if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: adminUserId },
    });
    console.log("Existing user check:", existingUser);

    if (existingUser) {
      console.log("User already exists!");
      return;
    }

    // Try transaction
    const org = await prisma.$transaction(async (tx) => {
      console.log("1. Creating Organization...");
      const newOrg = await tx.organization.create({
        data: {
          name,
          subscriptionTier: subscriptionTier || "free",
          status: "active",
        },
      });
      console.log("Organization created:", newOrg.id);

      console.log("2. Creating Default Venue...");
      const venueId = `venue-${Math.random().toString(36).substring(2, 10)}`;
      const newVenue = await tx.venue.create({
        data: {
          id: venueId,
          name: `${name} Main`,
          organizationId: newOrg.id,
          currency: "TRY",
          defaultLocale: "tr",
          supportedLocales: ["tr", "en"],
        },
      });
      console.log("Venue created:", newVenue.id);

      console.log("3. Creating Admin User...");
      const newUser = await tx.user.create({
        data: {
          id: adminUserId,
          email: adminEmail,
          firstName: adminFirstName || null,
          lastName: adminLastName || null,
          role: "ORGANIZATION_ADMIN",
          organizationId: newOrg.id,
          isActive: true,
        },
      });
      console.log("User created:", newUser.id);

      return newOrg;
    });

    console.log("Transaction succeeded!", org);
  } catch (err) {
    console.error("TRANSACTION FAILED WITH ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
