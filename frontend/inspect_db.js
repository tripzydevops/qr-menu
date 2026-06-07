const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        premiumMenuEnabled: true,
        premiumMenuSelected: true,
      }
    });
    console.log("=== Organizations ===");
    orgs.forEach(o => console.log(JSON.stringify(o, null, 2)));

    const tables = await prisma.table.findMany({
      where: { qrToken: 'k1' },
      select: { id: true, name: true, qrToken: true, venueId: true }
    });
    console.log("\n=== Table with qrToken=k1 ===");
    tables.forEach(t => console.log(JSON.stringify(t, null, 2)));

    if (tables.length > 0) {
      const venue = await prisma.venue.findUnique({
        where: { id: tables[0].venueId },
        select: { id: true, name: true, organizationId: true }
      });
      console.log("\n=== Venue ===");
      console.log(JSON.stringify(venue, null, 2));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
