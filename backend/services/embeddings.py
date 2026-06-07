import os
import httpx
import hashlib
import random
from typing import List

def get_mock_embedding(text: str) -> List[float]:
    """
    Generate a deterministic mock embedding of size 768 by seeding random
    with the hash of the text. Normalizes the vector to unit length.
    """
    hasher = hashlib.sha256(text.encode("utf-8"))
    seed_int = int(hasher.hexdigest(), 16) % (2**32)
    
    rng = random.Random(seed_int)
    vec = [rng.uniform(-1.0, 1.0) for _ in range(768)]
    
    # Normalize to unit length
    magnitude = sum(x*x for x in vec) ** 0.5
    if magnitude > 0:
        vec = [x / magnitude for x in vec]
    return vec

async def get_embedding(text: str) -> List[float]:
    """
    Generate a 768-dimension embedding vector for a given text using
    Google's Gemini text-embedding-004 model. Falls back to deterministic mock.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Avoid spamming stdout, but notify on first load if running locally
        return get_mock_embedding(text)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    payload = {
        "model": "models/text-embedding-004",
        "content": {
            "parts": [
                {"text": text}
            ]
        }
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                return data["embedding"]["values"]
            else:
                print(f"[Embeddings] Error: API returned status {response.status_code}. Response: {response.text}")
    except Exception as e:
        print(f"[Embeddings] Exception calling Gemini embeddings API: {e}")

    # Fallback if call failed
    return get_mock_embedding(text)

def get_embedding_sync(text: str) -> List[float]:
    """
    Generate a 768-dimension embedding vector for a given text using
    Google's Gemini text-embedding-004 model. Synchronous version.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return get_mock_embedding(text)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    payload = {
        "model": "models/text-embedding-004",
        "content": {
            "parts": [
                {"text": text}
            ]
        }
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                return data["embedding"]["values"]
            else:
                print(f"[Embeddings] Error: API returned status {response.status_code}. Response: {response.text}")
    except Exception as e:
        print(f"[Embeddings] Exception calling Gemini embeddings API: {e}")

    return get_mock_embedding(text)
