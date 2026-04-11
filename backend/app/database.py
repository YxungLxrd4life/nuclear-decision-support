from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# .env всегда из папки backend/, а не из cwd (иначе DATABASE_URL не подхватывается).
_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")

# Один и тот же файл БД независимо от текущей папки запуска uvicorn (иначе сценарии «пропадают»).
_DEFAULT_DB_PATH = _BACKEND_DIR / "nuclear_support.db"
_DEFAULT_SQLITE_URL = f"sqlite:///{_DEFAULT_DB_PATH.as_posix()}"

DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_SQLITE_URL)

_engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_pre_ping"] = True

engine = create_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Import inside function to avoid circular imports at module load time.
        from . import models
        from .auth import get_password_hash

        test_users = [
            {"username": "operator", "password": "operator123", "is_admin": False},
            {"username": "admin", "password": "admin123", "is_admin": True},
        ]
        for user_data in test_users:
            existing = db.query(models.User).filter(
                models.User.username == user_data["username"]
            ).first()
            if existing is None:
                db.add(
                    models.User(
                        username=user_data["username"],
                        hashed_password=get_password_hash(user_data["password"]),
                        is_active=True,
                        is_admin=user_data["is_admin"],
                    )
                )
        db.commit()

        # Встроенные сценарии из app/data/*.json — без ручной загрузки JSON админом
        from . import bundled_scenarios

        bundled_scenarios.ensure_bundled_scenarios(db)
    finally:
        db.close()