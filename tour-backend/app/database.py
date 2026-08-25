"""
app/database.py - Kết nối Supabase PostgreSQL bằng SQLAlchemy 2.0.

- pool_pre_ping=True : kiểm tra kết nối còn sống trước khi sử dụng.
- pool_recycle=1800  : làm mới kết nối sau 30 phút (chống timeout của Supabase).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # kiểm tra kết nối còn sống trước khi dùng
    pool_recycle=1800,    # làm mới kết nối sau 30 phút
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency FastAPI: mở phiên làm việc và đóng sau khi xong."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
