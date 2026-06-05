import { NextRequest, NextResponse } from "next/server";

function getMockAiParsedMenu() {
  return {
    isDemo: true,
    categories: [
      {
        nameTr: "AI Taranan Başlangıçlar",
        nameEn: "AI Scanned Starters",
        items: [
          {
            nameTr: "Humus",
            nameEn: "Hummus",
            price: 140.0,
            descriptionTr: "Tahin, limon ve sarımsaklı süzme nohut ezmesi.",
            descriptionEn: "Mashed chickpeas with tahini, lemon, and garlic.",
            allergens: ["sesame"],
            calories: 250
          },
          {
            nameTr: "Haydari",
            nameEn: "Haydari Meze",
            price: 110.0,
            descriptionTr: "Süzme yoğurt, nane ve dereotu.",
            descriptionEn: "Strained yogurt with mint and dill.",
            allergens: ["dairy"],
            calories: 150
          }
        ]
      },
      {
        nameTr: "AI Taranan Ana Yemekler",
        nameEn: "AI Scanned Main Dishes",
        items: [
          {
            nameTr: "Kuzu Şiş Izgara",
            nameEn: "Grilled Lamb Shish",
            price: 450.0,
            descriptionTr: "Közlenmiş domates, biber, pilav ve lavaş ile servis edilir.",
            descriptionEn: "Served with grilled tomatoes, peppers, rice, and lavash.",
            allergens: ["gluten"],
            calories: 520
          },
          {
            nameTr: "Fırın Kebap",
            nameEn: "Oven Baked Kebab",
            price: 490.0,
            descriptionTr: "Konya usulü fırında pişmiş yumuşak kuzu eti.",
            descriptionEn: "Oven slow-cooked tender lamb meat, Konya style.",
            allergens: [],
            calories: 610
          }
        ]
      }
    ]
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ detail: "Dosya yüklenmesi zorunludur." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(getMockAiParsedMenu());
    }

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");

    const prompt = 
      "You are an expert menu scanner. Analyze the provided menu document (image or PDF). " +
      "Extract all categories and items. For each item, provide name (in Turkish and English), price, description, " +
      "allergens (like 'gluten', 'dairy', 'nuts', 'sesame', etc.) if explicitly mentioned or highly obvious, and calories if listed. " +
      "You must return the data matching the JSON structure with categories: [{ nameTr, nameEn, items: [{ nameTr, nameEn, price, descriptionTr, descriptionEn, allergens, calories }] }]";

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.type,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const resJson = await response.json();
    const textResponse = resJson.candidates[0].content.parts[0].text;
    const parsedData = JSON.parse(textResponse);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("AI Import failed:", error);
    return NextResponse.json(getMockAiParsedMenu()); // Robust fallback
  }
}
