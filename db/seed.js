const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Supabase database via Prisma Client...");

  // 1. Clean existing records in dependency order
  await prisma.analyticsEvent.deleteMany({});
  await prisma.menuSchedule.deleteMany({});
  await prisma.menuItemTranslation.deleteMany({});
  await prisma.categoryTranslation.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.menu.deleteMany({});
  await prisma.table.deleteMany({});
  await prisma.venueStaff.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.dietaryLabel.deleteMany({});

  console.log("Database cleared. Inserting Karaköy Lokantası dataset...");

  // 2. Create Dietary Labels
  const labelHalal = await prisma.dietaryLabel.create({
    data: { key: "halal", icon: "☪" }
  });
  const labelVegan = await prisma.dietaryLabel.create({
    data: { key: "vegan", icon: "🌱" }
  });
  const labelGlutenFree = await prisma.dietaryLabel.create({
    data: { key: "gluten-free", icon: "🌾" }
  });

  // 3. Create Organization with premium branding
  const org = await prisma.organization.create({
    data: {
      id: "org-karakoy",
      name: "Karaköy Lokantası",
      logoUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80",
      brandColor: "#722F37", // Rich Garnet
      subscriptionTier: "premium"
    }
  });

  // 4. Create Venue
  const venue = await prisma.venue.create({
    data: {
      id: "venue-karakoy-main",
      name: "Karaköy Merkez",
      address: "Kemankeş Karamustafa Paşa Mh., Beyoğlu, İstanbul",
      coverImageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&auto=format&fit=crop&q=80",
      phone: "+90 212 292 44 55",
      operatingHours: {
        monday: { open: "12:00", close: "23:00" },
        tuesday: { open: "12:00", close: "23:00" },
        wednesday: { open: "12:00", close: "23:00" },
        thursday: { open: "12:00", close: "23:00" },
        friday: { open: "12:00", close: "23:30" },
        saturday: { open: "12:00", close: "23:30" },
        sunday: { open: "12:00", close: "22:00" }
      },
      currency: "TRY",
      defaultLocale: "tr",
      supportedLocales: ["tr", "en"],
      organizationId: org.id
    }
  });

  // 5. Create Tables
  const tables = [
    { id: "table-1", name: "Masa 1", areaName: "Bahçe", qrToken: "k1", venueId: venue.id },
    { id: "table-2", name: "Masa 2", areaName: "Bahçe", qrToken: "k2", venueId: venue.id },
    { id: "table-3", name: "Masa 3", areaName: "Giriş Kat", qrToken: "k3", venueId: venue.id },
    { id: "table-4", name: "Masa 4", areaName: "Giriş Kat", qrToken: "k4", venueId: venue.id },
    { id: "table-5", name: "Masa 5", areaName: "Teras", qrToken: "k5", venueId: venue.id },
  ];
  for (const t of tables) {
    await prisma.table.create({ data: t });
  }

  // 6. Create Menu and Schedules
  const mainMenu = await prisma.menu.create({
    data: {
      id: "menu-karakoy-main",
      name: "Ana Yemek Menüsü",
      venueId: venue.id,
      isActive: true
    }
  });

  await prisma.menuSchedule.create({
    data: {
      menuId: mainMenu.id,
      startTime: "12:00",
      endTime: "23:30"
    }
  });

  // 7. Create Categories linked to Menu
  const catStarters = await prisma.category.create({
    data: {
      id: "cat-starters",
      nameTr: "Başlangıçlar & Mezeler",
      nameEn: "Starters & Mezes",
      iconName: "Soup",
      sortOrder: 1,
      venueId: venue.id,
      menuId: mainMenu.id
    }
  });

  const catMains = await prisma.category.create({
    data: {
      id: "cat-mains",
      nameTr: "Ana Yemekler",
      nameEn: "Main Courses",
      iconName: "Beef",
      sortOrder: 2,
      venueId: venue.id,
      menuId: mainMenu.id
    }
  });

  const catDesserts = await prisma.category.create({
    data: {
      id: "cat-desserts",
      nameTr: "Tatlılar",
      nameEn: "Desserts",
      iconName: "Dessert",
      sortOrder: 3,
      venueId: venue.id,
      menuId: mainMenu.id
    }
  });

  const catDrinks = await prisma.category.create({
    data: {
      id: "cat-drinks",
      nameTr: "İçecekler",
      nameEn: "Drinks",
      iconName: "GlassWater",
      sortOrder: 4,
      venueId: venue.id,
      menuId: mainMenu.id
    }
  });

  // Create Category Translations
  const categoryTranslations = [
    { categoryId: catStarters.id, locale: "tr", name: "Başlangıçlar & Mezeler" },
    { categoryId: catStarters.id, locale: "en", name: "Starters & Mezes" },
    { categoryId: catMains.id, locale: "tr", name: "Ana Yemekler" },
    { categoryId: catMains.id, locale: "en", name: "Main Courses" },
    { categoryId: catDesserts.id, locale: "tr", name: "Tatlılar" },
    { categoryId: catDesserts.id, locale: "en", name: "Desserts" },
    { categoryId: catDrinks.id, locale: "tr", name: "İçecekler" },
    { categoryId: catDrinks.id, locale: "en", name: "Drinks" }
  ];

  for (const ct of categoryTranslations) {
    await prisma.categoryTranslation.create({ data: ct });
  }

  // 8. Create Menu Items
  const menuItems = [
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
      calories: 180,
      categoryId: catStarters.id,
      dietaryLabels: { connect: [{ key: "halal" }, { key: "vegan" }] }
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
      calories: 340,
      categoryId: catStarters.id,
      dietaryLabels: { connect: [{ key: "halal" }, { key: "gluten-free" }] }
    },
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
      calories: 620,
      categoryId: catMains.id,
      dietaryLabels: { connect: [{ key: "halal" }] }
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
      calories: 480,
      categoryId: catMains.id,
      dietaryLabels: { connect: [{ key: "halal" }] }
    },
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
      calories: 520,
      categoryId: catDesserts.id,
      dietaryLabels: { connect: [{ key: "halal" }] }
    },
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
      calories: 90,
      categoryId: catDrinks.id,
      dietaryLabels: { connect: [{ key: "halal" }, { key: "gluten-free" }] }
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
      calories: 0,
      categoryId: catDrinks.id,
      dietaryLabels: { connect: [{ key: "halal" }, { key: "gluten-free" }, { key: "vegan" }] }
    }
  ];

  for (const itemData of menuItems) {
    const createdItem = await prisma.menuItem.create({
      data: itemData
    });

    // Create item translations
    await prisma.menuItemTranslation.create({
      data: {
        menuItemId: createdItem.id,
        locale: "tr",
        name: itemData.nameTr,
        description: itemData.descriptionTr
      }
    });

    await prisma.menuItemTranslation.create({
      data: {
        menuItemId: createdItem.id,
        locale: "en",
        name: itemData.nameEn,
        description: itemData.descriptionEn
      }
    });
  }

  // 8. Create users and assign roles
  console.log("Seeding platform users and assigning roles...");
  
  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      id: "user-super-admin",
      email: "superadmin@tripzy.travel",
      firstName: "Super",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      isActive: true
    }
  });

  // Org Admin (Karaköy Lokantası owner)
  const orgAdmin = await prisma.user.create({
    data: {
      id: "user-org-admin-karakoy",
      email: "admin@karakoylokantasi.com",
      firstName: "Ahmet",
      lastName: "Yılmaz",
      role: "ORGANIZATION_ADMIN",
      organizationId: org.id,
      isActive: true
    }
  });

  // Venue Manager
  const venueManager = await prisma.user.create({
    data: {
      id: "user-venue-manager-karakoy",
      email: "manager@karakoylokantasi.com",
      firstName: "Mehmet",
      lastName: "Demir",
      role: "VENUE_MANAGER",
      organizationId: org.id,
      isActive: true
    }
  });

  // Link Venue Manager to Karaköy Venue
  await prisma.venueStaff.create({
    data: {
      userId: venueManager.id,
      venueId: venue.id
    }
  });

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

