import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load env variables from root or backend directory
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to local dev database if DATABASE_URL is not set
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/qrmenu"

# Remove pgbouncer query parameter since psycopg2/SQLAlchemy doesn't support it
if "pgbouncer=" in DATABASE_URL:
    if "?" in DATABASE_URL:
        base_url, query_str = DATABASE_URL.split("?", 1)
        params = [p for p in query_str.split("&") if not p.startswith("pgbouncer=")]
        if params:
            DATABASE_URL = f"{base_url}?{'&'.join(params)}"
        else:
            DATABASE_URL = base_url

# Create engine
engine = create_engine(DATABASE_URL)

# SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base
Base = declarative_base()

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
