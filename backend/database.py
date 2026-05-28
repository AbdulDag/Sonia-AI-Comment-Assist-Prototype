from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from backend.config import settings

SQLALCHEMY_DATABASE_URL = f"sqlite:///{settings.database_path}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — yields a DB session and closes it on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables declared on Base (idempotent)."""
    import backend.models  # noqa: F401 — registers models with Base before create_all

    Base.metadata.create_all(bind=engine)
