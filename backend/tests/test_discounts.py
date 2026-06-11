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

def test_discounts_and_loyalty():
    db = SessionLocal()
    client = TestClient(main.app)

    # 1. Setup test organization, venue, table, category, and menu items
    org_id = f"test-disc-org-{uuid.uuid4()}"
    venue_id = f"test-disc-venue-{uuid.uuid4()}"
    table_id = f"test-disc-table-{uuid.uuid4()}"
    cat_id = f"test-disc-cat-{uuid.uuid4()}"

    org = models.Organization(id=org_id, name="Discount Org")
    db.add(org)

    venue = models.Venue(
        id=venue_id,
        name="Discount Venue",
        organizationId=org_id,
        currency="TRY",
        defaultLocale="tr",
        supportedLocales=["tr", "en"]
    )
    db.add(venue)
    db.flush()

    table = models.Table(
        id=table_id,
        name="Discount Table",
        qrToken=f"disctoken-{uuid.uuid4().hex[:6]}",
        venueId=venue_id
    )
    db.add(table)

    cat = models.Category(
        id=cat_id,
        nameTr="Yemekler",
        nameEn="Foods",
        venueId=venue_id
    )
    db.add(cat)
    db.flush()

    item1 = models.MenuItem(
        id=f"test-disc-item-1-{uuid.uuid4().hex[:6]}",
        nameTr="Kuru Fasulye",
        nameEn="Beans",
        price=Decimal("150.00"),
        categoryId=cat_id,
        isAvailable=True,
        showOnMenu=True,
        allergens=[]
    )
    db.add(item1)
    db.commit()

    created_order_ids = []
    created_coupon_ids = []
    created_loyalty_ids = []

    try:
        # 2. Test Coupon CRUD API
        coupon_payload = {
            "code": "PROMO15",
            "type": "PERCENTAGE",
            "value": 15.0,
            "minSubtotal": 100.0,
            "maxDiscountAmount": 50.0,
            "isActive": True,
            "venueId": venue_id
        }
        res = client.post(f"/api/admin/venues/{venue_id}/coupons", json=coupon_payload)
        assert res.status_code == 201
        coupon_data = res.json()
        assert coupon_data["code"] == "PROMO15"
        created_coupon_ids.append(coupon_data["id"])

        # 3. Create active table order (150.00 TL subtotal)
        order = models.Order(
            id=f"order-disc-{uuid.uuid4()}",
            venueId=venue_id,
            tableId=table_id,
            status="served",
            totalAmount=Decimal("150.00"),
            createdAt=datetime.datetime.utcnow()
        )
        db.add(order)
        db.commit()
        created_order_ids.append(order.id)

        # 4. Validate Coupon
        val_res = client.post(
            f"/api/admin/tables/{table_id}/validate-discount",
            json={"couponCode": "PROMO15"}
        )
        assert val_res.status_code == 200
        val_data = val_res.json()
        # 150 * 0.15 = 22.50 discount
        assert float(val_data["discountAmount"]) == 22.50
        assert float(val_data["netAmount"]) == 127.50
        assert val_data["discountType"] == "COUPON"
        assert val_data["discountRef"] == "PROMO15"

        # 5. Apply Coupon to Orders
        apply_res = client.post(
            f"/api/admin/tables/{table_id}/apply-discount",
            json={"couponCode": "PROMO15"}
        )
        assert apply_res.status_code == 200
        db.refresh(order)
        assert float(order.discountAmount) == 22.50
        assert float(order.netAmount) == 127.50
        assert order.discountType == "COUPON"
        assert order.discountRef == "PROMO15"

        # 6. Pay table and verify coupon usage count
        pay_res = client.post(
            f"/api/admin/tables/{table_id}/pay",
            json={"paymentMethod": "card"}
        )
        assert pay_res.status_code == 200
        db.refresh(order)
        assert order.status == "completed"
        
        # Coupon usage count check
        coupon_db = db.query(models.Coupon).filter(models.Coupon.id == coupon_data["id"]).first()
        assert coupon_db.usageCount == 1

        # 7. Test Loyalty Points Earning & Redemption
        # Create loyalty account
        loy_payload = {
            "phone": "05559998877",
            "name": "Efe",
            "externalUserId": "tripzy-user-777",
            "venueId": venue_id
        }
        loy_res = client.post(f"/api/admin/venues/{venue_id}/loyalty", json=loy_payload)
        assert loy_res.status_code == 201
        loy_data = loy_res.json()
        assert loy_data["phone"] == "05559998877"
        created_loyalty_ids.append(loy_data["id"])

        # Create new active order (total: 300 ₺)
        order_l = models.Order(
            id=f"order-loy-{uuid.uuid4()}",
            venueId=venue_id,
            tableId=table_id,
            status="served",
            totalAmount=Decimal("300.00"),
            createdAt=datetime.datetime.utcnow()
        )
        db.add(order_l)
        db.commit()
        created_order_ids.append(order_l.id)

        # Pay order with loyalty account linked (No points redeemed yet, should earn 30 points)
        pay_loy_res = client.post(
            f"/api/admin/tables/{table_id}/pay",
            json={"paymentMethod": "cash", "loyaltyPhone": "05559998877"}
        )
        assert pay_loy_res.status_code == 200
        
        # Check points balance (300 netAmount -> 30 points)
        loyalty_db = db.query(models.LoyaltyAccount).filter(models.LoyaltyAccount.phone == "05559998877").first()
        assert loyalty_db.points == 30
        
        # Verify history log
        history = db.query(models.LoyaltyHistory).filter(models.LoyaltyHistory.loyaltyAccountId == loyalty_db.id).all()
        assert len(history) == 1
        assert history[0].points == 30

        # Create another active order (total: 100 ₺)
        order_red = models.Order(
            id=f"order-red-{uuid.uuid4()}",
            venueId=venue_id,
            tableId=table_id,
            status="served",
            totalAmount=Decimal("100.00"),
            createdAt=datetime.datetime.utcnow()
        )
        db.add(order_red)
        db.commit()
        created_order_ids.append(order_red.id)

        # Validate Loyalty points discount: Efe has 30 points -> 3.00 ₺ discount
        val_red_res = client.post(
            f"/api/admin/tables/{table_id}/validate-discount",
            json={"loyaltyPhone": "05559998877"}
        )
        assert val_red_res.status_code == 200
        val_red_data = val_red_res.json()
        assert float(val_red_data["discountAmount"]) == 3.00
        assert float(val_red_data["netAmount"]) == 97.00

        # Apply loyalty points discount
        apply_red_res = client.post(
            f"/api/admin/tables/{table_id}/apply-discount",
            json={"loyaltyPhone": "05559998877"}
        )
        assert apply_red_res.status_code == 200

        # Pay order (Redeem 30 points + Earn 9 points from 97 ₺ net total -> final points: 0 - 30 + 30 + 9 = 9)
        pay_red_res = client.post(
            f"/api/admin/tables/{table_id}/pay",
            json={"paymentMethod": "cash"}
        )
        assert pay_red_res.status_code == 200

        db.refresh(loyalty_db)
        # Verify points math: started at 30, redeemed 30 (drops to 0), earned 9 from 97 ₺ net total -> 9 points
        assert loyalty_db.points == 9

        # Check history logs (1 earn, 1 redeem, 1 earn)
        histories = db.query(models.LoyaltyHistory).filter(models.LoyaltyHistory.loyaltyAccountId == loyalty_db.id).all()
        assert len(histories) == 3
        points_list = [h.points for h in histories]
        assert -30 in points_list
        assert 9 in points_list

    finally:
        # Cleanup
        db.query(models.Payment).filter(models.Payment.venueId == venue_id).delete()
        for oid in created_order_ids:
            db.query(models.OrderItem).filter(models.OrderItem.orderId == oid).delete()
            db.query(models.Order).filter(models.Order.id == oid).delete()
        db.query(models.Coupon).filter(models.Coupon.id.in_(created_coupon_ids)).delete()
        db.query(models.LoyaltyHistory).filter(models.LoyaltyHistory.loyaltyAccountId.in_(created_loyalty_ids)).delete()
        db.query(models.LoyaltyAccount).filter(models.LoyaltyAccount.id.in_(created_loyalty_ids)).delete()
        db.query(models.MenuItem).filter(models.MenuItem.categoryId == cat_id).delete()
        db.query(models.Category).filter(models.Category.id == cat_id).delete()
        db.query(models.Table).filter(models.Table.id == table_id).delete()
        db.query(models.Venue).filter(models.Venue.id == venue_id).delete()
        db.query(models.Organization).filter(models.Organization.id == org_id).delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    test_discounts_and_loyalty()
    print("All discount and loyalty tests passed successfully!")
