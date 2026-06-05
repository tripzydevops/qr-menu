from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime

# Translation Schemas
class MenuItemTranslationBase(BaseModel):
    locale: str
    name: str
    description: Optional[str] = None

class MenuItemTranslationCreate(MenuItemTranslationBase):
    menuItemId: str

class MenuItemTranslationSchema(MenuItemTranslationBase):
    id: str
    menuItemId: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class CategoryTranslationBase(BaseModel):
    locale: str
    name: str

class CategoryTranslationCreate(CategoryTranslationBase):
    categoryId: str

class CategoryTranslationSchema(CategoryTranslationBase):
    id: str
    categoryId: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Dietary Label Schemas
class DietaryLabelBase(BaseModel):
    key: str
    icon: Optional[str] = None

class DietaryLabelCreate(DietaryLabelBase):
    pass

class DietaryLabelSchema(DietaryLabelBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Menu Schedule Schemas
class MenuScheduleBase(BaseModel):
    dayOfWeek: Optional[int] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    startDate: Optional[datetime] = None
    endDate: Optional[datetime] = None

class MenuScheduleCreate(MenuScheduleBase):
    menuId: str

class MenuScheduleSchema(MenuScheduleBase):
    id: str
    menuId: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Menu Schemas
class MenuBase(BaseModel):
    name: str
    isActive: bool = True

class MenuCreate(MenuBase):
    venueId: str

class MenuSchema(MenuBase):
    id: str
    venueId: str
    schedules: List[MenuScheduleSchema] = []
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# MenuItem Schemas
class MenuItemBase(BaseModel):
    nameTr: str
    nameEn: str
    descriptionTr: Optional[str] = None
    descriptionEn: Optional[str] = None
    price: Decimal
    imageUrl: Optional[str] = None
    allergens: List[str] = []
    isAvailable: bool = True
    sortOrder: int = 0
    calories: Optional[int] = None

class MenuItemCreate(MenuItemBase):
    categoryId: str
    dietaryLabelIds: Optional[List[str]] = []

class MenuItemSchema(MenuItemBase):
    id: str
    categoryId: str
    dietaryLabels: List[DietaryLabelSchema] = []
    translations: List[MenuItemTranslationSchema] = []
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Category Schemas
class CategoryBase(BaseModel):
    nameTr: str
    nameEn: str
    iconName: Optional[str] = None
    sortOrder: int = 0
    menuId: Optional[str] = None

class CategoryCreate(CategoryBase):
    venueId: str

class CategorySchema(CategoryBase):
    id: str
    venueId: str
    items: List[MenuItemSchema] = []
    translations: List[CategoryTranslationSchema] = []
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Table Schemas
class TableBase(BaseModel):
    name: str
    areaName: Optional[str] = None
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

# Venue Schemas
class VenueBase(BaseModel):
    name: str
    address: Optional[str] = None
    coverImageUrl: Optional[str] = None
    phone: Optional[str] = None
    operatingHours: Optional[Dict[str, Any]] = None
    currency: str = "TRY"
    defaultLocale: str = "tr"
    supportedLocales: List[str] = ["tr", "en"]

class VenueCreate(VenueBase):
    organizationId: str

class VenueSchema(VenueBase):
    id: str
    organizationId: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Organization Schemas
class OrganizationBase(BaseModel):
    name: str
    logoUrl: Optional[str] = None
    brandColor: Optional[str] = None
    subscriptionTier: Optional[str] = "free"

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationSchema(OrganizationBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

# Analytics Schemas
class AnalyticsEventBase(BaseModel):
    venueId: str
    tableId: Optional[str] = None
    locale: Optional[str] = None
    path: Optional[str] = None
    userAgent: Optional[str] = None

class AnalyticsEventCreate(AnalyticsEventBase):
    pass

class AnalyticsEventSchema(AnalyticsEventBase):
    id: str
    createdAt: datetime

    class Config:
        from_attributes = True

# Guest Menu Page Fetch Response
class GuestMenuResponse(BaseModel):
    tableName: str
    areaName: Optional[str] = None
    venueId: str
    venueName: str
    coverImageUrl: Optional[str] = None
    phone: Optional[str] = None
    operatingHours: Optional[Dict[str, Any]] = None
    currency: str
    defaultLocale: str
    supportedLocales: List[str]
    organizationName: str
    logoUrl: Optional[str] = None
    brandColor: Optional[str] = None
    categories: List[CategorySchema]

