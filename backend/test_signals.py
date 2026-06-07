import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models

def test_user_signals():
    client = TestClient(app)
    
    # We will POST a batch of signals
    payload = {
        "venueId": "venue-karakoy-main",
        "tableId": "table-1",
        "signals": [
            {
                "sessionId": "sess-test-123",
                "eventType": "filter_dietary",
                "eventData": {"filterKey": "vegan"},
                "createdAt": "2026-06-07T15:00:00Z"
            },
            {
                "sessionId": "sess-test-123",
                "eventType": "view_item",
                "eventData": {"itemId": "item-hummus", "durationMs": 4000},
                "createdAt": "2026-06-07T15:00:05Z"
            }
        ]
    }
    
    response = client.post("/api/analytics/signals", json=payload)
    print(f"POST '/api/analytics/signals' status: {response.status_code}")
    assert response.status_code == 204
    
    # Verify in DB
    db = SessionLocal()
    try:
        signals = db.query(models.UserSignal).filter(models.UserSignal.sessionId == "sess-test-123").all()
        print(f"Found {len(signals)} signals in database.")
        assert len(signals) == 2
        assert signals[0].eventType == "filter_dietary"
        assert signals[0].eventData == {"filterKey": "vegan"}
        assert signals[1].eventType == "view_item"
        assert signals[1].eventData == {"itemId": "item-hummus", "durationMs": 4000}
        
        # Cleanup
        for sig in signals:
            db.delete(sig)
        db.commit()
        print("Test passed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    test_user_signals()
