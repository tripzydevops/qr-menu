const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const o = await prisma.order.findUnique({
      where: { id: 'fc1c75cb-1e82-43c3-b2e4-81b200ecc1f1' },
      include: {
        items: {
          include: {
            menuItem: true
          }
        }
      }
    });
    console.log(JSON.stringify(o, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
