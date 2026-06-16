import sys
import os
import datetime
from decimal import Decimal

# Add parent directory to path so imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from services.analytics import get_sales_analytics

def test_sales_analytics():
    db = SessionLocal()
    
    try:
        # Cleanup first just in case
        cleanup(db)

        # 1. Setup Venue
        org = models.Organization(id="test-org-analytics", name="Analytics Test Org")
        venue = models.Venue(id="test-venue-analytics", name="Analytics Test Venue", organizationId="test-org-analytics")
        db.add(org)
        db.add(venue)
        db.flush()

        # 2. Setup Category & Menu Items
        cat = models.Category(id="test-cat-analytics", nameTr="Yemekler", nameEn="Main Dishes", venueId="test-venue-analytics")
        db.add(cat)

        # Item 1: Burger (Star: High Popularity, High Margin)
        # Price: 200, Cost: 50 -> Margin: 150
        burger = models.MenuItem(
            id="test-item-burger",
            nameTr="Burger",
            nameEn="Burger",
            price=Decimal("200.00"),
            categoryId="test-cat-analytics"
        )
        db.add(burger)

        # Item 2: Truffle Pasta (Puzzle: Low Popularity, High Margin)
        # Price: 300, Cost: 70 -> Margin: 230
        pasta = models.MenuItem(
            id="test-item-pasta",
            nameTr="Trüflü Makarna",
            nameEn="Truffle Pasta",
            price=Decimal("300.00"),
            categoryId="test-cat-analytics"
        )
        db.add(pasta)

        # Item 3: Chicken Wrap (Plowhorse: High Popularity, Low Margin)
        # Price: 120, Cost: 90 -> Margin: 30
        wrap = models.MenuItem(
            id="test-item-wrap",
            nameTr="Tavuk Dürüm",
            nameEn="Chicken Wrap",
            price=Decimal("120.00"),
            categoryId="test-cat-analytics"
        )
        db.add(wrap)

        # Item 4: Salad (Dog: Low Popularity, Low Margin)
        # Price: 100, Cost: 80 -> Margin: 20
        salad = models.MenuItem(
            id="test-item-salad",
            nameTr="Salata",
            nameEn="Salad",
            price=Decimal("100.00"),
            categoryId="test-cat-analytics"
        )
        db.add(salad)
        db.flush()

        # 3. Setup Recipes (Costs)
        recipe1 = models.Recipe(id="test-recipe-burger", menuItemId="test-item-burger", currentCost=Decimal("50.00"))
        recipe2 = models.Recipe(id="test-recipe-pasta", menuItemId="test-item-pasta", currentCost=Decimal("70.00"))
        recipe3 = models.Recipe(id="test-recipe-wrap", menuItemId="test-item-wrap", currentCost=Decimal("90.00"))
        recipe4 = models.Recipe(id="test-recipe-salad", menuItemId="test-item-salad", currentCost=Decimal("80.00"))
        db.add(recipe1)
        db.add(recipe2)
        db.add(recipe3)
        db.add(recipe4)

        # 4. Setup Views (AnalyticsEvents)
        # Burger: 10 views
        for _ in range(10):
            db.add(models.AnalyticsEvent(id=str(os.urandom(16).hex()), venueId="test-venue-analytics", path="/menu/item-test-item-burger"))
        # Pasta: 5 views
        for _ in range(5):
            db.add(models.AnalyticsEvent(id=str(os.urandom(16).hex()), venueId="test-venue-analytics", path="/menu/item-test-item-pasta"))
        # Wrap: 10 views
        for _ in range(10):
            db.add(models.AnalyticsEvent(id=str(os.urandom(16).hex()), venueId="test-venue-analytics", path="/menu/item-test-item-wrap"))
        # Salad: 2 views
        for _ in range(2):
            db.add(models.AnalyticsEvent(id=str(os.urandom(16).hex()), venueId="test-venue-analytics", path="/menu/item-test-item-salad"))
        db.flush()

        # 5. Setup Orders & OrderItems (Completed sales)
        # Order 1: 3 Burgers, 1 Wrap
        order1 = models.Order(
            id="test-order-1",
            venueId="test-venue-analytics",
            status="completed",
            totalAmount=Decimal("720.00"),
            netAmount=Decimal("720.00"),
            paidAt=datetime.datetime.utcnow()
        )
        db.add(order1)
        db.flush()
        db.add(models.OrderItem(id="test-oi-1", orderId="test-order-1", menuItemId="test-item-burger", quantity=3, price=Decimal("200.00")))
        db.add(models.OrderItem(id="test-oi-2", orderId="test-order-1", menuItemId="test-item-wrap", quantity=1, price=Decimal("120.00")))

        # Order 2: 2 Wraps, 1 Truffle Pasta
        order2 = models.Order(
            id="test-order-2",
            venueId="test-venue-analytics",
            status="completed",
            totalAmount=Decimal("540.00"),
            netAmount=Decimal("540.00"),
            paidAt=datetime.datetime.utcnow()
        )
        db.add(order2)
        db.flush()
        db.add(models.OrderItem(id="test-oi-3", orderId="test-order-2", menuItemId="test-item-wrap", quantity=2, price=Decimal("120.00")))
        db.add(models.OrderItem(id="test-oi-4", orderId="test-order-2", menuItemId="test-item-pasta", quantity=1, price=Decimal("300.00")))

        db.commit()

        # Run get_sales_analytics
        result = get_sales_analytics(db, "test-venue-analytics", days=1)

        # Assert Summary
        # Total orders: 2
        # Total revenue: 720 + 540 = 1260.00
        # AOV: 1260 / 2 = 630.00
        # Total items sold: 3 burger + 1 wrap + 2 wrap + 1 pasta = 7
        assert result["summary"]["totalOrders"] == 2
        assert result["summary"]["totalRevenue"] == 1260.00
        assert result["summary"]["averageOrderValue"] == 630.00
        assert result["summary"]["totalItemsSold"] == 7

        # Assert Best Sellers
        # tavuk dürüm quantity = 3
        # burger quantity = 3
        # pasta quantity = 1
        # salad quantity = 0
        best_seller_ids = [x["id"] for x in result["bestSellers"]]
        assert "test-item-burger" in best_seller_ids
        assert "test-item-wrap" in best_seller_ids

        # Check conversion rate for burger: 3 sold / 10 views = 30.0%
        burger_perf = next(x for x in result["bestSellers"] if x["id"] == "test-item-burger")
        assert burger_perf["conversionRate"] == 30.0

        # Assert Matrix Classifications
        # Margins:
        # burger: 150
        # pasta: 230
        # wrap: 30
        # salad: 20
        # Average margin = (150 + 230 + 30 + 20) / 4 = 107.5
        
        # Quantities:
        # burger: 3
        # wrap: 3
        # pasta: 1
        # salad: 0
        # Average quantity = (3 + 3 + 1 + 0) / 4 = 1.75

        # Stars (High Pop, High Margin): burger (qty 3 >= 1.75, margin 150 >= 107.5)
        # Plowhorses (High Pop, Low Margin): wrap (qty 3 >= 1.75, margin 30 < 107.5)
        # Puzzles (Low Pop, High Margin): pasta (qty 1 < 1.75, margin 230 >= 107.5)
        # Dogs (Low Pop, Low Margin): salad (qty 0 < 1.75, margin 20 < 107.5)

        star_ids = [x["id"] for x in result["matrix"]["stars"]]
        plowhorse_ids = [x["id"] for x in result["matrix"]["plowhorses"]]
        puzzle_ids = [x["id"] for x in result["matrix"]["puzzles"]]
        dog_ids = [x["id"] for x in result["matrix"]["dogs"]]

        assert "test-item-burger" in star_ids
        assert "test-item-wrap" in plowhorse_ids
        assert "test-item-pasta" in puzzle_ids
        assert "test-item-salad" in dog_ids

        print("All assertions passed successfully!")

    finally:
        cleanup(db)
        db.close()

def cleanup(db):
    db.query(models.OrderItem).filter(models.OrderItem.id.like("test-oi-%")).delete()
    db.query(models.Order).filter(models.Order.venueId == "test-venue-analytics").delete()
    db.query(models.AnalyticsEvent).filter(models.AnalyticsEvent.venueId == "test-venue-analytics").delete()
    db.query(models.Recipe).filter(models.Recipe.id.like("test-recipe-%")).delete()
    db.query(models.MenuItem).filter(models.MenuItem.categoryId == "test-cat-analytics").delete()
    db.query(models.Category).filter(models.Category.venueId == "test-venue-analytics").delete()
    db.query(models.Venue).filter(models.Venue.id == "test-venue-analytics").delete()
    db.query(models.Organization).filter(models.Organization.id == "test-org-analytics").delete()
    db.commit()

if __name__ == "__main__":
    test_sales_analytics()
