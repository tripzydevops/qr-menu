from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import uuid

# Relative imports within backend package (or we run it with PYTHONPATH=.)
try:
    from .database import get_db, engine, Base
    from . import models, schemas
except ImportError:
    from database import get_db, engine, Base
    import models
    import schemas

# Create database tables if they do not exist (useful for quick local testing/fallback)
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

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Tripzy QR Menu SaaS API is running."}

# --- GUEST ENDPOINT ---

@app.get("/api/menu/{qr_token}", response_model=schemas.GuestMenuResponse)
def get_menu_by_qr_token(qr_token: str, db: Session = Depends(get_db)):
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

    # 3. Get Menu Categories & Items
    categories = db.query(models.Category).filter(
        models.Category.venueId == venue.id
    ).order_by(models.Category.sortOrder.asc()).all()

    # Filter items that are available for guests
    for category in categories:
        category.items = [item for item in category.items if item.isAvailable]

    return schemas.GuestMenuResponse(
        tableName=table.name,
        venueName=venue.name,
        organizationName=org.name,
        logoUrl=org.logoUrl,
        categories=categories
    )

# --- ADMIN ENDPOINTS (BASIC CRUD) ---

@app.post("/api/admin/organizations", response_model=schemas.OrganizationSchema, status_code=status.HTTP_201_CREATED)
def create_organization(org_in: schemas.OrganizationCreate, db: Session = Depends(get_db)):
    db_org = models.Organization(
        id=str(uuid.uuid4()),
        name=org_in.name,
        logoUrl=org_in.logoUrl
    )
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

@app.post("/api/admin/venues", response_model=schemas.VenueSchema, status_code=status.HTTP_201_CREATED)
def create_venue(venue_in: schemas.VenueCreate, db: Session = Depends(get_db)):
    # Verify organization exists
    org = db.query(models.Organization).filter(models.Organization.id == venue_in.organizationId).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    db_venue = models.Venue(
        id=str(uuid.uuid4()),
        name=venue_in.name,
        address=venue_in.address,
        organizationId=venue_in.organizationId
    )
    db.add(db_venue)
    db.commit()
    db.refresh(db_venue)
    return db_venue

@app.post("/api/admin/tables", response_model=schemas.TableSchema, status_code=status.HTTP_201_CREATED)
def create_table(table_in: schemas.TableCreate, db: Session = Depends(get_db)):
    # Verify venue exists
    venue = db.query(models.Venue).filter(models.Venue.id == table_in.venueId).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    # Double check unique token
    existing = db.query(models.Table).filter(models.Table.qrToken == table_in.qrToken).first()
    if existing:
        raise HTTPException(status_code=400, detail="QR Token already in use")

    db_table = models.Table(
        id=str(uuid.uuid4()),
        name=table_in.name,
        qrToken=table_in.qrToken,
        venueId=table_in.venueId
    )
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    return db_table

@app.post("/api/admin/categories", response_model=schemas.CategorySchema, status_code=status.HTTP_201_CREATED)
def create_category(cat_in: schemas.CategoryCreate, db: Session = Depends(get_db)):
    venue = db.query(models.Venue).filter(models.Venue.id == cat_in.venueId).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    db_cat = models.Category(
        id=str(uuid.uuid4()),
        nameTr=cat_in.nameTr,
        nameEn=cat_in.nameEn,
        sortOrder=cat_in.sortOrder,
        venueId=cat_in.venueId
    )
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

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
        categoryId=item_in.categoryId
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
