const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking and adding 'Order' to supabase_realtime publication...");
    await prisma.$executeRawUnsafe(
      `ALTER PUBLICATION supabase_realtime ADD TABLE "Order";`
    ).catch(e => {
      console.log("Order table note (might already exist):", e.message);
    });

    console.log("Checking and adding 'WaiterRequest' to supabase_realtime publication...");
    await prisma.$executeRawUnsafe(
      `ALTER PUBLICATION supabase_realtime ADD TABLE "WaiterRequest";`
    ).catch(e => {
      console.log("WaiterRequest table note (might already exist):", e.message);
    });

    console.log("Realtime publication check complete!");
  } catch (err) {
    console.error("Error enabling realtime:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
