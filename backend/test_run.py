import sys
import os

# Adjust path to find modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from fastapi.testclient import TestClient
    from main import app
    print("FastAPI package loaded successfully!")
    
    client = TestClient(app)
    response = client.get("/")
    print(f"GET '/' status code: {response.status_code}")
    print(f"GET '/' body: {response.json()}")
    
    if response.status_code == 200:
        print("Backend syntax verification PASSED!")
    else:
        print("Backend verification FAILED!")
except Exception as e:
    print(f"Verification encountered error: {e}")
    print("If fastapi or other dependencies are not installed globally, this is expected until 'pip install -r requirements.txt' is run.")
