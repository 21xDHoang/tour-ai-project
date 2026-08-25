"""
Model CongNoNhaCungCap - Bảng công nợ nhà cung cấp / đối tác (Accounts Payable).

Nợ phải trả cho khách sạn, nhà xe, nhà hàng... Trạng thái: ChuaTra / TraMotPhan / DaTatToan.
"""
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CongNoNhaCungCap(Base):
    __tablename__ = "CongNoNhaCungCap"

    MaPhaiTra: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    TenDoiTac: Mapped[str] = mapped_column(String(200), nullable=False)
    DichVu: Mapped[str] = mapped_column(String(200), nullable=False)
    TongTien: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    DaThanhToan: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    HanThanhToan: Mapped[date | None] = mapped_column(Date, nullable=True)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="ChuaTra")
    GhiChu: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<CongNoNhaCungCap {self.MaPhaiTra}: {self.TenDoiTac} ({self.TrangThai})>"
