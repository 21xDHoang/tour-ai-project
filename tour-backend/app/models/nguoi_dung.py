"""
Model NguoiDung - Bảng 2.6 (Người dùng).

Tài khoản đăng nhập của 4 vai trò: Admin, Consultant, Accountant, Customer.
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.common import utcnow


class NguoiDung(Base):
    __tablename__ = "NguoiDung"

    MaNguoiDung: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    HoTen: Mapped[str] = mapped_column(String(100), nullable=False)
    Email: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    MatKhauHash: Mapped[str] = mapped_column(String(255), nullable=False)
    VaiTro: Mapped[str] = mapped_column(String(20), nullable=False, default="Customer")
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="Active")
    NgayTao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

    # ---- Cấu hình lương (nhân viên văn phòng / tài xế) ----
    HeSoLuong: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("1"))
    LuongCoBan: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    PhuCap: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))

    # Quan hệ: 1-N với DatCho (NguoiTao), ThanhToan (NguoiXuLy), HuyTour, AI_TuVanTour
    ds_dat_cho: Mapped[list["DatCho"]] = relationship(back_populates="nguoi_tao")
    ds_thanh_toan: Mapped[list["ThanhToan"]] = relationship(back_populates="nguoi_xu_ly")
    ds_huy_tour: Mapped[list["HuyTour"]] = relationship(back_populates="nguoi_xu_ly")
    ds_tu_van: Mapped[list["AITuVanTour"]] = relationship(back_populates="nguoi_dung")
    ds_lead: Mapped[list["YeuCauTuVan"]] = relationship(back_populates="nguoi_phu_trach")
    ds_tour_rieng: Mapped[list["YeuCauTourRieng"]] = relationship(
        back_populates="nguoi_xu_ly"
    )

    def __repr__(self) -> str:
        return f"<NguoiDung {self.MaNguoiDung}: {self.Email} ({self.VaiTro})>"
