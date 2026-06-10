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
    
    # Create category and menu item for recipe CRUD test
    cat = models.Category(
        id="test-recipe-cat-1",
        nameTr="Yiyecekler",
        nameEn="Foods",
        venueId="test-recipe-venue-1"
    )
    db.add(cat)
    db.flush()
    
    item = models.MenuItem(
        id="test-recipe-item-1",
        nameTr="Girit Ezme",
        nameEn="Girit Ezme",
        price=Decimal("150.00"),
        categoryId="test-recipe-cat-1",
        isAvailable=True,
        showOnMenu=True
    )
    db.add(item)
    db.commit()
    
    try:
        # Test Case A: Scan via text JSON input (using fallback parsing mode)
        recipe_text = "For this recipe we need 2 cups of Flour and 1 cup of Milk. Makes 1.5 kg."
        
        response = client.post(
            "/api/admin/inventory/recipes/scan?venueId=test-recipe-venue-1",
            json={"text": recipe_text}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict)
        assert "items" in data
        assert "suggestedYieldQuantity" in data
        assert "suggestedYieldUnit" in data
        
        items = data["items"]
        
        # Verify both ingredients are returned with correct matching
        matched_flour = next((x for x in items if x["ingredientId"] == "test-ing-flour"), None)
        matched_milk = next((x for x in items if x["ingredientId"] == "test-ing-milk"), None)
        
        assert matched_flour is not None
        assert abs(matched_flour["amountUsed"] - 249.6) < 1.0
        assert matched_flour["confidence"] > 0.5
        assert matched_flour["originalText"] is not None
        
        assert matched_milk is not None
        assert abs(matched_milk["amountUsed"] - 240.0) < 10.0
        
        # Verify parsed yield
        assert data["suggestedYieldQuantity"] == 1.5
        assert data["suggestedYieldUnit"] == "kg"
        
        # Test Case B: Scan via multipart/form-data upload
        file_data = {"file": ("recipe.txt", b"Need 1 cup of Flour and 2 cups of Milk.", "text/plain")}
        response_file = client.post(
            "/api/admin/inventory/recipes/scan?venueId=test-recipe-venue-1",
            files=file_data
        )
        assert response_file.status_code == 200, f"Failed: {response_file.text}"
        data_file = response_file.json()
        assert isinstance(data_file, dict)
        assert len(data_file["items"]) > 0
        
        # Test Case C: Recipe CRUD with new columns (POST and PUT)
        # 1. Create recipe
        post_payload = {
            "menuItemId": "test-recipe-item-1",
            "targetMargin": 0.75,
            "yieldQuantity": 10.0,
            "yieldUnit": "kg",
            "portionSize": 0.15,
            "totalYield": 1.5,
            "ingredients": [
                {"ingredientId": "test-ing-flour", "amountUsed": 100.0}
            ]
        }
        res_create = client.post("/api/admin/inventory/recipes", json=post_payload)
        assert res_create.status_code == 201, f"Failed: {res_create.text}"
        created_data = res_create.json()
        assert float(created_data["yieldQuantity"]) == 10.0
        assert created_data["yieldUnit"] == "kg"
        assert float(created_data["portionSize"]) == 0.15
        assert float(created_data["totalYield"]) == 1.5
        recipe_id = created_data["id"]
        
        # 2. Update recipe
        put_payload = {
            "targetMargin": 0.80,
            "yieldQuantity": 20.0,
            "yieldUnit": "g",
            "portionSize": 150.0,
            "totalYield": 3000.0,
            "ingredients": [
                {"ingredientId": "test-ing-flour", "amountUsed": 150.0}
            ]
        }
        res_update = client.put(f"/api/admin/inventory/recipes/{recipe_id}", json=put_payload)
        assert res_update.status_code == 200, f"Failed: {res_update.text}"
        updated_data = res_update.json()
        assert float(updated_data["yieldQuantity"]) == 20.0
        assert updated_data["yieldUnit"] == "g"
        assert float(updated_data["portionSize"]) == 150.0
        assert float(updated_data["totalYield"]) == 3000.0
        
    finally:
        # Cleanup
        db.query(models.RecipeIngredient).filter(models.RecipeIngredient.ingredientId == "test-ing-flour").delete()
        db.query(models.Recipe).filter(models.Recipe.menuItemId == "test-recipe-item-1").delete()
        db.query(models.MenuItem).filter(models.MenuItem.id == "test-recipe-item-1").delete()
        db.query(models.Category).filter(models.Category.id == "test-recipe-cat-1").delete()
        db.query(models.Ingredient).filter(models.Ingredient.venueId == "test-recipe-venue-1").delete()
        db.query(models.Venue).filter(models.Venue.id == "test-recipe-venue-1").delete()
        db.query(models.Organization).filter(models.Organization.id == "test-recipe-org-1").delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    print("Running recipe ocr and CRUD tests...")
    test_recipe_scan_endpoints()
    print("All recipe ocr and CRUD tests passed successfully!")
