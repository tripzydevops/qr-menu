import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ detail: "Dosya yüklenmesi zorunludur." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ detail: "Gemini API anahtarı yapılandırılmamış." }, { status: 500 });
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    let response: Response | null = null;
    let lastErrText = "";
    let retryDelay = 5000;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          break;
        } else if (response.status === 429 || response.status === 503) {
          lastErrText = await response.text();
          console.warn(`[Menu Import AI] Gemini API busy (${response.status}). Retrying in ${retryDelay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2;
        } else {
          lastErrText = await response.text();
          break;
        }
      } catch (fetchErr: any) {
        lastErrText = fetchErr.message || String(fetchErr);
        console.warn(`[Menu Import AI] Gemini fetch exception: ${lastErrText}. Retrying in ${retryDelay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2;
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Gemini API returned status ${response ? response.status : "Unknown"}: ${lastErrText}`);
    }

    const resJson = await response.json();
    const textResponse = resJson.candidates[0].content.parts[0].text;
    const parsedData = JSON.parse(textResponse);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("AI Import failed:", error);
    return NextResponse.json({ detail: error.message || "Menü ayrıştırma başarısız oldu." }, { status: 500 });
  }
}
