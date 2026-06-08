import sys
import os
from decimal import Decimal
from fastapi.testclient import TestClient

# Add parent directory to path so imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
import main

# Mock get_embedding_sync and get_embedding to force fallback to standard text search
def mock_get_embedding_sync(q):
    raise Exception("Force text search fallback for test")
async def mock_get_embedding(q):
    raise Exception("Force text search fallback for test")
main.get_embedding_sync = mock_get_embedding_sync
main.get_embedding = mock_get_embedding


def test_visibility():
    db = SessionLocal()
    client = TestClient(main.app)
    
    # Setup test org, venue, category, table, and two menu items (one visible, one hidden)
    org = models.Organization(id="test-vis-org-1", name="Visibility Org")
    db.add(org)
    
    venue = models.Venue(
        id="test-vis-venue-1",
        name="Visibility Venue",
        organizationId="test-vis-org-1",
        currency="TRY",
        defaultLocale="tr",
        supportedLocales=["tr", "en"]
    )
    db.add(venue)
    db.flush()
    
    table = models.Table(
        id="test-vis-table-1",
        name="Visibility Table",
        qrToken="vistesttoken",
        venueId="test-vis-venue-1"
    )
    db.add(table)
    
    cat = models.Category(
        id="test-vis-cat-1",
        nameTr="Yiyecekler",
        nameEn="Foods",
        venueId="test-vis-venue-1"
    )
    db.add(cat)
    db.flush()
    
    item_visible = models.MenuItem(
        id="test-vis-item-visible",
        nameTr="Görünür Köfte",
        nameEn="Visible Meatball",
        price=Decimal("150.00"),
        categoryId="test-vis-cat-1",
        isAvailable=True,
        showOnMenu=True,
        allergens=[]
    )
    db.add(item_visible)
    
    item_hidden = models.MenuItem(
        id="test-vis-item-hidden",
        nameTr="Gizli Sos",
        nameEn="Hidden Sauce",
        price=Decimal("50.00"),
        categoryId="test-vis-cat-1",
        isAvailable=True,
        showOnMenu=False,
        allergens=[]
    )
    db.add(item_hidden)
    db.commit()
    
    try:
        # 1. Fetch guest menu by QR token
        print("Fetching guest menu...")
        response = client.get("/api/menu/vistesttoken")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify categorised items
        categories = data["categories"]
        assert len(categories) == 1
        items = categories[0]["items"]
        
        item_ids = [item["id"] for item in items]
        print(f"Guest menu item IDs: {item_ids}")
        assert "test-vis-item-visible" in item_ids, "Visible item should be in guest menu"
        assert "test-vis-item-hidden" not in item_ids, "Hidden item should NOT be in guest menu"
        print("Guest menu visibility test PASSED!")
        
        # 2. Test search menu items (fallback text search)
        print("Testing text search...")
        # Search query matching visible item name
        res_search_vis = client.get("/api/menu/vistesttoken/search?q=Visible")
        assert res_search_vis.status_code == 200
        search_vis_ids = [item["id"] for item in res_search_vis.json()]
        assert "test-vis-item-visible" in search_vis_ids, f"Expected test-vis-item-visible in {search_vis_ids}"
        
        # Search query matching hidden item name
        res_search_hid = client.get("/api/menu/vistesttoken/search?q=Sauce")
        assert res_search_hid.status_code == 200
        search_hid_ids = [item["id"] for item in res_search_hid.json()]
        assert "test-vis-item-hidden" not in search_hid_ids, f"Expected test-vis-item-hidden NOT in {search_hid_ids}"
        print("Search filtering test PASSED!")
        
    finally:
        # Cleanup
        db.query(models.MenuItem).filter(models.MenuItem.id.like("test-vis-%")).delete()
        db.query(models.Category).filter(models.Category.id.like("test-vis-%")).delete()
        db.query(models.Table).filter(models.Table.id.like("test-vis-%")).delete()
        db.query(models.Venue).filter(models.Venue.id.like("test-vis-%")).delete()
        db.query(models.Organization).filter(models.Organization.id.like("test-vis-%")).delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    print("Running visibility test...")
    test_visibility()
    print("All visibility tests passed successfully!")
