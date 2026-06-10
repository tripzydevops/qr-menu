import sys
import os
from decimal import Decimal

# Adjust path to find modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_order():
    payload = {
        "venueId": "venue-rwalop3e",
        "tableId": "c02fafa6-9920-472c-9084-bd862b0d57a8",
        "items": [
            {
                "menuItemId": "16232fba-1430-430d-868a-a0242d613dee", # Türk Çayı
                "quantity": 2,
                "notes": "Açık olsun"
            }
        ]
    }
    
    response = client.post("/api/admin/orders", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Body: {response.json()}")
    
    assert response.status_code == 201
    data = response.json()
    assert data["venueId"] == "venue-rwalop3e"
    assert data["tableId"] == "c02fafa6-9920-472c-9084-bd862b0d57a8"
    assert float(data["totalAmount"]) == 70.0 # 35 * 2
    assert len(data["items"]) == 1
    assert data["items"][0]["notes"] == "Açık olsun"
    print("Integration test PASSED!")

if __name__ == "__main__":
    try:
        test_create_order()
    except Exception as e:
        print(f"Integration test FAILED: {e}")
        sys.exit(1)
