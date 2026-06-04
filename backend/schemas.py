from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

class MenuItemBase(BaseModel):
    nameTr: str
    nameEn: str
    descriptionTr: Optional[str] = None
    descriptionEn: Optional[str] = None
    price: Decimal
    imageUrl: Optional[str] = None
    allergens: List[str] = []
    isAvailable: bool = True

class MenuItemCreate(MenuItemBase):
    categoryId: str

class MenuItemSchema(MenuItemBase):
    id: str
    categoryId: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    nameTr: str
    nameEn: str
    sortOrder: int = 0

class CategoryCreate(CategoryBase):
    venueId: str

class CategorySchema(CategoryBase):
    id: str
    venueId: str
    items: List[MenuItemSchema] = []
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class TableBase(BaseModel):
    name: str
    qrToken: str

class TableCreate(TableBase):
    venueId: str

class TableSchema(TableBase):
    id: str
    venueId: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class VenueBase(BaseModel):
    name: str
    address: Optional[str] = None

class VenueCreate(VenueBase):
    organizationId: str

class VenueSchema(VenueBase):
    id: str
    organizationId: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class OrganizationBase(BaseModel):
    name: str
    logoUrl: Optional[str] = None

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationSchema(OrganizationBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Combined schema for QR menu page fetch
class GuestMenuResponse(BaseModel):
    tableName: str
    venueName: str
    organizationName: str
    logoUrl: Optional[str] = None
    categories: List[CategorySchema]
