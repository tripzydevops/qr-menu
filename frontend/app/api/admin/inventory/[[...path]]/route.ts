export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Helpers & Costing Logic
// ---------------------------------------------------------------------------

async function verifyInventoryGating(venueId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: { organization: true },
  });
  if (!venue) {
    throw new Error("Venue not found");
  }
  if (!venue.organization.inventoryEnabled) {
    throw new Error("Inventory and Costing module is not enabled for this organization");
  }
  return venue;
}

// 1. Recalculate Recipe Cost
async function recalculateRecipeCost(recipeId: string): Promise<number> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
  });
  if (!recipe) return 0;

  let totalCost = 0;
  for (const ri of recipe.ingredients) {
    if (ri.ingredient) {
      totalCost += Number(ri.amountUsed) * Number(ri.ingredient.weightedCost);
    }
  }

  const yieldQuantity = Number(recipe.yieldQuantity || 1);
  const portionCost = yieldQuantity > 0 ? totalCost / yieldQuantity : totalCost;

  await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      currentCost: portionCost,
      updatedAt: new Date(),
    },
  });

  return portionCost;
}

// 2. Recalculate Affected Recipes for an Ingredient
async function recalculateAffectedRecipes(ingredientId: string) {
  const recipeIngredients = await prisma.recipeIngredient.findMany({
    where: { ingredientId },
  });

  const seenRecipeIds = new Set<string>();
  for (const ri of recipeIngredients) {
    if (!seenRecipeIds.has(ri.recipeId)) {
      seenRecipeIds.add(ri.recipeId);
      await recalculateRecipeCost(ri.recipeId);
      await checkMarginAlert(ri.recipeId);
    }
  }
}

// 3. Margin Alert Checks
async function checkMarginAlert(recipeId: string) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      menuItem: {
        include: {
          category: true,
        },
      },
    },
  });
  if (!recipe || !recipe.menuItem) return null;

  const price = Number(recipe.menuItem.price);
  const cost = Number(recipe.currentCost);
  const targetMargin = Number(recipe.targetMargin);

  if (price <= 0) return null;

  const currentMargin = (price - cost) / price;
  const deviation = targetMargin - currentMargin;

  const venueId = recipe.menuItem.category.venueId;

  // Get alert rule
  let rule = await prisma.pricingAlertRule.findUnique({
    where: { venueId },
  });

  const swingThreshold = rule ? Number(rule.swingThreshold) : 0.05;
  const isActive = rule ? rule.isActive : true;

  if (!isActive) return null;

  if (deviation >= swingThreshold) {
    const denominator = 1.0 - targetMargin;
    const suggestedPrice = denominator > 0 ? cost / denominator : price;

    // Create alert
    const alert = await prisma.pricingAlert.create({
      data: {
        venueId,
        menuItemId: recipe.menuItem.id,
        recipeId: recipe.id,
        alertType: "margin_drop",
        message: `Margin for '${recipe.menuItem.nameEn}' dropped to ${(currentMargin * 100).toFixed(2)}% (target ${(targetMargin * 100).toFixed(2)}%)`,
        currentMargin,
        targetMargin,
        suggestedPrice,
        isResolved: false,
      },
    });
    return alert;
  }

  return null;
}

// 4. WAC Calculation & Invoice Processing
async function processInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: {
        include: {
          ingredient: true,
        },
      },
    },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "pending") throw new Error(`Invoice is already ${invoice.status}`);

  const affectedIngredientIds: string[] = [];

  for (const item of invoice.items) {
    const ingredient = item.ingredient;
    if (!ingredient) continue;

    const currentStock = Number(ingredient.currentStock);
    const currentWac = Number(ingredient.weightedCost);
    const qty = Number(item.quantity);
    const enteredUnitCost = Number(item.unitCost);
    const vatRate = Number(item.vatRate ?? 0.01);
    const isVatInclusive = item.isVatInclusive ?? false;

    const unitCost = isVatInclusive ? enteredUnitCost / (1 + vatRate) : enteredUnitCost;

    const newStock = currentStock + qty;
    const newWac = newStock > 0 ? (currentStock * currentWac + qty * unitCost) / newStock : unitCost;

    const oldCost = currentWac;

    // Update ingredient
    await prisma.ingredient.update({
      where: { id: ingredient.id },
      data: {
        currentStock: newStock,
        weightedCost: newWac,
        updatedAt: new Date(),
      },
    });

    // Log cost log
    await prisma.ingredientCostLog.create({
      data: {
        ingredientId: ingredient.id,
        oldCost,
        newCost: newWac,
        reason: "invoice",
      },
    });

    if (!affectedIngredientIds.includes(ingredient.id)) {
      affectedIngredientIds.push(ingredient.id);
    }
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "processed",
      updatedAt: new Date(),
    },
    include: {
      items: {
        include: {
          ingredient: true,
        },
      },
      supplier: true,
    },
  });

  // Recalculate affected recipes
  for (const ingredientId of affectedIngredientIds) {
    await recalculateAffectedRecipes(ingredientId);
  }

  return updatedInvoice;
}

// 5. Mock OCR Results helper
function getMockOcrResult() {
  return {
    supplierName: "Metro Toptancı Market",
    invoiceNumber: "MTR-2026-00891",
    invoiceDate: "2026-06-07",
    items: [
      { itemName: "Whole Milk (Süt)", quantity: 10.0, unitCost: 45.50 },
      { itemName: "Espresso Beans (Kahve Çekirdeği)", quantity: 5.0, unitCost: 320.00 },
      { itemName: "Sugar (Toz Şeker)", quantity: 2.0, unitCost: 35.00 },
    ],
  };
}

// ---------------------------------------------------------------------------
// GET Handlers
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const pathSegments = params.path || [];
    const { searchParams } = new URL(request.url);

    // 0. Suggest Density (does not require venueId)
    if (pathSegments[0] === "ingredients" && pathSegments[1] === "suggest-density") {
      const name = searchParams.get("name");
      if (!name) {
        return NextResponse.json({ detail: "name parameter is required" }, { status: 400 });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ density: 1.0 });
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
      const prompt = `You are a culinary science assistant. Estimate the density (specific gravity) in g/mL of the ingredient named: "${name}".
Return a JSON object with this exact structure:
{
  "density": number
}
Ensure the density is a positive float. Typical examples: Water = 1.0, Yogurt = 1.08, Olive Oil = 0.92, Flour = 0.52, Sugar = 0.85, Milk = 1.03, Honey = 1.42. If you don't know or the name is unclear, default to 1.0.`;

      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
          const parsed = JSON.parse(textResponse.trim());
          return NextResponse.json({ density: Number(parsed.density || 1.0) });
        }
      }
      return NextResponse.json({ density: 1.0 });
    }

    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json({ detail: "venueId parameter is required" }, { status: 400 });
    }

    const venue = await verifyInventoryGating(venueId);
    const org = venue.organization;

    // 1. Ingredients List
    if (pathSegments[0] === "ingredients") {
      const ingredients = await prisma.ingredient.findMany({
        where: org.sharedInventory ? { organizationId: org.id } : { venueId },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(
        ingredients.map((ing) => ({
          ...ing,
          currentStock: Number(ing.currentStock),
          reorderLevel: ing.reorderLevel ? Number(ing.reorderLevel) : null,
          weightedCost: Number(ing.weightedCost),
          density: Number(ing.density),
        }))
      );
    }

    // 2. Suppliers List
    if (pathSegments[0] === "suppliers") {
      const suppliers = await prisma.supplier.findMany({
        where: { venueId },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(suppliers);
    }

    // 3. Invoices List
    if (pathSegments[0] === "invoices") {
      const invoices = await prisma.invoice.findMany({
        where: { venueId },
        orderBy: { invoiceDate: "desc" },
        include: {
          supplier: true,
          items: {
            include: {
              ingredient: true,
            },
          },
        },
      });

      return NextResponse.json(
        invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          supplierId: inv.supplierId,
          supplierName: inv.supplier?.name || null,
          invoiceDate: inv.invoiceDate.toISOString(),
          totalAmount: Number(inv.totalAmount),
          status: inv.status,
          venueId: inv.venueId,
          createdAt: inv.createdAt.toISOString(),
          updatedAt: inv.updatedAt.toISOString(),
          items: inv.items.map((item) => ({
            id: item.id,
            ingredientId: item.ingredientId,
            ingredientName: item.ingredient?.name || null,
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
            vatRate: Number(item.vatRate),
            isVatInclusive: item.isVatInclusive,
            totalCost: Number(item.totalCost),
          })),
        }))
      );
    }

    // 4. Recipes List
    if (pathSegments[0] === "recipes") {
      const recipes = await prisma.recipe.findMany({
        where: {
          isDeleted: false,
          menuItem: {
            isDeleted: false,
            category: { venueId },
          },
        },
        include: {
          menuItem: true,
          ingredients: {
            include: {
              ingredient: true,
            },
          },
        },
      });

      return NextResponse.json(
        recipes.map((r) => {
          const price = r.menuItem ? Number(r.menuItem.price) : 0;
          const cost = Number(r.currentCost);
          const currentMargin = price > 0 ? (price - cost) / price : 0;

          return {
            id: r.id,
            menuItemId: r.menuItemId,
            menuItemName: r.menuItem?.nameEn || null,
            menuItemPrice: price,
            targetMargin: Number(r.targetMargin),
            yieldQuantity: Number(r.yieldQuantity || 1.0),
            currentCost: cost,
            currentMargin,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            ingredients: r.ingredients.map((ri) => ({
              id: ri.id,
              ingredientId: ri.ingredientId,
              ingredientName: ri.ingredient?.name || null,
              ingredientUnit: ri.ingredient?.unit || null,
              ingredientCost: ri.ingredient ? Number(ri.ingredient.weightedCost) : 0,
              ingredientDensity: ri.ingredient ? Number(ri.ingredient.density) : 1.0,
              amountUsed: Number(ri.amountUsed),
              lineCost: ri.ingredient ? Number(ri.amountUsed) * Number(ri.ingredient.weightedCost) : 0,
            })),
          };
        })
      );
    }

    // 5. Profitability Dashboard
    if (pathSegments[0] === "profitability") {
      const menuItems = await prisma.menuItem.findMany({
        where: {
          isDeleted: false,
          category: { venueId },
        },
        include: {
          recipe: true,
        },
      });

      const itemsList = [];
      let healthyCount = 0;
      let warningCount = 0;
      let criticalCount = 0;
      let marginSum = 0;
      let itemsWithRecipes = 0;

      for (const mi of menuItems) {
        if (!mi.recipe || mi.recipe.isDeleted) continue;
        itemsWithRecipes++;

        const price = Number(mi.price);
        const cost = Number(mi.recipe.currentCost);
        const targetMargin = Number(mi.recipe.targetMargin);
        const margin = price > 0 ? (price - cost) / price : 0;
        const deviation = Math.abs(targetMargin - margin);

        const denominator = 1.0 - targetMargin;
        const suggestedPrice = denominator > 0 ? cost / denominator : price;

        let status = "healthy";
        if (deviation < 0.02) {
          status = "healthy";
          healthyCount++;
        } else if (deviation < 0.05) {
          status = "warning";
          warningCount++;
        } else {
          status = "critical";
          criticalCount++;
        }

        marginSum += margin;

        itemsList.push({
          menuItemId: mi.id,
          menuItemName: mi.nameEn,
          menuPrice: price,
          recipeCost: cost,
          margin,
          targetMargin,
          marginDeviation: targetMargin - margin,
          suggestedPrice,
          status,
        });
      }

      const averageMargin = itemsWithRecipes > 0 ? marginSum / itemsWithRecipes : 0;

      return NextResponse.json({
        venueId,
        totalMenuItems: menuItems.length,
        itemsWithRecipes,
        healthyCount,
        warningCount,
        criticalCount,
        averageMargin,
        items: itemsList,
      });
    }

    // 6. Alert Rules
    if (pathSegments[0] === "alert-rules") {
      let rule = await prisma.pricingAlertRule.findUnique({
        where: { venueId },
      });

      if (!rule) {
        rule = await prisma.pricingAlertRule.create({
          data: {
            venueId,
            swingThreshold: 0.05,
            stockDeductionMode: "manual",
            autoSyncEnabled: false,
            isActive: true,
          },
        });
      }

      return NextResponse.json({
        ...rule,
        swingThreshold: Number(rule.swingThreshold),
      });
    }

    // 7. Pricing Alerts
    if (pathSegments[0] === "alerts") {
      const alerts = await prisma.pricingAlert.findMany({
        where: {
          venueId,
          isResolved: false,
        },
        orderBy: { createdAt: "desc" },
        include: {
          menuItem: true,
        },
      });

      return NextResponse.json(
        alerts.map((a) => ({
          ...a,
          menuItemName: a.menuItem?.nameEn || null,
          currentMargin: Number(a.currentMargin),
          targetMargin: Number(a.targetMargin),
          suggestedPrice: a.suggestedPrice ? Number(a.suggestedPrice) : null,
          createdAt: a.createdAt.toISOString(),
        }))
      );
    }

    return NextResponse.json({ detail: "Endpoint path not found" }, { status: 404 });
  } catch (error: any) {
    console.error("[GET /api/admin/inventory] Error:", error);
    return NextResponse.json({ detail: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST Handlers
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const pathSegments = params.path || [];

    // 1. Invoices scan (Gemini OCR)
    if (pathSegments[0] === "invoices" && pathSegments[1] === "scan") {
      const { searchParams } = new URL(request.url);
      const venueId = searchParams.get("venueId");

      const formData = await request.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ detail: "File upload is required" }, { status: 400 });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        console.warn("[OCR] API Key missing, falling back to mock OCR scan.");
        return NextResponse.json(getMockOcrResult());
      }

      const bytes = await file.arrayBuffer();
      const base64Data = Buffer.from(bytes).toString("base64");
      const mimeType = file.type;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

      let existingSuppliers: any[] = [];
      let existingIngredients: any[] = [];

      if (venueId) {
        existingSuppliers = await prisma.supplier.findMany({
          where: { venueId },
          select: { id: true, name: true }
        });

        const venue = await prisma.venue.findUnique({
          where: { id: venueId },
          include: { organization: true }
        });
        const org = venue?.organization;

        existingIngredients = await prisma.ingredient.findMany({
          where: org?.sharedInventory ? { organizationId: org.id } : { venueId },
          select: { id: true, name: true, unit: true }
        });
      }

      let prompt = `Analyze this invoice image/document and extract the structured information. Return a JSON object with the following structure:
{
  "supplierName": "string or null",
  "matchedSupplierId": "string or null",
  "invoiceNumber": "string or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "items": [
    {
      "itemName": "string",
      "matchedIngredientId": "string or null",
      "quantity": number,
      "unitCost": number
    }
  ]
}
Extract raw items exactly as shown. For quantity and unitCost, ensure they are positive numeric values.`;

      if (existingSuppliers.length > 0) {
        prompt += `\n\nHere are the existing suppliers in the database: ${JSON.stringify(existingSuppliers)}`;
        prompt += `\nBased on the supplier name extracted from the invoice, match it to one of these existing suppliers if there is a semantic match (e.g. 'MIGROS TICARET A.S.' matches 'migros'). If a match is found, populate 'matchedSupplierId' with its ID. Otherwise, return null for 'matchedSupplierId'.`;
      }

      if (existingIngredients.length > 0) {
        prompt += `\n\nHere are the existing ingredients/materials in the database: ${JSON.stringify(existingIngredients)}`;
        prompt += `\nBased on the item name/description extracted from the invoice, match each item to one of these existing ingredients if there is a semantic match (e.g. 'ALTINKILIC TAZE KASR' matches 'Kaşar Peyniri', 'SÜZME SÜT 1L' matches 'Süt', 'KIRMIZI ET' or 'DANA ET' matches 'Kıyma (Dana)'). If a match is found, populate 'matchedIngredientId' with its ID. Otherwise, return null for 'matchedIngredientId'.`;
      }

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
          try {
            const parsed = JSON.parse(textResponse.trim());

            // Auto-creation logic if venueId is provided
            if (venueId && typeof parsed === "object" && parsed !== null) {
              // 1. Resolve or Create Supplier
              const supplierName = parsed.supplierName;
              const matchedSupId = parsed.matchedSupplierId;

              if (supplierName && !matchedSupId) {
                const existingSup = await prisma.supplier.findFirst({
                  where: {
                    venueId,
                    name: { equals: supplierName, mode: "insensitive" }
                  }
                });
                if (existingSup) {
                  parsed.matchedSupplierId = existingSup.id;
                } else {
                  const newSup = await prisma.supplier.create({
                    data: {
                      name: supplierName,
                      venueId
                    }
                  });
                  parsed.matchedSupplierId = newSup.id;
                }
              }

              // 2. Resolve or Create Ingredients
              const items = parsed.items;
              if (Array.isArray(items)) {
                const venue = await prisma.venue.findUnique({
                  where: { id: venueId },
                  include: { organization: true }
                });
                const orgId = venue?.organizationId;

                for (const item of items) {
                  if (item && typeof item === "object") {
                    const itemName = item.itemName;
                    const matchedIngId = item.matchedIngredientId;

                    if (itemName && !matchedIngId) {
                      const existingIng = await prisma.ingredient.findFirst({
                        where: {
                          venueId,
                          name: { equals: itemName, mode: "insensitive" }
                        }
                      });
                      if (existingIng) {
                        item.matchedIngredientId = existingIng.id;
                      } else {
                        const newIng = await prisma.ingredient.create({
                          data: {
                            name: itemName,
                            unit: "adet",
                            currentStock: 0,
                            weightedCost: 0,
                            density: 1.0,
                            venueId,
                            organizationId: orgId
                          }
                        });
                        item.matchedIngredientId = newIng.id;
                      }
                    }
                  }
                }
              }
            }

            return NextResponse.json(parsed);
          } catch (jsonErr: any) {
            console.error("[OCR] Failed to parse JSON response from Gemini:", jsonErr);
            return NextResponse.json({
              ...getMockOcrResult(),
              _debugError: `Failed to parse Gemini JSON: ${jsonErr.message}. Raw text: ${textResponse}`
            });
          }
        }
      } else {
        const errText = await res.text();
        console.error(`[OCR] Gemini API call failed with status ${res.status}: ${errText}`);
        return NextResponse.json({
          ...getMockOcrResult(),
          _debugError: `Gemini API returned status ${res.status}: ${errText}`
        });
      }

      console.error("[OCR] Gemini API failed. Returning fallback mock.");
      return NextResponse.json(getMockOcrResult());
    }

    const body = await request.json();
    const { venueId } = body;

    if (!venueId) {
      return NextResponse.json({ detail: "venueId is required" }, { status: 400 });
    }

    await verifyInventoryGating(venueId);

    // 2. Add Ingredient
    if (pathSegments[0] === "ingredients") {
      const { name, unit, reorderLevel, density } = body;
      const existing = await prisma.ingredient.findFirst({
        where: { venueId, name },
      });
      if (existing) {
        return NextResponse.json({ detail: "Ingredient with this name already exists in this venue" }, { status: 400 });
      }

      const ing = await prisma.ingredient.create({
        data: {
          name,
          unit,
          currentStock: 0,
          weightedCost: 0,
          reorderLevel: reorderLevel ? Number(reorderLevel) : null,
          density: density !== undefined ? Number(density) : 1.0,
          venueId,
        },
      });

      return NextResponse.json({
        ...ing,
        currentStock: Number(ing.currentStock),
        reorderLevel: ing.reorderLevel ? Number(ing.reorderLevel) : null,
        weightedCost: Number(ing.weightedCost),
        density: Number(ing.density),
      }, { status: 201 });
    }

    // 3. Add Supplier
    if (pathSegments[0] === "suppliers") {
      const { name, contactEmail, contactPhone } = body;
      const sup = await prisma.supplier.create({
        data: { name, contactEmail, contactPhone, venueId },
      });
      return NextResponse.json(sup, { status: 201 });
    }

    // 4. Create Invoice
    if (pathSegments[0] === "invoices") {
      const { invoiceNumber, supplierId, invoiceDate, items } = body; // items: Array of { ingredientId, quantity, unitCost }

      let totalAmount = 0;
      for (const item of items) {
        totalAmount += Number(item.quantity) * Number(item.unitCost);
      }

      const invoice = await prisma.$transaction(async (tx) => {
        const dbInvoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            supplierId,
            invoiceDate: new Date(invoiceDate),
            totalAmount,
            status: "pending",
            venueId,
            items: {
              create: items.map((i: any) => ({
                ingredientId: i.ingredientId,
                quantity: Number(i.quantity),
                unitCost: Number(i.unitCost),
                vatRate: Number(i.vatRate || 0.01),
                isVatInclusive: Boolean(i.isVatInclusive || false),
                totalCost: Number(i.quantity) * Number(i.unitCost),
              })),
            },
          },
        });
        return dbInvoice;
      });

      // Process invoice costing auto-run
      const processed = await processInvoice(invoice.id);

      return NextResponse.json({
        id: processed.id,
        invoiceNumber: processed.invoiceNumber,
        supplierId: processed.supplierId,
        supplierName: processed.supplier?.name || null,
        invoiceDate: processed.invoiceDate.toISOString(),
        totalAmount: Number(processed.totalAmount),
        status: processed.status,
        venueId: processed.venueId,
        items: processed.items.map((item) => ({
          id: item.id,
          ingredientId: item.ingredientId,
          ingredientName: item.ingredient?.name || null,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
          vatRate: Number(item.vatRate || 0.01),
          isVatInclusive: item.isVatInclusive || false,
          totalCost: Number(item.totalCost),
        })),
      }, { status: 201 });
    }

    // 5. Create Recipe
    if (pathSegments[0] === "recipes") {
      const { menuItemId, targetMargin, ingredients, yieldQuantity } = body; // ingredients: Array of { ingredientId, amountUsed }

      const existing = await prisma.recipe.findUnique({
        where: { menuItemId },
      });
      if (existing) {
        return NextResponse.json({ detail: "Recipe already exists for this menu item" }, { status: 400 });
      }

      const recipe = await prisma.$transaction(async (tx) => {
        const dbRecipe = await tx.recipe.create({
          data: {
            menuItemId,
            targetMargin: Number(targetMargin),
            yieldQuantity: yieldQuantity ? Number(yieldQuantity) : 1.0,
            currentCost: 0,
            ingredients: {
              create: ingredients.map((i: any) => ({
                ingredientId: i.ingredientId,
                amountUsed: Number(i.amountUsed),
              })),
            },
          },
          include: {
            ingredients: {
              include: { ingredient: true },
            },
            menuItem: true,
          },
        });
        return dbRecipe;
      });

      // Recalculate
      await recalculateRecipeCost(recipe.id);
      await checkMarginAlert(recipe.id);

      const updated = await prisma.recipe.findUnique({
        where: { id: recipe.id },
        include: {
          ingredients: {
            include: { ingredient: true },
          },
          menuItem: true,
        },
      });

      if (!updated) {
        return NextResponse.json({ detail: "Recalculation error" }, { status: 500 });
      }

      const price = updated.menuItem ? Number(updated.menuItem.price) : 0;
      const cost = Number(updated.currentCost);

      return NextResponse.json({
        id: updated.id,
        menuItemId: updated.menuItemId,
        menuItemName: updated.menuItem?.nameEn || null,
        menuItemPrice: price,
        targetMargin: Number(updated.targetMargin),
        yieldQuantity: Number(updated.yieldQuantity || 1.0),
        currentCost: cost,
        currentMargin: price > 0 ? (price - cost) / price : 0,
        ingredients: updated.ingredients.map((ri) => ({
          id: ri.id,
          ingredientId: ri.ingredientId,
          ingredientName: ri.ingredient?.name || null,
          ingredientUnit: ri.ingredient?.unit || null,
          ingredientCost: ri.ingredient ? Number(ri.ingredient.weightedCost) : 0,
          ingredientDensity: ri.ingredient ? Number(ri.ingredient.density) : 1.0,
          amountUsed: Number(ri.amountUsed),
          lineCost: ri.ingredient ? Number(ri.amountUsed) * Number(ri.ingredient.weightedCost) : 0,
        })),
      }, { status: 201 });
    }

    // 6. Recalculate Specific Recipe
    if (pathSegments[0] === "recipes" && pathSegments[2] === "recalculate") {
      const recipeId = pathSegments[1];
      const cost = await recalculateRecipeCost(recipeId);
      await checkMarginAlert(recipeId);

      const r = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
          menuItem: true,
          ingredients: {
            include: { ingredient: true },
          },
        },
      });

      if (!r) {
        return NextResponse.json({ detail: "Recipe not found" }, { status: 404 });
      }

      const price = r.menuItem ? Number(r.menuItem.price) : 0;
      const currentMargin = price > 0 ? (price - cost) / price : 0;

      return NextResponse.json({
        id: r.id,
        menuItemId: r.menuItemId,
        menuItemName: r.menuItem?.nameEn || null,
        menuItemPrice: price,
        targetMargin: Number(r.targetMargin),
        yieldQuantity: Number(r.yieldQuantity || 1.0),
        currentCost: cost,
        currentMargin,
        ingredients: r.ingredients.map((ri) => ({
          id: ri.id,
          ingredientId: ri.ingredientId,
          ingredientName: ri.ingredient?.name || null,
          ingredientUnit: ri.ingredient?.unit || null,
          ingredientCost: ri.ingredient ? Number(ri.ingredient.weightedCost) : 0,
          ingredientDensity: ri.ingredient ? Number(ri.ingredient.density) : 1.0,
          amountUsed: Number(ri.amountUsed),
          lineCost: ri.ingredient ? Number(ri.amountUsed) * Number(ri.ingredient.weightedCost) : 0,
        })),
      });
    }

    // 7. Resolve Alert
    if (pathSegments[0] === "alerts" && pathSegments[2] === "resolve") {
      const alertId = pathSegments[1];
      const alert = await prisma.pricingAlert.update({
        where: { id: alertId },
        data: { isResolved: true },
        include: { menuItem: true },
      });
      return NextResponse.json({
        ...alert,
        menuItemName: alert.menuItem?.nameEn || null,
        currentMargin: Number(alert.currentMargin),
        targetMargin: Number(alert.targetMargin),
        suggestedPrice: alert.suggestedPrice ? Number(alert.suggestedPrice) : null,
      });
    }

    // 8. Sync Prices
    if (pathSegments[0] === "sync-prices") {
      const { menuItemIds, syncType, customPrices } = body; // menuItemIds: Array, customPrices: Map

      const results = [];
      for (const miId of menuItemIds) {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: miId },
          include: { recipe: true },
        });
        if (!menuItem || menuItem.isDeleted || !menuItem.recipe || menuItem.recipe.isDeleted) continue;

        const oldPrice = Number(menuItem.price);
        const cost = Number(menuItem.recipe.currentCost);
        const targetMargin = Number(menuItem.recipe.targetMargin);

        let newPrice = oldPrice;
        if (syncType === "custom" && customPrices && customPrices[miId] !== undefined) {
          newPrice = Number(customPrices[miId]);
        } else {
          const denominator = 1.0 - targetMargin;
          newPrice = denominator > 0 ? cost / denominator : oldPrice;
        }

        // Round to 2 decimal places
        newPrice = Math.round(newPrice * 100) / 100;

        await prisma.menuItem.update({
          where: { id: miId },
          data: {
            price: newPrice,
            updatedAt: new Date(),
          },
        });

        // Resolve alerts
        await prisma.pricingAlert.updateMany({
          where: {
            venueId,
            menuItemId: miId,
            isResolved: false,
          },
          data: {
            isResolved: true,
          },
        });

        const newMargin = newPrice > 0 ? (newPrice - cost) / newPrice : 0;

        results.push({
          menuItemId: miId,
          menuItemName: menuItem.nameEn,
          oldPrice,
          newPrice,
          newMargin,
        });
      }

      return NextResponse.json(results);
    }

    // 9. Scan Recipe (Gemini AI Parser)
    if (pathSegments[0] === "recipes" && pathSegments[1] === "scan") {
      const { searchParams } = new URL(request.url);
      const venueId = searchParams.get("venueId");
      if (!venueId) {
        return NextResponse.json({ detail: "venueId is required" }, { status: 400 });
      }

      const allIngredients = await prisma.ingredient.findMany({
        where: { venueId },
        select: { id: true, name: true, unit: true, weightedCost: true, density: true },
      });

      let promptContext = "Available ingredients in database:\n" + 
        allIngredients.map(ing => `- ID: "${ing.id}", Name: "${ing.name}", Unit: "${ing.unit}", Density: "${Number(ing.density)} g/mL"`).join("\n");

      const contentType = request.headers.get("content-type") || "";
      let recipeContentPart: any = null;

      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        if (!file) {
          return NextResponse.json({ detail: "File upload is required" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const base64Data = Buffer.from(bytes).toString("base64");
        recipeContentPart = {
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          }
        };
      } else {
        const body = await request.json();
        const { text } = body;
        if (!text) {
          return NextResponse.json({ detail: "Text description is required" }, { status: 400 });
        }
        recipeContentPart = { text: `Recipe text to parse:\n${text}` };
      }

      if (!apiKey) {
        console.warn("[OCR] API Key missing, falling back to empty list.");
        return NextResponse.json([]);
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

      const prompt = `Analyze the recipe content (text or image) and extract the structured list of ingredients.
${promptContext}

Match each ingredient in the recipe to the closest database ingredient name.
For each matched ingredient, return a JSON array containing objects with this exact structure:
[
  {
    "ingredientId": "string",
    "amountUsed": number
  }
]
Only return matches that correspond to the available ingredients listed. If a recipe ingredient doesn't match any listed database ingredient, omit it.
The "amountUsed" must be a positive number in the unit specified for that ingredient in the database list.
IMPORTANT CONVERSION RULE:
If the recipe specifies a volume-based quantity (e.g., cup, tablespoon, teaspoon, ml, liter) but the database ingredient's unit is weight-based (e.g., g, kg), you MUST convert the volume to weight using the provided Density (in g/mL) for that ingredient.
Standard conversions to use:
- 1 cup (Su bardağı) = 240 mL
- 1 tablespoon (Yemek kaşığı / tbsp) = 15 mL
- 1 teaspoon (Tatlı kaşığı / tsp) = 5 mL
For example:
- If the recipe specifies "2 cups of Yogurt" and Yogurt has "Density: 1.08 g/mL", convert 2 cups to mL (2 * 240 = 480 mL), then to grams using density (480 * 1.08 = 518.4 g). If Yogurt's database unit is "g", return 518.4.
- If the recipe specifies "3 tablespoons of Flour" and Flour has "Density: 0.52 g/mL", convert 3 tbsp to mL (3 * 15 = 45 mL), then to grams (45 * 0.52 = 23.4 g). If Flour's database unit is "g", return 23.4.
Perform all conversions carefully before outputting the final "amountUsed" in the database ingredient's unit!`;

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              recipeContentPart,
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
          const parsed = JSON.parse(textResponse.trim());
          return NextResponse.json(parsed);
        }
      }

      console.error("[Recipe OCR] Gemini API failed.");
      return NextResponse.json([]);
    }

    return NextResponse.json({ detail: "Endpoint path not found" }, { status: 404 });
  } catch (error: any) {
    console.error("[POST /api/admin/inventory] Error:", error);
    return NextResponse.json({ detail: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PUT Handlers
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const pathSegments = params.path || [];
    const body = await request.json();

    // 1. Update Ingredient
    if (pathSegments[0] === "ingredients" && pathSegments[1]) {
      const id = pathSegments[1];
      const { name, unit, reorderLevel, density } = body;

      const ing = await prisma.ingredient.update({
        where: { id },
        data: {
          name,
          unit,
          reorderLevel: reorderLevel ? Number(reorderLevel) : null,
          density: density !== undefined ? Number(density) : 1.0,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        ...ing,
        currentStock: Number(ing.currentStock),
        reorderLevel: ing.reorderLevel ? Number(ing.reorderLevel) : null,
        weightedCost: Number(ing.weightedCost),
        density: Number(ing.density),
      });
    }

    // 2. Update Supplier
    if (pathSegments[0] === "suppliers" && pathSegments[1]) {
      const id = pathSegments[1];
      const { name, contactEmail, contactPhone } = body;

      const sup = await prisma.supplier.update({
        where: { id },
        data: {
          name,
          contactEmail,
          contactPhone,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(sup);
    }

    // 3. Update Recipe
    if (pathSegments[0] === "recipes" && pathSegments[1]) {
      const id = pathSegments[1];
      const { targetMargin, ingredients, yieldQuantity } = body; // ingredients: Array of { ingredientId, amountUsed }

      const updated = await prisma.$transaction(async (tx) => {
        // Clear old recipe ingredients
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: id },
        });

        const recipe = await tx.recipe.update({
          where: { id },
          data: {
            targetMargin: Number(targetMargin),
            yieldQuantity: yieldQuantity ? Number(yieldQuantity) : 1.0,
            updatedAt: new Date(),
            ingredients: {
              create: ingredients.map((i: any) => ({
                ingredientId: i.ingredientId,
                amountUsed: Number(i.amountUsed),
              })),
            },
          },
          include: {
            menuItem: true,
            ingredients: {
              include: { ingredient: true },
            },
          },
        });
        return recipe;
      });

      // Recalculate
      await recalculateRecipeCost(updated.id);
      await checkMarginAlert(updated.id);

      const finalRecipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
          menuItem: true,
          ingredients: {
            include: { ingredient: true },
          },
        },
      });

      if (!finalRecipe) throw new Error("Recalculation error");

      const price = finalRecipe.menuItem ? Number(finalRecipe.menuItem.price) : 0;
      const cost = Number(finalRecipe.currentCost);

      return NextResponse.json({
        id: finalRecipe.id,
        menuItemId: finalRecipe.menuItemId,
        menuItemName: finalRecipe.menuItem?.nameEn || null,
        menuItemPrice: price,
        targetMargin: Number(finalRecipe.targetMargin),
        yieldQuantity: Number(finalRecipe.yieldQuantity || 1.0),
        currentCost: cost,
        currentMargin: price > 0 ? (price - cost) / price : 0,
        ingredients: finalRecipe.ingredients.map((ri) => ({
          id: ri.id,
          ingredientId: ri.ingredientId,
          ingredientName: ri.ingredient?.name || null,
          ingredientUnit: ri.ingredient?.unit || null,
          ingredientCost: ri.ingredient ? Number(ri.ingredient.weightedCost) : 0,
          ingredientDensity: ri.ingredient ? Number(ri.ingredient.density) : 1.0,
          amountUsed: Number(ri.amountUsed),
          lineCost: ri.ingredient ? Number(ri.amountUsed) * Number(ri.ingredient.weightedCost) : 0,
        })),
      });
    }

    // 4. Update Alert Rules
    if (pathSegments[0] === "alert-rules") {
      const { venueId, swingThreshold, stockDeductionMode, autoSyncEnabled, isActive } = body;

      const rule = await prisma.pricingAlertRule.update({
        where: { venueId },
        data: {
          swingThreshold: Number(swingThreshold),
          stockDeductionMode,
          autoSyncEnabled,
          isActive,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        ...rule,
        swingThreshold: Number(rule.swingThreshold),
      });
    }

    return NextResponse.json({ detail: "Endpoint path not found" }, { status: 404 });
  } catch (error: any) {
    console.error("[PUT /api/admin/inventory] Error:", error);
    return NextResponse.json({ detail: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE Handlers
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const pathSegments = params.path || [];

    // 1. Delete Ingredient
    if (pathSegments[0] === "ingredients" && pathSegments[1]) {
      const id = pathSegments[1];
      await prisma.ingredient.delete({ where: { id } });
      return new NextResponse(null, { status: 204 });
    }

    // 2. Delete Supplier
    if (pathSegments[0] === "suppliers" && pathSegments[1]) {
      const id = pathSegments[1];
      await prisma.supplier.delete({ where: { id } });
      return new NextResponse(null, { status: 204 });
    }

    // 3. Delete Recipe
    if (pathSegments[0] === "recipes" && pathSegments[1]) {
      const id = pathSegments[1];
      await prisma.recipe.update({
        where: { id },
        data: { isDeleted: true },
      });
      return new NextResponse(null, { status: 204 });
    }

    // 4. Void Invoice (status = "void")
    if (pathSegments[0] === "invoices" && pathSegments[1]) {
      const id = pathSegments[1];
      const inv = await prisma.invoice.update({
        where: { id },
        data: {
          status: "void",
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(inv);
    }

    return NextResponse.json({ detail: "Endpoint path not found" }, { status: 404 });
  } catch (error: any) {
    console.error("[DELETE /api/admin/inventory] Error:", error);
    return NextResponse.json({ detail: error.message || "Internal Server Error" }, { status: 500 });
  }
}
