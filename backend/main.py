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

    if venue_in.brandColor is not None:
        org = db.query(models.Organization).filter(models.Organization.id == venue.organizationId).first()
        if org:
            org.brandColor = venue_in.brandColor

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
    if new_status not in ["pending", "preparing", "completed", "cancelled"]:
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



