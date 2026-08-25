"""
Model PhanHoi - Bảng 2.17 (Phản hồi khách hàng).

Đánh giá của khách sau chuyến đi: SoSao phải nằm trong khoảng 1..5.
"""
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.common import utcnow


class PhanHoi(Base):
    __tablename__ = "PhanHoi"
    __table_args__ = (
        # Ràng buộc SoSao trong khoảng 1..5 (quote cột cho PostgreSQL)
        CheckConstraint('"SoSao" BETWEEN 1 AND 5', name="ck_PhanHoi_SoSao"),
    )

    MaPhanHoi: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaDatCho: Mapped[int] = mapped_column(ForeignKey("DatCho.MaDatCho"), nullable=False)
    MaKhachHang: Mapped[int] = mapped_column(
        ForeignKey("KhachHang.MaKhachHang"), nullable=False
    )
    SoSao: Mapped[int] = mapped_column(Integer, nullable=False)
    NoiDung: Mapped[str | None] = mapped_column(Text, nullable=True)
    NgayTao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    # Kiểm duyệt đánh giá: TrangThai (ChoDuyet/DaDuyet/TuChoi), AnHien
    TrangThai: Mapped[str] = mapped_column(
        String(20), nullable=False, default="DaDuyet"
    )
    AnHien: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Quan hệ
    dat_cho: Mapped["DatCho"] = relationship(back_populates="ds_phan_hoi")
    khach_hang: Mapped["KhachHang"] = relationship(back_populates="ds_phan_hoi")

    def __repr__(self) -> str:
        return f"<PhanHoi {self.MaPhanHoi}: {self.SoSao} sao>"
