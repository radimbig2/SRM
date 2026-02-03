from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# SQLite database URL. Using a local file `recruiting.db` in the backend directory.
DATABASE_URL = "sqlite:///./recruiting.db"

# Create the SQLAlchemy engine. For SQLite we disable the same thread check
# because FastAPI will create new threads for requests.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # required by SQLite for async use
)

# SessionLocal is a factory for creating new database sessions.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models. In SQLAlchemy 2.0 the DeclarativeBase provides
# type checking and improved configurability.
class Base(DeclarativeBase):
    pass