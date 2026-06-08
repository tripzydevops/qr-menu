import sys
import os
import datetime
from decimal import Decimal

# Add parent directory to path so imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
import schemas
from services import costing

def setup_test_entities(db):
    """
    Sets up common test records: Organization, Venue, Category, MenuItem, Supplier, and alert rule.
    Returns a dictionary of all created objects.
    """
    # 1. Org
    org = models.Organization(
        id="test-org-1",
        name="Test Org",
        inventoryEnabled=True,
        sharedInventory=False
    )
    db.add(org)
    
    # 2. Venue
    venue = models.Venue(
        id="test-venue-1",
        name="Test Venue",
        organizationId="test-org-1",
        currency="TRY",
        defaultLocale="tr",
        supportedLocales=["tr", "en"]
    )
    db.add(venue)
    db.flush()
    
    # 3. Category
    cat = models.Category(
        id="test-cat-1",
        nameTr="Test Kategori",
        nameEn="Test Category",
        venueId="test-venue-1"
    )
    db.add(cat)
    
    # 4. MenuItem
    item = models.MenuItem(
        id="test-item-1",
        nameTr="Kahve",
        nameEn="Coffee",
        price=Decimal("100.00"),
        categoryId="test-cat-1",
        isAvailable=True
    )
    db.add(item)
    
    # 5. Supplier
    supplier = models.Supplier(
        id="test-sup-1",
        name="Coffee Supplier",
        venueId="test-venue-1"
    )
    db.add(supplier)
    
    # 6. PricingAlertRule
    rule = models.PricingAlertRule(
        id="test-rule-1",
        venueId="test-venue-1",
        swingThreshold=Decimal("0.05"),
        stockDeductionMode="auto",
        autoSyncEnabled=False,
        isActive=True
    )
    db.add(rule)
    
    db.commit()
    return {
        "org": org,
        "venue": venue,
        "category": cat,
        "menuItem": item,
        "supplier": supplier,
        "rule": rule
    }

def cleanup_test_entities(db):
    """
    Removes all test data to prevent interference with other tests or databases.
    """
    db.query(models.PricingAlert).filter(models.PricingAlert.venueId == "test-venue-1").delete()
    db.query(models.PricingAlertRule).filter(models.PricingAlertRule.venueId == "test-venue-1").delete()
    db.query(models.RecipeIngredient).filter(models.RecipeIngredient.id.like("test-%")).delete()
    db.query(models.Recipe).filter(models.Recipe.id.like("test-%")).delete()
    db.query(models.InvoiceItem).filter(models.InvoiceItem.id.like("test-%")).delete()
    db.query(models.Invoice).filter(models.Invoice.venueId == "test-venue-1").delete()
    db.query(models.IngredientCostLog).filter(models.IngredientCostLog.ingredientId.like("test-%")).delete()
    db.query(models.Ingredient).filter(models.Ingredient.venueId == "test-venue-1").delete()
    db.query(models.Supplier).filter(models.Supplier.venueId == "test-venue-1").delete()
    db.query(models.MenuItem).filter(models.MenuItem.id == "test-item-1").delete()
    db.query(models.Category).filter(models.Category.id == "test-cat-1").delete()
    db.query(models.Venue).filter(models.Venue.id == "test-venue-1").delete()
    db.query(models.Organization).filter(models.Organization.id == "test-org-1").delete()
    db.commit()

# --- TESTS ---

def test_wac_calculations():
    db = SessionLocal()
    cleanup_test_entities(db)
    setup_test_entities(db)
    try:
        # Create ingredient
        ing = models.Ingredient(
            id="test-ing-1",
            name="Coffee Beans",
            unit="g",
            currentStock=Decimal("0.0"),
            weightedCost=Decimal("0.0"),
            venueId="test-venue-1"
        )
        db.add(ing)
        db.commit()

        # Submit 1st invoice: 1000g @ 0.5 TL/g (Total 500)
        inv1 = models.Invoice(
            id="test-inv-1",
            supplierId="test-sup-1",
            invoiceDate=datetime.datetime.utcnow(),
            totalAmount=Decimal("500.00"),
            status="pending",
            venueId="test-venue-1"
        )
        db.add(inv1)
        db.flush()
        
        inv_item1 = models.InvoiceItem(
            id="test-invitem-1",
            invoiceId="test-inv-1",
            ingredientId="test-ing-1",
            quantity=Decimal("1000.0"),
            unitCost=Decimal("0.5"),
            totalCost=Decimal("500.0")
        )
        db.add(inv_item1)
        db.commit()

        # Process invoice
        costing.process_invoice(db, "test-inv-1")

        # Verify WAC and stock
        db.refresh(ing)
        assert ing.currentStock == Decimal("1000.0000")
        assert ing.weightedCost == Decimal("0.500000")

        # Submit 2nd invoice: 500g @ 0.8 TL/g (Total 400)
        inv2 = models.Invoice(
            id="test-inv-2",
            supplierId="test-sup-1",
            invoiceDate=datetime.datetime.utcnow(),
            totalAmount=Decimal("400.00"),
            status="pending",
            venueId="test-venue-1"
        )
        db.add(inv2)
        db.flush()
        
        inv_item2 = models.InvoiceItem(
            id="test-invitem-2",
            invoiceId="test-inv-2",
            ingredientId="test-ing-1",
            quantity=Decimal("500.0"),
            unitCost=Decimal("0.8"),
            totalCost=Decimal("400.0")
        )
        db.add(inv_item2)
        db.commit()

        # Process invoice 2
        costing.process_invoice(db, "test-inv-2")

        # Verify new WAC: (1000 * 0.5 + 500 * 0.8) / 1500 = (500 + 400) / 1500 = 900 / 1500 = 0.60
        db.refresh(ing)
        assert ing.currentStock == Decimal("1500.0000")
        assert ing.weightedCost == Decimal("0.600000")

        # Verify cost log
        logs = db.query(models.IngredientCostLog).filter(models.IngredientCostLog.ingredientId == "test-ing-1").all()
        assert len(logs) == 2
        
        print("test_wac_calculations passed.")
    finally:
        cleanup_test_entities(db)
        db.close()

def test_recipe_cost_and_alerts():
    db = SessionLocal()
    cleanup_test_entities(db)
    setup_test_entities(db)
    try:
        # Create ingredient: Coffee beans (WAC 0.6) and milk (WAC 0.05)
        ing1 = models.Ingredient(
            id="test-ing-1",
            name="Coffee Beans",
            unit="g",
            currentStock=Decimal("1000.0"),
            weightedCost=Decimal("0.60"),
            venueId="test-venue-1"
        )
        ing2 = models.Ingredient(
            id="test-ing-2",
            name="Milk",
            unit="ml",
            currentStock=Decimal("5000.0"),
            weightedCost=Decimal("0.05"),
            venueId="test-venue-1"
        )
        db.add(ing1)
        db.add(ing2)
        
        # Create recipe for "test-item-1" (Coffee, price = 100.00)
        # Uses 15g coffee beans (15 * 0.6 = 9.0) + 200ml milk (200 * 0.05 = 10.0) -> Cost = 19.0 TL
        recipe = models.Recipe(
            id="test-recipe-1",
            menuItemId="test-item-1",
            targetMargin=Decimal("0.85"),  # 85% target margin (Requires price 19 / 0.15 = 126.67, so 100.0 price is critical!)
            currentCost=Decimal("0.0")
        )
        db.add(recipe)
        db.flush()

        ri1 = models.RecipeIngredient(
            id="test-ri-1",
            recipeId="test-recipe-1",
            ingredientId="test-ing-1",
            amountUsed=Decimal("15.0")
        )
        ri2 = models.RecipeIngredient(
            id="test-ri-2",
            recipeId="test-recipe-1",
            ingredientId="test-ing-2",
            amountUsed=Decimal("200.0")
        )
        db.add(ri1)
        db.add(ri2)
        db.commit()

        # Recalculate
        costing.recalculate_recipe_cost(db, "test-recipe-1")
        
        db.refresh(recipe)
        assert recipe.currentCost == Decimal("19.00")

        # Check margin alert. Target = 85%, Current price = 100, cost = 19. Current margin = (100 - 19) / 100 = 81%.
        # Deviation = 85% - 81% = 4%. Rule swingThreshold = 5%.
        # Since deviation (4%) < swingThreshold (5%), no alert should trigger.
        alert = costing.check_margin_alert(db, "test-recipe-1")
        assert alert is None

        # Now update swingThreshold to 3%
        rule = db.query(models.PricingAlertRule).filter(models.PricingAlertRule.venueId == "test-venue-1").first()
        rule.swingThreshold = Decimal("0.03")
        db.commit()

        # Check alert again. Now deviation (4%) >= swingThreshold (3%), should trigger alert!
        alert = costing.check_margin_alert(db, "test-recipe-1")
        assert alert is not None
        assert alert.alertType == "margin_drop"
        assert alert.suggestedPrice == Decimal("126.67") # 19 / (1 - 0.85) = 19 / 0.15 = 126.6666... -> 126.67
        
        print("test_recipe_cost_and_alerts passed.")
    finally:
        cleanup_test_entities(db)
        db.close()

def test_price_sync():
    db = SessionLocal()
    cleanup_test_entities(db)
    setup_test_entities(db)
    try:
        # Create ingredient and recipe
        ing = models.Ingredient(
            id="test-ing-1",
            name="Coffee Beans",
            unit="g",
            currentStock=Decimal("1000.0"),
            weightedCost=Decimal("2.0"),
            venueId="test-venue-1"
        )
        db.add(ing)
        
        recipe = models.Recipe(
            id="test-recipe-1",
            menuItemId="test-item-1",
            targetMargin=Decimal("0.80"), # 80% margin. cost = 30 -> suggested price = 30 / 0.20 = 150
            currentCost=Decimal("0.0")
        )
        db.add(recipe)
        db.flush()
        
        ri = models.RecipeIngredient(
            id="test-ri-1",
            recipeId="test-recipe-1",
            ingredientId="test-ing-1",
            amountUsed=Decimal("15.0") # 15 * 2.0 = 30.0 cost
        )
        db.add(ri)
        db.commit()

        costing.recalculate_recipe_cost(db, "test-recipe-1")
        
        # Trigger an alert
        alert = costing.check_margin_alert(db, "test-recipe-1")
        assert alert is not None
        
        # Sync suggested price
        results = costing.sync_prices(db, "test-venue-1", ["test-item-1"], sync_type="suggested")
        
        assert len(results) == 1
        assert results[0].newPrice == Decimal("150.00")
        assert results[0].newMargin == Decimal("0.80")
        
        # Verify MenuItem price is updated
        item = db.query(models.MenuItem).filter(models.MenuItem.id == "test-item-1").first()
        assert item.price == Decimal("150.00")
        
        # Verify alert is resolved
        assert alert.isResolved == True

        print("test_price_sync passed.")
    finally:
        cleanup_test_entities(db)
        db.close()

def test_stock_deduction():
    db = SessionLocal()
    cleanup_test_entities(db)
    setup_test_entities(db)
    try:
        # Create ingredient with stock 100g, reorder level 20g
        ing = models.Ingredient(
            id="test-ing-1",
            name="Coffee Beans",
            unit="g",
            currentStock=Decimal("100.0"),
            reorderLevel=Decimal("20.0"),
            weightedCost=Decimal("1.0"),
            venueId="test-venue-1"
        )
        db.add(ing)
        
        recipe = models.Recipe(
            id="test-recipe-1",
            menuItemId="test-item-1",
            targetMargin=Decimal("0.70"),
            currentCost=Decimal("15.0")
        )
        db.add(recipe)
        db.flush()
        
        ri = models.RecipeIngredient(
            id="test-ri-1",
            recipeId="test-recipe-1",
            ingredientId="test-ing-1",
            amountUsed=Decimal("15.0") # Uses 15g per coffee
        )
        db.add(ri)
        
        # Create completed Order with quantity = 6
        order = models.Order(
            id="test-order-1",
            venueId="test-venue-1",
            status="completed",
            totalAmount=Decimal("600.00"),
            paidAt=datetime.datetime.utcnow()
        )
        db.add(order)
        db.flush()
        
        order_item = models.OrderItem(
            id="test-orderitem-1",
            orderId="test-order-1",
            menuItemId="test-item-1",
            quantity=6,
            price=Decimal("100.00")
        )
        db.add(order_item)
        db.commit()

        # Deduct stock
        warnings = costing.deduct_stock_from_order(db, "test-order-1")
        
        # 6 items * 15g = 90g deduction. Remaining stock = 100g - 90g = 10g.
        # Since remaining stock (10g) <= reorder level (20g), should trigger low stock warning!
        db.refresh(ing)
        assert ing.currentStock == Decimal("10.0000")
        assert len(warnings) == 1
        assert warnings[0]["ingredientId"] == "test-ing-1"
        assert Decimal(warnings[0]["currentStock"]) == Decimal("10.0")

        print("test_stock_deduction passed.")
    finally:
        db.query(models.OrderItem).filter(models.OrderItem.id == "test-orderitem-1").delete()
        db.query(models.Order).filter(models.Order.id == "test-order-1").delete()
        cleanup_test_entities(db)
        db.close()

def test_wac_with_kdv():
    db = SessionLocal()
    cleanup_test_entities(db)
    setup_test_entities(db)
    try:
        # Create ingredient
        ing = models.Ingredient(
            id="test-ing-kdv",
            name="Flour",
            unit="g",
            currentStock=Decimal("0.0"),
            weightedCost=Decimal("0.0"),
            venueId="test-venue-1"
        )
        db.add(ing)
        db.commit()

        # Submit invoice: 
        # Item 1: 10 units @ 110 TL, VAT 10% (Inclusive) -> Net cost = 100 TL. Total = 1100
        # Item 2: 5 units @ 200 TL, VAT 10% (Exclusive) -> Net cost = 200 TL. Total = 1000
        inv = models.Invoice(
            id="test-inv-kdv",
            supplierId="test-sup-1",
            invoiceDate=datetime.datetime.utcnow(),
            totalAmount=Decimal("2100.00"),
            status="pending",
            venueId="test-venue-1"
        )
        db.add(inv)
        db.flush()

        inv_item1 = models.InvoiceItem(
            id="test-invitem-kdv-1",
            invoiceId="test-inv-kdv",
            ingredientId="test-ing-kdv",
            quantity=Decimal("10.0"),
            unitCost=Decimal("110.0"),
            vatRate=Decimal("0.10"),
            isVatInclusive=True,
            totalCost=Decimal("1100.0")
        )
        inv_item2 = models.InvoiceItem(
            id="test-invitem-kdv-2",
            invoiceId="test-inv-kdv",
            ingredientId="test-ing-kdv",
            quantity=Decimal("5.0"),
            unitCost=Decimal("200.0"),
            vatRate=Decimal("0.10"),
            isVatInclusive=False,
            totalCost=Decimal("1000.0")
        )
        db.add(inv_item1)
        db.add(inv_item2)
        db.commit()

        # Process invoice
        costing.process_invoice(db, "test-inv-kdv")

        # Verify:
        # Total Qty = 15.0
        # Total Net Cost = 10 * 100 + 5 * 200 = 1000 + 1000 = 2000
        # WAC = 2000 / 15 = 133.333333...
        db.refresh(ing)
        assert ing.currentStock == Decimal("15.0000")
        assert abs(ing.weightedCost - Decimal("133.333333")) < Decimal("0.0001")

        print("test_wac_with_kdv passed.")
    finally:
        db.query(models.InvoiceItem).filter(models.InvoiceItem.id.like("test-%")).delete()
        db.query(models.Invoice).filter(models.Invoice.id == "test-inv-kdv").delete()
        db.query(models.IngredientCostLog).filter(models.IngredientCostLog.ingredientId == "test-ing-kdv").delete()
        db.query(models.Ingredient).filter(models.Ingredient.id == "test-ing-kdv").delete()
        cleanup_test_entities(db)
        db.close()

if __name__ == "__main__":
    print("Running costing and inventory engine tests...")
    test_wac_calculations()
    test_recipe_cost_and_alerts()
    test_price_sync()
    test_stock_deduction()
    test_wac_with_kdv()
    print("All backend tests completed successfully!")
