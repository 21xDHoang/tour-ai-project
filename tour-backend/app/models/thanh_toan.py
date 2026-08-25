"""
Model ThanhToan - Bảng 2.15 (Thanh toán).

Giao dịch tài chính: LoaiGiaoDich (Coc / ThanhToan / HoanTien),
PhuongThuc (TienMat / ChuyenKhoan), NguoiXuLyID là kế toán xử lý.
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.common import utcnow


class ThanhToan(Base):
    __tablename__ = "ThanhToan"

    MaThanhToan: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaDatCho: Mapped[int] = mapped_column(ForeignKey("DatCho.MaDatCho"), nullable=False)
    LoaiGiaoDich: Mapped[str] = mapped_column(String(20), nullable=False)
    SoTien: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    NgayGiaoDich: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow
    )
    PhuongThuc: Mapped[str] = mapped_column(String(20), nullable=False)
    NguoiXuLyID: Mapped[int] = mapped_column(
        ForeignKey("NguoiDung.MaNguoiDung"), nullable=False
    )
    GhiChu: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Quan hệ
    dat_cho: Mapped["DatCho"] = relationship(back_populates="ds_thanh_toan")
    nguoi_xu_ly: Mapped["NguoiDung"] = relationship(back_populates="ds_thanh_toan")

    def __repr__(self) -> str:
        return f"<ThanhToan {self.MaThanhToan}: {self.LoaiGiaoDich} {self.SoTien}>"
