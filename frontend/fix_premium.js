const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    // Enable premium for org-karakoy (token k1 points here)
    const result1 = await prisma.organization.update({
      where: { id: 'org-karakoy' },
      data: { 
        premiumMenuEnabled: true, 
        premiumMenuSelected: true 
      },
    });
    console.log("Updated org-karakoy:", result1.name, "premiumMenuSelected:", result1.premiumMenuSelected);

    // Also enable for bispecial (the live org)
    const result2 = await prisma.organization.update({
      where: { id: 'cb541e44-ccaf-435a-a1b4-6eb3f65f5ba8' },
      data: { 
        premiumMenuEnabled: true, 
        premiumMenuSelected: true 
      },
    });
    console.log("Updated bispecial:", result2.name, "premiumMenuSelected:", result2.premiumMenuSelected);

    console.log("\nDone! Both orgs now have premium enabled.");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
