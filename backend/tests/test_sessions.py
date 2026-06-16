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

def test_register_sessions_lifecycle():
    db = SessionLocal()
    client = TestClient(main.app)

    # 1. Setup test data
    org_id = f"test-sess-org-{uuid.uuid4()}"
    venue_id = f"test-sess-venue-{uuid.uuid4()}"
    table_id = f"test-sess-table-{uuid.uuid4()}"
    cat_id = f"test-sess-cat-{uuid.uuid4()}"

    org = models.Organization(id=org_id, name="Session Org")
    db.add(org)

    venue = models.Venue(
        id=venue_id,
        name="Session Venue",
        organizationId=org_id,
        currency="TRY",
        defaultLocale="tr",
        supportedLocales=["tr", "en"]
    )
    db.add(venue)
    db.flush()

    table = models.Table(
        id=table_id,
        name="Session Table",
        qrToken=f"sesstoken-{uuid.uuid4().hex[:6]}",
        venueId=venue_id
    )
    db.add(table)

    cat = models.Category(
        id=cat_id,
        nameTr="Mezeler",
        nameEn="Mezes",
        venueId=venue_id
    )
    db.add(cat)
    db.flush()

    item = models.MenuItem(
        id=f"test-sess-item-{uuid.uuid4().hex[:6]}",
        nameTr="Humus",
        nameEn="Hummus",
        price=Decimal("150.00"),
        categoryId=cat_id,
        isAvailable=True
    )
    db.add(item)
    db.commit()

    try:
        # 2. Check no active session
        response = client.get(f"/api/admin/cashier/session/active?venueId={venue_id}")
        assert response.status_code == 200
        assert response.json() is None

        # 3. Open session
        open_payload = {
            "venueId": venue_id,
            "openingCash": 500.00,
            "openedById": None
        }
        response = client.post("/api/admin/cashier/session/open", json=open_payload)
        assert response.status_code == 200
        session_data = response.json()
        assert session_data["status"] == "open"
        assert float(session_data["openingCash"]) == 500.00
        session_id = session_data["id"]

        # 4. Attempt to open duplicate session
        response = client.post("/api/admin/cashier/session/open", json=open_payload)
        assert response.status_code == 400

        # 5. Place order & pay cash to test auto-linking
        # Create order first via Guest token
        order_payload = {
            "items": [
                {
                    "menuItemId": item.id,
                    "quantity": 2,
                    "notes": "Ekstra zeytinyağı"
                }
            ]
        }
        response = client.post(f"/api/menu/{table.qrToken}/order", json=order_payload)
        assert response.status_code == 201
        order_data = response.json()
        order_id = order_data["id"]

        # Complete payment
        payment_payload = {"paymentMethod": "cash"}
        response = client.post(f"/api/admin/orders/{order_id}/payment", json=payment_payload)
        assert response.status_code == 200
        
        # Verify the created Payment has the registerSessionId linked
        # We query table payments
        response = client.get(f"/api/admin/tables/{table_id}/payments")
        assert response.status_code == 200
        payments = response.json()
        assert len(payments) == 1
        assert payments[0]["registerSessionId"] == session_id
        assert float(payments[0]["amount"]) == 300.00

        # 6. Check cashier summary filters by session
        response = client.get(f"/api/admin/cashier/summary?venueId={venue_id}&sessionId={session_id}")
        assert response.status_code == 200
        summary = response.json()
        assert summary["totalRevenue"] == 300.00
        assert summary["cashRevenue"] == 300.00
        assert summary["timeframe"]["sessionId"] == session_id

        # 7. Close session
        close_payload = {
            "closingCash": 800.00,
            "closedById": None
        }
        response = client.post(f"/api/admin/cashier/session/close?venueId={venue_id}", json=close_payload)
        assert response.status_code == 200
        closed_session = response.json()
        assert closed_session["status"] == "closed"
        assert float(closed_session["closingCash"]) == 800.00
        assert float(closed_session["expectedRevenue"]) == 300.00
        # discrepancy: closing (800) - (opening (500) + cash payments (300)) = 0
        assert float(closed_session["discrepancy"]) == 0.00

        # 8. Check session history
        response = client.get(f"/api/admin/cashier/session/history?venueId={venue_id}")
        assert response.status_code == 200
        history = response.json()
        assert len(history) == 1
        assert history[0]["id"] == session_id

        # 9. Verify order endpoint filtering by session
        response = client.get(f"/api/admin/orders?venueId={venue_id}&sessionId={session_id}")
        assert response.status_code == 200
        orders = response.json()
        assert len(orders) == 1
        assert orders[0]["id"] == order_id

        print("All Cashier Register Session tests passed successfully!")

    finally:
        # Clean up database
        db.query(models.Payment).filter(models.Payment.venueId == venue_id).delete()
        db.query(models.RegisterSession).filter(models.RegisterSession.venueId == venue_id).delete()
        db.query(models.OrderItem).filter(models.OrderItem.menuItemId == item.id).delete()
        db.query(models.Order).filter(models.Order.venueId == venue_id).delete()
        db.query(models.MenuItem).filter(models.MenuItem.categoryId == cat_id).delete()
        db.query(models.Category).filter(models.Category.venueId == venue_id).delete()
        db.query(models.Table).filter(models.Table.venueId == venue_id).delete()
        db.query(models.Venue).filter(models.Venue.id == venue_id).delete()
        db.query(models.Organization).filter(models.Organization.id == org_id).delete()
        db.commit()
        db.close()
