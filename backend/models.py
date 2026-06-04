from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Numeric, Boolean, ARRAY
from sqlalchemy.orm import relationship
import datetime
from .database import Base

class Organization(Base):
    __tablename__ = "Organization"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    logoUrl = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venues = relationship("Venue", back_populates="organization", cascade="all, delete-orphan")

class Venue(Base):
    __tablename__ = "Venue"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    organizationId = Column(String, ForeignKey("Organization.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="venues")
    tables = relationship("Table", back_populates="venue", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="venue", cascade="all, delete-orphan")

class Table(Base):
    __tablename__ = "Table"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    qrToken = Column(String, unique=True, index=True, nullable=False)
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="tables")

class Category(Base):
    __tablename__ = "Category"

    id = Column(String, primary_key=True, index=True)
    nameTr = Column(String, nullable=False)
    nameEn = Column(String, nullable=False)
    sortOrder = Column(Integer, default=0)
    venueId = Column(String, ForeignKey("Venue.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="categories")
    items = relationship("MenuItem", back_populates="category", cascade="all, delete-orphan")

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
    categoryId = Column(String, ForeignKey("Category.id", ondelete="CASCADE"), nullable=False)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    category = relationship("Category", back_populates="items")
