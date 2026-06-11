const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.menuItem.findMany({ 
  take: 5,
  select: { id: true, nameTr: true, price: true, categoryId: true } 
})
.then(items => { 
  console.log(JSON.stringify(items, null, 2)); 
  p.$disconnect(); 
});
