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
    showOnMenu: bool = True
    isDeleted: bool = False
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
    brandColor: Optional[str] = None
    premiumMenuSelected: Optional[bool] = None

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
    status: Optional[str] = "active"
    premiumMenuEnabled: Optional[bool] = False
    premiumMenuSelected: Optional[bool] = False
    kdsEnabled: Optional[bool] = False
    printingEnabled: Optional[bool] = False
    inventoryEnabled: Optional[bool] = False
    sharedInventory: Optional[bool] = False

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

# User Signal Schemas
class UserSignalBase(BaseModel):
    sessionId: str
    eventType: str
    eventData: Dict[str, Any]
    createdAt: Optional[datetime] = None

class UserSignalCreate(UserSignalBase):
    pass

class UserSignalSchema(UserSignalBase):
    id: str
    venueId: str
    tableId: Optional[str] = None
    createdAt: datetime

    class Config:
        from_attributes = True

class BatchUserSignalsCreate(BaseModel):
    venueId: str
    tableId: Optional[str] = None
    signals: List[UserSignalCreate]

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
    plan: Optional[str] = None
    premiumMenuEnabled: Optional[bool] = False
    premiumMenuSelected: Optional[bool] = False
    kdsEnabled: Optional[bool] = False
    printingEnabled: Optional[bool] = False
    inventoryEnabled: Optional[bool] = False
    categories: List[CategorySchema]

# User Schemas
class UserBase(BaseModel):
    email: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    role: str = "VENUE_MANAGER"
    organizationId: Optional[str] = None
    isActive: bool = True

class UserCreate(UserBase):
    id: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    role: Optional[str] = None
    organizationId: Optional[str] = None
    isActive: Optional[bool] = None

class UserSchema(UserBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class VenueStaffSchema(BaseModel):
    userId: str
    venueId: str
    createdAt: datetime

    class Config:
        from_attributes = True

# Super Admin Stats Schemas
class SuperAdminStatsResponse(BaseModel):
    totalOrganizations: int
    activeOrganizations: int
    totalVenues: int
    totalTables: int
    totalViews: int
    viewsByLocale: Dict[str, int]
    viewsByDay: Dict[str, int]
    organizationPlanDistribution: Dict[str, int]

# Organization Onboarding Schema
class OrganizationOnboard(BaseModel):
    name: str
    adminEmail: str
    adminFirstName: Optional[str] = None
    adminLastName: Optional[str] = None
    adminUserId: str
    subscriptionTier: Optional[str] = "free"


# --- ORDER & WAITER REQUEST SCHEMAS ---

class OrderItemBase(BaseModel):
    menuItemId: str
    quantity: int
    notes: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemSchema(OrderItemBase):
    id: str
    orderId: str
    price: Decimal
    
    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    status: str = "pending"

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]

class AdminOrderCreate(BaseModel):
    venueId: str
    tableId: Optional[str] = None
    items: List[OrderItemCreate]

class OrderSchema(OrderBase):
    id: str
    venueId: str
    tableId: Optional[str] = None
    tableName: Optional[str] = None
    totalAmount: Decimal
    paymentMethod: Optional[str] = None
    paidAt: Optional[datetime] = None
    items: List[OrderItemSchema] = []
    isArchived: bool = False
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class WaiterRequestBase(BaseModel):
    type: str # "waiter", "bill"
    status: str = "pending"

class WaiterRequestCreate(WaiterRequestBase):
    pass

class WaiterRequestSchema(WaiterRequestBase):
    id: str
    venueId: str
    tableId: str
    tableName: Optional[str] = None
    areaName: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


# --- SPLIT PAYMENT SCHEMAS ---

class SplitPaymentItem(BaseModel):
    amount: Decimal
    paymentMethod: str  # "cash" | "card"
    label: Optional[str] = None
    orderItemIds: List[str] = []

class SplitPaymentCreate(BaseModel):
    splitMode: str  # "equal" | "by_item" | "by_amount"
    payments: List[SplitPaymentItem]

class PaymentSchema(BaseModel):
    id: str
    venueId: str
    tableId: str
    amount: Decimal
    paymentMethod: str
    splitMode: str
    label: Optional[str] = None
    orderIds: List[str] = []
    orderItemIds: List[str] = []
    createdAt: datetime

    class Config:
        from_attributes = True


# --- IMPORT SCHEMAS ---

class BulkImportMenuItem(BaseModel):
    nameTr: str
    nameEn: str
    price: Decimal
    descriptionTr: Optional[str] = None
    descriptionEn: Optional[str] = None
    allergens: List[str] = []
    calories: Optional[int] = None

class BulkImportCategory(BaseModel):
    nameTr: str
    nameEn: str
    items: List[BulkImportMenuItem]

class BulkImportRequest(BaseModel):
    venueId: str
    categories: List[BulkImportCategory]



# --- INVENTORY COSTING & RECIPE ENGINE SCHEMAS ---

# Ingredient
class IngredientBase(BaseModel):
    name: str
    unit: str  # "g", "ml", "kg", "liter", "unit"
    reorderLevel: Optional[Decimal] = None
    density: Decimal = Decimal("1.0")
    lastBrand: Optional[str] = None

class IngredientCreate(IngredientBase):
    venueId: str

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    reorderLevel: Optional[Decimal] = None
    density: Optional[Decimal] = None
    lastBrand: Optional[str] = None

class IngredientSchema(IngredientBase):
    id: str
    currentStock: Decimal
    weightedCost: Decimal
    venueId: str
    organizationId: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    class Config:
        from_attributes = True

# Supplier
class SupplierBase(BaseModel):
    name: str
    contactEmail: Optional[str] = None
    contactPhone: Optional[str] = None

class SupplierCreate(SupplierBase):
    venueId: str

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contactEmail: Optional[str] = None
    contactPhone: Optional[str] = None

class SupplierSchema(SupplierBase):
    id: str
    venueId: str
    createdAt: datetime
    updatedAt: datetime
    class Config:
        from_attributes = True

# Invoice & InvoiceItem
class InvoiceItemCreate(BaseModel):
    ingredientId: str
    quantity: Decimal
    unitCost: Decimal
    vatRate: Optional[Decimal] = Decimal("0.01")
    isVatInclusive: Optional[bool] = False
    rawName: Optional[str] = None
    brand: Optional[str] = None

class InvoiceItemSchema(BaseModel):
    id: str
    ingredientId: str
    ingredientName: Optional[str] = None
    ingredientUnit: Optional[str] = None
    quantity: Decimal
    unitCost: Decimal
    vatRate: Decimal
    isVatInclusive: bool
    totalCost: Decimal
    rawName: Optional[str] = None
    brand: Optional[str] = None
    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    invoiceNumber: Optional[str] = None
    supplierId: str
    invoiceDate: datetime
    venueId: str
    items: List[InvoiceItemCreate]

class InvoiceSchema(BaseModel):
    id: str
    invoiceNumber: Optional[str] = None
    supplierId: str
    supplierName: Optional[str] = None
    invoiceDate: datetime
    totalAmount: Decimal
    status: str
    venueId: str
    items: List[InvoiceItemSchema] = []
    isArchived: bool = False
    createdAt: datetime
    updatedAt: datetime
    class Config:
        from_attributes = True

# Recipe & RecipeIngredient
class RecipeIngredientCreate(BaseModel):
    ingredientId: str
    amountUsed: Decimal

class RecipeIngredientSchema(BaseModel):
    id: str
    ingredientId: str
    ingredientName: Optional[str] = None
    ingredientUnit: Optional[str] = None
    ingredientCost: Optional[Decimal] = None
    amountUsed: Decimal
    lineCost: Optional[Decimal] = None  # amountUsed * weightedCost
    class Config:
        from_attributes = True

class RecipeCreate(BaseModel):
    menuItemId: str
    targetMargin: Decimal = Decimal("0.70")
    yieldQuantity: Optional[Decimal] = Decimal("1.0")
    yieldUnit: Optional[str] = "porsiyon"
    portionSize: Optional[Decimal] = Decimal("1.0")
    totalYield: Optional[Decimal] = Decimal("1.0")
    ingredients: List[RecipeIngredientCreate]

class RecipeUpdate(BaseModel):
    targetMargin: Optional[Decimal] = None
    yieldQuantity: Optional[Decimal] = None
    yieldUnit: Optional[str] = None
    portionSize: Optional[Decimal] = None
    totalYield: Optional[Decimal] = None
    ingredients: Optional[List[RecipeIngredientCreate]] = None

class RecipeSchema(BaseModel):
    id: str
    menuItemId: str
    menuItemName: Optional[str] = None
    menuItemPrice: Optional[Decimal] = None
    targetMargin: Decimal
    yieldQuantity: Decimal
    yieldUnit: str
    portionSize: Decimal
    totalYield: Decimal
    currentCost: Decimal
    currentMargin: Optional[Decimal] = None
    isDeleted: bool = False
    ingredients: List[RecipeIngredientSchema] = []
    createdAt: datetime
    updatedAt: datetime
    class Config:
        from_attributes = True

# Pricing Alert
class PricingAlertSchema(BaseModel):
    id: str
    venueId: str
    menuItemId: str
    menuItemName: Optional[str] = None
    recipeId: str
    alertType: str
    message: str
    currentMargin: Decimal
    targetMargin: Decimal
    suggestedPrice: Optional[Decimal] = None
    isResolved: bool
    createdAt: datetime
    class Config:
        from_attributes = True

# Pricing Alert Rule
class PricingAlertRuleCreate(BaseModel):
    swingThreshold: Decimal = Decimal("0.05")
    stockDeductionMode: str = "manual"  # "auto" or "manual"
    autoSyncEnabled: bool = False
    isActive: bool = True

class PricingAlertRuleSchema(PricingAlertRuleCreate):
    id: str
    venueId: str
    createdAt: datetime
    updatedAt: datetime
    class Config:
        from_attributes = True

# Profitability Dashboard
class MenuItemProfitability(BaseModel):
    menuItemId: str
    menuItemName: str
    menuPrice: Decimal
    recipeCost: Decimal
    margin: Decimal          # (price - cost) / price
    targetMargin: Decimal
    marginDeviation: Decimal # target - current
    suggestedPrice: Decimal  # cost / (1 - targetMargin)
    status: str              # "healthy", "warning", "critical"

class ProfitabilityDashboard(BaseModel):
    venueId: str
    totalMenuItems: int
    itemsWithRecipes: int
    healthyCount: int
    warningCount: int
    criticalCount: int
    averageMargin: Decimal
    items: List[MenuItemProfitability]

# Price Sync
class PriceSyncRequest(BaseModel):
    venueId: str
    menuItemIds: List[str]
    syncType: str = "suggested"  # "suggested" or "custom"
    customPrices: Optional[Dict[str, Decimal]] = None

class PriceSyncResult(BaseModel):
    menuItemId: str
    menuItemName: str
    oldPrice: Decimal
    newPrice: Decimal
    newMargin: Decimal
