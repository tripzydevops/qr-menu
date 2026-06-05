import sys
import os

# Adjust path to find modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from fastapi.testclient import TestClient
    from main import app
    from database import get_db
    import models

    client = TestClient(app)
    
    # 1. Resolve seed table
    db = next(get_db())
    table = db.query(models.Table).filter(models.Table.qrToken == "k1").first()
    if not table:
        print("Seed table 'k1' not found, skipping deep verification.")
        sys.exit(0)
    
    venue_id = table.venueId
    
    # Resolve a menu item
    menu_item = db.query(models.MenuItem).filter(models.MenuItem.isAvailable == True).first()
    if not menu_item:
        print("No active menu items found, skipping deep verification.")
        sys.exit(0)
        
    print(f"Using Table: {table.name} (token: k1)")
    print(f"Using MenuItem: {menu_item.nameEn} (price: {menu_item.price})")

    # 2. Test Calling Waiter
    print("\n--- Testing Call Waiter ---")
    waiter_payload = {"type": "waiter"}
    res = client.post("/api/menu/k1/call-waiter", json=waiter_payload)
    assert res.status_code == 201, f"Failed calling waiter: {res.text}"
    waiter_req = res.json()
    assert waiter_req["type"] == "waiter"
    assert waiter_req["status"] == "pending"
    print("Call Waiter endpoint PASSED!")
    
    # 3. Test Placing Order
    print("\n--- Testing Place Order ---")
    order_payload = {
        "items": [
            {
                "menuItemId": menu_item.id,
                "quantity": 2,
                "notes": "No spicy"
            }
        ]
    }
    res = client.post("/api/menu/k1/order", json=order_payload)
    assert res.status_code == 201, f"Failed placing order: {res.text}"
    order = res.json()
    assert order["status"] == "pending"
    assert len(order["items"]) == 1
    assert order["items"][0]["notes"] == "No spicy"
    print("Place Order endpoint PASSED!")

    # 4. Test Listing Orders & Requests for Admin
    print("\n--- Testing Admin List Endpoints ---")
    res_orders = client.get(f"/api/admin/orders?venueId={venue_id}")
    assert res_orders.status_code == 200
    assert any(o["id"] == order["id"] for o in res_orders.json())
    
    res_reqs = client.get(f"/api/admin/waiter-requests?venueId={venue_id}&status=pending")
    assert res_reqs.status_code == 200
    assert any(r["id"] == waiter_req["id"] for r in res_reqs.json())
    print("Admin List endpoints PASSED!")

    # 5. Test Updating Order and Request Statuses
    print("\n--- Testing Status Transition Endpoints ---")
    res_upd_order = client.put(f"/api/admin/orders/{order['id']}/status", json={"status": "preparing"})
    assert res_upd_order.status_code == 200
    assert res_upd_order.json()["status"] == "preparing"
    
    res_upd_req = client.put(f"/api/admin/waiter-requests/{waiter_req['id']}/status", json={"status": "completed"})
    assert res_upd_req.status_code == 200
    assert res_upd_req.json()["status"] == "completed"
    print("Admin Action endpoints PASSED!")
    
    print("\nALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!")

except Exception as e:
    print(f"\nVerification encountered error: {e}")
    sys.exit(1)
