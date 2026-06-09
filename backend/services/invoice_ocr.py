import os
import base64
import httpx
import json
from typing import List, Dict, Any, Optional

async def parse_invoice_image(
    file_bytes: bytes, 
    mime_type: str,
    existing_suppliers: Optional[List[Dict[str, Any]]] = None,
    existing_ingredients: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Sends the invoice image/PDF to Gemini 1.5 Flash to extract:
    - supplierName
    - matchedSupplierId
    - invoiceNumber
    - invoiceDate (YYYY-MM-DD)
    - items: list of dicts with:
        - itemName
        - matchedIngredientId
        - quantity
        - unitCost
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[Invoice OCR] GEMINI_API_KEY not found. Returning mock OCR results.")
        return get_mock_ocr_result()

    base64_data = base64.b64encode(file_bytes).decode("utf-8")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    prompt = (
        "Analyze this invoice image/document and extract the structured information. "
        "Return a JSON object with the following structure:\n"
        "{\n"
        "  \"supplierName\": \"string or null\",\n"
        "  \"matchedSupplierId\": \"string or null\",\n"
        "  \"invoiceNumber\": \"string or null\",\n"
        "  \"invoiceDate\": \"YYYY-MM-DD or null\",\n"
        "  \"items\": [\n"
        "    {\n"
        "      \"itemName\": \"string\",\n"
        "      \"brand\": \"string or null\",\n"
        "      \"matchedIngredientId\": \"string or null\",\n"
        "      \"quantity\": number,\n"
        "      \"unitCost\": number\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "Extract raw items. For quantity and unitCost, ensure they are positive numeric values. "
        "For 'brand', extract the brand name of the product if clearly visible (e.g. 'Altınkılıç', 'Sütaş', 'Pınar'); "
        "otherwise return null."
    )

    if existing_suppliers:
        prompt += f"\n\nHere are the existing suppliers in the database: {json.dumps(existing_suppliers, ensure_ascii=False)}"
        prompt += (
            "\nBased on the supplier name extracted from the invoice, match it to one of these existing suppliers "
            "if there is a semantic match (e.g. 'MIGROS TICARET A.S.' matches 'migros'). If a match is found, "
            "populate 'matchedSupplierId' with its ID. Otherwise, return null for 'matchedSupplierId'."
        )

    if existing_ingredients:
        prompt += f"\n\nHere are the existing ingredients/materials in the database: {json.dumps(existing_ingredients, ensure_ascii=False)}"
        prompt += (
            "\nBased on the item name/description extracted from the invoice, match each item to one of these "
            "existing ingredients if there is a semantic match (e.g. 'ALTINKILIC TAZE KASR' matches 'Kaşar Peyniri', "
            "'SÜZME SÜT 1L' matches 'Süt', 'KIRMIZI ET' or 'DANA ET' matches 'Kıyma (Dana)'). "
            "If a match is found, populate 'matchedIngredientId' with its ID. Otherwise, return null for 'matchedIngredientId'.\n"
            "CRITICAL CONVERSION RULE: If a match is found, compare the invoice packaging unit with the database ingredient's unit (e.g. 'g', 'ml', 'kg', 'liter', 'unit'). "
            "If the database unit is 'g' (grams) or 'ml' (milliliters) but the invoice lists it as packages or pieces (e.g. 1 package of cheese), "
            "convert the quantity to the database unit (grams or milliliters) by estimating the package size/weight (e.g. Altınkılıç Taze Kaşar is 600g, so quantity = 600). "
            "If you convert the quantity, adjust 'unitCost' accordingly: 'unitCost = totalLineCost / quantity' (e.g. 269.00 / 600 = 0.448333). "
            "Ensure that quantity * unitCost equals the actual total cost of the line item on the invoice. Use up to 6 decimal places of precision for 'unitCost' to prevent rounding errors."
        )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": base64_data
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    max_retries = 3
    retry_delay = 5.0

    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    text_response = data["candidates"][0]["content"]["parts"][0]["text"]
                    try:
                        return json.loads(text_response.strip())
                    except Exception as json_err:
                        print(f"[Invoice OCR] Failed to parse JSON response: {json_err}. Raw text: {text_response}")
                        mock = get_mock_ocr_result()
                        mock["_debugError"] = f"JSON parse error: {str(json_err)}"
                        return mock
                elif response.status_code in [429, 503]:
                    if attempt < max_retries - 1:
                        print(f"[Invoice OCR] Gemini API busy ({response.status_code}). Retrying in {retry_delay}s... (Attempt {attempt+1}/{max_retries})")
                        import asyncio
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2
                        continue
                    else:
                        err_msg = f"Gemini API error {response.status_code}: {response.text}"
                        print(f"[Invoice OCR] {err_msg}")
                        mock = get_mock_ocr_result()
                        mock["_debugError"] = err_msg
                        return mock
                else:
                    err_msg = f"Gemini API error {response.status_code}: {response.text}"
                    print(f"[Invoice OCR] {err_msg}")
                    mock = get_mock_ocr_result()
                    mock["_debugError"] = err_msg
                    return mock
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"[Invoice OCR] Connection/timeout exception: {e}. Retrying in {retry_delay}s... (Attempt {attempt+1}/{max_retries})")
                import asyncio
                await asyncio.sleep(retry_delay)
                retry_delay *= 2
                continue
            else:
                import traceback
                traceback.print_exc()
                err_msg = f"Exception calling Gemini API: {e}"
                print(f"[Invoice OCR] {err_msg}")
                mock = get_mock_ocr_result()
                mock["_debugError"] = err_msg
                return mock

def get_mock_ocr_result() -> Dict[str, Any]:
    """
    Deterministic mock data for demonstration/fallback when API keys are not configured.
    """
    return {
        "supplierName": "Metro Toptancı Market",
        "invoiceNumber": "MTR-2026-00891",
        "invoiceDate": "2026-06-07",
        "items": [
            {"itemName": "Whole Milk (Süt)", "quantity": 10.0, "unitCost": 45.50},
            {"itemName": "Espresso Beans (Kahve Çekirdeği)", "quantity": 5.0, "unitCost": 320.00},
            {"itemName": "Sugar (Toz Şeker)", "quantity": 2.0, "unitCost": 35.00}
        ]
    }
