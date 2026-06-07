const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.table.findMany({ select: { id: true, name: true, qrToken: true, venueId: true } })
  .then(t => { console.log(JSON.stringify(t, null, 2)); p.$disconnect(); });
