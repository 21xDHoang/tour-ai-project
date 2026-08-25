"""
Model ChiTietDatCho - Bảng 2.14 (Chi tiết đặt chỗ).

Danh sách hành khách trong một đơn đặt chỗ.
"""
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ChiTietDatCho(Base):
    __tablename__ = "ChiTietDatCho"

    MaChiTiet: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaDatCho: Mapped[int] = mapped_column(ForeignKey("DatCho.MaDatCho"), nullable=False)
    HoTen: Mapped[str] = mapped_column(String(100), nullable=False)
    SoDienThoai: Mapped[str | None] = mapped_column(String(20), nullable=True)
    GhiChu: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Quan hệ: N-1 với DatCho
    dat_cho: Mapped["DatCho"] = relationship(back_populates="ds_chi_tiet")

    def __repr__(self) -> str:
        return f"<ChiTietDatCho {self.MaChiTiet}: {self.HoTen}>"
