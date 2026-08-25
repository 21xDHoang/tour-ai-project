"""
Model QuyetToanTour - Bảng quyết toán đoàn tour (Tour P&L).

Một lịch khởi hành = một quyết toán. Lợi nhuận gộp = DoanhThuThucTe - tổng
giá vốn (Xe + Khách sạn + Ăn uống + Vé + Thù lao HDV).
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.common import utcnow


class QuyetToanTour(Base):
    __tablename__ = "QuyetToanTour"
    __table_args__ = (UniqueConstraint("MaLich", name="uq_QuyetToan_MaLich"),)

    MaQuyetToan: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaLich: Mapped[int] = mapped_column(ForeignKey("LichKhoiHanh.MaLich"), nullable=False)
    DoanhThuThucTe: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    ChiPhiXe: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    ChiPhiKhachSan: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    ChiPhiAnUong: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    ChiPhiVe: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    ThuLaoHDV: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    TamUngHDV: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    HDVChiThucTe: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    HoaDonAnh: Mapped[str | None] = mapped_column(Text, nullable=True)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="ChoQuyetToan")
    NgayKhoaSo: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    GhiChu: Mapped[str | None] = mapped_column(Text, nullable=True)

    lich: Mapped["LichKhoiHanh"] = relationship(foreign_keys=[MaLich])

    def __repr__(self) -> str:
        return f"<QuyetToanTour {self.MaQuyetToan}: lich {self.MaLich} ({self.TrangThai})>"
