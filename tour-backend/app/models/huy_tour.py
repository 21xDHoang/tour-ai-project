"""
Model HuyTour - Bảng 2.16 (Hủy tour).

Hồ sơ hủy tour với mức phạt theo chính sách DR-04:
MucPhat chỉ nhận 0.0 (hoàn 100%) / 0.5 (phạt 50%) / 1.0 (phạt 100%).
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.common import utcnow


class HuyTour(Base):
    __tablename__ = "HuyTour"
    __table_args__ = (
        # DR-04: mức phạt chỉ nhận 0 / 0.5 / 1.0 (quote cột cho PostgreSQL)
        CheckConstraint('"MucPhat" IN (0.0, 0.5, 1.0)', name="ck_Huy_MucPhat"),
    )

    MaHuy: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaDatCho: Mapped[int] = mapped_column(ForeignKey("DatCho.MaDatCho"), nullable=False)
    NgayHuy: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    LyDo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    MucPhat: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    SoTienHoan: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=0
    )
    NguoiXuLyID: Mapped[int] = mapped_column(
        ForeignKey("NguoiDung.MaNguoiDung"), nullable=False
    )

    # Quan hệ
    dat_cho: Mapped["DatCho"] = relationship(back_populates="ds_huy")
    nguoi_xu_ly: Mapped["NguoiDung"] = relationship(back_populates="ds_huy_tour")

    def __repr__(self) -> str:
        return f"<HuyTour {self.MaHuy}: dat {self.MaDatCho} phat {self.MucPhat}>"
