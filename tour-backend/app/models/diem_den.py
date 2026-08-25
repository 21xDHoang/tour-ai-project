"""
Model DiemDen - Bảng 2.8 (Điểm đến).

Danh mục điểm đến du lịch (tên điểm đến duy nhất).
"""
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DiemDen(Base):
    __tablename__ = "DiemDen"

    MaDiemDen: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    TenDiemDen: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    KhuVuc: Mapped[str | None] = mapped_column(String(100), nullable=True)
    MoTa: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Quan hệ: 1-N với Tour
    ds_tour: Mapped[list["Tour"]] = relationship(back_populates="diem_den")

    def __repr__(self) -> str:
        return f"<DiemDen {self.MaDiemDen}: {self.TenDiemDen}>"
