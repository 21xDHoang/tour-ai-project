"""
Model AI_DeXuatHuongDanVien - Bảng 2.19 (AI đề xuất HDV).

Kết quả đề xuất Top 3 hướng dẫn viên cho một lịch khởi hành (UC-13).
XepHang từ 1 đến 3; TrangThai: ChoDuyet / DaDuyet / TuChoi.
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.common import utcnow


class AIDeXuatHuongDanVien(Base):
    __tablename__ = "AI_DeXuatHuongDanVien"
    __table_args__ = (
        # UC-13: chỉ giữ Top 3 (quote cột cho PostgreSQL phân biệt hoa thường)
        CheckConstraint('"XepHang" BETWEEN 1 AND 3', name="ck_AIDX_XepHang"),
    )

    MaDeXuat: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaLich: Mapped[int] = mapped_column(
        ForeignKey("LichKhoiHanh.MaLich"), nullable=False
    )
    MaHDV: Mapped[int] = mapped_column(
        ForeignKey("HuongDanVien.MaHDV"), nullable=False
    )
    DiemTuongDong: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    LyDo: Mapped[str | None] = mapped_column(Text, nullable=True)
    XepHang: Mapped[int] = mapped_column(Integer, nullable=False)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="ChoDuyet")
    ThoiGian: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

    # Quan hệ
    lich: Mapped["LichKhoiHanh"] = relationship(back_populates="ds_de_xuat")
    hdv: Mapped["HuongDanVien"] = relationship(back_populates="ds_de_xuat")

    def __repr__(self) -> str:
        return (
            f"<AIDeXuatHuongDanVien {self.MaDeXuat}: "
            f"lich {self.MaLich} - HDV {self.MaHDV} - hang {self.XepHang}>"
        )
