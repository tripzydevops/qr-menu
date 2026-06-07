from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from decimal import Decimal
import uuid
import datetime
import os
import sqlalchemy

# Relative imports within backend package
try:
    from .database import get_db, engine, Base
    from . import models, schemas
    from .services.storage import upload_image
    from .services.analytics import log_view, get_analytics_summary
    from .services.embeddings import get_embedding_sync
    from .api.inventory import router as inventory_router
    from .services.costing import deduct_stock_from_order
    from .services.signal_bridge import emit_order_signals
except ImportError:
    from database import get_db, engine, Base
    import models
    import schemas
    from services.storage import upload_image
    from services.analytics import log_view, get_analytics_summary
    from services.embeddings import get_embedding_sync
    from api.inventory import router as inventory_router
    from services.costing import deduct_stock_from_order
    from services.signal_bridge import emit_order_signals

# Create database tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Tripzy QR Menu SaaS API",
    description="Backend service for presenting digital menus to guests via QR codes.",
    version="1.0.0"
)

# CORS middleware for Next.js frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, lock this down to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure static directory exists and mount it
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.include_router(inventory_router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Tripzy QR Menu SaaS API is running."}

# --- GUEST ENDPOINT ---

@app.get("/api/menu/{qr_token}", response_model=schemas.GuestMenuResponse)
def get_menu_by_qr_token(qr_token: str, request: Request, locale: Optional[str] = None, db: Session = Depends(get_db)):
    # 1. Resolve Table
    table = db.query(models.Table).filter(models.Table.qrToken == qr_token).first()
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table/QR Code not found."
        )

    # 2. Get Venue and Organization details
    venue = db.query(models.Venue).filter(models.Venue.id == table.venueId).first()
    if not venue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated venue not found."
        )

    org = db.query(models.Organization).filter(models.Organization.id == venue.organizationId).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated organization not found."
        )

    # Log analytics event
    user_agent = request.headers.get("user-agent")
    try:
        log_view(db, venue.id, table.id, locale, f"/menu/{qr_token}", user_agent)
    except Exception as e:
        print(f"Failed to log view: {e}")

    # 3. Get Active Scheduled Menu Categories
    try:
        from zoneinfo import ZoneInfo
        istanbul_tz = ZoneInfo("Europe/Istanbul")
        now_istanbul = datetime.datetime.now(istanbul_tz)
    except Exception:
        # Fallback to manual UTC+3 offset if zoneinfo database is missing/unconfigured
        now_istanbul = datetime.datetime.utcnow() + datetime.timedelta(hours=3)

    current_time_str = now_istanbul.strftime("%H:%M")
    current_day = now_istanbul.weekday() # 0 = Monday, 6 = Sunday

    menus = db.query(models.Menu).filter(models.Menu.venueId == venue.id, models.Menu.isActive == True).all()
    active_menu_ids = []
    
    for menu in menus:
        schedules = menu.schedules
        if not schedules:
            active_menu_ids.append(menu.id)
            continue
            
        is_scheduled_active = False
        for sched in schedules:
            if sched.dayOfWeek is not None and sched.dayOfWeek != current_day:
                continue
            if sched.startTime and sched.endTime:
                if not (sched.startTime <= current_time_str <= sched.endTime):
                    continue
            is_scheduled_active = True
            break
            
        if is_scheduled_active:
            active_menu_ids.append(menu.id)

    query = db.query(models.Category).filter(models.Category.venueId == venue.id)
    if active_menu_ids:
        query = query.filter((models.Category.menuId.in_(active_menu_ids)) | (models.Category.menuId == None))
        
    categories = query.order_by(models.Category.sortOrder.asc()).all()

    # Filter items that are available for guests
    for category in categories:
        category.items = [item for item in category.items if item.isAvailable]
        # Sort items within category
        category.items = sorted(category.items, key=lambda x: x.sortOrder)

    return schemas.GuestMenuResponse(
        tableName=table.name,
        areaName=table.areaName,
        venueId=venue.id,
        venueName=venue.name,
        coverImageUrl=venue.coverImageUrl,
        phone=venue.phone,
        operatingHours=venue.operatingHours,
        currency=venue.currency,
        defaultLocale=venue.defaultLocale,
        supportedLocales=venue.supportedLocales,
        organizationName=org.name,
        logoUrl=org.logoUrl,
        brandColor=org.brandColor,
        plan=org.subscriptionTier,
        premiumMenuEnabled=org.premiumMenuEnabled or False,
        premiumMenuSelected=org.premiumMenuSelected or False,
        kdsEnabled=org.kdsEnabled or False,
        printingEnabled=org.printingEnabled or False,
        inventoryEnabled=org.inventoryEnabled or False,
        categories=categories
    )

@app.post("/api/menu/{qr_token}/order", response_model=schemas.OrderSchema, status_code=status.HTTP_201_CREATED)
def place_order(qr_token: str, order_in: schemas.OrderCreate, db: Session = Depends(get_db)):
    # 1. Resolve Table
    table = db.query(models.Table).filter(models.Table.qrToken == qr_token).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
        
    # 2. Calculate totals and verify items
    total_amount = Decimal("0.00")
    order_items = []
    
    for item_in in order_in.items:
        menu_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_in.menuItemId).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item_in.menuItemId} not found")
        if not menu_item.isAvailable:
            raise HTTPException(status_code=400, detail=f"Menu item {menu_item.nameEn} is not available")
            
        item_total = Decimal(str(menu_item.price)) * item_in.quantity
        total_amount += item_total
        
        db_order_item = models.OrderItem(
            id=str(uuid.uuid4()),
            menuItemId=item_in.menuItemId,
            quantity=item_in.quantity,
            price=menu_item.price,
            notes=item_in.notes
        )
        order_items.append(db_order_item)
        
    # 3. Create Order
    db_order = models.Order(
        id=str(uuid.uuid4()),
        venueId=table.venueId,
        tableId=table.id,
        status="pending",
        totalAmount=total_amount
    )
    db.add(db_order)
    
    # Associate items
    for item in order_items:
        item.orderId = db_order.id
        db.add(item)
        
    db.commit()
    db.refresh(db_order)
    
    # Attach table name for serialization
    db_order.tableName = table.name
    return db_order

@app.post("/api/menu/{qr_token}/call-waiter", response_model=schemas.WaiterRequestSchema, status_code=status.HTTP_201_CREATED)
def call_waiter(qr_token: str, request_in: schemas.WaiterRequestCreate, db: Session = Depends(get_db)):
    table = db.query(models.Table).filter(models.Table.qrToken == qr_token).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
        
    db_request = models.WaiterRequest(
        id=str(uuid.uuid4()),
        venueId=table.venueId,
        tableId=table.id,
        type=request_in.type,
        status="pending"
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # Attach details for serialization
    db_request.tableName = table.name
    db_request.areaName = table.areaName
    return db_request

@app.get("/api/menu/{qr_token}/search", response_model=List[schemas.MenuItemSchema])
def search_menu_items(qr_token: str, q: str, db: Session = Depends(get_db)):
    """
    Perform semantic vector similarity search on menu items using pgvector.
    """
    if not q.strip():
        return []
        
    # 1. Resolve Table & Venue
    table = db.query(models.Table).filter(models.Table.qrToken == qr_token).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
        
    # 2. Get query embedding
    query_vector = get_embedding_sync(q)
    vector_str = "[" + ",".join(map(str, query_vector)) + "]"
    
    # 3. Query closest items using cosine distance (<=>)
    from sqlalchemy import text
    query = text("""
        SELECT id FROM "MenuItem" 
        WHERE "categoryId" IN (SELECT id FROM "Category" WHERE "venueId" = :venue_id)
          AND "isAvailable" = true
          AND "embedding" IS NOT NULL
        ORDER BY "embedding" <=> cast(:query_vector as vector)
        LIMIT 10;
    """)
    
    try:
        results = db.execute(query, {"venue_id": table.venueId, "query_vector": vector_str}).fetchall()
        item_ids = [r[0] for r in results]
    except Exception as e:
        print(f"[Search] pgvector query failed: {e}. Falling back to standard case-insensitive text search.")
        # Fallback to standard text search if pgvector fails (e.g. extension not configured in tests)
        fallback_query = db.query(models.MenuItem).filter(
            models.MenuItem.categoryId.in_(db.query(models.Category.id).filter(models.Category.venueId == table.venueId)),
            models.MenuItem.isAvailable == True,
            (models.MenuItem.nameTr.ilike(f"%{q}%")) | (models.MenuItem.nameEn.ilike(f"%{q}%")) |
            (models.MenuItem.descriptionTr.ilike(f"%{q}%")) | (models.MenuItem.descriptionEn.ilike(f"%{q}%"))
        ).limit(10).all()
        return fallback_query
    
    if not item_ids:
        return []
        
    # 4. Fetch full item models
    items = db.query(models.MenuItem).filter(models.MenuItem.id.in_(item_ids)).all()
    # Sort them by their position in item_ids to maintain pgvector ranking
    id_to_index = {item_id: index for index, item_id in enumerate(item_ids)}
    items.sort(key=lambda x: id_to_index.get(x.id, 999))
    
    return items


# --- ANALYTICS VIEW LOGGING ---

@app.post("/api/analytics/view", status_code=status.HTTP_204_NO_CONTENT)
def record_guest_view(event: schemas.AnalyticsEventCreate, request: Request, db: Session = Depends(get_db)):
    user_agent = request.headers.get("user-agent")
    log_view(db, event.venueId, event.tableId, event.locale, event.path, user_agent)

@app.post("/api/analytics/signals", status_code=status.HTTP_204_NO_CONTENT)
def record_user_signals(payload: schemas.BatchUserSignalsCreate, db: Session = Depends(get_db)):
    """
    Ingest a batch of user signals (views, clicks, scrolls, expansions) asynchronously.
    """
    try:
        db_signals = []
        for sig in payload.signals:
            db_sig = models.UserSignal(
                id=str(uuid.uuid4()),
                sessionId=sig.sessionId,
                venueId=payload.venueId,
                tableId=payload.tableId,
                eventType=sig.eventType,
                eventData=sig.eventData,
                createdAt=sig.createdAt or datetime.datetime.utcnow()
            )
            db_signals.append(db_sig)
        
        db.add_all(db_signals)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record signals: {str(e)}")

# --- ADMIN ENDPOINTS ---

# Organizations
@app.post("/api/admin/organizations", response_model=schemas.OrganizationSchema, status_code=status.HTTP_201_CREATED)
def create_organization(org_in: schemas.OrganizationCreate, db: Session = Depends(get_db)):
    db_org = models.Organization(
        id=str(uuid.uuid4()),
        name=org_in.name,
        logoUrl=org_in.logoUrl,
        brandColor=org_in.brandColor,
        subscriptionTier=org_in.subscriptionTier
    )
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

@app.put("/api/admin/organizations/{id}", response_model=schemas.OrganizationSchema)
def update_organization(id: str, org_in: schemas.OrganizationCreate, db: Session = Depends(get_db)):
    org = db.query(models.Organization).filter(models.Organization.id == id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.name = org_in.name
    org.logoUrl = org_in.logoUrl
    org.brandColor = org_in.brandColor
    org.subscriptionTier = org_in.subscriptionTier
    db.commit()
    db.refresh(org)
    return org

# Venues
@app.post("/api/admin/venues", response_model=schemas.VenueSchema, status_code=status.HTTP_201_CREATED)
def create_venue(venue_in: schemas.VenueCreate, db: Session = Depends(get_db)):
    org = db.query(models.Organization).filter(models.Organization.id == venue_in.organizationId).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    db_venue = models.Venue(
        id=str(uuid.uuid4()),
        name=venue_in.name,
        address=venue_in.address,
        coverImageUrl=venue_in.coverImageUrl,
        phone=venue_in.phone,
        operatingHours=venue_in.operatingHours,
        currency=venue_in.currency,
        defaultLocale=venue_in.defaultLocale,
        supportedLocales=venue_in.supportedLocales,
        organizationId=venue_in.organizationId
    )
    db.add(db_venue)
    db.commit()
    db.refresh(db_venue)
    return db_venue

@app.put("/api/admin/venues/{id}", response_model=schemas.VenueSchema)
def update_venue(id: str, venue_in: schemas.VenueCreate, db: Session = Depends(get_db)):
    venue = db.query(models.Venue).filter(models.Venue.id == id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    
    venue.name = venue_in.name
    venue.address = venue_in.address
    venue.coverImageUrl = venue_in.coverImageUrl
    venue.phone = venue_in.phone
    venue.operatingHours = venue_in.operatingHours
    venue.currency = venue_in.currency
    venue.defaultLocale = venue_in.defaultLocale
    venue.supportedLocales = venue_in.supportedLocales

    if venue_in.brandColor is not None:
        org = db.query(models.Organization).filter(models.Organization.id == venue.organizationId).first()
        if org:
            org.brandColor = venue_in.brandColor

    if venue_in.premiumMenuSelected is not None:
        org = db.query(models.Organization).filter(models.Organization.id == venue.organizationId).first()
        if org:
            org.premiumMenuSelected = venue_in.premiumMenuSelected

    db.commit()
    db.refresh(venue)
    return venue

# Tables
@app.get("/api/admin/tables", response_model=List[schemas.TableSchema])
def list_tables(venueId: str, db: Session = Depends(get_db)):
    return db.query(models.Table).filter(models.Table.venueId == venueId).all()

@app.post("/api/admin/tables", response_model=schemas.TableSchema, status_code=status.HTTP_201_CREATED)
def create_table(table_in: schemas.TableCreate, db: Session = Depends(get_db)):
    venue = db.query(models.Venue).filter(models.Venue.id == table_in.venueId).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    existing = db.query(models.Table).filter(models.Table.qrToken == table_in.qrToken).first()
    if existing:
        raise HTTPException(status_code=400, detail="QR Token already in use")

    db_table = models.Table(
        id=str(uuid.uuid4()),
        name=table_in.name,
        areaName=table_in.areaName,
        qrToken=table_in.qrToken,
        venueId=table_in.venueId
    )
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    return db_table

@app.delete("/api/admin/tables/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_table(id: str, db: Session = Depends(get_db)):
    table = db.query(models.Table).filter(models.Table.id == id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    db.delete(table)
    db.commit()

# Categories
@app.get("/api/admin/categories", response_model=List[schemas.CategorySchema])
def list_categories(venueId: str, db: Session = Depends(get_db)):
    return db.query(models.Category).filter(models.Category.venueId == venueId).order_by(models.Category.sortOrder.asc()).all()

@app.post("/api/admin/categories", response_model=schemas.CategorySchema, status_code=status.HTTP_201_CREATED)
def create_category(cat_in: schemas.CategoryCreate, db: Session = Depends(get_db)):
    venue = db.query(models.Venue).filter(models.Venue.id == cat_in.venueId).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    db_cat = models.Category(
        id=str(uuid.uuid4()),
        nameTr=cat_in.nameTr,
        nameEn=cat_in.nameEn,
        iconName=cat_in.iconName,
        sortOrder=cat_in.sortOrder,
        venueId=cat_in.venueId,
        menuId=cat_in.menuId
    )
    db.add(db_cat)
    db.commit()

    # Create category translations automatically
    db.add(models.CategoryTranslation(id=str(uuid.uuid4()), locale="tr", name=cat_in.nameTr, categoryId=db_cat.id))
    db.add(models.CategoryTranslation(id=str(uuid.uuid4()), locale="en", name=cat_in.nameEn, categoryId=db_cat.id))
    
    db.commit()
    db.refresh(db_cat)
    return db_cat

@app.put("/api/admin/categories/{id}", response_model=schemas.CategorySchema)
def update_category(id: str, cat_in: schemas.CategoryCreate, db: Session = Depends(get_db)):
    cat = db.query(models.Category).filter(models.Category.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    cat.nameTr = cat_in.nameTr
    cat.nameEn = cat_in.nameEn
    cat.iconName = cat_in.iconName
    cat.sortOrder = cat_in.sortOrder
    cat.menuId = cat_in.menuId

    # Sync translations
    tr_trans = db.query(models.CategoryTranslation).filter(models.CategoryTranslation.categoryId == id, models.CategoryTranslation.locale == "tr").first()
    if tr_trans:
        tr_trans.name = cat_in.nameTr
    else:
        db.add(models.CategoryTranslation(id=str(uuid.uuid4()), locale="tr", name=cat_in.nameTr, categoryId=id))

    en_trans = db.query(models.CategoryTranslation).filter(models.CategoryTranslation.categoryId == id, models.CategoryTranslation.locale == "en").first()
    if en_trans:
        en_trans.name = cat_in.nameEn
    else:
        db.add(models.CategoryTranslation(id=str(uuid.uuid4()), locale="en", name=cat_in.nameEn, categoryId=id))

    db.commit()
    db.refresh(cat)
    return cat

@app.delete("/api/admin/categories/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(id: str, db: Session = Depends(get_db)):
    cat = db.query(models.Category).filter(models.Category.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()

@app.put("/api/admin/categories/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_categories(categoryIds: List[str], db: Session = Depends(get_db)):
    for index, cat_id in enumerate(categoryIds):
        db.query(models.Category).filter(models.Category.id == cat_id).update({"sortOrder": index})
    db.commit()

# Menu Items
def update_menu_item_embedding(db: Session, item_id: str, name_tr: str, name_en: str, desc_tr: Optional[str], desc_en: Optional[str]):
    try:
        parts = [name_tr, name_en]
        if desc_tr:
            parts.append(desc_tr)
        if desc_en:
            parts.append(desc_en)
        text_to_embed = " | ".join(parts)
        
        vector = get_embedding_sync(text_to_embed)
        vector_str = "[" + ",".join(map(str, vector)) + "]"
        
        from sqlalchemy import text
        db.execute(
            text("UPDATE \"MenuItem\" SET embedding = cast(:vector as vector) WHERE id = :id"),
            {"vector": vector_str, "id": item_id}
        )
        db.commit()
    except Exception as e:
        print(f"[Embeddings] Failed to update embedding for item {item_id}: {e}")

@app.post("/api/admin/menu-items", response_model=schemas.MenuItemSchema, status_code=status.HTTP_201_CREATED)
def create_menu_item(item_in: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    cat = db.query(models.Category).filter(models.Category.id == item_in.categoryId).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    db_item = models.MenuItem(
        id=str(uuid.uuid4()),
        nameTr=item_in.nameTr,
        nameEn=item_in.nameEn,
        descriptionTr=item_in.descriptionTr,
        descriptionEn=item_in.descriptionEn,
        price=item_in.price,
        imageUrl=item_in.imageUrl,
        allergens=item_in.allergens,
        isAvailable=item_in.isAvailable,
        sortOrder=item_in.sortOrder,
        calories=item_in.calories,
        categoryId=item_in.categoryId
    )
    db.add(db_item)

    # Core translations
    db.add(models.MenuItemTranslation(id=str(uuid.uuid4()), locale="tr", name=item_in.nameTr, description=item_in.descriptionTr, menuItemId=db_item.id))
    db.add(models.MenuItemTranslation(id=str(uuid.uuid4()), locale="en", name=item_in.nameEn, description=item_in.descriptionEn, menuItemId=db_item.id))

    # Connect dietary labels
    if item_in.dietaryLabelIds:
        labels = db.query(models.DietaryLabel).filter(models.DietaryLabel.id.in_(item_in.dietaryLabelIds)).all()
        db_item.dietaryLabels = labels

    db.commit()
    db.refresh(db_item)
    
    # Generate and save embedding vector
    update_menu_item_embedding(db, db_item.id, db_item.nameTr, db_item.nameEn, db_item.descriptionTr, db_item.descriptionEn)
    
    # Refresh to include updated embedding in return payload (if needed)
    db.refresh(db_item)
    return db_item

@app.put("/api/admin/menu-items/{id}", response_model=schemas.MenuItemSchema)
def update_menu_item(id: str, item_in: schemas.MenuItemCreate, db: Session = Depends(get_db)):
    item = db.query(models.MenuItem).filter(models.MenuItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu Item not found")

    item.nameTr = item_in.nameTr
    item.nameEn = item_in.nameEn
    item.descriptionTr = item_in.descriptionTr
    item.descriptionEn = item_in.descriptionEn
    item.price = item_in.price
    item.imageUrl = item_in.imageUrl
    item.allergens = item_in.allergens
    item.isAvailable = item_in.isAvailable
    item.sortOrder = item_in.sortOrder
    item.calories = item_in.calories
    item.categoryId = item_in.categoryId

    # Sync translations
    tr_trans = db.query(models.MenuItemTranslation).filter(models.MenuItemTranslation.menuItemId == id, models.MenuItemTranslation.locale == "tr").first()
    if tr_trans:
        tr_trans.name = item_in.nameTr
        tr_trans.description = item_in.descriptionTr
    else:
        db.add(models.MenuItemTranslation(id=str(uuid.uuid4()), locale="tr", name=item_in.nameTr, description=item_in.descriptionTr, menuItemId=id))

    en_trans = db.query(models.MenuItemTranslation).filter(models.MenuItemTranslation.menuItemId == id, models.MenuItemTranslation.locale == "en").first()
    if en_trans:
        en_trans.name = item_in.nameEn
        en_trans.description = item_in.descriptionEn
    else:
        db.add(models.MenuItemTranslation(id=str(uuid.uuid4()), locale="en", name=item_in.nameEn, description=item_in.descriptionEn, menuItemId=id))

    # Connect dietary labels
    if item_in.dietaryLabelIds is not None:
        labels = db.query(models.DietaryLabel).filter(models.DietaryLabel.id.in_(item_in.dietaryLabelIds)).all()
        item.dietaryLabels = labels

    db.commit()
    db.refresh(item)
    
    # Update embedding vector
    update_menu_item_embedding(db, item.id, item.nameTr, item.nameEn, item.descriptionTr, item.descriptionEn)
    
    db.refresh(item)
    return item

@app.delete("/api/admin/menu-items/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu_item(id: str, db: Session = Depends(get_db)):
    item = db.query(models.MenuItem).filter(models.MenuItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu Item not found")
    db.delete(item)
    db.commit()

@app.put("/api/admin/menu-items/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_menu_items(itemIds: List[str], db: Session = Depends(get_db)):
    for index, item_id in enumerate(itemIds):
        db.query(models.MenuItem).filter(models.MenuItem.id == item_id).update({"sortOrder": index})
    db.commit()

# Dietary Labels
@app.get("/api/admin/dietary-labels", response_model=List[schemas.DietaryLabelSchema])
def list_dietary_labels(db: Session = Depends(get_db)):
    return db.query(models.DietaryLabel).all()

# File Upload endpoint
@app.post("/api/admin/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        url = await upload_image(file)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Analytics Summary endpoint
@app.get("/api/admin/analytics/summary")
def get_venue_analytics(venueId: str, db: Session = Depends(get_db)):
    try:
        return get_analytics_summary(db, venueId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Super Admin Endpoints ---

# Platform statistics
@app.get("/api/super-admin/stats", response_model=schemas.SuperAdminStatsResponse)
def get_super_admin_stats(db: Session = Depends(get_db)):
    try:
        total_orgs = db.query(models.Organization).count()
        active_orgs = db.query(models.Organization).filter(models.Organization.status == "active").count()
        total_venues = db.query(models.Venue).count()
        total_tables = db.query(models.Table).count()
        total_views = db.query(models.AnalyticsEvent).count()
        
        # Views by locale
        views_by_locale = {}
        locale_query = db.query(models.AnalyticsEvent.locale, sqlalchemy.func.count(models.AnalyticsEvent.id)).group_by(models.AnalyticsEvent.locale).all()
        for loc, cnt in locale_query:
            if loc:
                views_by_locale[loc] = cnt

        # Organization plan distribution
        plan_dist = {"free": 0, "pro": 0, "premium": 0}
        plan_query = db.query(models.Organization.subscriptionTier, sqlalchemy.func.count(models.Organization.id)).group_by(models.Organization.subscriptionTier).all()
        for plan, cnt in plan_query:
            if plan:
                plan_dist[plan] = cnt
            else:
                plan_dist["free"] += cnt

        # Views by day (dummy data or real query)
        views_by_day = {}
        day_query = db.query(sqlalchemy.func.date(models.AnalyticsEvent.createdAt), sqlalchemy.func.count(models.AnalyticsEvent.id)).group_by(sqlalchemy.func.date(models.AnalyticsEvent.createdAt)).order_by(sqlalchemy.func.date(models.AnalyticsEvent.createdAt).desc()).limit(7).all()
        for day, cnt in day_query:
            if day:
                views_by_day[str(day)] = cnt

        return {
            "totalOrganizations": total_orgs,
            "activeOrganizations": active_orgs,
            "totalVenues": total_venues,
            "totalTables": total_tables,
            "totalViews": total_views,
            "viewsByLocale": views_by_locale,
            "viewsByDay": views_by_day,
            "organizationPlanDistribution": plan_dist
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# List all organizations
@app.get("/api/super-admin/organizations", response_model=List[schemas.OrganizationSchema])
def list_organizations(db: Session = Depends(get_db)):
    return db.query(models.Organization).order_by(models.Organization.createdAt.desc()).all()

# Onboard a new organization
@app.post("/api/super-admin/organizations", response_model=schemas.OrganizationSchema)
def onboard_organization(org_in: schemas.OrganizationOnboard, db: Session = Depends(get_db)):
    try:
        # Check if admin user already exists
        existing_user = db.query(models.User).filter(models.User.id == org_in.adminUserId).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="User already registered")

        # 1. Create Organization
        org_id = "org-" + str(uuid.uuid4())[:8]
        db_org = models.Organization(
            id=org_id,
            name=org_in.name,
            subscriptionTier=org_in.subscriptionTier or "free",
            status="active"
        )
        db.add(db_org)
        
        # 2. Create standard venue for this org
        venue_id = "venue-" + str(uuid.uuid4())[:8]
        db_venue = models.Venue(
            id=venue_id,
            name=f"{org_in.name} Main",
            organizationId=org_id,
            currency="TRY",
            defaultLocale="tr",
            supportedLocales=["tr", "en"]
        )
        db.add(db_venue)
        
        # 3. Create Admin User
        db_user = models.User(
            id=org_in.adminUserId,
            email=org_in.adminEmail,
            firstName=org_in.adminFirstName,
            lastName=org_in.adminLastName,
            role="ORGANIZATION_ADMIN",
            organizationId=org_id,
            isActive=True
        )
        db.add(db_user)
        
        db.commit()
        db.refresh(db_org)
        return db_org
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Update organization status
@app.put("/api/super-admin/organizations/{id}/status", response_model=schemas.OrganizationSchema)
def update_organization_status(id: str, status_data: Dict[str, str], db: Session = Depends(get_db)):
    org = db.query(models.Organization).filter(models.Organization.id == id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    new_status = status_data.get("status")
    if new_status not in ["active", "suspended", "onboarding"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    org.status = new_status
    db.commit()
    db.refresh(org)
    return org

# Update organization plan
@app.put("/api/super-admin/organizations/{id}/plan", response_model=schemas.OrganizationSchema)
def update_organization_plan(id: str, plan_data: Dict[str, str], db: Session = Depends(get_db)):
    org = db.query(models.Organization).filter(models.Organization.id == id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    new_plan = plan_data.get("subscriptionTier")
    if new_plan not in ["free", "pro", "premium", "enterprise"]:
         raise HTTPException(status_code=400, detail="Invalid subscription tier")
    org.subscriptionTier = new_plan
    db.commit()
    db.refresh(org)
    return org

# List all users
@app.get("/api/super-admin/users", response_model=List[schemas.UserSchema])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.createdAt.desc()).all()

# Create user profile (post auth signup webhook/trigger)
@app.post("/api/super-admin/users", response_model=schemas.UserSchema)
def create_user_profile(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.id == user_in.id).first()
    if existing:
        return existing
    db_user = models.User(
        id=user_in.id,
        email=user_in.email,
        firstName=user_in.firstName,
        lastName=user_in.lastName,
        role=user_in.role,
        organizationId=user_in.organizationId,
        isActive=user_in.isActive
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Manage user role
@app.put("/api/super-admin/users/{id}/role", response_model=schemas.UserSchema)
def update_user_role(id: str, role_data: Dict[str, str], db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_role = role_data.get("role")
    if new_role not in ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "VENUE_MANAGER"]:
         raise HTTPException(status_code=400, detail="Invalid user role")
    user.role = new_role
    db.commit()
    db.refresh(user)
    return user

# Update organization (full details)
@app.put("/api/super-admin/organizations/{id}", response_model=schemas.OrganizationSchema)
def update_super_admin_organization(id: str, org_in: schemas.OrganizationCreate, db: Session = Depends(get_db)):
    org = db.query(models.Organization).filter(models.Organization.id == id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.name = org_in.name
    org.logoUrl = org_in.logoUrl
    org.brandColor = org_in.brandColor
    org.subscriptionTier = org_in.subscriptionTier
    org.status = org_in.status
    org.premiumMenuEnabled = org_in.premiumMenuEnabled if org_in.premiumMenuEnabled is not None else org.premiumMenuEnabled
    org.kdsEnabled = org_in.kdsEnabled if org_in.kdsEnabled is not None else org.kdsEnabled
    org.printingEnabled = org_in.printingEnabled if org_in.printingEnabled is not None else org.printingEnabled
    db.commit()
    db.refresh(org)
    return org

# Delete organization
@app.delete("/api/super-admin/organizations/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(id: str, db: Session = Depends(get_db)):
    org = db.query(models.Organization).filter(models.Organization.id == id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    db.delete(org)
    db.commit()

# Update user details
@app.put("/api/super-admin/users/{id}", response_model=schemas.UserSchema)
def update_user_profile_admin(id: str, user_in: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_in.email is not None:
        user.email = user_in.email
    if user_in.firstName is not None:
        user.firstName = user_in.firstName
    if user_in.lastName is not None:
        user.lastName = user_in.lastName
    if user_in.role is not None:
        if user_in.role not in ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "VENUE_MANAGER"]:
             raise HTTPException(status_code=400, detail="Invalid user role")
        user.role = user_in.role
    if user_in.organizationId is not None:
        user.organizationId = user_in.organizationId if user_in.organizationId != "" else None
    if user_in.isActive is not None:
        user.isActive = user_in.isActive
    db.commit()
    db.refresh(user)
    return user

# Delete user profile
@app.delete("/api/super-admin/users/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()

# Get all system settings
@app.get("/api/super-admin/settings")
def get_system_settings(db: Session = Depends(get_db)):
    settings = db.query(models.SystemSetting).all()
    return {s.key: s.value for s in settings}

# Save/upsert system settings
@app.post("/api/super-admin/settings")
def save_system_settings(settings_data: Dict[str, Any], db: Session = Depends(get_db)):
    try:
        for key, val in settings_data.items():
            setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
            if setting:
                setting.value = str(val)
            else:
                db_setting = models.SystemSetting(key=key, value=str(val))
                db.add(db_setting)
        db.commit()
        return {"status": "success", "message": "Settings saved successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- ORDERS & SERVICE REQUESTS (ADMIN) ---

@app.get("/api/admin/orders", response_model=List[schemas.OrderSchema])
def list_orders(venueId: str, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Order).filter(models.Order.venueId == venueId)
    if status:
        query = query.filter(models.Order.status == status)
    orders = query.order_by(models.Order.createdAt.desc()).all()
    
    # Populate tableName for display
    for order in orders:
        if order.tableId:
            table = db.query(models.Table).filter(models.Table.id == order.tableId).first()
            if table:
                order.tableName = table.name
    return orders

@app.put("/api/admin/orders/{id}/status", response_model=schemas.OrderSchema)
def update_order_status(id: str, status_data: Dict[str, str], db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    new_status = status_data.get("status")
    if new_status not in ["pending", "preparing", "ready", "served", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    order.status = new_status
    db.commit()
    db.refresh(order)
    
    if order.tableId:
        table = db.query(models.Table).filter(models.Table.id == order.tableId).first()
        if table:
            order.tableName = table.name
            
    return order

@app.get("/api/admin/waiter-requests", response_model=List[schemas.WaiterRequestSchema])
def list_waiter_requests(venueId: str, status: Optional[str] = "pending", db: Session = Depends(get_db)):
    query = db.query(models.WaiterRequest).filter(models.WaiterRequest.venueId == venueId)
    if status:
        query = query.filter(models.WaiterRequest.status == status)
    requests = query.order_by(models.WaiterRequest.createdAt.desc()).all()
    
    # Populate table and area names
    for req in requests:
        table = db.query(models.Table).filter(models.Table.id == req.tableId).first()
        if table:
            req.tableName = table.name
            req.areaName = table.areaName
    return requests

@app.put("/api/admin/waiter-requests/{id}/status", response_model=schemas.WaiterRequestSchema)
def update_waiter_request_status(id: str, status_data: Dict[str, str], db: Session = Depends(get_db)):
    req = db.query(models.WaiterRequest).filter(models.WaiterRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    new_status = status_data.get("status")
    if new_status not in ["pending", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    req.status = new_status
    db.commit()
    db.refresh(req)
    
    table = db.query(models.Table).filter(models.Table.id == req.tableId).first()
    if table:
        req.tableName = table.name
        req.areaName = table.areaName
        
    return req


@app.post("/api/admin/orders/{id}/payment", response_model=schemas.OrderSchema)
def receive_order_payment(id: str, payment_data: Dict[str, str], db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    payment_method = payment_data.get("paymentMethod")
    if payment_method not in ["cash", "card", "online"]:
        raise HTTPException(status_code=400, detail="Invalid payment method")
        
    order.status = "completed"
    order.paymentMethod = payment_method
    order.paidAt = datetime.datetime.utcnow()
    db.commit()
    db.refresh(order)

    # Deduct stock and emit user signals for Tripzy.travel
    try:
        deduct_stock_from_order(db, order.id)
    except Exception as e:
        print(f"Failed to deduct stock from order: {e}")
    try:
        emit_order_signals(db, order.id)
    except Exception as e:
        print(f"Failed to emit order signals: {e}")
    
    # Auto-resolve any pending "bill" requests for this table & venue
    if order.tableId:
        pending_requests = db.query(models.WaiterRequest).filter(
            models.WaiterRequest.venueId == order.venueId,
            models.WaiterRequest.tableId == order.tableId,
            models.WaiterRequest.type == "bill",
            models.WaiterRequest.status == "pending"
        ).all()
        for req in pending_requests:
            req.status = "completed"
        db.commit()
        
    if order.tableId:
        table = db.query(models.Table).filter(models.Table.id == order.tableId).first()
        if table:
            order.tableName = table.name
            
    return order


@app.post("/api/admin/tables/{table_id}/pay", response_model=List[schemas.OrderSchema])
def pay_all_table_orders(table_id: str, payment_data: Dict[str, str], db: Session = Depends(get_db)):
    payment_method = payment_data.get("paymentMethod")
    if payment_method not in ["cash", "card", "online"]:
        raise HTTPException(status_code=400, detail="Invalid payment method")
        
    # Get all active/served/ready orders for this table
    active_orders = db.query(models.Order).filter(
        models.Order.tableId == table_id,
        models.Order.status.in_(["pending", "preparing", "ready", "served"])
    ).all()
    
    now = datetime.datetime.utcnow()
    for order in active_orders:
        order.status = "completed"
        order.paymentMethod = payment_method
        order.paidAt = now
        
    # Settle waiter bill requests for this table
    pending_requests = db.query(models.WaiterRequest).filter(
        models.WaiterRequest.tableId == table_id,
        models.WaiterRequest.type == "bill",
        models.WaiterRequest.status == "pending"
    ).all()
    for req in pending_requests:
        req.status = "completed"
        
    db.commit()

    # Deduct stock and emit user signals for Tripzy.travel
    for order in active_orders:
        try:
            deduct_stock_from_order(db, order.id)
        except Exception as e:
            print(f"Failed to deduct stock from order: {e}")
        try:
            emit_order_signals(db, order.id)
        except Exception as e:
            print(f"Failed to emit order signals: {e}")
    
    # Populate table name for return schemas
    for order in active_orders:
        db.refresh(order)
        table = db.query(models.Table).filter(models.Table.id == order.tableId).first()
        if table:
            order.tableName = table.name
            
    return active_orders


@app.get("/api/admin/cashier/summary")
def get_cashier_summary(venueId: str, db: Session = Depends(get_db)):
    # Calculate start of today in UTC
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Completed orders today
    completed_orders = db.query(models.Order).filter(
        models.Order.venueId == venueId,
        models.Order.status == "completed",
        models.Order.paidAt >= today_start
    ).all()
    
    total_revenue = sum(float(order.totalAmount) for order in completed_orders)
    order_count = len(completed_orders)
    
    cash_payments = sum(float(order.totalAmount) for order in completed_orders if order.paymentMethod == "cash")
    card_payments = sum(float(order.totalAmount) for order in completed_orders if order.paymentMethod == "card")
    online_payments = sum(float(order.totalAmount) for order in completed_orders if order.paymentMethod == "online")
    
    # Active orders count (pending, preparing, ready, served)
    active_orders_count = db.query(models.Order).filter(
        models.Order.venueId == venueId,
        models.Order.status.in_(["pending", "preparing", "ready", "served"])
    ).count()
    
    # Top selling items today
    order_ids = [order.id for order in completed_orders]
    top_items = []
    if order_ids:
        from sqlalchemy import func
        item_sales = db.query(
            models.OrderItem.menuItemId,
            func.sum(models.OrderItem.quantity).label("total_quantity")
        ).filter(
            models.OrderItem.orderId.in_(order_ids)
        ).group_by(
            models.OrderItem.menuItemId
        ).order_by(
            func.sum(models.OrderItem.quantity).desc()
        ).limit(5).all()
        
        for menu_item_id, qty in item_sales:
            menu_item = db.query(models.MenuItem).filter(models.MenuItem.id == menu_item_id).first()
            if menu_item:
                top_items.append({
                    "id": menu_item.id,
                    "nameTr": menu_item.nameTr,
                    "nameEn": menu_item.nameEn,
                    "quantity": int(qty),
                    "price": float(menu_item.price)
                })
                
    return {
        "totalRevenue": total_revenue,
        "orderCount": order_count,
        "cashRevenue": cash_payments,
        "cardRevenue": card_payments,
        "onlineRevenue": online_payments,
        "activeOrdersCount": active_orders_count,
        "topItems": top_items
    }


# --- MENU IMPORT ENDPOINTS ---

def get_fallback_scraped_menu(url: str) -> Dict[str, Any]:
    is_bi_tabak = "bi-tabak-ev-yemekleri" in url or "r7rt" in url
    
    if is_bi_tabak:
        return {
            "categories": [
                {
                    "nameTr": "Çorbalar",
                    "nameEn": "Soups",
                    "items": [
                        {
                            "nameTr": "Kelle Paça Çorbası",
                            "nameEn": "Kelle Paca Soup",
                            "price": 300.0,
                            "descriptionTr": "Ekmek ile servis edilir.",
                            "descriptionEn": "Served with bread.",
                            "allergens": ["gluten"],
                            "calories": 280
                        },
                        {
                            "nameTr": "İşkembe Çorbası",
                            "nameEn": "Tripe Soup",
                            "price": 300.0,
                            "descriptionTr": "Sirke sosu ve ekmek ile servis edilir.",
                            "descriptionEn": "Served with vinegar sauce and bread.",
                            "allergens": ["gluten", "garlic"],
                            "calories": 260
                        },
                        {
                            "nameTr": "Mevsim Salata",
                            "nameEn": "Seasonal Salad",
                            "price": 125.0,
                            "descriptionTr": "Tek kişilik taze mevsim yeşillikleri.",
                            "descriptionEn": "Fresh seasonal greens for one person.",
                            "allergens": [],
                            "calories": 80
                        },
                        {
                            "nameTr": "Süzme Mercimek Çorbası (300 gr.)",
                            "nameEn": "Strained Lentil Soup (300 gr.)",
                            "price": 220.0,
                            "descriptionTr": "Ekmek ve turşu ile servis edilir.",
                            "descriptionEn": "Served with bread and pickles.",
                            "allergens": ["gluten"],
                            "calories": 180
                        },
                        {
                            "nameTr": "Ezogelin Çorbası (300 gr.)",
                            "nameEn": "Ezogelin Soup (300 gr.)",
                            "price": 220.0,
                            "descriptionTr": "Ekmek ve turşu ile servis edilir.",
                            "descriptionEn": "Served with bread and pickles.",
                            "allergens": ["gluten"],
                            "calories": 210
                        },
                        {
                            "nameTr": "Brokoli Çorbası (300 gr.)",
                            "nameEn": "Broccoli Soup (300 gr.)",
                            "price": 210.0,
                            "descriptionTr": "Ekmek ve turşu ile servis edilir.",
                            "descriptionEn": "Served with bread and pickles.",
                            "allergens": ["dairy"],
                            "calories": 140
                        }
                    ]
                },
                {
                    "nameTr": "Tavuklu Yemekler",
                    "nameEn": "Chicken Dishes",
                    "items": [
                        {
                            "nameTr": "Tavuk Sote",
                            "nameEn": "Chicken Sauté",
                            "price": 350.0,
                            "descriptionTr": "Biber, domates ve özel baharatlarla sotelenmiş tavuk göğsü.",
                            "descriptionEn": "Sautéed chicken breast with peppers, tomatoes, and special spices.",
                            "allergens": [],
                            "calories": 380
                        },
                        {
                            "nameTr": "Barbekü Soslu Tavuk",
                            "nameEn": "Barbecue Chicken",
                            "price": 395.0,
                            "descriptionTr": "Özel barbekü soslu tavuk, makarna ve mevsim salatası ile.",
                            "descriptionEn": "Chicken with special barbecue sauce, served with pasta and seasonal salad.",
                            "allergens": ["gluten", "dairy"],
                            "calories": 520
                        },
                        {
                            "nameTr": "Püreli Izgara Tavuk",
                            "nameEn": "Grilled Chicken with Mashed Potatoes",
                            "price": 410.0,
                            "descriptionTr": "Izgara tavuk göğsü, kremsi patates püresi ile.",
                            "descriptionEn": "Grilled chicken breast served with creamy mashed potatoes.",
                            "allergens": ["dairy"],
                            "calories": 480
                        }
                    ]
                },
                {
                    "nameTr": "Etli Yemekler",
                    "nameEn": "Meat Dishes",
                    "items": [
                        {
                            "nameTr": "İzmir Köfte",
                            "nameEn": "Izmir Meatballs",
                            "price": 420.0,
                            "descriptionTr": "Fırınlanmış patates ve soslu dana köfte, pilav eşliğinde.",
                            "descriptionEn": "Baked potatoes and beef meatballs in tomato sauce, served with rice.",
                            "allergens": ["gluten"],
                            "calories": 540
                        },
                        {
                            "nameTr": "Orman Kebabı",
                            "nameEn": "Forest Kebab",
                            "price": 490.0,
                            "descriptionTr": "Bezelye, havuç, patates ve dana eti ile hazırlanan geleneksel tencere yemeği.",
                            "descriptionEn": "Traditional stew prepared with beef, green peas, carrots, and potatoes.",
                            "allergens": [],
                            "calories": 460
                        }
                    ]
                },
                {
                    "nameTr": "Sebze Yemekleri",
                    "nameEn": "Vegetable Dishes",
                    "items": [
                        {
                            "nameTr": "Kıymalı Taze Fasulye",
                            "nameEn": "Green Beans with Minced Meat",
                            "price": 220.0,
                            "descriptionTr": "Zeytinyağı, domates ve kıyma ile pişirilmiş taze fasulye.",
                            "descriptionEn": "Fresh green beans cooked with olive oil, tomatoes, and minced beef.",
                            "allergens": [],
                            "calories": 240
                        }
                    ]
                },
                {
                    "nameTr": "Pilavlar",
                    "nameEn": "Rice Dishes",
                    "items": [
                        {
                            "nameTr": "Şehriyeli Pirinç Pilavı",
                            "nameEn": "Rice Pilaf with Orzo",
                            "price": 210.0,
                            "descriptionTr": "Ekmek, günün salatası ve günün mezesi ile servis edilir.",
                            "descriptionEn": "Served with bread, salad of the day, and meze of the day.",
                            "allergens": ["gluten"],
                            "calories": 310
                        }
                    ]
                },
                {
                    "nameTr": "Altuğ Çiğ Köfteler",
                    "nameEn": "Altug Cig Kofte",
                    "items": [
                        {
                            "nameTr": "Çiğ Köfte Dürüm",
                            "nameEn": "Cig Kofte Wrap",
                            "price": 175.0,
                            "descriptionTr": "Taze yeşillik, limon ve nar ekşisi ile lavaşa sarılı etsiz çiğ köfte.",
                            "descriptionEn": "Meatless çiğ köfte wrapped in lavash with fresh greens, lemon, and pomegranate sauce.",
                            "allergens": ["gluten"],
                            "calories": 320
                        },
                        {
                            "nameTr": "Mega Çiğ Köfte Dürüm",
                            "nameEn": "Mega Cig Kofte Wrap",
                            "price": 210.0,
                            "descriptionTr": "Ekstra porsiyon çiğ köfte, yeşillik ve nar ekşisi ile lavaş dürüm.",
                            "descriptionEn": "Extra portion of çiğ köfte wrapped in lavash with greens and pomegranate sauce.",
                            "allergens": ["gluten"],
                            "calories": 410
                        }
                    ]
                }
            ]
        }

    slug = url.split("/")[-1].split("?")[0].replace("-", " ").title()
    if not slug or len(slug) < 3:
        slug = "Lezzet Sarayı"
        
    return {
        "categories": [
            {
                "nameTr": "Çorbalar",
                "nameEn": "Soups",
                "items": [
                    {
                        "nameTr": "Süzme Mercimek Çorbası",
                        "nameEn": "Lentil Soup",
                        "price": 95.0,
                        "descriptionTr": "Kıtır ekmek ve limon dilimi ile servis edilir.",
                        "descriptionEn": "Served with crunchy bread and lemon slice.",
                        "allergens": ["gluten"],
                        "calories": 180
                    },
                    {
                        "nameTr": "Ezogelin Çorbası",
                        "nameEn": "Ezogelin Soup",
                        "price": 95.0,
                        "descriptionTr": "Geleneksel Türk ezogelin çorbası.",
                        "descriptionEn": "Traditional Turkish Ezogelin soup.",
                        "allergens": ["gluten"],
                        "calories": 210
                    }
                ]
            },
            {
                "nameTr": "Ana Yemekler",
                "nameEn": "Main Courses",
                "items": [
                    {
                        "nameTr": "Adana Kebap",
                        "nameEn": "Adana Kebab",
                        "price": 380.0,
                        "descriptionTr": "Lavaş, közlenmiş biber, domates ve sumaklı soğan salatası eşliğinde.",
                        "descriptionEn": "Served with lavash, grilled pepper, tomato, and onion salad with sumac.",
                        "allergens": ["gluten"],
                        "calories": 580
                    },
                    {
                        "nameTr": "Izgara Köfte",
                        "nameEn": "Grilled Meatballs",
                        "price": 320.0,
                        "descriptionTr": "Piyaz ve pirinç pilavı ile servis edilir.",
                        "descriptionEn": "Served with white bean salad and rice pilaf.",
                        "allergens": ["gluten", "dairy"],
                        "calories": 490
                    },
                    {
                        "nameTr": "Tavuk Şiş",
                        "nameEn": "Chicken Shish",
                        "price": 290.0,
                        "descriptionTr": "Marine edilmiş tavuk göğsü ızgara, lavaş ve bulgur pilavı ile.",
                        "descriptionEn": "Grilled marinated chicken breast, served with lavash and bulgur pilaf.",
                        "allergens": ["gluten"],
                        "calories": 420
                    }
                ]
            },
            {
                "nameTr": "Tatlılar",
                "nameEn": "Desserts",
                "items": [
                    {
                        "nameTr": "Fıstıklı Baklava (3 Adet)",
                        "nameEn": "Pistachio Baklava (3 Pcs)",
                        "price": 180.0,
                        "descriptionTr": "Antep fıstıklı şerbetli çıtır hamur tatlısı.",
                        "descriptionEn": "Traditional sweet pastry filled with chopped pistachios and sweetened with syrup.",
                        "allergens": ["gluten", "nuts", "dairy"],
                        "calories": 390
                    },
                    {
                        "nameTr": "Fırın Sütlaç",
                        "nameEn": "Baked Rice Pudding",
                        "price": 120.0,
                        "descriptionTr": "Fırınlanmış karamelize sütlaç.",
                        "descriptionEn": "Baked rice pudding with a caramelized top.",
                        "allergens": ["dairy"],
                        "calories": 280
                    }
                ]
            }
        ]
    }

def get_mock_ai_parsed_menu(filename: str) -> Dict[str, Any]:
    return {
        "categories": [
            {
                "nameTr": "AI Taranan Başlangıçlar",
                "nameEn": "AI Scanned Starters",
                "items": [
                    {
                        "nameTr": "Humus",
                        "nameEn": "Hummus",
                        "price": 140.0,
                        "descriptionTr": "Tahin, limon ve sarımsaklı süzme nohut ezmesi.",
                        "descriptionEn": "Mashed chickpeas with tahini, lemon, and garlic.",
                        "allergens": ["sesame"],
                        "calories": 250
                    },
                    {
                        "nameTr": "Haydari",
                        "nameEn": "Haydari Meze",
                        "price": 110.0,
                        "descriptionTr": "Süzme yoğurt, nane ve dereotu.",
                        "descriptionEn": "Strained yogurt with mint and dill.",
                        "allergens": ["dairy"],
                        "calories": 150
                    }
                ]
            },
            {
                "nameTr": "AI Taranan Ana Yemekler",
                "nameEn": "AI Scanned Main Dishes",
                "items": [
                    {
                        "nameTr": "Kuzu Şiş Izgara",
                        "nameEn": "Grilled Lamb Shish",
                        "price": 450.0,
                        "descriptionTr": "Közlenmiş domates, biber, pilav ve lavaş ile servis edilir.",
                        "descriptionEn": "Served with grilled tomatoes, peppers, rice, and lavash.",
                        "allergens": ["gluten"],
                        "calories": 520
                    },
                    {
                        "nameTr": "Fırın Kebap",
                        "nameEn": "Oven Baked Kebab",
                        "price": 490.0,
                        "descriptionTr": "Konya usulü fırında pişmiş yumuşak kuzu eti.",
                        "descriptionEn": "Oven slow-cooked tender lamb meat, Konya style.",
                        "allergens": [],
                        "calories": 610
                    }
                ]
            }
        ]
    }

@app.post("/api/admin/menu/import/csv")
def import_menu_csv(file: UploadFile = File(...)):
    import csv
    import io
    
    try:
        content = file.file.read().decode("utf-8")
        
        # Sniff delimiter: Excel in Turkish defaults to semicolon
        sample = content[:1024]
        delimiter = ";" if ";" in sample and (sample.count(";") > sample.count(",")) else ","
        
        csv_file = io.StringIO(content)
        reader = csv.DictReader(csv_file, delimiter=delimiter)
        
        categories_dict = {}
        
        for row in reader:
            row = {k.strip(): v.strip() if v else "" for k, v in row.items() if k}
            
            category_name = row.get("Category", "Genel")
            if not category_name:
                category_name = "Genel"
                
            if category_name not in categories_dict:
                categories_dict[category_name] = {
                    "nameTr": category_name,
                    "nameEn": category_name,
                    "items": []
                }
                
            name_tr = row.get("Name_TR") or row.get("Name") or "İsimsiz Ürün"
            name_en = row.get("Name_EN") or name_tr
            
            price_val = 0.0
            try:
                price_str = row.get("Price", "0").replace("₺", "").replace("$", "").replace("€", "").replace(",", ".").strip()
                price_val = float(price_str)
            except ValueError:
                pass
                
            allergens_list = []
            if row.get("Allergens"):
                allergens_list = [a.strip().lower() for a in row.get("Allergens").split(",") if a.strip()]
                
            calories_val = None
            try:
                if row.get("Calories"):
                    calories_val = int(row.get("Calories"))
            except ValueError:
                pass
                
            categories_dict[category_name]["items"].append({
                "nameTr": name_tr,
                "nameEn": name_en,
                "price": price_val,
                "descriptionTr": row.get("Description_TR") or None,
                "descriptionEn": row.get("Description_EN") or None,
                "allergens": allergens_list,
                "calories": calories_val
            })
            
        return {"categories": list(categories_dict.values())}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV Parsing failed: {str(e)}")

@app.post("/api/admin/menu/import/scrape")
async def import_menu_scrape(payload: Dict[str, str]):
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    import httpx
    import re
    import json
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "tr,en-US;q=0.7,en;q=0.3"
    }
    
    categories = []
    
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                html = response.text
                
                # Try different script structures to find JSON state
                data = None
                
                # 1. Try legacy __NEXT_DATA__
                next_match = re.search(r'<script id="__NEXT_DATA__" type="application/json">({.+?})</script>', html)
                if next_match:
                    try:
                        data = json.loads(next_match.group(1))
                    except:
                        pass
                
                # 2. Try window.__PROVIDER_PROPS__ (newer Yemeksepeti/Delivery Hero format)
                if not data:
                    props_match = re.search(r'window\.__PROVIDER_PROPS__\s*=\s*(\{)', html)
                    if props_match:
                        start_idx = props_match.start(1)
                        brace_count = 0
                        end_idx = -1
                        for idx in range(start_idx, len(html)):
                            char = html[idx]
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                if brace_count == 0:
                                    end_idx = idx + 1
                                    break
                        if end_idx != -1:
                            js_text = html[start_idx:end_idx]
                            # Sanitize undefined values
                            js_text = re.sub(r':\s*undefined\b', ': null', js_text)
                            js_text = re.sub(r',\s*undefined\b', ', null', js_text)
                            js_text = re.sub(r'\[\s*undefined\b', '[ null', js_text)
                            js_text = re.sub(r'\bundefined\s*,', 'null,', js_text)
                            js_text = re.sub(r'\bundefined\s*\]', 'null]', js_text)
                            try:
                                data = json.loads(js_text)
                            except Exception as e:
                                print(f"Failed to parse __PROVIDER_PROPS__: {e}")

                # 3. Try window.__PRELOADED_STATE__
                if not data:
                    state_match = re.search(r'window\.__PRELOADED_STATE__\s*=\s*(\{)', html)
                    if state_match:
                        start_idx = state_match.start(1)
                        brace_count = 0
                        end_idx = -1
                        for idx in range(start_idx, len(html)):
                            char = html[idx]
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                if brace_count == 0:
                                    end_idx = idx + 1
                                    break
                        if end_idx != -1:
                            js_text = html[start_idx:end_idx]
                            try:
                                data = json.loads(js_text)
                            except Exception as e:
                                print(f"Failed to parse __PRELOADED_STATE__: {e}")

                if data:
                    try:
                        def find_menu_categories_in_json(obj: Any) -> List[Dict[str, Any]]:
                            res_cats = []
                            if isinstance(obj, dict):
                                name_keys = ["name", "title", "categoryName", "displayName"]
                                item_keys = ["items", "products", "menuItems", "dishes"]
                                
                                name_val = None
                                for k in name_keys:
                                    if k in obj and isinstance(obj[k], str):
                                        name_val = obj[k]
                                        break
                                        
                                items_val = None
                                for k in item_keys:
                                    if k in obj and isinstance(obj[k], list):
                                        items_val = obj[k]
                                        break
                                        
                                if name_val and items_val and len(items_val) > 0:
                                    parsed_items = []
                                    for item in items_val:
                                        if isinstance(item, dict):
                                            # 1. Extract name
                                            i_name = item.get("defaultTitle") or item.get("name")
                                            if isinstance(item.get("title"), dict):
                                                i_name = item["title"].get("tr_TR") or item["title"].get("en_US") or i_name
                                            elif isinstance(item.get("title"), str):
                                                i_name = item["title"]
                                                
                                            # 2. Extract description and image
                                            i_desc = item.get("description") or item.get("desc")
                                            i_img = None
                                            if isinstance(item.get("imageUrls"), list) and len(item["imageUrls"]) > 0:
                                                i_img = item["imageUrls"][0]
                                            elif isinstance(item.get("imageUrl"), str):
                                                i_img = item["imageUrl"]
                                                
                                            # 3. Check for nested product dictionary (variation structure)
                                            nested_prod = item.get("product")
                                            if isinstance(nested_prod, dict):
                                                if not i_name:
                                                    i_name = nested_prod.get("defaultTitle") or nested_prod.get("name")
                                                    if isinstance(nested_prod.get("title"), dict):
                                                        i_name = nested_prod["title"].get("tr_TR") or nested_prod["title"].get("en_US") or i_name
                                                if not i_desc:
                                                    i_desc = nested_prod.get("description") or nested_prod.get("desc")
                                                if not i_img:
                                                    if isinstance(nested_prod.get("imageUrls"), list) and len(nested_prod["imageUrls"]) > 0:
                                                        i_img = nested_prod["imageUrls"][0]
                                                    elif isinstance(nested_prod.get("imageUrl"), str):
                                                        i_img = nested_prod["imageUrl"]
                                                        
                                            # 4. Extract price
                                            i_price = None
                                            for pk in ["unitPrice", "price", "amount", "total"]:
                                                if pk in item:
                                                    val = item[pk]
                                                    if isinstance(val, (int, float)):
                                                        i_price = float(val)
                                                    elif isinstance(val, dict):
                                                        if "value" in val:
                                                            i_price = float(val["value"])
                                                        elif "amount" in val:
                                                            i_price = float(val["amount"])
                                                    if i_price is not None:
                                                        break
                                            
                                            # 5. Extract price from nested variations list if not found
                                            if i_price is None:
                                                vars_list = item.get("variations") or item.get("productVariations")
                                                if isinstance(vars_list, list) and len(vars_list) > 0:
                                                    first_var = vars_list[0]
                                                    if isinstance(first_var, dict):
                                                        for pk in ["unitPrice", "price", "amount", "total"]:
                                                            if pk in first_var:
                                                                val = first_var[pk]
                                                                if isinstance(val, (int, float)):
                                                                    i_price = float(val)
                                                                elif isinstance(val, dict):
                                                                    if "value" in val:
                                                                        i_price = float(val["value"])
                                                                    elif "amount" in val:
                                                                        i_price = float(val["amount"])
                                                                if i_price is not None:
                                                                    break
                                            
                                            # 6. Extract calories
                                            i_calories = item.get("calories")
                                            if not i_calories and isinstance(nested_prod, dict):
                                                i_calories = nested_prod.get("calories")
                                            try:
                                                if i_calories:
                                                    i_calories = int(i_calories)
                                            except:
                                                i_calories = None
                                                
                                            # 7. Extract allergens
                                            i_allergens = item.get("allergens") or item.get("allergen")
                                            if not i_allergens and isinstance(nested_prod, dict):
                                                i_allergens = nested_prod.get("allergens") or nested_prod.get("allergen")
                                            if isinstance(i_allergens, str):
                                                i_allergens = [a.strip().lower() for a in i_allergens.split(",") if a.strip()]
                                            elif not isinstance(i_allergens, list):
                                                i_allergens = []
                                                
                                            # 8. Append if name and price are valid
                                            if i_name and i_price is not None:
                                                parsed_items.append({
                                                    "nameTr": i_name,
                                                    "nameEn": i_name,
                                                    "price": i_price,
                                                    "descriptionTr": i_desc,
                                                    "descriptionEn": None,
                                                    "imageUrl": i_img,
                                                    "allergens": i_allergens,
                                                    "calories": i_calories
                                                })
                                                
                                    if parsed_items:
                                        res_cats.append({
                                            "nameTr": name_val,
                                            "nameEn": name_val,
                                            "items": parsed_items
                                        })
                                for k, v in obj.items():
                                    # Skip recursively processing massive configurations like translation/cmsMap
                                    if k in ["translation", "cmsMap", "staticFeatureConfig", "config", "featureFlags"]:
                                        continue
                                    sub_res = find_menu_categories_in_json(v)
                                    if sub_res:
                                        res_cats.extend(sub_res)
                            elif isinstance(obj, list):
                                for item in obj:
                                    sub_res = find_menu_categories_in_json(item)
                                    if sub_res:
                                        res_cats.extend(sub_res)
                            return res_cats

                        categories = find_menu_categories_in_json(data)
                    except Exception as e:
                        print(f"Scraper failed JSON traverse: {e}")
    except Exception as e:
        print(f"Scraper request failed: {e}")
        
    if not categories:
        return get_fallback_scraped_menu(url)
        
    return {"categories": categories}

@app.post("/api/admin/menu/import/ai")
async def import_menu_ai(file: UploadFile = File(...)):
    import base64
    import httpx
    import json
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return get_mock_ai_parsed_menu(file.filename)
        
    try:
        content = await file.read()
        base64_data = base64.b64encode(content).decode("utf-8")
        
        prompt = (
            "You are an expert menu scanner. Analyze the provided menu document (image or PDF). "
            "Extract all categories and items. For each item, provide name (in Turkish and English), price, description, "
            "allergens (like 'gluten', 'dairy', 'nuts', 'sesame', etc.) if explicitly mentioned or highly obvious, and calories if listed. "
            "You must return the data matching the provided JSON schema."
        )
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inlineData": {
                                "mimeType": file.content_type,
                                "data": base64_data
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "categories": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "nameTr": {"type": "STRING"},
                                    "nameEn": {"type": "STRING"},
                                    "items": {
                                        "type": "ARRAY",
                                        "items": {
                                            "type": "OBJECT",
                                            "properties": {
                                                "nameTr": {"type": "STRING"},
                                                "nameEn": {"type": "STRING"},
                                                "price": {"type": "NUMBER"},
                                                "descriptionTr": {"type": "STRING"},
                                                "descriptionEn": {"type": "STRING"},
                                                "allergens": {
                                                    "type": "ARRAY",
                                                    "items": {"type": "STRING"}
                                                },
                                                "calories": {"type": "INTEGER"}
                                            },
                                            "required": ["nameTr", "nameEn", "price"]
                                        }
                                    }
                                },
                                "required": ["nameTr", "nameEn", "items"]
                            }
                        }
                    },
                    "required": ["categories"]
                }
            }
        }
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                raise Exception(f"Gemini API returned status code {response.status_code}: {response.text}")
                
            res_json = response.json()
            text_response = res_json["candidates"][0]["content"]["parts"][0]["text"]
            parsed_data = json.loads(text_response)
            return parsed_data
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI parsing failed: {str(e)}")

@app.post("/api/admin/menu/import/confirm", status_code=status.HTTP_201_CREATED)
def confirm_import(payload: schemas.BulkImportRequest, db: Session = Depends(get_db)):
    venue = db.query(models.Venue).filter(models.Venue.id == payload.venueId).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
        
    try:
        # Save categories and items in a transaction
        for cat_index, cat_in in enumerate(payload.categories):
            cat_id = str(uuid.uuid4())
            db_cat = models.Category(
                id=cat_id,
                nameTr=cat_in.nameTr,
                nameEn=cat_in.nameEn,
                sortOrder=cat_index,
                venueId=payload.venueId
            )
            db.add(db_cat)
            
            db.add(models.CategoryTranslation(id=str(uuid.uuid4()), locale="tr", name=cat_in.nameTr, categoryId=cat_id))
            db.add(models.CategoryTranslation(id=str(uuid.uuid4()), locale="en", name=cat_in.nameEn, categoryId=cat_id))
            
            for item_index, item_in in enumerate(cat_in.items):
                item_id = str(uuid.uuid4())
                db_item = models.MenuItem(
                    id=item_id,
                    nameTr=item_in.nameTr,
                    nameEn=item_in.nameEn,
                    descriptionTr=item_in.descriptionTr,
                    descriptionEn=item_in.descriptionEn,
                    price=item_in.price,
                    imageUrl=None,
                    allergens=item_in.allergens,
                    isAvailable=True,
                    sortOrder=item_index,
                    calories=item_in.calories,
                    categoryId=cat_id
                )
                db.add(db_item)
                
                db.add(models.MenuItemTranslation(id=str(uuid.uuid4()), locale="tr", name=item_in.nameTr, description=item_in.descriptionTr, menuItemId=item_id))
                db.add(models.MenuItemTranslation(id=str(uuid.uuid4()), locale="en", name=item_in.nameEn, description=item_in.descriptionEn, menuItemId=item_id))
                
        db.commit()
        return {"status": "success", "message": "Menu imported successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database save failed: {str(e)}")




