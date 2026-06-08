const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const densityMap = {
  // Liquids / Oils
  "Süt": 1.03,
  "Zeytinyağı": 0.92,
  "Zeytinyağı (Sızma)": 0.92,
  "Ayçiçek Yağı": 0.92,
  "Sıvı Krema": 0.95,
  "Su": 1.0,
  "Nar Ekşisi": 1.25,
  "Bal": 1.42,
  "Limon Suyu": 1.03,
  "Tahin": 1.22,
  "Pekmez": 1.40,
  "Sirke": 1.01,
  
  // Yogurt & Pastes & Dairy
  "Yoğurt": 1.06,
  "Süzme Yoğurt": 1.08,
  "Labne Peyniri": 1.02,
  "Mayonez": 0.98,
  "Ketçap": 1.15,
  "Domates Salçası": 1.15,
  "Biber Salçası": 1.15,
  "Salça": 1.15,
  "Tereyağı": 0.92,
  
  // Flours & Powders & Grains
  "Un": 0.52,
  "Un (Buğday)": 0.52,
  "Toz Şeker": 0.85,
  "Pirinç": 0.80,
  "Pirinç (Osmancık)": 0.80,
  "Bulgur": 0.76,
  "Bulgur (Pilavlık)": 0.76,
  "İrmik": 0.72,
  "Nişasta": 0.55,
  "Nişasta (Mısır)": 0.55,
  "Tuz": 1.20,
  "Karabiber": 0.50,
  "Pul Biber": 0.45,
  "Kimyon": 0.45,
  "Kekik": 0.15,
  "Sumak": 0.55,
  "Çay": 0.35,
  "Çay (Dökme Rize)": 0.35,
  "Kahve Çekirdeği": 0.38,
  "Kahve Çekirdeği (Espresso)": 0.38,
  "Türk Kahvesi": 0.42,
  "Kakao Tozu": 0.48,
  "Nohut (Kuru)": 0.75,
  "Galeta Unu": 0.50,
  "Kuru Bakla": 0.80,
};

async function main() {
  console.log("Updating existing ingredient densities in database...");
  const allIngredients = await prisma.ingredient.findMany();
  
  let updatedCount = 0;
  for (const ing of allIngredients) {
    const matchedDensity = densityMap[ing.name];
    if (matchedDensity !== undefined) {
      await prisma.ingredient.update({
        where: { id: ing.id },
        data: {
          density: matchedDensity,
        },
      });
      console.log(`Updated '${ing.name}' density to: ${matchedDensity} g/mL`);
      updatedCount++;
    }
  }
  console.log(`Successfully updated ${updatedCount} ingredients!`);
}

main()
  .catch((e) => {
    console.error("Error updating densities:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
