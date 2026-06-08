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
) -> List[Dict[str, Any]]:
    """
    Parses a recipe from text or file bytes using Gemini 3.5 Flash.
    Returns a list of dicts with:
    - ingredientId: str
    - amountUsed: float
    """
    if not existing_ingredients:
        existing_ingredients = []

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[Recipe OCR] GEMINI_API_KEY not found. Returning mock/fallback results.")
        return fallback_parse_recipe(text_content, existing_ingredients)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"

    # Build prompt context with existing ingredients
    prompt_context = "Available ingredients in database:\n"
    for ing in existing_ingredients:
        density_val = ing.get("density")
        if density_val is None:
            density_val = 1.0
        prompt_context += f'- ID: "{ing.get("id")}", Name: "{ing.get("name")}", Unit: "{ing.get("unit")}", Density: "{density_val} g/mL"\n'

    prompt = (
        "Analyze the recipe content (text or image) and extract the structured list of ingredients.\n"
        f"{prompt_context}\n"
        "Match each ingredient in the recipe to the closest database ingredient name.\n"
        "For each matched ingredient, return a JSON array containing objects with this exact structure:\n"
        "[\n"
        "  {\n"
        "    \"ingredientId\": \"string\",\n"
        "    \"amountUsed\": number\n"
        "  }\n"
        "]\n"
        "Only return matches that correspond to the available ingredients listed. If a recipe ingredient doesn't match any listed database ingredient, omit it.\n"
        "The \"amountUsed\" must be a positive number in the unit specified for that ingredient in the database list.\n"
        "IMPORTANT CONVERSION RULE:\n"
        "If the recipe specifies a volume-based quantity (e.g., cup, tablespoon, teaspoon, ml, liter) but the database ingredient's unit is weight-based (e.g., g, kg), you MUST convert the volume to weight using the provided Density (in g/mL) for that ingredient.\n"
        "Standard conversions to use:\n"
        "- 1 cup (Su bardağı) = 240 mL\n"
        "- 1 tablespoon (Yemek kaşığı / tbsp) = 15 mL\n"
        "- 1 teaspoon (Tatlı kaşığı / tsp) = 5 mL\n"
        "For example:\n"
        "- If the recipe specifies \"2 cups of Yogurt\" and Yogurt has \"Density: 1.08 g/mL\", convert 2 cups to mL (2 * 240 = 480 mL), then to grams using density (480 * 1.08 = 518.4 g). If Yogurt's database unit is \"g\", return 518.4.\n"
        "- If the recipe specifies \"3 tablespoons of Flour\" and Flour has \"Density: 0.52 g/mL\", convert 3 tbsp to mL (3 * 15 = 45 mL), then to grams (45 * 0.52 = 23.4 g). If Flour's database unit is \"g\", return 23.4.\n"
        "Perform all conversions carefully before outputting the final \"amountUsed\" in the database ingredient's unit!"
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
        # Nothing provided, return empty list
        return []

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

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                text_response = data["candidates"][0]["content"]["parts"][0]["text"]
                try:
                    return json.loads(text_response.strip())
                except Exception as json_err:
                    print(f"[Recipe OCR] Failed to parse JSON response: {json_err}. Raw text: {text_response}")
                    return fallback_parse_recipe(text_content, existing_ingredients)
            else:
                print(f"[Recipe OCR] Gemini API error {response.status_code}: {response.text}")
                return fallback_parse_recipe(text_content, existing_ingredients)
    except Exception as e:
        print(f"[Recipe OCR] Exception calling Gemini API: {e}")
        return fallback_parse_recipe(text_content, existing_ingredients)

def fallback_parse_recipe(text_content: Optional[str], existing_ingredients: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Fallback mock matcher for offline/testing development.
    """
    if not existing_ingredients:
        return []

    if not text_content:
        # If no text is provided (e.g. image scanned in fallback mode),
        # return the first 2 ingredients if they exist as mock items.
        results = []
        for ing in existing_ingredients[:2]:
            unit = ing.get("unit", "g")
            amount = 150.0 if unit in ["g", "ml"] else 2.0
            results.append({
                "ingredientId": ing.get("id"),
                "amountUsed": amount
            })
        return results

    results = []
    text = text_content.lower()

    for ing in existing_ingredients:
        ing_id = ing.get("id")
        name = ing.get("name", "").lower()
        unit = ing.get("unit", "g")
        
        # Safe float conversion for density
        try:
            density = float(ing.get("density") if ing.get("density") is not None else 1.0)
        except (ValueError, TypeError):
            density = 1.0

        if name in text:
            # Default amount
            amount = 100.0 if unit in ["g", "ml"] else 1.0
            
            # Find index of ingredient name
            idx = text.find(name)
            # Context around the ingredient name
            context_start = max(0, idx - 20)
            context_end = min(len(text), idx + len(name) + 20)
            surrounding_text = text[context_start:context_end]
            
            # Search for numbers in context
            numbers = re.findall(r'\d+(?:\.\d+)?', surrounding_text)
            if numbers:
                # Take the first number in the surrounding context as a guess
                try:
                    amount = float(numbers[0])
                except ValueError:
                    pass

            # Handle volume conversions in fallback
            if unit == "g":
                if any(x in surrounding_text for x in ["cup", "bardak"]):
                    amount = amount * 240.0 * density
                elif any(x in surrounding_text for x in ["tbsp", "yemek kaşığı", "kaşık"]):
                    amount = amount * 15.0 * density
                elif any(x in surrounding_text for x in ["tsp", "tatlı kaşığı"]):
                    amount = amount * 5.0 * density

            results.append({
                "ingredientId": ing_id,
                "amountUsed": round(amount, 2)
            })

    return results
