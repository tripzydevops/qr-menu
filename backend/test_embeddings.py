import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models

def test_semantic_search():
    client = TestClient(app)
    
    # We will query search for 'lentil'
    # 'k1' table token connects to Karaköy Lokantası (seeded venue)
    print("Testing semantic search for 'lentil'...")
    response = client.get("/api/menu/k1/search?q=lentil")
    print(f"GET '/api/menu/k1/search?q=lentil' status: {response.status_code}")
    assert response.status_code == 200
    
    data = response.json()
    print(f"Returned {len(data)} items.")
    for item in data:
        print(f"- {item['nameEn']}: {item['price']} TRY")
        
    assert len(data) > 0
    # The first item should be Lentil Soup or mezes
    assert any(x['nameEn'] == 'Lentil Soup' for x in data)
    
    # Test semantic match for 'soup' (should retrieve Lentil Soup)
    print("\nTesting semantic search for 'soup'...")
    response_soup = client.get("/api/menu/k1/search?q=soup")
    data_soup = response_soup.json()
    assert response_soup.status_code == 200
    assert any(x['nameEn'] == 'Lentil Soup' for x in data_soup)
    print(f"Successfully retrieved Lentil Soup when searching for 'soup'!")
    
    print("\nTest passed successfully!")

if __name__ == "__main__":
    test_semantic_search()
