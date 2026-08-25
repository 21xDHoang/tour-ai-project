"""
Model PhiChi - Phiếu chi (thanh toán cho nhà cung cấp / đối tác).

Mỗi phiếu chi trừ nợ nhà cung cấp và được đưa vào Sổ quỹ như một khoản chi.
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.common import utcnow


class PhiChi(Base):
    __tablename__ = "PhiChi"

    MaPhieuChi: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaPhaiTra: Mapped[int | None] = mapped_column(
        ForeignKey("CongNoNhaCungCap.MaPhaiTra"), nullable=True
    )
    SoTien: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    NgayChi: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    GhiChu: Mapped[str | None] = mapped_column(Text, nullable=True)
    NguoiXuLyID: Mapped[int] = mapped_column(
        ForeignKey("NguoiDung.MaNguoiDung"), nullable=False
    )

    def __repr__(self) -> str:
        return f"<PhiChi {self.MaPhieuChi}: {self.SoTien}>"
