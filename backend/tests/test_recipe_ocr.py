import sys
import os
from decimal import Decimal
from fastapi.testclient import TestClient

# Add parent directory to path so imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
import main

def test_recipe_scan_endpoints():
    db = SessionLocal()
    client = TestClient(main.app)
    
    # 1. Setup test data
    # Create Organization with inventoryEnabled=True
    org = models.Organization(id="test-recipe-org-1", name="Recipe Test Org", inventoryEnabled=True)
    db.add(org)
    
    venue = models.Venue(
        id="test-recipe-venue-1",
        name="Recipe Test Venue",
        organizationId="test-recipe-org-1",
        currency="TRY",
        defaultLocale="tr",
        supportedLocales=["tr", "en"]
    )
    db.add(venue)
    db.flush()
    
    # Create some ingredients for matching
    ing_flour = models.Ingredient(
        id="test-ing-flour",
        name="Flour",
        unit="g",
        currentStock=Decimal("1000.00"),
        weightedCost=Decimal("0.05"),
        density=Decimal("0.52"),
        venueId="test-recipe-venue-1"
    )
    db.add(ing_flour)
    
    ing_milk = models.Ingredient(
        id="test-ing-milk",
        name="Milk",
        unit="ml",
        currentStock=Decimal("2000.00"),
        weightedCost=Decimal("0.03"),
        density=Decimal("1.03"),
        venueId="test-recipe-venue-1"
    )
    db.add(ing_milk)
    db.commit()
    
    try:
        # Test Case A: Scan via text JSON input (using fallback parsing mode)
        # We search for "2 cups of flour and 1 cup of milk"
        # Flour density = 0.52. 2 cups = 480 ml * 0.52 = 249.6 g
        # Milk unit = ml, so 1 cup = 240 ml
        recipe_text = "For this recipe we need 2 cups of Flour and 1 cup of Milk."
        
        response = client.post(
            "/api/admin/inventory/recipes/scan?venueId=test-recipe-venue-1",
            json={"text": recipe_text}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Verify both ingredients are returned with correct matching
        matched_flour = next((x for x in data if x["ingredientId"] == "test-ing-flour"), None)
        matched_milk = next((x for x in data if x["ingredientId"] == "test-ing-milk"), None)
        
        assert matched_flour is not None
        # Flour: 2 cups -> 2 * 240 * 0.52 = 249.6
        assert abs(matched_flour["amountUsed"] - 249.6) < 1.0
        
        assert matched_milk is not None
        # Milk unit is ml: 1 cup -> 1 * 240 * 1.03 = 247.2 (Wait, since database unit is ml, the recipe specifies 1 cup = 240ml. 
        # Wait, if unit in database is ml, do we multiply by density?
        # Let's check fallback code: it checks unit == "g" to do volume-to-weight conversions.
        # Since Milk is "ml", it shouldn't convert to weight, it stays as volume (240ml). Let's see if amount is around 240.
        # Fallback code does: `if unit == "g": ...` so it won't multiply by density. Amount should be 240.
        assert abs(matched_milk["amountUsed"] - 240.0) < 1.0 or matched_milk["amountUsed"] == 240.0
        
        # Test Case B: Scan via multipart/form-data upload
        # Send empty mock file bytes. Fallback mode should return the first 2 ingredients.
        file_data = {"file": ("recipe.txt", b"dummy recipe text", "text/plain")}
        response_file = client.post(
            "/api/admin/inventory/recipes/scan?venueId=test-recipe-venue-1",
            files=file_data
        )
        assert response_file.status_code == 200, f"Failed: {response_file.text}"
        data_file = response_file.json()
        assert isinstance(data_file, list)
        assert len(data_file) > 0
        
    finally:
        # Cleanup
        db.query(models.Ingredient).filter(models.Ingredient.venueId == "test-recipe-venue-1").delete()
        db.query(models.Venue).filter(models.Venue.id == "test-recipe-venue-1").delete()
        db.query(models.Organization).filter(models.Organization.id == "test-recipe-org-1").delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    print("Running recipe ocr test...")
    test_recipe_scan_endpoints()
    print("All recipe ocr tests passed successfully!")
