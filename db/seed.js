const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Supabase database via Prisma Client...");

  // 1. Clean existing records (cascade handles child records, but clearing in order is safe)
  await prisma.menuItem.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.table.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.organization.deleteMany({});

  console.log("Database cleared. Inserting Karaköy Lokantası dataset...");

  // 2. Create Organization
  const org = await prisma.organization.create({
    data: {
      id: "org-karakoy",
      name: "Karaköy Lokantası",
      logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80"
    }
  });

  // 3. Create Venue
  const venue = await prisma.venue.create({
    data: {
      id: "venue-karakoy-main",
      name: "Karaköy Merkez",
      address: "Kemankeş Karamustafa Paşa Mh., Beyoğlu, İstanbul",
      organizationId: org.id
    }
  });

  // 4. Create Tables
  const tables = [
    { id: "table-1", name: "Masa 1", qrToken: "k1", venueId: venue.id },
    { id: "table-2", name: "Masa 2", qrToken: "k2", venueId: venue.id },
    { id: "table-3", name: "Masa 3", qrToken: "k3", venueId: venue.id },
    { id: "table-4", name: "Masa 4", qrToken: "k4", venueId: venue.id },
    { id: "table-5", name: "Room 101", qrToken: "r101", venueId: venue.id },
  ];
  for (const t of tables) {
    await prisma.table.create({ data: t });
  }

  // 5. Create Categories
  const catStarters = await prisma.category.create({
    data: {
      id: "cat-starters",
      nameTr: "Başlangıçlar & Mezeler",
      nameEn: "Starters & Mezes",
      sortOrder: 1,
      venueId: venue.id
    }
  });

  const catMains = await prisma.category.create({
    data: {
      id: "cat-mains",
      nameTr: "Ana Yemekler",
      nameEn: "Main Courses",
      sortOrder: 2,
      venueId: venue.id
    }
  });

  const catDesserts = await prisma.category.create({
    data: {
      id: "cat-desserts",
      nameTr: "Tatlılar",
      nameEn: "Desserts",
      sortOrder: 3,
      venueId: venue.id
    }
  });

  const catDrinks = await prisma.category.create({
    data: {
      id: "cat-drinks",
      nameTr: "İçecekler",
      nameEn: "Drinks",
      sortOrder: 4,
      venueId: venue.id
    }
  });

  // 6. Create Menu Items
  const items = [
    // Starters
    {
      id: "item-lentil",
      nameTr: "Süzme Mercimek Çorbası",
      nameEn: "Lentil Soup",
      descriptionTr: "Kıtır ekmek ve limon ile servis edilir.",
      descriptionEn: "Served with crunchy croutons and lemon.",
      price: 120.00,
      imageUrl: "https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=500&auto=format&fit=crop&q=80",
      allergens: ["gluten"],
      isAvailable: true,
      categoryId: catStarters.id
    },
    {
      id: "item-hummus",
      nameTr: "Sıcak Tereyağlı Humus",
      nameEn: "Warm Hummus with Butter",
      descriptionTr: "Pastırma dilimleri ve tereyağı ile fırınlanmış humus.",
      descriptionEn: "Baked hummus topped with pastrami slices and melted butter.",
      price: 195.00,
      imageUrl: "https://images.unsplash.com/photo-1628294895520-73f08b1c51d9?w=500&auto=format&fit=crop&q=80",
      allergens: ["sesame", "dairy"],
      isAvailable: true,
      categoryId: catStarters.id
    },
    // Mains
    {
      id: "item-kebab",
      nameTr: "Zırh Kebabı (Adana)",
      nameEn: "Hand-Minced Adana Kebab",
      descriptionTr: "Közlenmiş biber, domates, lavaş ve sumaklı soğan salatası eşliğinde.",
      descriptionEn: "Served with grilled pepper, tomato, lavash, and sumac onion salad.",
      price: 420.00,
      imageUrl: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&auto=format&fit=crop&q=80",
      allergens: ["gluten"],
      isAvailable: true,
      categoryId: catMains.id
    },
    {
      id: "item-manti",
      nameTr: "Kayseri Mantısı",
      nameEn: "Turkish Manti (Dumplings)",
      descriptionTr: "Sarımsaklı yoğurt, nane ve sumaklı tereyağ sosu ile.",
      descriptionEn: "Tiny beef-filled dumplings served with garlic yogurt, mint, and sumac butter.",
      price: 310.00,
      imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=80",
      allergens: ["gluten", "dairy"],
      isAvailable: true,
      categoryId: catMains.id
    },
    // Desserts
    {
      id: "item-baklava",
      nameTr: "Fıstıklı Havuç Dilim Baklava",
      nameEn: "Pistachio Carrot-Slice Baklava",
      descriptionTr: "Maraş kesme dondurması ile servis edilir.",
      descriptionEn: "Served with traditional Maraş goat milk ice cream.",
      price: 240.00,
      imageUrl: "https://images.unsplash.com/photo-1582231375454-9e86e40b2a11?w=500&auto=format&fit=crop&q=80",
      allergens: ["gluten", "nuts", "dairy"],
      isAvailable: true,
      categoryId: catDesserts.id
    },
    // Drinks
    {
      id: "item-ayran",
      nameTr: "Yayık Ayranı",
      nameEn: "Traditional Frothy Ayran",
      descriptionTr: "Taze nane yaprağı ile soğuk servis edilir.",
      descriptionEn: "Cold churned salted yogurt drink served with fresh mint.",
      price: 65.00,
      imageUrl: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500&auto=format&fit=crop&q=80",
      allergens: ["dairy"],
      isAvailable: true,
      categoryId: catDrinks.id
    },
    {
      id: "item-tea",
      nameTr: "Demleme Türk Çayı",
      nameEn: "Turkish Tea",
      descriptionTr: "İnce belli bardakta servis edilir.",
      descriptionEn: "Traditional brewed black tea served in a tulip glass.",
      price: 35.00,
      imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80",
      allergens: [],
      isAvailable: true,
      categoryId: catDrinks.id
    }
  ];

  for (const item of items) {
    await prisma.menuItem.create({ data: item });
  }

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
