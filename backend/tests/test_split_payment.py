import sys
import os
from decimal import Decimal
import uuid
import datetime
from fastapi.testclient import TestClient

# Add parent directory to path so imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
import main
import schemas

def test_split_payment():
    db = SessionLocal()
    client = TestClient(main.app)
    
    # 1. Setup test organization, venue, table, category, and menu items
    org_id = f"test-split-org-{uuid.uuid4()}"
    venue_id = f"test-split-venue-{uuid.uuid4()}"
    table_id = f"test-split-table-{uuid.uuid4()}"
    cat_id = f"test-split-cat-{uuid.uuid4()}"
    
    org = models.Organization(id=org_id, name="Split Payment Org")
    db.add(org)
    
    venue = models.Venue(
        id=venue_id,
        name="Split Payment Venue",
        organizationId=org_id,
        currency="TRY",
        defaultLocale="tr",
        supportedLocales=["tr", "en"]
    )
    db.add(venue)
    db.flush()
    
    table = models.Table(
        id=table_id,
        name="Split Table",
        qrToken=f"splittoken-{uuid.uuid4().hex[:6]}",
        venueId=venue_id
    )
    db.add(table)
    
    cat = models.Category(
        id=cat_id,
        nameTr="Ana Yemekler",
        nameEn="Main Courses",
        venueId=venue_id
    )
    db.add(cat)
    db.flush()
    
    item1 = models.MenuItem(
        id=f"test-split-item-1-{uuid.uuid4().hex[:6]}",
        nameTr="Kebap",
        nameEn="Kebab",
        price=Decimal("400.00"),
        categoryId=cat_id,
        isAvailable=True,
        showOnMenu=True,
        allergens=[]
    )
    db.add(item1)
    
    item2 = models.MenuItem(
        id=f"test-split-item-2-{uuid.uuid4().hex[:6]}",
        nameTr="Ayran",
        nameEn="Ayran",
        price=Decimal("50.00"),
        categoryId=cat_id,
        isAvailable=True,
        showOnMenu=True,
        allergens=[]
    )
    db.add(item2)
    db.commit()
    
    # Track created items for cleanup
    created_order_ids = []
    
    try:
        # Scenario A: Test Full Payment (Nakit)
        # Create an order
        order_a = models.Order(
            id=f"order-a-{uuid.uuid4()}",
            venueId=venue_id,
            tableId=table_id,
            status="served",
            totalAmount=Decimal("450.00"),
            createdAt=datetime.datetime.utcnow()
        )
        db.add(order_a)
        db.commit()
        created_order_ids.append(order_a.id)
        
        # Pay the table using full payment endpoint
        res = client.post(f"/api/admin/tables/{table_id}/pay", json={"paymentMethod": "cash"})
        assert res.status_code == 200, f"Full payment failed: {res.text}"
        
        # Check order status is completed
        db.refresh(order_a)
        assert order_a.status == "completed"
        assert order_a.paymentMethod == "cash"
        
        # Check Payment record was created
        payments = db.query(models.Payment).filter(models.Payment.tableId == table_id).all()
        assert len(payments) == 1
        assert payments[0].amount == Decimal("450.00")
        assert payments[0].paymentMethod == "cash"
        assert payments[0].splitMode == "full"
        
        # Scenario B: Test Equal Split
        # Create two active orders for the table (400 + 50 = 450 total)
        order_b1 = models.Order(
            id=f"order-b1-{uuid.uuid4()}",
            venueId=venue_id,
            tableId=table_id,
            status="ready",
            totalAmount=Decimal("400.00"),
            createdAt=datetime.datetime.utcnow()
        )
        order_b2 = models.Order(
            id=f"order-b2-{uuid.uuid4()}",
            venueId=venue_id,
            tableId=table_id,
            status="served",
            totalAmount=Decimal("50.00"),
            createdAt=datetime.datetime.utcnow()
        )
        db.add(order_b1)
        db.add(order_b2)
        db.commit()
        created_order_ids.extend([order_b1.id, order_b2.id])
        
        # Let's split equally by 2: 225.00 cash, 225.00 card
        split_payload = {
            "splitMode": "equal",
            "payments": [
                {"amount": 225.00, "paymentMethod": "cash", "label": "Person 1"},
                {"amount": 225.00, "paymentMethod": "card", "label": "Person 2"}
            ]
        }
        res = client.post(f"/api/admin/tables/{table_id}/split-pay", json=split_payload)
        assert res.status_code == 200, f"Equal split failed: {res.text}"
        
        db.refresh(order_b1)
        db.refresh(order_b2)
        assert order_b1.status == "completed"
        assert order_b1.paymentMethod == "split"
        assert order_b2.status == "completed"
        assert order_b2.paymentMethod == "split"
        
        # We expect 3 payments now (1 from Scenario A + 2 from Scenario B)
        payments = db.query(models.Payment).filter(models.Payment.tableId == table_id).all()
        assert len(payments) == 3
        methods = [p.paymentMethod for p in payments]
        amounts = [float(p.amount) for p in payments]
        assert methods.count("cash") == 2
        assert methods.count("card") == 1
        assert 225.00 in amounts
        
        # Scenario C: Test By Amount Split
        order_c = models.Order(
            id=f"order-c-{uuid.uuid4()}",
            venueId=venue_id,
            tableId=table_id,
            status="served",
            totalAmount=Decimal("450.00"),
            createdAt=datetime.datetime.utcnow()
        )
        db.add(order_c)
        db.commit()
        created_order_ids.append(order_c.id)
        
        # Split by amount: 100₺ cash, 350₺ card
        split_payload = {
            "splitMode": "by_amount",
            "payments": [
                {"amount": 100.00, "paymentMethod": "cash", "label": "Row 1"},
                {"amount": 350.00, "paymentMethod": "card", "label": "Row 2"}
            ]
        }
        res = client.post(f"/api/admin/tables/{table_id}/split-pay", json=split_payload)
        assert res.status_code == 200, f"By-amount split failed: {res.text}"
        
        db.refresh(order_c)
        assert order_c.status == "completed"
        
        # We expect 5 payments now (1 from A + 2 from B + 2 from C)
        payments = db.query(models.Payment).filter(models.Payment.tableId == table_id).all()
        assert len(payments) == 5
        
        # Scenario E: Test By Item Split
        order_e = models.Order(
            id=f"order-e-{uuid.uuid4()}",
            venueId=venue_id,
            tableId=table_id,
            status="served",
            totalAmount=Decimal("450.00"),
            createdAt=datetime.datetime.utcnow()
        )
        db.add(order_e)
        db.flush()
        
        item_ref1 = models.OrderItem(
            id=f"order-item-1-{uuid.uuid4()}",
            orderId=order_e.id,
            menuItemId=item1.id,
            quantity=1,
            price=Decimal("400.00")
        )
        item_ref2 = models.OrderItem(
            id=f"order-item-2-{uuid.uuid4()}",
            orderId=order_e.id,
            menuItemId=item2.id,
            quantity=1,
            price=Decimal("50.00")
        )
        db.add(item_ref1)
        db.add(item_ref2)
        db.commit()
        created_order_ids.append(order_e.id)
        
        # Split by item: Ali pays for Kebab (400 cash), Veli pays for Ayran (50 card)
        split_payload = {
            "splitMode": "by_item",
            "payments": [
                {"amount": 400.00, "paymentMethod": "cash", "label": "Ali", "orderItemIds": [item_ref1.id]},
                {"amount": 50.00, "paymentMethod": "card", "label": "Veli", "orderItemIds": [item_ref2.id]}
            ]
        }
        res = client.post(f"/api/admin/tables/{table_id}/split-pay", json=split_payload)
        assert res.status_code == 200, f"By-item split failed: {res.text}"
        
        db.refresh(order_e)
        assert order_e.status == "completed"
        
        # We expect 7 payments now (1 from A + 2 from B + 2 from C + 2 from E)
        payments = db.query(models.Payment).filter(models.Payment.tableId == table_id).all()
        assert len(payments) == 7
        
        # Scenario D: Test Cashier Summary daily aggregation
        summary_res = client.get(f"/api/admin/cashier/summary?venueId={venue_id}")
        assert summary_res.status_code == 200
        summary = summary_res.json()
        
        # Total revenue should be 450 (A) + 450 (B) + 450 (C) + 450 (E) = 1800
        assert float(summary["totalRevenue"]) == 1800.00
        assert summary["orderCount"] == 5
        # We expect cashRevenue: 450 (A) + 225 (B) + 100 (C) + 400 (E) = 1175
        # We expect cardRevenue: 0 (A) + 225 (B) + 350 (C) + 50 (E) = 625
        assert float(summary["cashRevenue"]) == 1175.00
        assert float(summary["cardRevenue"]) == 625.00
        assert float(summary["splitRevenue"]) == 1350.00
        assert summary["splitOrderCount"] == 4
        print(f"Summary data: {summary}")
        
    finally:
        # Cleanup
        db.query(models.Payment).filter(models.Payment.venueId == venue_id).delete()
        for oid in created_order_ids:
            db.query(models.OrderItem).filter(models.OrderItem.orderId == oid).delete()
            db.query(models.Order).filter(models.Order.id == oid).delete()
        db.query(models.MenuItem).filter(models.MenuItem.categoryId == cat_id).delete()
        db.query(models.Category).filter(models.Category.id == cat_id).delete()
        db.query(models.Table).filter(models.Table.id == table_id).delete()
        db.query(models.Venue).filter(models.Venue.id == venue_id).delete()
        db.query(models.Organization).filter(models.Organization.id == org_id).delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    print("Running split payment test...")
    test_split_payment()
    print("All split payment tests passed successfully!")
