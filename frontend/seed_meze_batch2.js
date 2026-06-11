const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// New ingredients needed for the batch2 mezes
const newIngredients = [
  { name: "Sirke", unit: "ml", currentStock: 5000, weightedCost: 0.02, reorderLevel: 1000, venueId: "venue-rwalop3e" },
  { name: "Salatalık (Turşuluk)", unit: "kg", currentStock: 20, weightedCost: 25.00, reorderLevel: 5, venueId: "venue-rwalop3e" },
  { name: "Lahana", unit: "kg", currentStock: 15, weightedCost: 15.00, reorderLevel: 3, venueId: "venue-rwalop3e" },
  { name: "Yumurta", unit: "unit", currentStock: 200, weightedCost: 5.00, reorderLevel: 50, venueId: "venue-rwalop3e" },
  { name: "Salatalık (Taze)", unit: "unit", currentStock: 50, weightedCost: 5.00, reorderLevel: 10, venueId: "venue-rwalop3e" },
];

// 4 existing mezes that need image updates (already in DB from seed_meze_recipes.js)
const existingImageUpdates = [
  { id: "item-sarma", imageUrl: "/images/yaprak_sarma.png" },
  { id: "item-enginar", imageUrl: "/images/enginar.png" },
  { id: "item-saksuka", imageUrl: "/images/saksuka.png" },
  { id: "item-cold-hummus", imageUrl: "/images/humus.png" },
];

// 5 completely new mezes
const newMezes = [
  {
    id: "item-biber-dolma",
    nameTr: "Biber Dolma (Zeytinyağlı)",
    nameEn: "Stuffed Peppers in Olive Oil",
    descriptionTr: "Baharatlı pirinç, çam fıstığı ve kuş üzümü ile doldurulmuş, zeytinyağında pişirilmiş biber dolması. Soğuk servis edilir.",
    descriptionEn: "Cold stuffed bell peppers filled with spiced rice, pine nuts, and currants, braised in olive oil and served at room temperature.",
    price: 150.00,
    calories: 200,
    imageUrl: "/images/biber_dolma.png",
    allergens: ["nuts"],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.82,
      ingredients: [
        { name: "Biber (Yeşil)", amountUsed: 150 },
        { name: "Pirinç (Osmancık)", amountUsed: 60 },
        { name: "Soğan (Kuru)", amountUsed: 40 },
        { name: "Domates", amountUsed: 30 },
        { name: "Çam Fıstığı", amountUsed: 5 },
        { name: "Kuş Üzümü", amountUsed: 5 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 20 },
        { name: "Kuru Nane", amountUsed: 2 },
        { name: "Karabiber", amountUsed: 1 },
        { name: "Tuz", amountUsed: 1 }
      ]
    }
  },
  {
    id: "item-havuc-tarator",
    nameTr: "Havuç Tarator",
    nameEn: "Carrot Tarator Dip",
    descriptionTr: "Rendelenmiş havuç, sarımsaklı süzme yoğurt, ceviz içi ve zeytinyağı ile hazırlanan renkli meze.",
    descriptionEn: "Grated carrot mixed with creamy garlic yogurt, crushed walnuts, and a drizzle of olive oil, topped with dried mint.",
    price: 120.00,
    calories: 140,
    imageUrl: "/images/havuc_tarator.png",
    allergens: ["dairy", "nuts"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.85,
      ingredients: [
        { name: "Havuç", amountUsed: 120 },
        { name: "Süzme Yoğurt", amountUsed: 80 },
        { name: "Sarımsak", amountUsed: 2 },
        { name: "Ceviz İçi", amountUsed: 15 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 10 },
        { name: "Kuru Nane", amountUsed: 1 }
      ]
    }
  },
  {
    id: "item-tursu",
    nameTr: "Turşu Tabağı",
    nameEn: "Mixed Pickled Vegetables",
    descriptionTr: "Geleneksel Türk usulü karışık turşu tabağı: salatalık, lahana, biber, havuç ve yeşil domates.",
    descriptionEn: "A colorful assortment of traditional Turkish pickled vegetables — cucumbers, cabbage, peppers, carrots, and green tomatoes in seasoned brine.",
    price: 90.00,
    calories: 30,
    imageUrl: "/images/tursu.png",
    allergens: [],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.88,
      ingredients: [
        { name: "Salatalık (Turşuluk)", amountUsed: 0.05 },
        { name: "Lahana", amountUsed: 0.03 },
        { name: "Havuç", amountUsed: 20 },
        { name: "Biber (Yeşil)", amountUsed: 20 },
        { name: "Domates", amountUsed: 20 },
        { name: "Sirke", amountUsed: 20 },
        { name: "Tuz", amountUsed: 5 }
      ]
    }
  },
  {
    id: "item-coban-salatasi",
    nameTr: "Çoban Salatası",
    nameEn: "Shepherd's Salad",
    descriptionTr: "İnce doğranmış domates, salatalık, yeşil biber, kırmızı soğan ve maydanoz; zeytinyağı ve limon sosu ile.",
    descriptionEn: "Finely diced fresh tomatoes, cucumbers, green peppers, red onion, and flat-leaf parsley, dressed with extra virgin olive oil and lemon juice.",
    price: 110.00,
    calories: 80,
    imageUrl: "/images/coban_salatasi.png",
    allergens: [],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.85,
      ingredients: [
        { name: "Domates", amountUsed: 80 },
        { name: "Salatalık (Taze)", amountUsed: 0.5 },
        { name: "Biber (Yeşil)", amountUsed: 30 },
        { name: "Soğan (Kuru)", amountUsed: 20 },
        { name: "Maydanoz", amountUsed: 0.1 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 },
        { name: "Limon", amountUsed: 0.25 }
      ]
    }
  },
  {
    id: "item-kabak-mucver",
    nameTr: "Kabak Mücver",
    nameEn: "Zucchini Fritters",
    descriptionTr: "Rendelenmiş kabak, beyaz peynir, dereotu ve taze soğan ile hazırlanıp kızartılmış çıtır mücver. Yoğurt ile servis edilir.",
    descriptionEn: "Golden crispy pan-fried fritters made from grated zucchini, feta cheese, fresh dill, spring onions, and eggs, served with a side of yogurt.",
    price: 140.00,
    calories: 250,
    imageUrl: "/images/kabak_mucver.png",
    allergens: ["dairy", "gluten"],
    dietaryLabels: ["halal"],
    recipe: {
      targetMargin: 0.80,
      ingredients: [
        { name: "Kabak", amountUsed: 150 },
        { name: "Beyaz Peynir", amountUsed: 30 },
        { name: "Dereotu", amountUsed: 0.05 },
        { name: "Soğan (Kuru)", amountUsed: 20 },
        { name: "Yumurta", amountUsed: 1 },
        { name: "Un (Buğday)", amountUsed: 20 },
        { name: "Ayçiçek Yağı", amountUsed: 25 },
        { name: "Tuz", amountUsed: 1 },
        { name: "Karabiber", amountUsed: 1 }
      ]
    }
  }
];

async function main() {
  const venueId = "venue-rwalop3e"; // bispecial Main
  const categoryId = "7af0074a-17bb-4636-ae8e-f0b0dc8ebc5a"; // Starters & Mezes (bispecial)

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: { organization: true }
  });

  if (!venue) {
    console.error(`Venue ${venueId} not found`);
    return;
  }

  const organizationId = venue.organizationId;
  const sharedInventory = venue.organization.sharedInventory;

  // 1. Update existing mezes with local image paths
  console.log("--- Updating existing meze images ---");
  for (const update of existingImageUpdates) {
    try {
      await prisma.menuItem.update({
        where: { id: update.id },
        data: { imageUrl: update.imageUrl }
      });
      console.log(`Updated image for: ${update.id} -> ${update.imageUrl}`);
    } catch (e) {
      console.log(`Item ${update.id} not found in DB, skipping image update.`);
    }
  }

  // 2. Seed missing ingredients
  console.log("\n--- Seeding new ingredients ---");
  for (const ing of newIngredients) {
    const existing = await prisma.ingredient.findFirst({
      where: { venueId, name: ing.name }
    });

    if (!existing) {
      await prisma.ingredient.create({
        data: {
          name: ing.name,
          unit: ing.unit,
          currentStock: ing.currentStock,
          weightedCost: ing.weightedCost,
          reorderLevel: ing.reorderLevel,
          venueId,
          organizationId
        }
      });
      console.log(`Created ingredient: ${ing.name}`);
    } else {
      console.log(`Ingredient already exists: ${ing.name}`);
    }
  }

  // Retrieve all ingredients to map names to IDs
  const dbIngredients = await prisma.ingredient.findMany({
    where: sharedInventory ? { organizationId } : { venueId }
  });
  const ingredientMap = {};
  dbIngredients.forEach(i => { ingredientMap[i.name] = i; });

  // 3. Clean up any existing new mezes (in case re-run)
  console.log("\n--- Cleaning up new mezes if they exist ---");
  const mezeIds = newMezes.map(m => m.id);
  await prisma.recipeIngredient.deleteMany({
    where: { recipe: { menuItemId: { in: mezeIds } } }
  });
  await prisma.recipe.deleteMany({
    where: { menuItemId: { in: mezeIds } }
  });
  await prisma.menuItemTranslation.deleteMany({
    where: { menuItemId: { in: mezeIds } }
  });
  await prisma.menuItem.deleteMany({
    where: { id: { in: mezeIds } }
  });
  console.log("Cleanup complete!");

  // 4. Seed 5 New Mezes with Recipes
  console.log("\n--- Seeding 5 new mezes ---");
  for (const m of newMezes) {
    const item = await prisma.menuItem.create({
      data: {
        id: m.id,
        nameTr: m.nameTr,
        nameEn: m.nameEn,
        descriptionTr: m.descriptionTr,
        descriptionEn: m.descriptionEn,
        price: m.price,
        calories: m.calories,
        imageUrl: m.imageUrl,
        allergens: m.allergens,
        categoryId,
        isAvailable: true,
        showOnMenu: true
      }
    });
    console.log(`Created MenuItem: ${m.nameEn}`);

    // Translations
    await prisma.menuItemTranslation.create({
      data: { menuItemId: item.id, locale: "tr", name: m.nameTr, description: m.descriptionTr }
    });
    await prisma.menuItemTranslation.create({
      data: { menuItemId: item.id, locale: "en", name: m.nameEn, description: m.descriptionEn }
    });

    // Dietary Labels
    if (m.dietaryLabels && m.dietaryLabels.length > 0) {
      await prisma.menuItem.update({
        where: { id: item.id },
        data: {
          dietaryLabels: {
            connect: m.dietaryLabels.map(key => ({ key }))
          }
        }
      });
    }

    // Recipe
    const recipe = await prisma.recipe.create({
      data: {
        menuItemId: item.id,
        targetMargin: m.recipe.targetMargin,
        yieldQuantity: 1.0,
        yieldUnit: "porsiyon",
        portionSize: 1.0,
        totalYield: 1.0,
        currentCost: 0
      }
    });

    let totalCost = 0;
    for (const ingUse of m.recipe.ingredients) {
      const ingredient = ingredientMap[ingUse.name];
      if (!ingredient) {
        console.error(`ERROR: Ingredient '${ingUse.name}' not found in DB!`);
        continue;
      }

      await prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          ingredientId: ingredient.id,
          amountUsed: ingUse.amountUsed
        }
      });

      totalCost += Number(ingUse.amountUsed) * Number(ingredient.weightedCost);
    }

    const portionCost = totalCost / Number(recipe.yieldQuantity || 1);

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { currentCost: portionCost }
    });

    console.log(`Recipe for ${m.nameEn} (Cost: ${portionCost.toFixed(2)} TRY, Margin: ${(m.recipe.targetMargin * 100).toFixed(0)}%, Price: ${m.price.toFixed(2)} TRY)`);
  }

  console.log("\n🎉 Batch 2 meze seeding complete! (5 new + 4 image updates)");
}

main()
  .catch((e) => {
    console.error("Error seeding batch 2 mezes:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
