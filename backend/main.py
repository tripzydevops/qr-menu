from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
import datetime
import os

# Relative imports within backend package
try:
    from .database import get_db, engine, Base
    from . import models, schemas
    from .services.storage import upload_image
    from .services.analytics import log_view, get_analytics_summary
except ImportError:
    from database import get_db, engine, Base
    import models
    import schemas
    from services.storage import upload_image
    from services.analytics import log_view, get_analytics_summary

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
    current_time_str = datetime.datetime.now().strftime("%H:%M")
    current_day = datetime.datetime.now().weekday() # 0 = Monday, 6 = Sunday

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
        categories=categories
    )

# --- ANALYTICS VIEW LOGGING ---

@app.post("/api/analytics/view", status_code=status.HTTP_204_NO_CONTENT)
def record_guest_view(event: schemas.AnalyticsEventCreate, request: Request, db: Session = Depends(get_db)):
    user_agent = request.headers.get("user-agent")
    log_view(db, event.venueId, event.tableId, event.locale, event.path, user_agent)

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

