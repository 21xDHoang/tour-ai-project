"""
Model BangLuong - Bảng lương nhân viên theo tháng.

Một dòng = lương 1 tháng của 1 nhân viên (nhân viên văn phòng/tài xế hoặc HDV).
TongLuong do backend tính theo loại:
  - MaNguoiDung: LuongCoBan * SoCong/SoCongChuan + PhuCap + Thuong
  - MaHDV      : SoTour * DinhMucThuLao + CongTacPhi + Thuong
"""
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BangLuong(Base):
    __tablename__ = "BangLuong"

    MaBangLuong: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    Thang: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..12
    Nam: Mapped[int] = mapped_column(Integer, nullable=False)
    MaNguoiDung: Mapped[int | None] = mapped_column(
        ForeignKey("NguoiDung.MaNguoiDung"), nullable=True
    )
    MaHDV: Mapped[int | None] = mapped_column(
        ForeignKey("HuongDanVien.MaHDV"), nullable=True
    )
    SoCong: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    SoCongChuan: Mapped[int] = mapped_column(Integer, nullable=False, default=26)
    SoTour: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    Thuong: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    TongLuong: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="ChoDuyet")
    GhiChu: Mapped[str | None] = mapped_column(String(255), nullable=True)

    nguoi_dung: Mapped["NguoiDung | None"] = relationship(foreign_keys=[MaNguoiDung])
    hdv: Mapped["HuongDanVien | None"] = relationship(foreign_keys=[MaHDV])

    def __repr__(self) -> str:
        return f"<BangLuong {self.MaBangLuong}: {self.Thang}/{self.Nam} - {self.TongLuong}>"
