import os
from sqlalchemy.orm import Session
from decimal import Decimal

try:
    from .database import SessionLocal, Base, engine
    from . import models
except ImportError:
    from database import SessionLocal, Base, engine
    import models

def seed_data():
    db = SessionLocal()
    # Recreate tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    print("Seeding database with sample Turkish restaurant...")

    # 1. Organization
    org = models.Organization(
        id="org-karakoy",
        name="Karaköy Lokantası",
        logoUrl="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80"
    )
    db.add(org)

    # 2. Venue
    venue = models.Venue(
        id="venue-karakoy-main",
        name="Karaköy Merkez",
        address="Kemankeş Karamustafa Paşa Mh., Beyoğlu, İstanbul",
        organizationId=org.id
    )
    db.add(venue)

    # 3. Tables
    tables = [
        models.Table(id="table-1", name="Masa 1", qrToken="k1", venueId=venue.id),
        models.Table(id="table-2", name="Masa 2", qrToken="k2", venueId=venue.id),
        models.Table(id="table-3", name="Masa 3", qrToken="k3", venueId=venue.id),
        models.Table(id="table-4", name="Masa 4", qrToken="k4", venueId=venue.id),
        models.Table(id="table-5", name="Room 101", qrToken="r101", venueId=venue.id), # hotel room example
    ]
    for t in tables:
        db.add(t)

    # 4. Categories
    cat_starters = models.Category(
        id="cat-starters",
        nameTr="Başlangıçlar / Mezeler",
        nameEn="Starters & Mezes",
        sortOrder=1,
        venueId=venue.id
    )
    cat_mains = models.Category(
        id="cat-mains",
        nameTr="Ana Yemekler",
        nameEn="Main Courses",
        sortOrder=2,
        venueId=venue.id
    )
    cat_desserts = models.Category(
        id="cat-desserts",
        nameTr="Tatlılar",
        nameEn="Desserts",
        sortOrder=3,
        venueId=venue.id
    )
    cat_drinks = models.Category(
        id="cat-drinks",
        nameTr="İçecekler",
        nameEn="Drinks",
        sortOrder=4,
        venueId=venue.id
    )
    db.add(cat_starters)
    db.add(cat_mains)
    db.add(cat_desserts)
    db.add(cat_drinks)

    # 5. Menu Items
    items = [
        # Starters
        models.MenuItem(
            id="item-lentil",
            nameTr="Süzme Mercimek Çorbası",
            nameEn="Lentil Soup",
            descriptionTr="Kıtır ekmek ve limon ile servis edilir.",
            descriptionEn="Served with crunchy croutons and lemon.",
            price=Decimal("120.00"),
            imageUrl="https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=500&auto=format&fit=crop&q=80",
            allergens=["gluten"],
            isAvailable=True,
            categoryId=cat_starters.id
        ),
        models.MenuItem(
            id="item-hummus",
            nameTr="Sıcak Tereyağlı Humus",
            nameEn="Warm Hummus with Butter",
            descriptionTr="Pastırma dilimleri ve tereyağı ile fırınlanmış humus.",
            descriptionEn="Baked hummus topped with pastrami slices and melted butter.",
            price=Decimal("195.00"),
            imageUrl="https://images.unsplash.com/photo-1628294895520-73f08b1c51d9?w=500&auto=format&fit=crop&q=80",
            allergens=["sesame", "dairy"],
            isAvailable=True,
            categoryId=cat_starters.id
        ),
        # Mains
        models.MenuItem(
            id="item-kebab",
            nameTr="Zırh Kebabı (Adana)",
            nameEn="Hand-Minced Adana Kebab",
            descriptionTr="Közlenmiş biber, domates, lavaş ve sumaklı soğan salatası eşliğinde.",
            descriptionEn="Served with grilled pepper, tomato, lavash, and sumac onion salad.",
            price=Decimal("420.00"),
            imageUrl="https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&auto=format&fit=crop&q=80",
            allergens=["gluten"],
            isAvailable=True,
            categoryId=cat_mains.id
        ),
        models.MenuItem(
            id="item-manti",
            nameTr="Kayseri Mantısı",
            nameEn="Turkish Manti (Dumplings)",
            descriptionTr="Sarımsaklı yoğurt, nane ve sumaklı tereyağ sosu ile.",
            descriptionEn="Tiny beef-filled dumplings served with garlic yogurt, mint, and sumac butter.",
            price=Decimal("310.00"),
            imageUrl="https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&auto=format&fit=crop&q=80",
            allergens=["gluten", "dairy"],
            isAvailable=True,
            categoryId=cat_mains.id
        ),
        # Desserts
        models.MenuItem(
            id="item-baklava",
            nameTr="Fıstıklı Havuç Dilim Baklava",
            nameEn="Pistachio Carrot-Slice Baklava",
            descriptionTr="Maraş kesme dondurması ile servis edilir.",
            descriptionEn="Served with traditional Maraş goat milk ice cream.",
            price=Decimal("240.00"),
            imageUrl="https://images.unsplash.com/photo-1582231375454-9e86e40b2a11?w=500&auto=format&fit=crop&q=80",
            allergens=["gluten", "nuts", "dairy"],
            isAvailable=True,
            categoryId=cat_desserts.id
        ),
        # Drinks
        models.MenuItem(
            id="item-ayran",
            nameTr="Yayık Ayranı",
            nameEn="Traditional Frothy Ayran",
            descriptionTr="Taze nane yaprağı ile soğuk servis edilir.",
            descriptionEn="Cold churned salted yogurt drink served with fresh mint.",
            price=Decimal("65.00"),
            imageUrl="https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500&auto=format&fit=crop&q=80",
            allergens=["dairy"],
            isAvailable=True,
            categoryId=cat_drinks.id
        ),
        models.MenuItem(
            id="item-tea",
            nameTr="Demleme Türk Çayı",
            nameEn="Turkish Tea",
            descriptionTr="İnce belli bardakta servis edilir.",
            descriptionEn="Traditional brewed black tea served in a tulip glass.",
            price=Decimal("35.00"),
            imageUrl="https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80",
            allergens=[],
            isAvailable=True,
            categoryId=cat_drinks.id
        )
    ]
    for item in items:
        db.add(item)

    db.commit()
    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_data()
