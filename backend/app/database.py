import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("oracle_database")

# Setup SQLAlchemy engine with PostgreSQL and fallback to SQLite
engine = None
try:
    if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
        # Try connecting to PostgreSQL
        logger.info(f"Connecting to database at {DATABASE_URL}...")
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        # Test connection quickly
        with engine.connect() as conn:
            pass
        logger.info("Connected to PostgreSQL successfully.")
    else:
        raise ValueError("DATABASE_URL is not PostgreSQL or empty.")
except Exception as e:
    logger.warning(f"PostgreSQL connection failed ({e}). Falling back to local SQLite database: sqlite:///./oracle.db")
    # For SQLite, use check_same_thread: False to allow multi-threaded access in FastAPI
    engine = create_engine("sqlite:///./oracle.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency for routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
