const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ingredients = [
  { name: "Kahve Çekirdeği", unit: "g", currentStock: 2500, weightedCost: 0.35, reorderLevel: 500, venueId: "venue-karakoy-main" },
  { name: "Süt", unit: "ml", currentStock: 10000, weightedCost: 0.035, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Toz Şeker", unit: "g", currentStock: 5000, weightedCost: 0.035, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Un", unit: "g", currentStock: 10000, weightedCost: 0.02, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Tereyağı", unit: "g", currentStock: 3000, weightedCost: 0.28, reorderLevel: 500, venueId: "venue-karakoy-main" },
  { name: "Zeytinyağı", unit: "ml", currentStock: 5000, weightedCost: 0.30, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Domates", unit: "g", currentStock: 8000, weightedCost: 0.03, reorderLevel: 1500, venueId: "venue-karakoy-main" },
  { name: "Biber", unit: "g", currentStock: 4000, weightedCost: 0.04, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Soğan", unit: "g", currentStock: 6000, weightedCost: 0.015, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Kıyma", unit: "g", currentStock: 5000, weightedCost: 0.45, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Tavuk Göğsü", unit: "g", currentStock: 6000, weightedCost: 0.18, reorderLevel: 1200, venueId: "venue-karakoy-main" },
  { name: "Yumurta", unit: "unit", currentStock: 120, weightedCost: 4.50, reorderLevel: 30, venueId: "venue-karakoy-main" },
  { name: "Tuz", unit: "g", currentStock: 2000, weightedCost: 0.01, reorderLevel: 500, venueId: "venue-karakoy-main" },
  { name: "Karabiber", unit: "g", currentStock: 1000, weightedCost: 0.80, reorderLevel: 200, venueId: "venue-karakoy-main" },
  { name: "Yoğurt", unit: "g", currentStock: 5000, weightedCost: 0.04, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Peynir", unit: "g", currentStock: 4000, weightedCost: 0.25, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Salça", unit: "g", currentStock: 3000, weightedCost: 0.08, reorderLevel: 500, venueId: "venue-karakoy-main" },
  { name: "Ekmek", unit: "unit", currentStock: 50, weightedCost: 10.00, reorderLevel: 10, venueId: "venue-karakoy-main" },
  { name: "Patates", unit: "g", currentStock: 15000, weightedCost: 0.02, reorderLevel: 3000, venueId: "venue-karakoy-main" },
  { name: "Maydanoz", unit: "unit", currentStock: 20, weightedCost: 10.00, reorderLevel: 5, venueId: "venue-karakoy-main" },
  { name: "Sarımsak", unit: "g", currentStock: 1000, weightedCost: 0.15, reorderLevel: 200, venueId: "venue-karakoy-main" },
  { name: "Pirinç", unit: "g", currentStock: 8000, weightedCost: 0.05, reorderLevel: 1500, venueId: "venue-karakoy-main" },
  { name: "Limon", unit: "unit", currentStock: 60, weightedCost: 5.00, reorderLevel: 15, venueId: "venue-karakoy-main" },
  { name: "Çay", unit: "g", currentStock: 3000, weightedCost: 0.15, reorderLevel: 500, venueId: "venue-karakoy-main" }
];

async function main() {
  const venue = await prisma.venue.findUnique({
    where: { id: "venue-karakoy-main" }
  });
  if (!venue) {
    console.error("Venue venue-karakoy-main not found");
    return;
  }

  console.log("Seeding ingredients...");
  for (const ing of ingredients) {
    // Check if ingredient already exists by name and venue
    const existing = await prisma.ingredient.findFirst({
      where: {
        venueId: ing.venueId,
        name: ing.name
      }
    });

    if (existing) {
      console.log(`Ingredient '${ing.name}' already exists. Updating...`);
      await prisma.ingredient.update({
        where: { id: existing.id },
        data: {
          unit: ing.unit,
          currentStock: ing.currentStock,
          weightedCost: ing.weightedCost,
          reorderLevel: ing.reorderLevel,
          updatedAt: new Date()
        }
      });
    } else {
      console.log(`Creating ingredient '${ing.name}'...`);
      await prisma.ingredient.create({
        data: {
          name: ing.name,
          unit: ing.unit,
          currentStock: ing.currentStock,
          weightedCost: ing.weightedCost,
          reorderLevel: ing.reorderLevel,
          venueId: ing.venueId,
          organizationId: venue.organizationId
        }
      });
    }
  }
  console.log("Ingredients seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding ingredients:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
