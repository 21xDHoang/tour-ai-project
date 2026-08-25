"""
Model KhachHang - Bảng 2.7 (Khách hàng).

Hồ sơ khách hàng: thông tin cá nhân, phân loại (Thuong / ThanThiet).
"""
from datetime import date

from sqlalchemy import Date, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class KhachHang(Base):
    __tablename__ = "KhachHang"

    MaKhachHang: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    HoTen: Mapped[str] = mapped_column(String(100), nullable=False)
    SoDienThoai: Mapped[str] = mapped_column(String(20), nullable=False)
    Email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    NgaySinh: Mapped[date | None] = mapped_column(Date, nullable=True)
    LoaiKhach: Mapped[str] = mapped_column(String(20), nullable=False, default="Thuong")
    GhiChu: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Ảnh đại diện lưu dạng data URI (base64) hoặc URL
    AnhDaiDien: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Quan hệ: 1-N với DatCho, PhanHoi, AI_TuVanTour
    ds_dat_cho: Mapped[list["DatCho"]] = relationship(back_populates="khach_hang")
    ds_phan_hoi: Mapped[list["PhanHoi"]] = relationship(back_populates="khach_hang")
    ds_tu_van: Mapped[list["AITuVanTour"]] = relationship(back_populates="khach_hang")

    def __repr__(self) -> str:
        return f"<KhachHang {self.MaKhachHang}: {self.HoTen}>"
