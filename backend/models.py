from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Numeric, Boolean, ARRAY, Table as SQLTable, JSON
from sqlalchemy.orm import relationship
import datetime
try:
    from .database import Base
except ImportError:
    from database import Base

# Association table for MenuItem to DietaryLabel (Prisma convention)
menu_item_dietary_label = SQLTable(
    "_MenuItemToDietaryLabel",
    Base.metadata,
    Column("A", String, ForeignKey("MenuItem.id", ondelete="CASCADE"), primary_key=True),
    Column("B", String, ForeignKey("DietaryLabel.id", ondelete="CASCADE"), primary_key=True)
)

class Organization(Base):
    __tablename__ = "Organization"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    logoUrl = Column(String, nullable=True)
    brandColor = Column(String, nullable=True)
    subscriptionTier = Column(String, default="free")
    status = Column(String, default="active") # "active", "suspended", "onboarding"
    premiumMenuEnabled = Column(Boolean, default=False) # Super admin override for premium card style
    premiumMenuSelected = Column(Boolean, default=False) # Client setting to choose premium card style
    kdsEnabled = Column(Boolean, default=False)
    printingEnabled = Column(Boolean, default=False)
    inventoryEnabled = Column(Boolean, default=False)
    sharedInventory = Column(Boolean, default=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venues = relationship("Venue", back_populates="organization", cascade="all, delete-orphan")
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")

class Venue(Base):
    __tablename__ = "Venue"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    coverImageUrl = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    operatingHours = Column(JSON, nullable=True)
    currency = Column(String, default="TRY")
    defaultLocale = Column(String, default="tr")
    supportedLocales = Column(ARRAY(String), default=["tr", "en"])
    organizationId = Column(String, ForeignKey("Organization.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="venues")
    tables = relationship("Table", back_populates="venue", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="venue", cascade="all, delete-orphan")
    menus = relationship("Menu", back_populates="venue", cascade="all, delete-orphan")
    staff = relationship("VenueStaff", back_populates="venue", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="venue", cascade="all, delete-orphan")
    waiterRequests = relationship("WaiterRequest", back_populates="venue", cascade="all, delete-orphan")
    ingredients = relationship("Ingredient", back_populates="venue", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="venue", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="venue", cascade="all, delete-orphan")
    pricingAlerts = relationship("PricingAlert", back_populates="venue", cascade="all, delete-orphan")
    pricingAlertRule = relationship("PricingAlertRule", back_populates="venue", uselist=False, cascade="all, delete-orphan")


class Table(Base):
    __tablename__ = "Table"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    areaName = Column(String, nullable=True)
    qrToken = Column(String, unique=True, index=True, nullable=False)
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="tables")
    orders = relationship("Order", back_populates="table")
    waiterRequests = relationship("WaiterRequest", back_populates="table", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "Category"

    id = Column(String, primary_key=True, index=True)
    nameTr = Column(String, nullable=False)
    nameEn = Column(String, nullable=False)
    iconName = Column(String, nullable=True)
    sortOrder = Column(Integer, default=0)
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), nullable=False)
    menuId = Column(String, ForeignKey("Menu.id", ondelete="CASCADE"), nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="categories")
    menu = relationship("Menu", back_populates="categories")
    items = relationship("MenuItem", back_populates="category", cascade="all, delete-orphan")
    translations = relationship("CategoryTranslation", back_populates="category", cascade="all, delete-orphan")

class MenuItem(Base):
    __tablename__ = "MenuItem"

    id = Column(String, primary_key=True, index=True)
    nameTr = Column(String, nullable=False)
    nameEn = Column(String, nullable=False)
    descriptionTr = Column(String, nullable=True)
    descriptionEn = Column(String, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    imageUrl = Column(String, nullable=True)
    allergens = Column(ARRAY(String), nullable=True)
    isAvailable = Column(Boolean, default=True)
    sortOrder = Column(Integer, default=0)
    calories = Column(Integer, nullable=True)
    categoryId = Column(String, ForeignKey("Category.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    category = relationship("Category", back_populates="items")
    dietaryLabels = relationship("DietaryLabel", secondary=menu_item_dietary_label, back_populates="items")
    translations = relationship("MenuItemTranslation", back_populates="menuItem", cascade="all, delete-orphan")
    orderItems = relationship("OrderItem", back_populates="menuItem", cascade="all, delete-orphan")
    recipe = relationship("Recipe", back_populates="menuItem", uselist=False, cascade="all, delete-orphan")
    pricingAlerts = relationship("PricingAlert", back_populates="menuItem")


class MenuItemTranslation(Base):
    __tablename__ = "MenuItemTranslation"

    id = Column(String, primary_key=True, index=True)
    locale = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    menuItemId = Column(String, ForeignKey("MenuItem.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    menuItem = relationship("MenuItem", back_populates="translations")

class CategoryTranslation(Base):
    __tablename__ = "CategoryTranslation"

    id = Column(String, primary_key=True, index=True)
    locale = Column(String, nullable=False)
    name = Column(String, nullable=False)
    categoryId = Column(String, ForeignKey("Category.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    category = relationship("Category", back_populates="translations")

class DietaryLabel(Base):
    __tablename__ = "DietaryLabel"

    id = Column(String, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    icon = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    items = relationship("MenuItem", secondary=menu_item_dietary_label, back_populates="dietaryLabels")

class Menu(Base):
    __tablename__ = "Menu"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), nullable=False)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="menus")
    categories = relationship("Category", back_populates="menu")
    schedules = relationship("MenuSchedule", back_populates="menu", cascade="all, delete-orphan")

class MenuSchedule(Base):
    __tablename__ = "MenuSchedule"

    id = Column(String, primary_key=True, index=True)
    menuId = Column(String, ForeignKey("Menu.id", ondelete="CASCADE"), nullable=False)
    dayOfWeek = Column(Integer, nullable=True)
    startTime = Column(String, nullable=True)
    endTime = Column(String, nullable=True)
    startDate = Column(DateTime, nullable=True)
    endDate = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    menu = relationship("Menu", back_populates="schedules")

class AnalyticsEvent(Base):
    __tablename__ = "AnalyticsEvent"

    id = Column(String, primary_key=True, index=True)
    venueId = Column(String, nullable=False)
    tableId = Column(String, nullable=True)
    locale = Column(String, nullable=True)
    path = Column(String, nullable=True)
    userAgent = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = "User"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    firstName = Column(String, nullable=True)
    lastName = Column(String, nullable=True)
    role = Column(String, default="VENUE_MANAGER")
    organizationId = Column(String, ForeignKey("Organization.id", ondelete="CASCADE"), nullable=True)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="users")
    venues = relationship("VenueStaff", back_populates="user", cascade="all, delete-orphan")

class VenueStaff(Base):
    __tablename__ = "VenueStaff"

    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), primary_key=True)
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), primary_key=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="venues")
    venue = relationship("Venue", back_populates="staff")


class SystemSetting(Base):
    __tablename__ = "SystemSetting"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)


class Order(Base):
    __tablename__ = "Order"

    id = Column(String, primary_key=True, index=True)
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), nullable=False)
    tableId = Column(String, ForeignKey("Table.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="pending")  # "pending", "preparing", "completed", "cancelled"
    totalAmount = Column(Numeric(10, 2), nullable=False)
    paymentMethod = Column(String, nullable=True)
    paidAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="orders")
    table = relationship("Table", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "OrderItem"

    id = Column(String, primary_key=True, index=True)
    orderId = Column(String, ForeignKey("Order.id", ondelete="CASCADE"), nullable=False)
    menuItemId = Column(String, ForeignKey("MenuItem.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    notes = Column(String, nullable=True)

    order = relationship("Order", back_populates="items")
    menuItem = relationship("MenuItem", back_populates="orderItems")


class WaiterRequest(Base):
    __tablename__ = "WaiterRequest"

    id = Column(String, primary_key=True, index=True)
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), nullable=False)
    tableId = Column(String, ForeignKey("Table.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # "waiter", "bill"
    status = Column(String, default="pending")  # "pending", "completed"
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="waiterRequests")
    table = relationship("Table", back_populates="waiterRequests")

class UserSignal(Base):
    __tablename__ = "UserSignal"

    id = Column(String, primary_key=True, index=True)
    sessionId = Column(String, nullable=False)
    venueId = Column(String, nullable=False)
    tableId = Column(String, nullable=True)
    eventType = Column(String, nullable=False) # e.g. "view_item", "expand_item", "filter_dietary"
    eventData = Column(JSON, nullable=False) # Store dynamic dict parameters
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)


# =============================================
# INVENTORY COSTING & RECIPE ENGINE
# =============================================

class Ingredient(Base):
    __tablename__ = "Ingredient"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    unit = Column(String, nullable=False)  # "g", "ml", "unit", "kg", "liter"
    currentStock = Column(Numeric(14, 4), default=0)
    reorderLevel = Column(Numeric(14, 4), nullable=True)
    weightedCost = Column(Numeric(14, 6), default=0)  # WAC per unit
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), nullable=False)
    organizationId = Column(String, nullable=True)  # Used when sharedInventory=true
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="ingredients")
    invoiceItems = relationship("InvoiceItem", back_populates="ingredient", cascade="all, delete-orphan")
    recipeItems = relationship("RecipeIngredient", back_populates="ingredient", cascade="all, delete-orphan")
    costHistory = relationship("IngredientCostLog", back_populates="ingredient", cascade="all, delete-orphan")


class Supplier(Base):
    __tablename__ = "Supplier"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contactEmail = Column(String, nullable=True)
    contactPhone = Column(String, nullable=True)
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="suppliers")
    invoices = relationship("Invoice", back_populates="supplier", cascade="all, delete-orphan")


class Invoice(Base):
    __tablename__ = "Invoice"

    id = Column(String, primary_key=True, index=True)
    invoiceNumber = Column(String, nullable=True)
    supplierId = Column(String, ForeignKey("Supplier.id", ondelete="CASCADE"), nullable=False)
    invoiceDate = Column(DateTime, nullable=False)
    totalAmount = Column(Numeric(14, 2), nullable=False)
    status = Column(String, default="pending")  # "pending", "processed", "void"
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    supplier = relationship("Supplier", back_populates="invoices")
    venue = relationship("Venue", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "InvoiceItem"

    id = Column(String, primary_key=True, index=True)
    invoiceId = Column(String, ForeignKey("Invoice.id", ondelete="CASCADE"), nullable=False)
    ingredientId = Column(String, ForeignKey("Ingredient.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Numeric(14, 4), nullable=False)
    unitCost = Column(Numeric(14, 6), nullable=False)
    totalCost = Column(Numeric(14, 2), nullable=False)

    invoice = relationship("Invoice", back_populates="items")
    ingredient = relationship("Ingredient", back_populates="invoiceItems")


class Recipe(Base):
    __tablename__ = "Recipe"

    id = Column(String, primary_key=True, index=True)
    menuItemId = Column(String, ForeignKey("MenuItem.id", ondelete="CASCADE"), unique=True, nullable=False)
    targetMargin = Column(Numeric(5, 4), default=0.70)  # 70%
    currentCost = Column(Numeric(14, 4), default=0)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    menuItem = relationship("MenuItem", back_populates="recipe")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")


class RecipeIngredient(Base):
    __tablename__ = "RecipeIngredient"

    id = Column(String, primary_key=True, index=True)
    recipeId = Column(String, ForeignKey("Recipe.id", ondelete="CASCADE"), nullable=False)
    ingredientId = Column(String, ForeignKey("Ingredient.id", ondelete="CASCADE"), nullable=False)
    amountUsed = Column(Numeric(14, 4), nullable=False)

    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="recipeItems")


class IngredientCostLog(Base):
    __tablename__ = "IngredientCostLog"

    id = Column(String, primary_key=True, index=True)
    ingredientId = Column(String, ForeignKey("Ingredient.id", ondelete="CASCADE"), nullable=False)
    oldCost = Column(Numeric(14, 6), nullable=False)
    newCost = Column(Numeric(14, 6), nullable=False)
    reason = Column(String, nullable=False)  # "invoice", "manual_adjustment"
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)

    ingredient = relationship("Ingredient", back_populates="costHistory")


class PricingAlert(Base):
    __tablename__ = "PricingAlert"

    id = Column(String, primary_key=True, index=True)
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), nullable=False)
    menuItemId = Column(String, ForeignKey("MenuItem.id"), nullable=False)
    recipeId = Column(String, nullable=False)
    alertType = Column(String, nullable=False)  # "margin_drop", "low_stock", "cost_spike"
    message = Column(String, nullable=False)
    currentMargin = Column(Numeric(5, 4), nullable=False)
    targetMargin = Column(Numeric(5, 4), nullable=False)
    suggestedPrice = Column(Numeric(14, 2), nullable=True)
    isResolved = Column(Boolean, default=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="pricingAlerts")
    menuItem = relationship("MenuItem", back_populates="pricingAlerts")


class PricingAlertRule(Base):
    __tablename__ = "PricingAlertRule"

    id = Column(String, primary_key=True, index=True)
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), unique=True, nullable=False)
    swingThreshold = Column(Numeric(5, 4), default=0.05)  # 5%
    stockDeductionMode = Column(String, default="manual")  # "auto" or "manual"
    autoSyncEnabled = Column(Boolean, default=False)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="pricingAlertRule")

