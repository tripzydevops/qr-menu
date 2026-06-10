import os
import base64
import httpx
import json
import re
from typing import List, Dict, Any, Optional

def parse_recipe(
    file_bytes: Optional[bytes] = None,
    mime_type: Optional[str] = None,
    text_content: Optional[str] = None,
    existing_ingredients: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Parses a recipe from text or file bytes using Gemini 3.5 Flash.
    Returns a dictionary with:
    {
      "items": [
        {
          "ingredientId": "string or null",
          "name": "string",
          "amountUsed": number,
          "unit": "string",
          "originalText": "string",
          "confidence": number
        }
      ],
      "suggestedYieldQuantity": number or null,
      "suggestedYieldUnit": "string or null"
    }
    """
    if not existing_ingredients:
        existing_ingredients = []

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY not found in environment variables.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={api_key}"

    # Build prompt context with existing ingredients
    prompt_context = "Available ingredients in database:\n"
    for ing in existing_ingredients:
        density_val = ing.get("density")
        if density_val is None:
            density_val = 1.0
        prompt_context += f'- ID: "{ing.get("id")}", Name: "{ing.get("name")}", Unit: "{ing.get("unit")}", Density: "{density_val} g/mL"\n'

    prompt = (
        "Analyze the recipe content (text or image) and extract: \n"
        "1. The list of ingredients.\n"
        "2. The suggested yield quantity and yield unit (e.g. if the recipe text indicates 'Serves 4', 'Makes 12 portions', 'Yield: 1.5 kg', or 'Makes 2 liters').\n\n"
        "Return a JSON object with this exact structure:\n"
        "{\n"
        "  \"items\": [\n"
        "    {\n"
        "      \"ingredientId\": \"string or null\",\n"
        "      \"name\": \"string\",\n"
        "      \"amountUsed\": number,\n"
        "      \"unit\": \"string\",\n"
        "      \"originalText\": \"string\",\n"
        "      \"confidence\": number\n"
        "    }\n"
        "  ],\n"
        "  \"suggestedYieldQuantity\": number or null,\n"
        "  \"suggestedYieldUnit\": \"string or null\"\n"
        "}\n\n"
        "RULES FOR INGREDIENTS:\n"
        f"{prompt_context}\n"
        "- Match each recipe ingredient to the closest database ingredient name using semantic similarity. "
        "The recipe might be in English or Turkish; translate English terms to match Turkish ingredients where appropriate (e.g., 'olive oil' matches 'Zeytinyağı', 'cheese' matches 'Beyaz Peynir' or 'Kaşar Peyniri').\n"
        "- If matched to a database ingredient, set 'ingredientId' to its ID, 'name' to the database ingredient's name, 'unit' to the database unit, 'confidence' to a float between 0.0 and 1.0, and 'originalText' to the raw text line from the recipe.\n"
        "- If an ingredient cannot be matched to any database ingredient, set 'ingredientId' to null, 'confidence' to 0.0, 'originalText' to the raw text line, 'name' to the translated Turkish name of the ingredient (or raw name if unable to translate), and 'unit' to a standard unit (e.g., 'g', 'ml', 'unit').\n"
        "- The 'amountUsed' must be a positive number in the unit specified for that ingredient in the database list.\n"
        "- IMPORTANT CONVERSION RULE:\n"
        "  If the recipe specifies a volume-based quantity (e.g., cup, tablespoon, teaspoon, ml, liter) but the database ingredient's unit is weight-based (e.g., g, kg), you MUST convert the volume to weight using the provided Density (in g/mL) for that ingredient.\n"
        "  Standard conversions:\n"
        "  - 1 cup (Su bardağı) = 240 mL\n"
        "  - 1 tablespoon (Yemek kaşığı / tbsp) = 15 mL\n"
        "  - 1 teaspoon (Tatlı kaşığı / tsp) = 5 mL\n\n"
        "RULES FOR YIELD:\n"
        "- Look for yield information (e.g., 'Makes 1.5 kg', 'Makes 8 servings', 'Serves 4', 'Yields 2 Liters').\n"
        "- If in portions/servings, set 'suggestedYieldQuantity' to the number (e.g. 8) and 'suggestedYieldUnit' to 'porsiyon'.\n"
        "- If in weight or volume, set 'suggestedYieldQuantity' to the number (e.g. 1.5) and 'suggestedYieldUnit' to the unit (e.g., 'kg', 'g', 'ml', 'L').\n"
        "- If no yield info is found, set both to null."
    )

    parts = [{"text": prompt}]

    if file_bytes and mime_type:
        base64_data = base64.b64encode(file_bytes).decode("utf-8")
        parts.append({
            "inlineData": {
                "mimeType": mime_type,
                "data": base64_data
            }
        })
    elif text_content:
        parts.append({"text": f"Recipe text to parse:\n{text_content}"})
    else:
        return {"items": [], "suggestedYieldQuantity": None, "suggestedYieldUnit": None}

    payload = {
        "contents": [
            {
                "parts": parts
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    max_retries = 4
    retry_delay = 4.0

    for attempt in range(max_retries):
        try:
            with httpx.Client(timeout=90.0) as client:
                response = client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    text_response = data["candidates"][0]["content"]["parts"][0]["text"]
                    try:
                        return json.loads(text_response.strip())
                    except Exception as json_err:
                        raise Exception(f"Failed to parse JSON response: {json_err}. Raw text: {text_response}")
                elif response.status_code in [429, 503]:
                    if attempt < max_retries - 1:
                        print(f"[Recipe OCR] Gemini API busy ({response.status_code}). Retrying in {retry_delay}s... (Attempt {attempt+1}/{max_retries})")
                        import time
                        time.sleep(retry_delay)
                        retry_delay *= 2
                        continue
                    else:
                        raise Exception(f"Gemini API error status {response.status_code}: {response.text}")
                else:
                    raise Exception(f"Gemini API error status {response.status_code}: {response.text}")
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"[Recipe OCR] Connection/timeout exception: {e}. Retrying in {retry_delay}s... (Attempt {attempt+1}/{max_retries})")
                import time
                time.sleep(retry_delay)
                retry_delay *= 2
                continue
            else:
                raise Exception(f"Exception calling Gemini API: {e}")

def fallback_parse_recipe(text_content: Optional[str], existing_ingredients: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Fallback mock matcher for offline/testing development.
    """
    if not existing_ingredients:
        return {"items": [], "suggestedYieldQuantity": 1.0, "suggestedYieldUnit": "porsiyon"}

    # Extract yield from text
    suggested_qty = 1.0
    suggested_unit = "porsiyon"
    if text_content:
        text_lower = text_content.lower()
        # Look for serving counts
        serv_match = re.search(r'(?:serves|porsiyon|kisilik|kişilik)\s*(\d+(?:\.\d+)?)', text_lower)
        if serv_match:
            try:
                suggested_qty = float(serv_match.group(1))
                suggested_unit = "porsiyon"
            except ValueError:
                pass
        else:
            # Look for weight yields (e.g. 1.5 kg, 500g)
            weight_match = re.search(r'(?:makes|elde edilen|verim)\s*(\d+(?:\.\d+)?)\s*(kg|g|l|ml)', text_lower)
            if weight_match:
                try:
                    suggested_qty = float(weight_match.group(1))
                    suggested_unit = weight_match.group(2)
                except ValueError:
                    pass

    # If no text content is provided (e.g. mock file upload), return first 2 ingredients as mock matches
    if not text_content:
        items = []
        for ing in existing_ingredients[:2]:
            unit = ing.get("unit", "g")
            amount = 150.0 if unit in ["g", "ml"] else 2.0
            items.append({
                "ingredientId": ing.get("id"),
                "name": ing.get("name"),
                "amountUsed": amount,
                "unit": unit,
                "originalText": f"Mock parsed {ing.get('name')}",
                "confidence": 0.9
            })
        return {
            "items": items,
            "suggestedYieldQuantity": 2.0,
            "suggestedYieldUnit": "porsiyon"
        }

    items = []
    text = text_content.lower()

    # Match existing ingredients
    for ing in existing_ingredients:
        ing_id = ing.get("id")
        name = ing.get("name", "").lower()
        unit = ing.get("unit", "g")
        
        try:
            density = float(ing.get("density") if ing.get("density") is not None else 1.0)
        except (ValueError, TypeError):
            density = 1.0

        if name in text:
            amount = 100.0 if unit in ["g", "ml"] else 1.0
            
            idx = text.find(name)
            context_start = max(0, idx - 20)
            context_end = min(len(text), idx + len(name) + 20)
            surrounding_text = text[context_start:context_end]
            
            numbers = re.findall(r'\d+(?:\.\d+)?', surrounding_text)
            if numbers:
                try:
                    amount = float(numbers[0])
                except ValueError:
                    pass

            if unit == "g":
                if any(x in surrounding_text for x in ["cup", "bardak"]):
                    amount = amount * 240.0 * density
                elif any(x in surrounding_text for x in ["tbsp", "yemek kaşığı", "kaşık"]):
                    amount = amount * 15.0 * density
                elif any(x in surrounding_text for x in ["tsp", "tatlı kaşığı"]):
                    amount = amount * 5.0 * density
            elif unit == "ml":
                if any(x in surrounding_text for x in ["cup", "bardak"]):
                    amount = amount * 240.0
                elif any(x in surrounding_text for x in ["tbsp", "yemek kaşığı", "kaşık"]):
                    amount = amount * 15.0
                elif any(x in surrounding_text for x in ["tsp", "tatlı kaşığı"]):
                    amount = amount * 5.0

            items.append({
                "ingredientId": ing_id,
                "name": ing.get("name"),
                "amountUsed": round(amount, 2),
                "unit": unit,
                "originalText": f"Original line for {ing.get('name')}",
                "confidence": 0.85
            })

    # Search for unmatched ingredients in the text
    # e.g., if "feslegen" or "walnut" or "walnuts" is in the text but not in database, we can mock return them as unmatched
    unmatched_candidates = [
        {"name": "Fesleğen", "keywords": ["feslegen", "fesleğen", "basil"]},
        {"name": "Ceviz İçi", "keywords": ["ceviz", "walnut", "walnuts"]},
        {"name": "Sarımsak", "keywords": ["sarimsak", "sarımsak", "garlic"]}
    ]
    
    for candidate in unmatched_candidates:
        # Check if already matched
        already_matched = any(item["name"].lower() == candidate["name"].lower() for item in items)
        db_has_it = any(ing.get("name", "").lower() == candidate["name"].lower() for ing in existing_ingredients)
        
        if not already_matched and not db_has_it:
            # Check if any keyword matches text
            if any(kw in text for kw in candidate["keywords"]):
                items.append({
                    "ingredientId": None,
                    "name": candidate["name"],
                    "amountUsed": 50.0,
                    "unit": "g",
                    "originalText": f"Found unmatched ingredient: {candidate['name']}",
                    "confidence": 0.0
                })

    return {
        "items": items,
        "suggestedYieldQuantity": suggested_qty,
        "suggestedYieldUnit": suggested_unit
    }
