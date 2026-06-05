import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ detail: "Dosya yüklenmesi zorunludur." }, { status: 400 });
    }

    const content = await file.text();
    // Sniff delimiter: Semicolon is default in Turkish locales
    const sample = content.slice(0, 1024);
    const semicolonCount = (sample.match(/;/g) || []).length;
    const commaCount = (sample.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ";" : ",";

    const lines = content.split(/\r?\n/);
    if (lines.length <= 1) {
      return NextResponse.json({ categories: [] });
    }

    // Parse headers
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const categoriesMap: Record<string, any> = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(delimiter).map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });

      const categoryName = row["Category"] || "Genel";
      if (!categoriesMap[categoryName]) {
        categoriesMap[categoryName] = {
          nameTr: categoryName,
          nameEn: categoryName,
          items: []
        };
      }

      const nameTr = row["Name_TR"] || row["Name"] || "İsimsiz Ürün";
      const nameEn = row["Name_EN"] || nameTr;
      
      let priceVal = 0.0;
      try {
        const priceStr = (row["Price"] || "0").replace(/[₺$€]/g, "").replace(",", ".").trim();
        priceVal = parseFloat(priceStr) || 0;
      } catch (e) {}

      const allergens = row["Allergens"]
        ? row["Allergens"].split(",").map(a => a.trim().toLowerCase()).filter(Boolean)
        : [];

      const calories = row["Calories"] ? parseInt(row["Calories"]) || null : null;

      categoriesMap[categoryName].items.push({
        nameTr,
        nameEn,
        price: priceVal,
        descriptionTr: row["Description_TR"] || null,
        descriptionEn: row["Description_EN"] || null,
        allergens,
        calories
      });
    }

    return NextResponse.json({ categories: Object.values(categoriesMap) });
  } catch (error: any) {
    console.error("CSV Import failed:", error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
