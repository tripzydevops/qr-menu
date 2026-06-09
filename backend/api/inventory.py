from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from decimal import Decimal
import uuid
import datetime

try:
    from ..database import get_db
    from .. import models, schemas
    from ..services import costing, invoice_ocr, recipe_ocr
except ImportError:
    from database import get_db
    import models
    import schemas
    from services import costing, invoice_ocr, recipe_ocr

router = APIRouter(prefix="/api/admin/inventory", tags=["inventory"])

# ---------------------------------------------------------------------------
# Helper: Verify Feature Flag Gating
# ---------------------------------------------------------------------------
def verify_inventory_gating(venue_id: str, db: Session) -> models.Venue:
    venue = db.query(models.Venue).filter(models.Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    org = db.query(models.Organization).filter(models.Organization.id == venue.organizationId).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not org.inventoryEnabled:
        raise HTTPException(
            status_code=403, 
            detail="Inventory and Costing module is not enabled for this organization"
        )
    return venue

# ---------------------------------------------------------------------------
# 1. Ingredients Endpoints
# ---------------------------------------------------------------------------
@router.get("/ingredients", response_model=List[schemas.IngredientSchema])
def list_ingredients(venueId: str, db: Session = Depends(get_db)):
    venue = verify_inventory_gating(venueId, db)
    org = db.query(models.Organization).filter(models.Organization.id == venue.organizationId).first()
    
    if org and org.sharedInventory:
        return db.query(models.Ingredient).filter(models.Ingredient.organizationId == org.id).order_by(models.Ingredient.name.asc()).all()
    else:
        return db.query(models.Ingredient).filter(models.Ingredient.venueId == venueId).order_by(models.Ingredient.name.asc()).all()

@router.post("/ingredients", response_model=schemas.IngredientSchema, status_code=status.HTTP_201_CREATED)
def create_ingredient(ing_in: schemas.IngredientCreate, db: Session = Depends(get_db)):
    venue = verify_inventory_gating(ing_in.venueId, db)
    
    # Check duplicate
    existing = db.query(models.Ingredient).filter(
        models.Ingredient.venueId == ing_in.venueId,
        models.Ingredient.name == ing_in.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ingredient with this name already exists in the venue")

    db_ing = models.Ingredient(
        id=str(uuid.uuid4()),
        name=ing_in.name,
        unit=ing_in.unit,
        currentStock=Decimal("0.0"),
        reorderLevel=Decimal(str(ing_in.reorderLevel)) if ing_in.reorderLevel is not None else None,
        weightedCost=Decimal("0.0"),
        density=Decimal(str(ing_in.density)),
        lastBrand=ing_in.lastBrand,
        venueId=ing_in.venueId,
        organizationId=venue.organizationId
    )
    db.add(db_ing)
    db.commit()
    db.refresh(db_ing)
    return db_ing

@router.put("/ingredients/{id}", response_model=schemas.IngredientSchema)
def update_ingredient(id: str, ing_in: schemas.IngredientBase, db: Session = Depends(get_db)):
    db_ing = db.query(models.Ingredient).filter(models.Ingredient.id == id).first()
    if not db_ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    verify_inventory_gating(db_ing.venueId, db)
    
    db_ing.name = ing_in.name
    db_ing.unit = ing_in.unit
    db_ing.reorderLevel = Decimal(str(ing_in.reorderLevel)) if ing_in.reorderLevel is not None else None
    db_ing.density = Decimal(str(ing_in.density))
    if ing_in.lastBrand is not None:
        db_ing.lastBrand = ing_in.lastBrand
    db_ing.updatedAt = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(db_ing)
    return db_ing

@router.delete("/ingredients/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ingredient(id: str, db: Session = Depends(get_db)):
    db_ing = db.query(models.Ingredient).filter(models.Ingredient.id == id).first()
    if not db_ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    verify_inventory_gating(db_ing.venueId, db)
    db.delete(db_ing)
    db.commit()

# ---------------------------------------------------------------------------
# 2. Suppliers Endpoints
# ---------------------------------------------------------------------------
@router.get("/suppliers", response_model=List[schemas.SupplierSchema])
def list_suppliers(venueId: str, db: Session = Depends(get_db)):
    verify_inventory_gating(venueId, db)
    return db.query(models.Supplier).filter(models.Supplier.venueId == venueId).order_by(models.Supplier.name.asc()).all()

@router.post("/suppliers", response_model=schemas.SupplierSchema, status_code=status.HTTP_201_CREATED)
def create_supplier(sup_in: schemas.SupplierCreate, db: Session = Depends(get_db)):
    verify_inventory_gating(sup_in.venueId, db)
    
    db_sup = models.Supplier(
        id=str(uuid.uuid4()),
        name=sup_in.name,
        contactEmail=sup_in.contactEmail,
        contactPhone=sup_in.contactPhone,
        venueId=sup_in.venueId
    )
    db.add(db_sup)
    db.commit()
    db.refresh(db_sup)
    return db_sup

@router.put("/suppliers/{id}", response_model=schemas.SupplierSchema)
def update_supplier(id: str, sup_in: schemas.SupplierBase, db: Session = Depends(get_db)):
    db_sup = db.query(models.Supplier).filter(models.Supplier.id == id).first()
    if not db_sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    verify_inventory_gating(db_sup.venueId, db)
    
    db_sup.name = sup_in.name
    db_sup.contactEmail = sup_in.contactEmail
    db_sup.contactPhone = sup_in.contactPhone
    db_sup.updatedAt = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(db_sup)
    return db_sup

@router.delete("/suppliers/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(id: str, db: Session = Depends(get_db)):
    db_sup = db.query(models.Supplier).filter(models.Supplier.id == id).first()
    if not db_sup:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    verify_inventory_gating(db_sup.venueId, db)
    db.delete(db_sup)
    db.commit()

# ---------------------------------------------------------------------------
# 3. Invoices Endpoints
# ---------------------------------------------------------------------------
@router.get("/invoices", response_model=List[schemas.InvoiceSchema])
def list_invoices(venueId: str, includeArchived: bool = False, db: Session = Depends(get_db)):
    verify_inventory_gating(venueId, db)
    query = db.query(models.Invoice).filter(models.Invoice.venueId == venueId)
    if not includeArchived:
        query = query.filter(models.Invoice.isArchived == False)
    invoices = query.order_by(models.Invoice.invoiceDate.desc()).all()
    
    # Map supplier names
    for inv in invoices:
        if inv.supplier:
            inv.supplierName = inv.supplier.name
        for item in inv.items:
            if item.ingredient:
                item.ingredientName = item.ingredient.name
                item.ingredientUnit = item.ingredient.unit
    return invoices

@router.post("/invoices", response_model=schemas.InvoiceSchema, status_code=status.HTTP_201_CREATED)
def create_invoice(inv_in: schemas.InvoiceCreate, db: Session = Depends(get_db)):
    verify_inventory_gating(inv_in.venueId, db)
    
    # Calculate total amount
    total_amount = Decimal("0.0")
    for item in inv_in.items:
        total_amount += Decimal(str(item.quantity)) * Decimal(str(item.unitCost))

    db_invoice = models.Invoice(
        id=str(uuid.uuid4()),
        invoiceNumber=inv_in.invoiceNumber,
        supplierId=inv_in.supplierId,
        invoiceDate=inv_in.invoiceDate,
        totalAmount=total_amount,
        status="pending",
        venueId=inv_in.venueId
    )
    db.add(db_invoice)
    db.flush()

    for item in inv_in.items:
        db_item = models.InvoiceItem(
            id=str(uuid.uuid4()),
            invoiceId=db_invoice.id,
            ingredientId=item.ingredientId,
            quantity=Decimal(str(item.quantity)),
            unitCost=Decimal(str(item.unitCost)),
            totalCost=Decimal(str(item.quantity)) * Decimal(str(item.unitCost)),
            rawName=item.rawName,
            brand=item.brand
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_invoice)

    # Process WAC automatically
    processed = costing.process_invoice(db, db_invoice.id)
    
    # Decorate supplier name
    if processed.supplier:
        processed.supplierName = processed.supplier.name
    for it in processed.items:
        if it.ingredient:
            it.ingredientName = it.ingredient.name
            it.ingredientUnit = it.ingredient.unit

    return processed

@router.get("/invoices/{id}", response_model=schemas.InvoiceSchema)
def get_invoice(id: str, db: Session = Depends(get_db)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    verify_inventory_gating(inv.venueId, db)
    
    if inv.supplier:
        inv.supplierName = inv.supplier.name
    for item in inv.items:
        if item.ingredient:
            item.ingredientName = item.ingredient.name
            item.ingredientUnit = item.ingredient.unit
    return inv

@router.delete("/invoices/{id}", response_model=schemas.InvoiceSchema)
def void_invoice(id: str, db: Session = Depends(get_db)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    verify_inventory_gating(inv.venueId, db)
    
    inv.status = "void"
    inv.updatedAt = datetime.datetime.utcnow()
    db.commit()
    db.refresh(inv)
    
    if inv.supplier:
        inv.supplierName = inv.supplier.name
    for item in inv.items:
        if item.ingredient:
            item.ingredientName = item.ingredient.name
            item.ingredientUnit = item.ingredient.unit
    return inv

@router.put("/invoices/{id}/archive", response_model=schemas.InvoiceSchema)
def archive_invoice(id: str, archive_data: Dict[str, bool], db: Session = Depends(get_db)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    verify_inventory_gating(inv.venueId, db)
    
    is_archived = archive_data.get("isArchived", True)
    inv.isArchived = is_archived
    inv.updatedAt = datetime.datetime.utcnow()
    db.commit()
    db.refresh(inv)
    
    if inv.supplier:
        inv.supplierName = inv.supplier.name
    for item in inv.items:
        if item.ingredient:
            item.ingredientName = item.ingredient.name
            item.ingredientUnit = item.ingredient.unit
    return inv

@router.post("/invoices/scan")
async def scan_invoice(
    venueId: Optional[str] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        content = await file.read()
        
        existing_suppliers = None
        existing_ingredients = None
        
        if venueId:
            sups = db.query(models.Supplier).filter(models.Supplier.venueId == venueId).all()
            existing_suppliers = [{"id": s.id, "name": s.name} for s in sups]
            
            ings = db.query(models.Ingredient).filter(models.Ingredient.venueId == venueId).all()
            existing_ingredients = [{"id": i.id, "name": i.name, "unit": i.unit} for i in ings]
            
        extracted = invoice_ocr.parse_invoice_image(
            content, 
            file.content_type,
            existing_suppliers=existing_suppliers,
            existing_ingredients=existing_ingredients
        )
        
        # Auto-creation logic if venueId is provided
        if venueId and isinstance(extracted, dict):
            # 1. Resolve or Create Supplier
            supplier_name = extracted.get("supplierName")
            matched_sup_id = extracted.get("matchedSupplierId")
            
            if supplier_name and not matched_sup_id:
                # Check if case-insensitive name exists
                existing_sup = db.query(models.Supplier).filter(
                    models.Supplier.venueId == venueId,
                    models.Supplier.name.ilike(supplier_name)
                ).first()
                if existing_sup:
                    extracted["matchedSupplierId"] = existing_sup.id
                else:
                    new_sup = models.Supplier(
                        id=str(uuid.uuid4()),
                        name=supplier_name,
                        venueId=venueId
                    )
                    db.add(new_sup)
                    db.commit()
                    db.refresh(new_sup)
                    extracted["matchedSupplierId"] = new_sup.id
            
            # 2. Resolve or Create Ingredients
            items = extracted.get("items", [])
            if isinstance(items, list):
                venue = db.query(models.Venue).filter(models.Venue.id == venueId).first()
                org_id = venue.organizationId if venue else None
                
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    item_name = item.get("itemName")
                    matched_ing_id = item.get("matchedIngredientId")
                    
                    if item_name and not matched_ing_id:
                        # Check if case-insensitive name exists
                        existing_ing = db.query(models.Ingredient).filter(
                            models.Ingredient.venueId == venueId,
                            models.Ingredient.name.ilike(item_name)
                        ).first()
                        if existing_ing:
                            item["matchedIngredientId"] = existing_ing.id
                        else:
                            new_ing = models.Ingredient(
                                id=str(uuid.uuid4()),
                                name=item_name,
                                unit="adet", # Default unit
                                currentStock=Decimal("0.0"),
                                weightedCost=Decimal("0.0"),
                                density=Decimal("1.0"),
                                lastBrand=item.get("brand"),
                                venueId=venueId,
                                organizationId=org_id
                            )
                            db.add(new_ing)
                            db.commit()
                            db.refresh(new_ing)
                            item["matchedIngredientId"] = new_ing.id

        return extracted
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR Scan failed: {str(e)}")

@router.post("/recipes/scan")
async def scan_recipe(
    request: Request,
    venueId: str,
    db: Session = Depends(get_db)
):
    try:
        # 1. Verify feature flag gating for inventory
        venue = verify_inventory_gating(venueId, db)
        org = db.query(models.Organization).filter(models.Organization.id == venue.organizationId).first()
        
        # 2. Get existing ingredients for the context
        if org and org.sharedInventory:
            ings = db.query(models.Ingredient).filter(models.Ingredient.organizationId == org.id).all()
        else:
            ings = db.query(models.Ingredient).filter(models.Ingredient.venueId == venueId).all()

        existing_ingredients = [
            {
                "id": i.id, 
                "name": i.name, 
                "unit": i.unit, 
                "density": float(i.density) if i.density is not None else 1.0
            } 
            for i in ings
        ]

        # 3. Read request content depending on the content-type
        content_type = request.headers.get("content-type", "")
        file_bytes = None
        mime_type = None
        text_content = None

        if "multipart/form-data" in content_type:
            form = await request.form()
            file_part = form.get("file")
            if not file_part:
                raise HTTPException(status_code=400, detail="File upload is required for multipart/form-data")
            
            # file_part is usually a Starlette UploadFile
            if hasattr(file_part, "read"):
                file_bytes = await file_part.read()
                mime_type = getattr(file_part, "content_type", None)
            else:
                raise HTTPException(status_code=400, detail="Uploaded object is not a readable file")
        else:
            # Fallback to JSON
            try:
                body = await request.json()
                text_content = body.get("text")
                if not text_content:
                    raise HTTPException(status_code=400, detail="Text description is required in JSON payload")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid JSON payload or missing fields: {str(e)}")

        # 4. Call recipe_ocr service
        extracted = recipe_ocr.parse_recipe(
            file_bytes=file_bytes,
            mime_type=mime_type,
            text_content=text_content,
            existing_ingredients=existing_ingredients
        )
        return extracted
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recipe scan failed: {str(e)}")

# ---------------------------------------------------------------------------
# 4. Recipes Endpoints
# ---------------------------------------------------------------------------
@router.get("/recipes", response_model=List[schemas.RecipeSchema])
def list_recipes(venueId: str, db: Session = Depends(get_db)):
    verify_inventory_gating(venueId, db)
    
    # Get all menu items with their recipes in this venue
    recipes = db.query(models.Recipe).join(
        models.MenuItem, models.Recipe.menuItemId == models.MenuItem.id
    ).join(
        models.Category, models.MenuItem.categoryId == models.Category.id
    ).filter(
        models.Category.venueId == venueId
    ).all()

    # Decorate Recipe schemas
    for r in recipes:
        r.menuItemName = r.menuItem.nameEn if r.menuItem else None
        r.menuItemPrice = r.menuItem.price if r.menuItem else None
        
        price = Decimal(str(r.menuItem.price)) if r.menuItem and r.menuItem.price else Decimal("0.0")
        cost = Decimal(str(r.currentCost))
        if price > Decimal("0.0"):
            r.currentMargin = (price - cost) / price
        else:
            r.currentMargin = Decimal("0.0")

        for ri in r.ingredients:
            if ri.ingredient:
                ri.ingredientName = ri.ingredient.name
                ri.ingredientUnit = ri.ingredient.unit
                ri.ingredientCost = ri.ingredient.weightedCost
                ri.lineCost = Decimal(str(ri.amountUsed)) * Decimal(str(ri.ingredient.weightedCost))
    
    return recipes

@router.post("/recipes", response_model=schemas.RecipeSchema, status_code=status.HTTP_201_CREATED)
def create_recipe(recipe_in: schemas.RecipeCreate, db: Session = Depends(get_db)):
    menu_item = db.query(models.MenuItem).filter(models.MenuItem.id == recipe_in.menuItemId).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu Item not found")
    
    category = db.query(models.Category).filter(models.Category.id == menu_item.categoryId).first()
    if not category:
         raise HTTPException(status_code=400, detail="Menu Item category not found")
    
    verify_inventory_gating(category.venueId, db)

    # Check duplicate
    existing = db.query(models.Recipe).filter(models.Recipe.menuItemId == recipe_in.menuItemId).first()
    if existing:
        raise HTTPException(status_code=400, detail="Recipe already exists for this menu item")

    db_recipe = models.Recipe(
        id=str(uuid.uuid4()),
        menuItemId=recipe_in.menuItemId,
        targetMargin=Decimal(str(recipe_in.targetMargin)),
        yieldQuantity=Decimal(str(recipe_in.yieldQuantity or 1.0)),
        yieldUnit=recipe_in.yieldUnit or "porsiyon",
        portionSize=Decimal(str(recipe_in.portionSize or 1.0)),
        totalYield=Decimal(str(recipe_in.totalYield or 1.0)),
        currentCost=Decimal("0.0")
    )
    db.add(db_recipe)
    db.flush()

    for item in recipe_in.ingredients:
        db_ri = models.RecipeIngredient(
            id=str(uuid.uuid4()),
            recipeId=db_recipe.id,
            ingredientId=item.ingredientId,
            amountUsed=Decimal(str(item.amountUsed))
        )
        db.add(db_ri)

    db.commit()
    db.refresh(db_recipe)

    # Recalculate cost
    costing.recalculate_recipe_cost(db, db_recipe.id)
    costing.check_margin_alert(db, db_recipe.id)
    db.commit()
    db.refresh(db_recipe)

    # Decorate
    db_recipe.menuItemName = menu_item.nameEn
    db_recipe.menuItemPrice = menu_item.price
    price = Decimal(str(menu_item.price)) if menu_item.price else Decimal("0.0")
    cost = Decimal(str(db_recipe.currentCost))
    db_recipe.currentMargin = (price - cost) / price if price > Decimal("0.0") else Decimal("0.0")

    for ri in db_recipe.ingredients:
        if ri.ingredient:
            ri.ingredientName = ri.ingredient.name
            ri.ingredientUnit = ri.ingredient.unit
            ri.ingredientCost = ri.ingredient.weightedCost
            ri.lineCost = Decimal(str(ri.amountUsed)) * Decimal(str(ri.ingredient.weightedCost))

    return db_recipe

@router.put("/recipes/{id}", response_model=schemas.RecipeSchema)
def update_recipe(id: str, recipe_in: schemas.RecipeUpdate, db: Session = Depends(get_db)):
    db_recipe = db.query(models.Recipe).filter(models.Recipe.id == id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    menu_item = db_recipe.menuItem
    category = db.query(models.Category).filter(models.Category.id == menu_item.categoryId).first()
    verify_inventory_gating(category.venueId, db)

    if recipe_in.targetMargin is not None:
        db_recipe.targetMargin = Decimal(str(recipe_in.targetMargin))
    if recipe_in.yieldQuantity is not None:
        db_recipe.yieldQuantity = Decimal(str(recipe_in.yieldQuantity))
    if recipe_in.yieldUnit is not None:
        db_recipe.yieldUnit = recipe_in.yieldUnit
    if recipe_in.portionSize is not None:
        db_recipe.portionSize = Decimal(str(recipe_in.portionSize))
    if recipe_in.totalYield is not None:
        db_recipe.totalYield = Decimal(str(recipe_in.totalYield))
    db_recipe.updatedAt = datetime.datetime.utcnow()

    # Update ingredients if provided
    if recipe_in.ingredients is not None:
        # Clear old ingredients
        db.query(models.RecipeIngredient).filter(models.RecipeIngredient.recipeId == id).delete()

        # Add new ingredients
        for item in recipe_in.ingredients:
            db_ri = models.RecipeIngredient(
                id=str(uuid.uuid4()),
                recipeId=id,
                ingredientId=item.ingredientId,
                amountUsed=Decimal(str(item.amountUsed))
            )
            db.add(db_ri)

    db.commit()
    db.refresh(db_recipe)

    # Recalculate cost
    costing.recalculate_recipe_cost(db, id)
    costing.check_margin_alert(db, id)
    db.commit()
    db.refresh(db_recipe)

    # Decorate
    db_recipe.menuItemName = menu_item.nameEn
    db_recipe.menuItemPrice = menu_item.price
    price = Decimal(str(menu_item.price)) if menu_item.price else Decimal("0.0")
    cost = Decimal(str(db_recipe.currentCost))
    db_recipe.currentMargin = (price - cost) / price if price > Decimal("0.0") else Decimal("0.0")

    for ri in db_recipe.ingredients:
        if ri.ingredient:
            ri.ingredientName = ri.ingredient.name
            ri.ingredientUnit = ri.ingredient.unit
            ri.ingredientCost = ri.ingredient.weightedCost
            ri.lineCost = Decimal(str(ri.amountUsed)) * Decimal(str(ri.ingredient.weightedCost))

    return db_recipe

@router.delete("/recipes/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(id: str, db: Session = Depends(get_db)):
    db_recipe = db.query(models.Recipe).filter(models.Recipe.id == id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    menu_item = db_recipe.menuItem
    category = db.query(models.Category).filter(models.Category.id == menu_item.categoryId).first()
    verify_inventory_gating(category.venueId, db)

    db.delete(db_recipe)
    db.commit()

@router.post("/recipes/{id}/recalculate", response_model=schemas.RecipeSchema)
def recalculate_recipe(id: str, db: Session = Depends(get_db)):
    db_recipe = db.query(models.Recipe).filter(models.Recipe.id == id).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    menu_item = db_recipe.menuItem
    category = db.query(models.Category).filter(models.Category.id == menu_item.categoryId).first()
    verify_inventory_gating(category.venueId, db)

    costing.recalculate_recipe_cost(db, id)
    costing.check_margin_alert(db, id)
    db.commit()
    db.refresh(db_recipe)

    # Decorate
    db_recipe.menuItemName = menu_item.nameEn
    db_recipe.menuItemPrice = menu_item.price
    price = Decimal(str(menu_item.price)) if menu_item.price else Decimal("0.0")
    cost = Decimal(str(db_recipe.currentCost))
    db_recipe.currentMargin = (price - cost) / price if price > Decimal("0.0") else Decimal("0.0")

    for ri in db_recipe.ingredients:
        if ri.ingredient:
            ri.ingredientName = ri.ingredient.name
            ri.ingredientUnit = ri.ingredient.unit
            ri.ingredientCost = ri.ingredient.weightedCost
            ri.lineCost = Decimal(str(ri.amountUsed)) * Decimal(str(ri.ingredient.weightedCost))

    return db_recipe

# ---------------------------------------------------------------------------
# 5. Profitability & Dashboard Endpoints
# ---------------------------------------------------------------------------
@router.get("/profitability", response_model=schemas.ProfitabilityDashboard)
def get_profitability(venueId: str, db: Session = Depends(get_db)):
    verify_inventory_gating(venueId, db)
    dashboard = costing.get_profitability_dashboard(db, venueId)
    return dashboard

# ---------------------------------------------------------------------------
# 6. Pricing Alerts & Rules Endpoints
# ---------------------------------------------------------------------------
@router.get("/alerts", response_model=List[schemas.PricingAlertSchema])
def list_alerts(venueId: str, db: Session = Depends(get_db)):
    verify_inventory_gating(venueId, db)
    alerts = db.query(models.PricingAlert).filter(
        models.PricingAlert.venueId == venueId,
        models.PricingAlert.isResolved == False
    ).order_by(models.PricingAlert.createdAt.desc()).all()

    for alert in alerts:
        if alert.menuItem:
            alert.menuItemName = alert.menuItem.nameEn
    return alerts

@router.put("/alerts/{id}/resolve", response_model=schemas.PricingAlertSchema)
def resolve_alert(id: str, db: Session = Depends(get_db)):
    alert = db.query(models.PricingAlert).filter(models.PricingAlert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    verify_inventory_gating(alert.venueId, db)
    alert.isResolved = True
    db.commit()
    db.refresh(alert)
    if alert.menuItem:
        alert.menuItemName = alert.menuItem.nameEn
    return alert

@router.get("/alert-rules", response_model=schemas.PricingAlertRuleSchema)
def get_alert_rule(venueId: str, db: Session = Depends(get_db)):
    verify_inventory_gating(venueId, db)
    rule = db.query(models.PricingAlertRule).filter(models.PricingAlertRule.venueId == venueId).first()
    if not rule:
        # Create default rule
        rule = models.PricingAlertRule(
            id=str(uuid.uuid4()),
            venueId=venueId,
            swingThreshold=Decimal("0.05"),
            stockDeductionMode="manual",
            autoSyncEnabled=False,
            isActive=True
        )
        db.add(rule)
        db.commit()
        db.refresh(rule)
    return rule

@router.put("/alert-rules", response_model=schemas.PricingAlertRuleSchema)
def update_alert_rule(venueId: str, rule_in: schemas.PricingAlertRuleCreate, db: Session = Depends(get_db)):
    verify_inventory_gating(venueId, db)
    rule = db.query(models.PricingAlertRule).filter(models.PricingAlertRule.venueId == venueId).first()
    if not rule:
        rule = models.PricingAlertRule(
            id=str(uuid.uuid4()),
            venueId=venueId
        )
        db.add(rule)
    
    rule.swingThreshold = Decimal(str(rule_in.swingThreshold))
    rule.stockDeductionMode = rule_in.stockDeductionMode
    rule.autoSyncEnabled = rule_in.autoSyncEnabled
    rule.isActive = rule_in.isActive
    rule.updatedAt = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(rule)
    return rule

# ---------------------------------------------------------------------------
# 7. Price Sync Endpoint
# ---------------------------------------------------------------------------
@router.post("/sync-prices", response_model=List[schemas.PriceSyncResult])
def sync_prices(req: schemas.PriceSyncRequest, venueId: str, db: Session = Depends(get_db)):
    verify_inventory_gating(venueId, db)
    
    # We load custom prices dictionary if present
    custom_prices_map = None
    if req.customPrices:
        custom_prices_map = {k: Decimal(str(v)) for k, v in req.customPrices.items()}

    results = costing.sync_prices(
        db=db,
        venue_id=venueId,
        menu_item_ids=req.menuItemIds,
        sync_type=req.syncType,
        custom_prices=custom_prices_map
    )
    
    # Try updating embeddings for synced items
    try:
        for res in results:
            item = db.query(models.MenuItem).filter(models.MenuItem.id == res.menuItemId).first()
            if item:
                # We can import embedding updates if defined in main.py
                try:
                    from main import update_menu_item_embedding
                    update_menu_item_embedding(db, item.id, item.nameTr, item.nameEn, item.descriptionTr, item.descriptionEn)
                except ImportError:
                    pass
    except Exception as e:
        print(f"Failed to update synced item embeddings: {e}")

    return results
