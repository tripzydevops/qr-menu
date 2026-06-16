import os
import httpx
import json
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import models

async def get_ai_recommendations(
    db: Session,
    venue_id: str,
    preference_profile: Dict[str, float],
    current_item_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Generate personalized recommendations for menu items using Gemini 3.1 Flash-Lite.
    Returns 3 items matching user preference signals with Turkish and English reasoning.
    """
    # 1. Fetch available menu items for the venue
    items = db.query(models.MenuItem).join(models.MenuItem.category).filter(
        models.Category.venueId == venue_id,
        models.MenuItem.isAvailable == True,
        models.MenuItem.isDeleted == False
    ).all()

    if not items:
        return []

    # 2. Format items list for the LLM prompt
    menu_data = []
    current_item_details = None
    for item in items:
        labels = [lbl.key for lbl in item.dietaryLabels]
        item_dict = {
            "id": item.id,
            "nameTr": item.nameTr,
            "nameEn": item.nameEn,
            "descriptionTr": item.descriptionTr or "",
            "descriptionEn": item.descriptionEn or "",
            "price": float(item.price),
            "allergens": item.allergens or [],
            "dietaryLabels": labels,
            "categoryTr": item.category.nameTr,
            "categoryEn": item.category.nameEn
        }
        menu_data.append(item_dict)
        if current_item_id and item.id == current_item_id:
            current_item_details = item_dict

    # 3. Construct prompt
    prompt = (
        "You are a premium virtual waiter and sommelier agent for Tripzy.travel. "
        "Your goal is to suggest the top 3 menu items that best match the customer's profile and current context. "
        "Return a JSON list containing exactly 3 items, each structured as follows:\n"
        "{\n"
        "  \"id\": \"string matching the item id exactly\",\n"
        "  \"reasonTr\": \"personalized explanation in Turkish (e.g. 'Glutensiz beslenmenizi desteklemek için harika bir seçenek...')\",\n"
        "  \"reasonEn\": \"personalized explanation in English (e.g. 'A great option to support your gluten-free preference...')\"\n"
        "}\n\n"
        "Rules:\n"
        "1. You MUST select from the provided menu items list.\n"
        f"2. Customer preferences profile: {json.dumps(preference_profile)}\n"
        "Preference profile score levels range from 0 to 50+. Focus on the highest scores (e.g. vegan, vegetarian, glutenFree, dairyFree, seafoodPreference, sweetTooth).\n"
    )

    if current_item_details:
        prompt += (
            f"3. Context: The guest is currently looking at: {json.dumps(current_item_details)}.\n"
            "Suggest complementary items (e.g., if looking at a main dish, suggest a suitable appetizer, drink, or dessert; if looking at a dessert, suggest a coffee/tea).\n"
        )
    else:
        prompt += "3. Context: General menu browsing.\n"

    prompt += f"\nHere is the available menu: {json.dumps(menu_data, ensure_ascii=False)}"

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[AI Recommendation] GEMINI_API_KEY not found. Falling back to local scoring.")
        return get_local_fallback_recommendations(items, preference_profile, current_item_id)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                text_response = data["candidates"][0]["content"]["parts"][0]["text"]
                recommendations = json.loads(text_response.strip())
                if isinstance(recommendations, list):
                    return recommendations
                if isinstance(recommendations, dict):
                    for val in recommendations.values():
                        if isinstance(val, list):
                            return val
                return recommendations
            else:
                print(f"[AI Recommendation] Gemini returned status {response.status_code}. Falling back.")
                return get_local_fallback_recommendations(items, preference_profile, current_item_id)
    except Exception as e:
        print(f"[AI Recommendation] Exception calling Gemini: {e}. Falling back.")
        return get_local_fallback_recommendations(items, preference_profile, current_item_id)

def get_local_fallback_recommendations(
    items: List[models.MenuItem],
    profile: Dict[str, float],
    current_item_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    scored_items = []
    for item in items:
        if current_item_id and item.id == current_item_id:
            continue
            
        score = 0.0
        labels = [lbl.key.lower() for lbl in item.dietaryLabels]
        
        if "vegan" in labels:
            score += profile.get("vegan", 0) * 1.5 + profile.get("vegetarian", 0)
        elif "vegetarian" in labels:
            score += profile.get("vegetarian", 0) * 1.5
            
        if "gluten-free" in labels or "glutensiz" in (item.nameTr or "").lower():
            score += profile.get("glutenFree", 0) * 1.5
            
        if "dairy-free" in labels:
            score += profile.get("dairyFree", 0) * 1.5
            
        full_text = ((item.nameTr or "") + " " + (item.nameEn or "") + " " + (item.descriptionTr or "")).lower()
        if "tatlı" in full_text or "dessert" in full_text or "chocolate" in full_text or "çikolata" in full_text:
            score += profile.get("sweetTooth", 0) * 1.5
            
        if "balık" in full_text or "fish" in full_text or "sea bass" in full_text:
            score += profile.get("seafoodPreference", 0) * 1.5

        scored_items.append((score, item))

    scored_items.sort(key=lambda x: x[0], reverse=True)
    top_3 = scored_items[:3]
    
    results = []
    for _, item in top_3:
        results.append({
            "id": item.id,
            "reasonTr": "Tercihlerinize uyan ve keyifle deneyebileceğiniz özel lezzetlerimizden biri.",
            "reasonEn": "One of our special dishes matching your dietary profile and tastes."
        })
    return results
