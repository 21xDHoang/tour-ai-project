"""
Model MaGiamGia - Bảng mã giảm giá / Voucher.

Quản lý mã coupon: giảm theo % hoặc số tiền, hạn sử dụng, số lần dùng
tối đa (flash sale / khuyến mãi).
"""
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MaGiamGia(Base):
    __tablename__ = "MaGiamGia"
    __table_args__ = (
        UniqueConstraint("MaCode", name="uq_MaGiamGia_MaCode"),
    )

    MaGiamGia: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaCode: Mapped[str] = mapped_column(String(50), nullable=False)
    MoTa: Mapped[str | None] = mapped_column(Text, nullable=True)
    # LoaiGiam: PhanTram / Tien
    LoaiGiam: Mapped[str] = mapped_column(String(20), nullable=False, default="PhanTram")
    GiaTri: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    HanSuDung: Mapped[date] = mapped_column(Date, nullable=False)
    SoLanToiDa: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    SoLanDaDung: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # TrangThai: Active / Expired
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="Active")

    def __repr__(self) -> str:
        return f"<MaGiamGia {self.MaCode}: {self.GiaTri} ({self.TrangThai})>"
