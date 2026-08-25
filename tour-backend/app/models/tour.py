"""
Model Tour - Bảng 2.9 (Danh mục tour).

Chương trình tour gắn với điểm đến; mô tả và lịch trình tóm tắt
có thể do AI sinh (UC-11) hoặc người dùng biên tập.
"""
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Tour(Base):
    __tablename__ = "Tour"

    MaTour: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaDiemDen: Mapped[int] = mapped_column(
        ForeignKey("DiemDen.MaDiemDen"), nullable=False
    )
    TenTour: Mapped[str] = mapped_column(String(200), nullable=False)
    MoTa: Mapped[str | None] = mapped_column(Text, nullable=True)
    LichTrinhTomTat: Mapped[str | None] = mapped_column(Text, nullable=True)
    SoNgay: Mapped[int] = mapped_column(Integer, nullable=False)
    GiaCoBan: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    GiaKhuyenMai: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="DangBan")
    # LoaiTour: TraiNghiem / NghiDuong / VanHoaLichSu
    LoaiTour: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Quan hệ
    diem_den: Mapped["DiemDen"] = relationship(back_populates="ds_tour")
    ds_lich: Mapped[list["LichKhoiHanh"]] = relationship(back_populates="tour")
    ds_phan_tich: Mapped[list["AIPhanTichPhanHoi"]] = relationship(back_populates="tour")

    def __repr__(self) -> str:
        return f"<Tour {self.MaTour}: {self.TenTour}>"
