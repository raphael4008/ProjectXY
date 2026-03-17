from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Construct the Database URL
# Sync URL for standard requests (using psycopg2 or similar)
# We need to make sure the driver is installed. 
# The config uses "postgresql+asyncpg" for async, but for the basic sync endpoints we might want synchronous.
# For simplicity in this "wiring phase", we will use synchronous `psycopg2` or `psycopg` if available,
# or just standard SQL Alchemy Sync.

# Let's check config again. settings.SQLALCHEMY_DATABASE_URI is built with postgresql+asyncpg.
# For simplicity with FastAPI dependencies (yield), sync is often easier unless we go full async.
# Given the constraints, I will create a Sync Engine for the deps.

SQLALCHEMY_DATABASE_URL = settings.SQLALCHEMY_DATABASE_URI.replace("+asyncpg", "")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_pre_ping=True,
    echo=True # Enable for debugging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
