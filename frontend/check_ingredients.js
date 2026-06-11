const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const venueId = "venue-rwalop3e";

  // 1. Get all meze recipes and their linked ingredients
  const recipes = await p.recipe.findMany({
    where: { menuItem: { categoryId: '7af0074a-17bb-4636-ae8e-f0b0dc8ebc5a' } },
    include: {
      menuItem: { select: { id: true, nameTr: true, nameEn: true } },
      ingredients: { include: { ingredient: { select: { name: true } } } }
    }
  });

  console.log("=== MEZE RECIPE INGREDIENT AUDIT ===\n");

  let totalMezes = 0;
  let emptyRecipes = [];
  for (const r of recipes) {
    totalMezes++;
    const count = r.ingredients.length;
    if (count === 0) {
      emptyRecipes.push(r.menuItem.nameTr);
    }
    console.log(`${r.menuItem.nameTr} (${r.menuItem.nameEn}): ${count} ingredients linked`);
  }

  if (emptyRecipes.length > 0) {
    console.log("\n⚠️  RECIPES WITH NO INGREDIENTS:");
    emptyRecipes.forEach(n => console.log(`  - ${n}`));
  } else {
    console.log("\n✅ All recipes have ingredients linked.");
  }

  // 2. Get all ingredients in the venue
  const allIngs = await p.ingredient.findMany({
    where: { venueId },
    select: { name: true, currentStock: true, weightedCost: true, unit: true }
  });

  console.log(`\n=== VENUE INGREDIENTS: ${allIngs.length} total ===\n`);
  allIngs.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  for (const ing of allIngs) {
    console.log(`  ${ing.name} (${ing.unit}) — Stock: ${ing.currentStock}, Cost: ${ing.weightedCost} TRY/${ing.unit}`);
  }

  // 3. Cross-check: find all ingredient names referenced in seed scripts vs what's in DB
  const seedIngredientNames = new Set([
    // From batch1 seed_meze_recipes.js
    "Beyaz Peynir", "Ceviz İçi", "Zeytinyağı (Sızma)", "Sarımsak", "Yeşil Zeytin",
    "Nohut (Kuru)", "Tahin", "Soğan (Kuru)", "Çam Fıstığı", "Kuş Üzümü", "Patates",
    "Lakerda Balığı", "Dereotu", "Pirinç (Osmancık)", "Patlıcan", "Biber (Yeşil)",
    "Süzme Yoğurt", "Domates", "Kuzu Ciğeri", "Un (Buğday)", "Ayçiçek Yağı", "Maydanoz",
    "Yufka", "Pastırma", "Kaşar Peyniri", "Arnavut Biberi (Kuru)", "Tereyağı",
    "Semizotu", "Yoğurt", "Kavun", "Pilaki Fasulyesi", "Havuç", "Limon",
    "Deniz Börülcesi", "Kabak", "Asma Yaprağı", "Kuru Nane", "Karabiber", "Tuz",
    "Kuru Bakla", "Közlenmiş Kırmızı Biber", "Galeta Unu", "Nar Ekşisi", "Kimyon", "Pul Biber",
    "Balık Yumurtası", "Ekmek (Tombik)", "Çiroz Balığı", "Ahtapot", "Biber (Kırmızı Kapya)",
    "Midye", "Karides", "Kalamar", "Süt", "Levrek Fileto", "Kekik",
    "Bulgur (Pilavlık)", "Kıyma (Dana)", "Bezelye (Konserve)",
    "Enginar (Çanak)",
    // From batch2 seed_meze_batch2.js
    "Sirke", "Salatalık (Turşuluk)", "Lahana", "Yumurta", "Salatalık (Taze)"
  ]);

  const dbNames = new Set(allIngs.map(i => i.name));
  const missing = [...seedIngredientNames].filter(n => !dbNames.has(n));

  if (missing.length > 0) {
    console.log("\n⚠️  INGREDIENTS REFERENCED IN RECIPES BUT MISSING FROM DB:");
    missing.sort().forEach(n => console.log(`  ❌ ${n}`));
  } else {
    console.log("\n✅ All recipe ingredients exist in the database.");
  }

  // 4. Check for zero-cost ingredients
  const zeroCost = allIngs.filter(i => !i.weightedCost || Number(i.weightedCost) === 0);
  if (zeroCost.length > 0) {
    console.log("\n⚠️  INGREDIENTS WITH ZERO COST (costing will be inaccurate):");
    zeroCost.forEach(i => console.log(`  ⚠️  ${i.name}`));
  }

  console.log("\n=== AUDIT COMPLETE ===");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
