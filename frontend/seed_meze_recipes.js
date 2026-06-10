const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const newIngredients = [
  { name: "Yeşil Zeytin", unit: "g", currentStock: 5000, weightedCost: 0.12, reorderLevel: 1000, venueId: "venue-rwalop3e" },
  { name: "Lakerda Balığı", unit: "g", currentStock: 2000, weightedCost: 1.20, reorderLevel: 500, venueId: "venue-rwalop3e" },
  { name: "Kuzu Ciğeri", unit: "g", currentStock: 3000, weightedCost: 0.50, reorderLevel: 800, venueId: "venue-rwalop3e" },
  { name: "Yufka", unit: "unit", currentStock: 100, weightedCost: 4.00, reorderLevel: 20, venueId: "venue-rwalop3e" },
  { name: "Kavun", unit: "unit", currentStock: 50, weightedCost: 40.00, reorderLevel: 10, venueId: "venue-rwalop3e" },
  { name: "Pilaki Fasulyesi", unit: "g", currentStock: 10000, weightedCost: 0.05, reorderLevel: 2000, venueId: "venue-rwalop3e" },
  { name: "Asma Yaprağı", unit: "g", currentStock: 4000, weightedCost: 0.15, reorderLevel: 1000, venueId: "venue-rwalop3e" },
  { name: "Balık Yumurtası", unit: "g", currentStock: 2000, weightedCost: 0.80, reorderLevel: 400, venueId: "venue-rwalop3e" },
  { name: "Çiroz Balığı", unit: "g", currentStock: 1500, weightedCost: 0.90, reorderLevel: 300, venueId: "venue-rwalop3e" },
  { name: "Ahtapot", unit: "g", currentStock: 3000, weightedCost: 1.10, reorderLevel: 500, venueId: "venue-rwalop3e" },
  { name: "Midye", unit: "unit", currentStock: 500, weightedCost: 2.50, reorderLevel: 100, venueId: "venue-rwalop3e" },
  { name: "Kalamar", unit: "g", currentStock: 4000, weightedCost: 0.70, reorderLevel: 1000, venueId: "venue-rwalop3e" }
];

const mezes = [
  // --- EXISTING 7 MEZES ---
  {
    id: "item-girit-meze",
    nameTr: "Girit Mezesi",
    nameEn: "Cretan Meze",
    descriptionTr: "Kırma yeşil zeytin, keçi peyniri, ceviz içi, sarımsak ve kuru nane, sızma zeytinyağı ile.",
    descriptionEn: "Crushed green olives, goat cheese, walnuts, garlic, and dried mint, dressed in cold-pressed olive oil.",
    price: 180.00,
    calories: 220,
    imageUrl: "/images/girit_meze.png",
    allergens: ["dairy", "nuts"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.75,
      ingredients: [
        { name: "Beyaz Peynir", amountUsed: 80 },
        { name: "Ceviz İçi", amountUsed: 20 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 },
        { name: "Sarımsak", amountUsed: 2 },
        { name: "Yeşil Zeytin", amountUsed: 30 }
      ]
    }
  },
  {
    id: "item-topik",
    nameTr: "Topik",
    nameEn: "Topik",
    descriptionTr: "Tahin, patates ve nohut ezmesi içinde tarçınlı, çam fıstıklı ve kuş üzümlü karamelize soğan dolgusu.",
    descriptionEn: "A traditional Armenian meze: caramelized onions with cinnamon, pine nuts, and currants, wrapped in a chickpea and tahini paste shell.",
    price: 220.00,
    calories: 310,
    imageUrl: "/images/topik.png",
    allergens: ["sesame", "nuts"],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.75,
      ingredients: [
        { name: "Nohut (Kuru)", amountUsed: 50 },
        { name: "Tahin", amountUsed: 30 },
        { name: "Soğan (Kuru)", amountUsed: 50 },
        { name: "Çam Fıstığı", amountUsed: 5 },
        { name: "Kuş Üzümü", amountUsed: 5 },
        { name: "Patates", amountUsed: 20 }
      ]
    }
  },
  {
    id: "item-lakerda",
    nameTr: "Lakerda",
    nameEn: "Lakerda",
    descriptionTr: "Tuzda pişirilmiş torik dilimleri, kırmızı soğan ve dereotu ile.",
    descriptionEn: "Classic salted cured bonito fish slices, served with red onions and dill.",
    price: 290.00,
    calories: 180,
    imageUrl: "/images/lakerda.png",
    allergens: [],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.70,
      ingredients: [
        { name: "Lakerda Balığı", amountUsed: 80 },
        { name: "Soğan (Kuru)", amountUsed: 20 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 10 },
        { name: "Dereotu", amountUsed: 0.1 }
      ]
    }
  },
  {
    id: "item-sogan-dolmasi",
    nameTr: "Zeytinyağlı Soğan Dolması",
    nameEn: "Stuffed Onion in Olive Oil",
    descriptionTr: "Kuş üzümü, çam fıstığı ve baharatlı pirinç dolgulu fırınlanmış soğan.",
    descriptionEn: "Oven-baked whole onions stuffed with spiced rice, currants, pine nuts, and mint, cooked in olive oil.",
    price: 160.00,
    calories: 190,
    imageUrl: "/images/sogan_dolmasi.png",
    allergens: ["nuts"],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.80,
      ingredients: [
        { name: "Soğan (Kuru)", amountUsed: 150 },
        { name: "Pirinç (Osmancık)", amountUsed: 40 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 },
        { name: "Çam Fıstığı", amountUsed: 5 },
        { name: "Kuş Üzümü", amountUsed: 5 }
      ]
    }
  },
  {
    id: "item-kopoglu",
    nameTr: "Köpoğlu",
    nameEn: "Köpoğlu",
    descriptionTr: "Sarımsaklı süzme yoğurt üzerinde kızarmış patlıcan, kabak ve biber, domates sosu eşliğinde.",
    descriptionEn: "Sautéed fried eggplant, zucchini, and peppers over garlicky strained yogurt, drizzled with tomato-garlic sauce.",
    price: 150.00,
    calories: 160,
    imageUrl: "/images/kopoglu.png",
    allergens: ["dairy"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.78,
      ingredients: [
        { name: "Patlıcan", amountUsed: 120 },
        { name: "Biber (Yeşil)", amountUsed: 30 },
        { name: "Süzme Yoğurt", amountUsed: 80 },
        { name: "Domates", amountUsed: 40 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 }
      ]
    }
  },
  {
    id: "item-arnavut-cigeri",
    nameTr: "Arnavut Ciğeri",
    nameEn: "Albanian Liver",
    descriptionTr: "Baharatlı unlanmış kuzu ciğeri kızartması, sumaklı soğan ve maydanoz salatası ile.",
    descriptionEn: "Tender fried lamb liver seasoned with cumin and red pepper flakes, served with sumac red onions and parsley.",
    price: 240.00,
    calories: 420,
    imageUrl: "/images/arnavut_cigeri.png",
    allergens: ["gluten"],
    dietaryLabels: ["halal"],
    recipe: {
      targetMargin: 0.70,
      ingredients: [
        { name: "Kuzu Ciğeri", amountUsed: 120 },
        { name: "Un (Buğday)", amountUsed: 15 },
        { name: "Soğan (Kuru)", amountUsed: 30 },
        { name: "Ayçiçek Yağı", amountUsed: 20 },
        { name: "Maydanoz", amountUsed: 0.1 }
      ]
    }
  },
  {
    id: "item-pacanga",
    nameTr: "Paçanga Böreği",
    nameEn: "Pacanga Boreg",
    descriptionTr: "Çıtır yufka içinde pastırma, erimiş kaşar peyniri, domates ve yeşil biber.",
    descriptionEn: "Crispy fried pastry filled with spiced pastırma (cured beef), melted kaşar cheese, tomatoes, and green peppers.",
    price: 190.00,
    calories: 380,
    imageUrl: "/images/pacanga_boregi.png",
    allergens: ["gluten", "dairy"],
    dietaryLabels: ["halal"],
    recipe: {
      targetMargin: 0.72,
      ingredients: [
        { name: "Yufka", amountUsed: 1 },
        { name: "Pastırma", amountUsed: 25 },
        { name: "Kaşar Peyniri", amountUsed: 40 },
        { name: "Domates", amountUsed: 20 },
        { name: "Biber (Yeşil)", amountUsed: 15 },
        { name: "Ayçiçek Yağı", amountUsed: 15 }
      ]
    }
  },

  // --- NEW 23 MEZES ---

  // Category 1: Yogurt & Cheese-Based Dips
  {
    id: "item-haydari",
    nameTr: "Haydari",
    nameEn: "Haydari",
    descriptionTr: "Süzme yoğurt, beyaz peynir, sarımsak, taze dereotu ve kuru nane karışımı meze.",
    descriptionEn: "A thick, creamy dip made from strained yogurt, crumbled feta cheese, garlic, fresh dill, and dried mint.",
    price: 130.00,
    calories: 150,
    imageUrl: "https://images.unsplash.com/photo-1571244856053-1a2f64ad4582?w=500&auto=format&fit=crop&q=80",
    allergens: ["dairy"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.82,
      ingredients: [
        { name: "Süzme Yoğurt", amountUsed: 100 },
        { name: "Beyaz Peynir", amountUsed: 30 },
        { name: "Sarımsak", amountUsed: 2 },
        { name: "Dereotu", amountUsed: 0.05 },
        { name: "Kuru Nane", amountUsed: 1 }
      ]
    }
  },
  {
    id: "item-atom",
    nameTr: "Atom",
    nameEn: "Atom",
    descriptionTr: "Sarımsaklı süzme yoğurt üzerine tereyağında kızdırılmış acı kuru Arnavut biberi.",
    descriptionEn: "Strained yogurt spiked with garlic and topped with dried red chilies sizzled in hot butter.",
    price: 140.00,
    calories: 190,
    imageUrl: "/images/atom.png",
    allergens: ["dairy"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.80,
      ingredients: [
        { name: "Süzme Yoğurt", amountUsed: 120 },
        { name: "Sarımsak", amountUsed: 2 },
        { name: "Arnavut Biberi (Kuru)", amountUsed: 10 },
        { name: "Tereyağı", amountUsed: 15 }
      ]
    }
  },
  {
    id: "item-semizotu",
    nameTr: "Yoğurtlu Semizotu",
    nameEn: "Purslane in Yogurt",
    descriptionTr: "Sarımsaklı süzme yoğurt ve sızma zeytinyağı ile harmanlanmış taze semizotu yaprakları.",
    descriptionEn: "Fresh, crunchy purslane leaves tossed with thick garlic yogurt and olive oil.",
    price: 130.00,
    calories: 110,
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
    allergens: ["dairy"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.82,
      ingredients: [
        { name: "Semizotu", amountUsed: 1 }, // 1 unit bunch
        { name: "Yoğurt", amountUsed: 100 },
        { name: "Sarımsak", amountUsed: 2 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 10 }
      ]
    }
  },
  {
    id: "item-peynir-kavun",
    nameTr: "Beyaz Peynir ve Kavun",
    nameEn: "White Cheese and Melon Platter",
    descriptionTr: "Ezine beyaz peyniri ve dilimlenmiş tatlı kavun tabağı.",
    descriptionEn: "High-quality brined sheep's milk cheese served alongside sweet, chilled honeydew melon slices.",
    price: 180.00,
    calories: 240,
    imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=80",
    allergens: ["dairy"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.70,
      ingredients: [
        { name: "Beyaz Peynir", amountUsed: 100 },
        { name: "Kavun", amountUsed: 0.25 } // 0.25 of a whole melon
      ]
    }
  },

  // Category 2: Olive Oil Vegetable Dishes (Zeytinyağlılar)
  {
    id: "item-pilaki",
    nameTr: "Zeytinyağlı Pilaki",
    nameEn: "Zeytinyagli Pilaki",
    descriptionTr: "Zeytinyağı, havuç, patates ve sarımsak ile yavaşça pişirilmiş fasulye (pilaki).",
    descriptionEn: "Borlotti beans simmered slowly with carrots, potatoes, garlic, and onions in olive oil, served cold with parsley and lemon.",
    price: 150.00,
    calories: 210,
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80",
    allergens: [],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.85,
      ingredients: [
        { name: "Pilaki Fasulyesi", amountUsed: 100 },
        { name: "Havuç", amountUsed: 20 },
        { name: "Patates", amountUsed: 20 },
        { name: "Sarımsak", amountUsed: 2 },
        { name: "Soğan (Kuru)", amountUsed: 30 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 },
        { name: "Maydanoz", amountUsed: 0.05 },
        { name: "Limon", amountUsed: 0.2 }
      ]
    }
  },
  {
    id: "item-deniz-borulcesi",
    nameTr: "Deniz Börülcesi",
    nameEn: "Deniz Borulcesi",
    descriptionTr: "Haşlanmış deniz börülcesi, zeytinyağı, sarımsak ve limon sosu ile.",
    descriptionEn: "A coastal succulent sea vegetable, boiled and dressed in lemon, garlic, and extra virgin olive oil.",
    price: 160.00,
    calories: 90,
    imageUrl: "/images/deniz_borulcesi.png",
    allergens: [],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.78,
      ingredients: [
        { name: "Deniz Börülcesi", amountUsed: 1 }, // 1 bunch
        { name: "Limon", amountUsed: 0.5 },
        { name: "Sarımsak", amountUsed: 3 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 }
      ]
    }
  },
  {
    id: "item-saksuka",
    nameTr: "Şakşuka",
    nameEn: "Saksuka",
    descriptionTr: "Sarımsaklı domates sosu içinde kızartılmış patlıcan, kabak ve patates küpleri.",
    descriptionEn: "Fried cubes of eggplant, zucchini, potatoes, and peppers tossed in a sweet-and-sour garlic tomato sauce.",
    price: 140.00,
    calories: 180,
    imageUrl: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=500&auto=format&fit=crop&q=80",
    allergens: [],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.85,
      ingredients: [
        { name: "Patlıcan", amountUsed: 100 },
        { name: "Kabak", amountUsed: 50 },
        { name: "Patates", amountUsed: 50 },
        { name: "Biber (Yeşil)", amountUsed: 20 },
        { name: "Domates", amountUsed: 60 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 },
        { name: "Sarımsak", amountUsed: 3 }
      ]
    }
  },
  {
    id: "item-enginar",
    nameTr: "Zeytinyağlı Enginar",
    nameEn: "Artichoke Cups in Olive Oil",
    descriptionTr: "Zeytinyağında pişmiş, bezelye, havuç ve dereotu ile doldurulmuş çanak enginar.",
    descriptionEn: "Whole artichoke cups simmered in olive oil and lemon, topped with a fine dice of potatoes, peas, carrots, and dill.",
    price: 180.00,
    calories: 140,
    imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=500&auto=format&fit=crop&q=80",
    allergens: [],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.80,
      ingredients: [
        { name: "Enginar (Çanak)", amountUsed: 1 }, // 1 piece
        { name: "Bezelye (Konserve)", amountUsed: 30 },
        { name: "Havuç", amountUsed: 15 },
        { name: "Patates", amountUsed: 15 },
        { name: "Dereotu", amountUsed: 0.05 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 },
        { name: "Limon", amountUsed: 0.25 }
      ]
    }
  },
  {
    id: "item-sarma",
    nameTr: "Zeytinyağlı Yaprak Sarma",
    nameEn: "Stuffed Grape Leaves",
    descriptionTr: "Baharatlı ve kuş üzümlü pirinç harcı doldurulmuş, zeytinyağlı asma yaprağı sarması.",
    descriptionEn: "Grape leaves stuffed with spiced rice, currants, pine nuts, and mint, rolled into tight cylinders and cooked in olive oil.",
    price: 170.00,
    calories: 220,
    imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500&auto=format&fit=crop&q=80",
    allergens: ["nuts"],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.82,
      ingredients: [
        { name: "Asma Yaprağı", amountUsed: 50 },
        { name: "Pirinç (Osmancık)", amountUsed: 60 },
        { name: "Kuş Üzümü", amountUsed: 5 },
        { name: "Çam Fıstığı", amountUsed: 5 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 20 },
        { name: "Soğan (Kuru)", amountUsed: 40 },
        { name: "Kuru Nane", amountUsed: 2 },
        { name: "Karabiber", amountUsed: 1 },
        { name: "Tuz", amountUsed: 1 }
      ]
    }
  },

  // Category 3: Nut & Bean Pastes
  {
    id: "item-fava",
    nameTr: "Fava",
    nameEn: "Fava Bean Puree",
    descriptionTr: "Dereotu, kırmızı soğan ve zeytinyağı eşliğinde pürüzsüz bakla ezmesi.",
    descriptionEn: "Dried broad beans boiled with onions, pureed into a silky smooth paste with olive oil, set in a mold, and served cold with red onions and dill.",
    price: 140.00,
    calories: 170,
    imageUrl: "/images/fava.png",
    allergens: [],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.85,
      ingredients: [
        { name: "Kuru Bakla", amountUsed: 80 },
        { name: "Soğan (Kuru)", amountUsed: 30 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 },
        { name: "Dereotu", amountUsed: 0.05 },
        { name: "Limon", amountUsed: 0.2 }
      ]
    }
  },
  {
    id: "item-muhammara",
    nameTr: "Muhammara",
    nameEn: "Muhammara",
    descriptionTr: "Ceviz, közlenmiş kırmızı biber, galeta unu ve nar ekşili acı meze ezmesi.",
    descriptionEn: "A thick, spicy Levantine paste made from crushed walnuts, roasted red peppers, breadcrumbs, pomegranate molasses, garlic, cumin, and hot pepper flakes.",
    price: 170.00,
    calories: 290,
    imageUrl: "/images/muhammara.png",
    allergens: ["nuts", "gluten"],
    dietaryLabels: ["halal", "vegan"],
    recipe: {
      targetMargin: 0.78,
      ingredients: [
        { name: "Közlenmiş Kırmızı Biber", amountUsed: 80 },
        { name: "Ceviz İçi", amountUsed: 40 },
        { name: "Galeta Unu", amountUsed: 20 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 },
        { name: "Nar Ekşisi", amountUsed: 10 },
        { name: "Sarımsak", amountUsed: 2 },
        { name: "Kimyon", amountUsed: 1 },
        { name: "Pul Biber", amountUsed: 2 },
        { name: "Tuz", amountUsed: 1 }
      ]
    }
  },
  {
    id: "item-cold-hummus",
    nameTr: "Zeytinyağlı Humus",
    nameEn: "Hummus in Olive Oil",
    descriptionTr: "Tahin, sarımsak, kimyon ve sızma zeytinyağı ile hazırlanan geleneksel nohut ezmesi.",
    descriptionEn: "Cooked chickpeas blended with tahini, garlic, cumin, olive oil, and lemon juice.",
    price: 150.00,
    calories: 260,
    imageUrl: "https://images.unsplash.com/photo-1547058886-f87c9ecf74d4?w=500&auto=format&fit=crop&q=80",
    allergens: ["sesame"],
    dietaryLabels: ["halal", "vegan", "gluten-free"],
    recipe: {
      targetMargin: 0.82,
      ingredients: [
        { name: "Nohut (Kuru)", amountUsed: 80 },
        { name: "Tahin", amountUsed: 40 },
        { name: "Kimyon", amountUsed: 1 },
        { name: "Sarımsak", amountUsed: 2 },
        { name: "Limon", amountUsed: 0.25 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 }
      ]
    }
  },

  // Category 4: Seafood Cold Mezes
  {
    id: "item-tarama",
    nameTr: "Tarama",
    nameEn: "Tarama",
    descriptionTr: "Sızma zeytinyağı, limon suyu ve ekmekle çırpılmış lezzetli balık yumurtası köpüğü.",
    descriptionEn: "A creamy mousse made from salted fish roe emulsified with olive oil, lemon juice, and soaked bread.",
    price: 210.00,
    calories: 280,
    imageUrl: "/images/tarama.png",
    allergens: ["fish", "gluten"],
    dietaryLabels: ["halal"],
    recipe: {
      targetMargin: 0.70,
      ingredients: [
        { name: "Balık Yumurtası", amountUsed: 50 },
        { name: "Ekmek (Tombik)", amountUsed: 0.25 }, // quarter loaf
        { name: "Zeytinyağı (Sızma)", amountUsed: 25 },
        { name: "Limon", amountUsed: 0.5 }
      ]
    }
  },
  {
    id: "item-ciroz",
    nameTr: "Çiroz",
    nameEn: "Ciroz (Dried Mackerel)",
    descriptionTr: "Zeytinyağı, sirke, sarımsak ve dereotu ile tatlandırılmış kurutulmuş uskumru filetoları.",
    descriptionEn: "Sun-dried mackerel, reconstituted, shredded, and dressed with olive oil, vinegar, garlic, and dill.",
    price: 220.00,
    calories: 160,
    imageUrl: "https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=500&auto=format&fit=crop&q=80",
    allergens: ["fish"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.72,
      ingredients: [
        { name: "Çiroz Balığı", amountUsed: 60 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 },
        { name: "Limon", amountUsed: 0.25 },
        { name: "Dereotu", amountUsed: 0.05 }
      ]
    }
  },
  {
    id: "item-ahtapot-salatasi",
    nameTr: "Ahtapot Salatası",
    nameEn: "Octopus Salad",
    descriptionTr: "Renkli biberler, kırmızı soğan, zeytinyağı ve limon soslu taze haşlanmış ahtapot.",
    descriptionEn: "Tender boiled octopus tentacles sliced and tossed with red onions, bell peppers, dill, olives, olive oil, and lemon.",
    price: 290.00,
    calories: 180,
    imageUrl: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=500&auto=format&fit=crop&q=80",
    allergens: ["molluscs"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.68,
      ingredients: [
        { name: "Ahtapot", amountUsed: 80 },
        { name: "Biber (Yeşil)", amountUsed: 15 },
        { name: "Biber (Kırmızı Kapya)", amountUsed: 15 },
        { name: "Soğan (Kuru)", amountUsed: 20 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 15 },
        { name: "Limon", amountUsed: 0.3 },
        { name: "Maydanoz", amountUsed: 0.05 }
      ]
    }
  },
  {
    id: "item-midye-dolma",
    nameTr: "Midye Dolma",
    nameEn: "Stuffed Mussels",
    descriptionTr: "Yenibahar ve baharatlı iç pilav dolgulu kabuklu midye dolması (porsiyon).",
    descriptionEn: "Mussels on the half shell stuffed with aromatic spiced rice, served cold with fresh lemon juice.",
    price: 180.00,
    calories: 200,
    imageUrl: "/images/midye_dolma.png",
    allergens: ["molluscs"],
    dietaryLabels: ["halal"],
    recipe: {
      targetMargin: 0.75,
      ingredients: [
        { name: "Midye", amountUsed: 5 }, // 5 pieces
        { name: "Pirinç (Osmancık)", amountUsed: 40 },
        { name: "Soğan (Kuru)", amountUsed: 20 },
        { name: "Kuş Üzümü", amountUsed: 3 },
        { name: "Çam Fıstığı", amountUsed: 3 },
        { name: "Zeytinyağı (Sızma)", amountUsed: 10 },
        { name: "Karabiber", amountUsed: 1 },
        { name: "Tuz", amountUsed: 1 }
      ]
    }
  },

  // Category 5: Seafood Hot Mezes
  {
    id: "item-karides-guvec",
    nameTr: "Karides Güveç",
    nameEn: "Shrimp Casserole",
    descriptionTr: "Domates, biber, sarımsak ve tereyağı ile güveçte pişen, üzeri kaşar kaplı karides.",
    descriptionEn: "Small bay shrimp baked in a clay dish with tomatoes, garlic, green peppers, butter, and topped with melted kaşar cheese.",
    price: 260.00,
    calories: 320,
    imageUrl: "/images/karides_guvec.png",
    allergens: ["crustaceans", "dairy"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.70,
      ingredients: [
        { name: "Karides", amountUsed: 100 },
        { name: "Domates", amountUsed: 50 },
        { name: "Biber (Yeşil)", amountUsed: 20 },
        { name: "Sarımsak", amountUsed: 3 },
        { name: "Tereyağı", amountUsed: 15 },
        { name: "Kaşar Peyniri", amountUsed: 40 }
      ]
    }
  },
  {
    id: "item-kalamar-tava",
    nameTr: "Kalamar Tava",
    nameEn: "Fried Calamari",
    descriptionTr: "Çıtır kalamar halkaları tava, cevizli tarator sos ile.",
    descriptionEn: "Rings of squid marinated to tenderize, light-battered, deep-fried, and served with a creamy walnut-tartar sauce.",
    price: 270.00,
    calories: 410,
    imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80",
    allergens: ["molluscs", "gluten", "dairy"],
    dietaryLabels: ["halal"],
    recipe: {
      targetMargin: 0.72,
      ingredients: [
        { name: "Kalamar", amountUsed: 120 },
        { name: "Un (Buğday)", amountUsed: 20 },
        { name: "Ayçiçek Yağı", amountUsed: 30 },
        { name: "Süt", amountUsed: 15 },
        { name: "Limon", amountUsed: 0.25 }
      ]
    }
  },
  {
    id: "item-kalamar-izgara",
    nameTr: "Kalamar Izgara",
    nameEn: "Grilled Calamari",
    descriptionTr: "Kömür ateşinde ızgaralanmış bütün kalamar tüpü, sarımsaklı tereyağ sosu ile.",
    descriptionEn: "Whole squid tubes marinated and grilled over charcoal, basted with garlic butter.",
    price: 280.00,
    calories: 260,
    imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&auto=format&fit=crop&q=80",
    allergens: ["molluscs", "dairy"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.70,
      ingredients: [
        { name: "Kalamar", amountUsed: 120 },
        { name: "Tereyağı", amountUsed: 20 },
        { name: "Sarımsak", amountUsed: 3 }
      ]
    }
  },
  {
    id: "item-balik-kokorec",
    nameTr: "Balık Kokoreç",
    nameEn: "Fish Kokorech",
    descriptionTr: "Kimyon, kekik, domates ve biberle sacda kavrulmuş levrek kokoreç.",
    descriptionEn: "Sautéed diced sea bass seasoned heavily with cumin, oregano, tomatoes, and green peppers, served hot in a clay dish.",
    price: 250.00,
    calories: 290,
    imageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=80",
    allergens: ["fish", "dairy"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.74,
      ingredients: [
        { name: "Levrek Fileto", amountUsed: 120 },
        { name: "Domates", amountUsed: 40 },
        { name: "Biber (Yeşil)", amountUsed: 20 },
        { name: "Tereyağı", amountUsed: 15 },
        { name: "Kekik", amountUsed: 1 },
        { name: "Kimyon", amountUsed: 2 },
        { name: "Pul Biber", amountUsed: 1 }
      ]
    }
  },

  // Category 6: Pastries & Meat Hot Mezes
  {
    id: "item-icli-kofte",
    nameTr: "İçli Köfte",
    nameEn: "Icli Kofte (Kibbeh)",
    descriptionTr: "Dışı çıtır bulgur kabuğu, içi cevizli ve baharatlı kıyma dolgulu içli köfte (2 adet).",
    descriptionEn: "Two crispy bulgur croquettes stuffed with a savory filling of spiced ground beef, onions, and walnuts, then fried.",
    price: 190.00,
    calories: 440,
    imageUrl: "/images/icli_kofte.png",
    allergens: ["gluten", "nuts"],
    dietaryLabels: ["halal"],
    recipe: {
      targetMargin: 0.75,
      ingredients: [
        { name: "Bulgur (Pilavlık)", amountUsed: 80 },
        { name: "Kıyma (Dana)", amountUsed: 80 },
        { name: "Soğan (Kuru)", amountUsed: 30 },
        { name: "Ceviz İçi", amountUsed: 15 },
        { name: "Ayçiçek Yağı", amountUsed: 25 },
        { name: "Karabiber", amountUsed: 1 },
        { name: "Tuz", amountUsed: 1 }
      ]
    }
  },
  {
    id: "item-kagitta-pastirma",
    nameTr: "Kağıtta Pastırma",
    nameEn: "Pastirma in Parchment",
    descriptionTr: "Fırında parşömen kağıdı içinde domates, biber ve tereyağı ile pişen pastırma dilimleri.",
    descriptionEn: "Spicy slices of pastırma cooked in parchment paper alongside tomatoes, butter, and green peppers, allowing the beef fats to emulsify.",
    price: 240.00,
    calories: 350,
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80",
    allergens: ["dairy"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.70,
      ingredients: [
        { name: "Pastırma", amountUsed: 50 },
        { name: "Domates", amountUsed: 30 },
        { name: "Biber (Yeşil)", amountUsed: 15 },
        { name: "Tereyağı", amountUsed: 15 }
      ]
    }
  },
  {
    id: "item-pastirmali-humus",
    nameTr: "Pastırmalı Humus",
    nameEn: "Hummus with Pastirma",
    descriptionTr: "Fırınlanmış sıcak humus üzerine kızarmış çıtır pastırma ve tereyağı sosu.",
    descriptionEn: "Traditional warm chickpea hummus topped with sizzling butter, pine nuts, and crispy slices of pastırma.",
    price: 240.00,
    calories: 450,
    imageUrl: "/images/pastirmali_humus.png",
    allergens: ["sesame", "dairy", "nuts"],
    dietaryLabels: ["halal", "gluten-free"],
    recipe: {
      targetMargin: 0.72,
      ingredients: [
        { name: "Nohut (Kuru)", amountUsed: 80 },
        { name: "Tahin", amountUsed: 40 },
        { name: "Pastırma", amountUsed: 30 },
        { name: "Tereyağı", amountUsed: 20 },
        { name: "Çam Fıstığı", amountUsed: 5 }
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

  // 1. Clean up first: delete these specific meze items if they are currently linked
  console.log("Cleaning up existing mezes...");
  const mezeIds = mezes.map(m => m.id);
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

  // 2. Seed missing ingredients
  console.log("Seeding ingredients for bispecial...");
  for (const ing of newIngredients) {
    const existing = await prisma.ingredient.findFirst({
      where: {
        venueId,
        name: ing.name
      }
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

  // Retrieve all ingredients in the venue/org to map names to IDs
  const dbIngredients = await prisma.ingredient.findMany({
    where: sharedInventory ? { organizationId } : { venueId }
  });
  const ingredientMap = {};
  dbIngredients.forEach(i => {
    ingredientMap[i.name] = i;
  });

  // 3. Seed Meze MenuItems, Translations, and Recipes
  console.log("\nSeeding mezes and recipes to bispecial...");
  for (const m of mezes) {
    const menuItemData = {
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
    };

    const item = await prisma.menuItem.create({
      data: {
        id: m.id,
        ...menuItemData
      }
    });
    console.log(`Created MenuItem: ${m.nameEn}`);

    // Create Translations
    await prisma.menuItemTranslation.create({
      data: { menuItemId: item.id, locale: "tr", name: m.nameTr, description: m.descriptionTr }
    });

    await prisma.menuItemTranslation.create({
      data: { menuItemId: item.id, locale: "en", name: m.nameEn, description: m.descriptionEn }
    });

    // Connect Dietary Labels
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

    // Create Recipe
    const recipe = await prisma.recipe.create({
      data: {
        menuItemId: item.id,
        targetMargin: m.recipe.targetMargin,
        yieldQuantity: 1.0,
        yieldUnit: "porsiyon",
        portionSize: 1.0,
        totalYield: 1.0,
        currentCost: 0 // Will calculate below
      }
    });

    // Create RecipeIngredients and calculate total cost
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

    const yieldQty = Number(recipe.yieldQuantity || 1);
    const portionCost = yieldQty > 0 ? totalCost / yieldQty : totalCost;

    // Update Recipe with computed cost
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        currentCost: portionCost
      }
    });

    console.log(`Configured Recipe for ${m.nameEn} (Total Cost: ${portionCost.toFixed(2)} TRY, Target Margin: ${(m.recipe.targetMargin * 100).toFixed(0)}%, Price: ${m.price.toFixed(2)} TRY)`);
  }

  console.log("\n🎉 Meze and recipe seeding to bispecial complete!");
}

main()
  .catch((e) => {
    console.error("Error seeding meze recipes:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
