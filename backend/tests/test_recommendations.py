import sys
import os
from decimal import Decimal
import uuid
from fastapi.testclient import TestClient

# Add parent directory to path so imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
import main
import schemas

def test_recommendations():
    db = SessionLocal()
    client = TestClient(main.app)

    # 1. Setup test organization, venue, table, category, and menu items
    org_id = f"test-recom-org-{uuid.uuid4()}"
    venue_id = f"test-recom-venue-{uuid.uuid4()}"
    table_id = f"test-recom-table-{uuid.uuid4()}"
    cat_id = f"test-recom-cat-{uuid.uuid4()}"

    org = models.Organization(id=org_id, name="Recom Org")
    db.add(org)

    venue = models.Venue(
        id=venue_id,
        name="Recom Venue",
        organizationId=org_id,
        currency="TRY",
        defaultLocale="tr",
        supportedLocales=["tr", "en"]
    )
    db.add(venue)
    db.flush()

    table = models.Table(
        id=table_id,
        name="Recom Table",
        qrToken=f"recomtoken-{uuid.uuid4().hex[:6]}",
        venueId=venue_id
    )
    db.add(table)

    cat = models.Category(
        id=cat_id,
        nameTr="Tatlılar",
        nameEn="Desserts",
        venueId=venue_id
    )
    db.add(cat)
    db.flush()

    item1 = models.MenuItem(
        id=f"test-recom-item-1-{uuid.uuid4().hex[:6]}",
        nameTr="Çikolatalı Sufle",
        nameEn="Chocolate Souffle",
        price=Decimal("120.00"),
        categoryId=cat_id,
        isAvailable=True
    )
    item2 = models.MenuItem(
        id=f"test-recom-item-2-{uuid.uuid4().hex[:6]}",
        nameTr="Baklava",
        nameEn="Baklava",
        price=Decimal("150.00"),
        categoryId=cat_id,
        isAvailable=True
    )
    item3 = models.MenuItem(
        id=f"test-recom-item-3-{uuid.uuid4().hex[:6]}",
        nameTr="Sütlaç",
        nameEn="Rice Pudding",
        price=Decimal("90.00"),
        categoryId=cat_id,
        isAvailable=True
    )
    db.add(item1)
    db.add(item2)
    db.add(item3)
    db.commit()

    try:
        # 2. Get recommendations with sweetTooth preference
        payload = {
            "preferenceProfile": {
                "vegan": 0,
                "vegetarian": 0,
                "glutenFree": 0,
                "halal": 0,
                "dairyFree": 0,
                "seafoodPreference": 0,
                "sweetTooth": 25.0
            },
            "currentItemId": None
        }
        
        response = client.post(f"/api/menu/{table.qrToken}/recommendations", json=payload)
        assert response.status_code == 200
        recoms = response.json()
        
        # Verify exactly 3 items are returned (either from LLM or our local fallback)
        assert len(recoms) == 3
        for item in recoms:
            assert "id" in item
            assert "reasonTr" in item
            assert "reasonEn" in item

        print("AI Recommendations test passed successfully!")

    finally:
        # Clean up database
        db.query(models.MenuItem).filter(models.MenuItem.categoryId == cat_id).delete()
        db.query(models.Category).filter(models.Category.venueId == venue_id).delete()
        db.query(models.Table).filter(models.Table.venueId == venue_id).delete()
        db.query(models.Venue).filter(models.Venue.id == venue_id).delete()
        db.query(models.Organization).filter(models.Organization.id == org_id).delete()
        db.commit()
        db.close()
