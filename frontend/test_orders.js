const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const venueId = "venue-karakoy-main";
    console.log("Querying orders for venue:", venueId);
    const orders = await prisma.order.findMany({
      where: { venueId },
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log("Total orders found:", orders.length);
    orders.forEach(o => {
      console.log(`Order ID: ${o.id}, Table: ${o.table?.name || 'None'}, Status: ${o.status}, Total: ${o.totalAmount}`);
    });
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
