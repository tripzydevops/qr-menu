const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ingredients = [
  // --- MEATS, POULTRY & CHARCUTERIE ---
  { name: "Dana Bonfile", unit: "g", currentStock: 3000, weightedCost: 0.85, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Kıyma (Dana)", unit: "g", currentStock: 8000, weightedCost: 0.45, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Tavuk Göğsü", unit: "g", currentStock: 10000, weightedCost: 0.18, reorderLevel: 2500, venueId: "venue-karakoy-main" },
  { name: "Kuzu Pirzola", unit: "g", currentStock: 3000, weightedCost: 0.95, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Sucuk", unit: "g", currentStock: 4000, weightedCost: 0.55, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Pastırma", unit: "g", currentStock: 1500, weightedCost: 1.10, reorderLevel: 500, venueId: "venue-karakoy-main" },

  // --- SEAFOOD ---
  { name: "Levrek Fileto", unit: "g", currentStock: 4000, weightedCost: 0.60, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Somon Fileto", unit: "g", currentStock: 3000, weightedCost: 0.80, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Karides", unit: "g", currentStock: 2500, weightedCost: 0.75, reorderLevel: 500, venueId: "venue-karakoy-main" },

  // --- DAIRY & EGGS ---
  { name: "Süt", unit: "ml", currentStock: 25000, weightedCost: 0.035, reorderLevel: 5000, venueId: "venue-karakoy-main" },
  { name: "Tereyağı", unit: "g", currentStock: 6000, weightedCost: 0.28, reorderLevel: 1500, venueId: "venue-karakoy-main" },
  { name: "Yumurta", unit: "unit", currentStock: 360, weightedCost: 4.50, reorderLevel: 60, venueId: "venue-karakoy-main" },
  { name: "Yoğurt", unit: "g", currentStock: 15000, weightedCost: 0.04, reorderLevel: 3000, venueId: "venue-karakoy-main" },
  { name: "Süzme Yoğurt", unit: "g", currentStock: 8000, weightedCost: 0.06, reorderLevel: 1500, venueId: "venue-karakoy-main" },
  { name: "Beyaz Peynir", unit: "g", currentStock: 8000, weightedCost: 0.18, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Kaşar Peyniri", unit: "g", currentStock: 10000, weightedCost: 0.24, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Parmesan Peyniri", unit: "g", currentStock: 1500, weightedCost: 0.85, reorderLevel: 400, venueId: "venue-karakoy-main" },
  { name: "Lor Peyniri", unit: "g", currentStock: 4000, weightedCost: 0.08, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Sıvı Krema", unit: "ml", currentStock: 5000, weightedCost: 0.09, reorderLevel: 1000, venueId: "venue-karakoy-main" },

  // --- FRESH VEGETABLES ---
  { name: "Domates", unit: "g", currentStock: 25000, weightedCost: 0.03, reorderLevel: 5000, venueId: "venue-karakoy-main" },
  { name: "Salatalık", unit: "g", currentStock: 15000, weightedCost: 0.02, reorderLevel: 3000, venueId: "venue-karakoy-main" },
  { name: "Biber (Yeşil)", unit: "g", currentStock: 10000, weightedCost: 0.04, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Biber (Kırmızı Kapya)", unit: "g", currentStock: 6000, weightedCost: 0.05, reorderLevel: 1200, venueId: "venue-karakoy-main" },
  { name: "Soğan (Kuru)", unit: "g", currentStock: 20000, weightedCost: 0.015, reorderLevel: 4000, venueId: "venue-karakoy-main" },
  { name: "Soğan (Yeşil)", unit: "unit", currentStock: 50, weightedCost: 8.00, reorderLevel: 10, venueId: "venue-karakoy-main" },
  { name: "Sarımsak", unit: "g", currentStock: 2000, weightedCost: 0.15, reorderLevel: 400, venueId: "venue-karakoy-main" },
  { name: "Patates", unit: "g", currentStock: 40000, weightedCost: 0.02, reorderLevel: 8000, venueId: "venue-karakoy-main" },
  { name: "Patlıcan", unit: "g", currentStock: 10000, weightedCost: 0.035, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Havuç", unit: "g", currentStock: 8000, weightedCost: 0.02, reorderLevel: 1500, venueId: "venue-karakoy-main" },
  { name: "Kabak", unit: "g", currentStock: 8000, weightedCost: 0.025, reorderLevel: 1500, venueId: "venue-karakoy-main" },
  { name: "Mantar (Kültür)", unit: "g", currentStock: 5000, weightedCost: 0.07, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Ispanak", unit: "g", currentStock: 6000, weightedCost: 0.04, reorderLevel: 1500, venueId: "venue-karakoy-main" },
  { name: "Marul", unit: "unit", currentStock: 40, weightedCost: 15.00, reorderLevel: 8, venueId: "venue-karakoy-main" },
  { name: "Roka", unit: "unit", currentStock: 30, weightedCost: 10.00, reorderLevel: 6, venueId: "venue-karakoy-main" },

  // --- FRESH FRUITS & HERBS ---
  { name: "Limon", unit: "unit", currentStock: 150, weightedCost: 5.00, reorderLevel: 30, venueId: "venue-karakoy-main" },
  { name: "Avokado", unit: "unit", currentStock: 24, weightedCost: 35.00, reorderLevel: 5, venueId: "venue-karakoy-main" },
  { name: "Maydanoz", unit: "unit", currentStock: 50, weightedCost: 10.00, reorderLevel: 10, venueId: "venue-karakoy-main" },
  { name: "Dereotu", unit: "unit", currentStock: 30, weightedCost: 10.00, reorderLevel: 6, venueId: "venue-karakoy-main" },
  { name: "Nane (Taze)", unit: "unit", currentStock: 30, weightedCost: 10.00, reorderLevel: 6, venueId: "venue-karakoy-main" },

  // --- OILS, CONDIMENTS & CANNED GOODS ---
  { name: "Zeytinyağı (Sızma)", unit: "ml", currentStock: 15000, weightedCost: 0.32, reorderLevel: 3000, venueId: "venue-karakoy-main" },
  { name: "Ayçiçek Yağı", unit: "ml", currentStock: 20000, weightedCost: 0.06, reorderLevel: 5000, venueId: "venue-karakoy-main" },
  { name: "Domates Salçası", unit: "g", currentStock: 8000, weightedCost: 0.08, reorderLevel: 1500, venueId: "venue-karakoy-main" },
  { name: "Biber Salçası", unit: "g", currentStock: 5000, weightedCost: 0.11, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Mayonez", unit: "g", currentStock: 4000, weightedCost: 0.09, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Ketçap", unit: "g", currentStock: 4000, weightedCost: 0.07, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Bal", unit: "g", currentStock: 3000, weightedCost: 0.25, reorderLevel: 500, venueId: "venue-karakoy-main" },
  { name: "Nar Ekşisi", unit: "ml", currentStock: 2000, weightedCost: 0.15, reorderLevel: 400, venueId: "venue-karakoy-main" },

  // --- DRY PANTRY GOODS ---
  { name: "Un (Buğday)", unit: "g", currentStock: 30000, weightedCost: 0.02, reorderLevel: 5000, venueId: "venue-karakoy-main" },
  { name: "Toz Şeker", unit: "g", currentStock: 15000, weightedCost: 0.035, reorderLevel: 3000, venueId: "venue-karakoy-main" },
  { name: "Pirinç (Osmancık)", unit: "g", currentStock: 20000, weightedCost: 0.05, reorderLevel: 4000, venueId: "venue-karakoy-main" },
  { name: "Bulgur (Pilavlık)", unit: "g", currentStock: 15000, weightedCost: 0.03, reorderLevel: 3000, venueId: "venue-karakoy-main" },
  { name: "Makarna (Spagetti)", unit: "g", currentStock: 10000, weightedCost: 0.04, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Ekmek (Tombik)", unit: "unit", currentStock: 100, weightedCost: 8.00, reorderLevel: 20, venueId: "venue-karakoy-main" },
  { name: "Ekmek (Sandviç)", unit: "unit", currentStock: 80, weightedCost: 9.00, reorderLevel: 15, venueId: "venue-karakoy-main" },
  { name: "İrmik", unit: "g", currentStock: 5000, weightedCost: 0.028, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Nişasta (Mısır)", unit: "g", currentStock: 4000, weightedCost: 0.035, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Kuru Maya", unit: "g", currentStock: 1000, weightedCost: 0.18, reorderLevel: 200, venueId: "venue-karakoy-main" },

  // --- SPICES & SEASONINGS ---
  { name: "Tuz", unit: "g", currentStock: 5000, weightedCost: 0.01, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Karabiber", unit: "g", currentStock: 2000, weightedCost: 0.80, reorderLevel: 400, venueId: "venue-karakoy-main" },
  { name: "Pul Biber", unit: "g", currentStock: 3000, weightedCost: 0.45, reorderLevel: 500, venueId: "venue-karakoy-main" },
  { name: "Kekik", unit: "g", currentStock: 2000, weightedCost: 0.35, reorderLevel: 400, venueId: "venue-karakoy-main" },
  { name: "Kimyon", unit: "g", currentStock: 2000, weightedCost: 0.50, reorderLevel: 400, venueId: "venue-karakoy-main" },
  { name: "Sumak", unit: "g", currentStock: 1500, weightedCost: 0.60, reorderLevel: 300, venueId: "venue-karakoy-main" },

  // --- BEVERAGES & CAFE SPECIFIC ---
  { name: "Kahve Çekirdeği (Espresso)", unit: "g", currentStock: 10000, weightedCost: 0.35, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Türk Kahvesi", unit: "g", currentStock: 4000, weightedCost: 0.28, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Çay (Dökme Rize)", unit: "g", currentStock: 10000, weightedCost: 0.15, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Kakao Tozu", unit: "g", currentStock: 2000, weightedCost: 0.22, reorderLevel: 400, venueId: "venue-karakoy-main" },

  // --- MEZE INGREDIENTS ---
  { name: "Nohut (Kuru)", unit: "g", currentStock: 10000, weightedCost: 0.06, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Tahin", unit: "g", currentStock: 5000, weightedCost: 0.18, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Ceviz İçi", unit: "g", currentStock: 4000, weightedCost: 0.45, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Çam Fıstığı", unit: "g", currentStock: 1000, weightedCost: 2.20, reorderLevel: 200, venueId: "venue-karakoy-main" },
  { name: "Kuru Nane", unit: "g", currentStock: 2000, weightedCost: 0.35, reorderLevel: 400, venueId: "venue-karakoy-main" },
  { name: "Galeta Unu", unit: "g", currentStock: 5000, weightedCost: 0.025, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Kuru Bakla", unit: "g", currentStock: 6000, weightedCost: 0.07, reorderLevel: 1200, venueId: "venue-karakoy-main" },
  { name: "Közlenmiş Kırmızı Biber", unit: "g", currentStock: 8000, weightedCost: 0.12, reorderLevel: 1500, venueId: "venue-karakoy-main" },
  { name: "Közlenmiş Patlıcan", unit: "g", currentStock: 10000, weightedCost: 0.09, reorderLevel: 2000, venueId: "venue-karakoy-main" },
  { name: "Deniz Börülcesi", unit: "unit", currentStock: 25, weightedCost: 25.00, reorderLevel: 5, venueId: "venue-karakoy-main" },
  { name: "Arnavut Biberi (Kuru)", unit: "g", currentStock: 1000, weightedCost: 0.95, reorderLevel: 200, venueId: "venue-karakoy-main" },
  { name: "Antep Fıstığı (İç)", unit: "g", currentStock: 2000, weightedCost: 0.90, reorderLevel: 400, venueId: "venue-karakoy-main" },
  { name: "Semizotu", unit: "unit", currentStock: 30, weightedCost: 12.00, reorderLevel: 6, venueId: "venue-karakoy-main" },
  { name: "Enginar (Çanak)", unit: "unit", currentStock: 40, weightedCost: 20.00, reorderLevel: 8, venueId: "venue-karakoy-main" },
  { name: "Bezelye (Konserve)", unit: "g", currentStock: 6000, weightedCost: 0.035, reorderLevel: 1200, venueId: "venue-karakoy-main" },
  { name: "Kuş Üzümü", unit: "g", currentStock: 1500, weightedCost: 0.40, reorderLevel: 300, venueId: "venue-karakoy-main" },
  { name: "Labne Peyniri", unit: "g", currentStock: 4000, weightedCost: 0.12, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Nar", unit: "unit", currentStock: 50, weightedCost: 8.00, reorderLevel: 10, venueId: "venue-karakoy-main" },

  // --- DELICATESSEN & SANDWICH SHOP INGREDIENTS ---
  { name: "Hindi Füme", unit: "g", currentStock: 5000, weightedCost: 0.35, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Dana Jambon", unit: "g", currentStock: 4000, weightedCost: 0.48, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Macar Salamı", unit: "g", currentStock: 4000, weightedCost: 0.38, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Frankfurter Sosis", unit: "g", currentStock: 3000, weightedCost: 0.40, reorderLevel: 600, venueId: "venue-karakoy-main" },
  { name: "Füme Kaburga", unit: "g", currentStock: 2000, weightedCost: 0.88, reorderLevel: 400, venueId: "venue-karakoy-main" },
  { name: "Rozbif (Dana)", unit: "g", currentStock: 2000, weightedCost: 0.85, reorderLevel: 400, venueId: "venue-karakoy-main" },
  { name: "Ton Balığı (Konserve)", unit: "g", currentStock: 5000, weightedCost: 0.14, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Çedar Peyniri (Dilimli)", unit: "g", currentStock: 5000, weightedCost: 0.30, reorderLevel: 1000, venueId: "venue-karakoy-main" },
  { name: "Mozzarella (Taze)", unit: "g", currentStock: 4000, weightedCost: 0.26, reorderLevel: 800, venueId: "venue-karakoy-main" },
  { name: "Kornişon Turşu", unit: "g", currentStock: 8000, weightedCost: 0.04, reorderLevel: 1500, venueId: "venue-karakoy-main" },
  { name: "Dijon Hardalı", unit: "g", currentStock: 1500, weightedCost: 0.18, reorderLevel: 300, venueId: "venue-karakoy-main" },
  { name: "BBQ Sos", unit: "g", currentStock: 3000, weightedCost: 0.09, reorderLevel: 600, venueId: "venue-karakoy-main" },
  { name: "Jalapeno Biberi (Turşu)", unit: "g", currentStock: 3000, weightedCost: 0.06, reorderLevel: 600, venueId: "venue-karakoy-main" },
  { name: "Ekşi Mayalı Ekmek (Dilimli)", unit: "unit", currentStock: 50, weightedCost: 12.00, reorderLevel: 10, venueId: "venue-karakoy-main" },
  { name: "Baget Ekmek", unit: "unit", currentStock: 60, weightedCost: 8.00, reorderLevel: 15, venueId: "venue-karakoy-main" },
  { name: "Ciabatta Ekmek", unit: "unit", currentStock: 50, weightedCost: 10.00, reorderLevel: 10, venueId: "venue-karakoy-main" },
  { name: "Krem Peynir", unit: "g", currentStock: 3000, weightedCost: 0.08, reorderLevel: 600, venueId: "venue-karakoy-main" },
  { name: "Pesto Sos", unit: "g", currentStock: 2000, weightedCost: 0.24, reorderLevel: 400, venueId: "venue-karakoy-main" },
  { name: "Kurutulmuş Domates", unit: "g", currentStock: 3000, weightedCost: 0.16, reorderLevel: 500, venueId: "venue-karakoy-main" }
];

async function main() {
  const venue = await prisma.venue.findUnique({
    where: { id: "venue-karakoy-main" }
  });
  if (!venue) {
    console.error("Venue venue-karakoy-main not found");
    return;
  }

  console.log("Seeding expanded list of ingredients...");
  let createdCount = 0;
  let updatedCount = 0;

  for (const ing of ingredients) {
    const existing = await prisma.ingredient.findFirst({
      where: {
        venueId: ing.venueId,
        name: ing.name
      }
    });

    if (existing) {
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
      updatedCount++;
    } else {
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
      createdCount++;
    }
  }
  console.log(`Seeding complete: Created ${createdCount} new ingredients, updated ${updatedCount} existing ingredients.`);
}

main()
  .catch((e) => {
    console.error("Error seeding ingredients:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
