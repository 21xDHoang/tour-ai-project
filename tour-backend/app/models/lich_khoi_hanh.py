"""
Model LichKhoiHanh - Bảng 2.10 (Lịch khởi hành).

Đợt khởi hành của một tour; chứa các ngưỡng DR-01:
MinSeats (đủ điều kiện khởi hành) và MaxSeats (chỗ tối đa).
SoChoCon mặc định bằng MaxSeats tại thời điểm tạo lịch.
"""
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LichKhoiHanh(Base):
    __tablename__ = "LichKhoiHanh"

    MaLich: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaTour: Mapped[int] = mapped_column(ForeignKey("Tour.MaTour"), nullable=False)
    NgayKhoiHanh: Mapped[date] = mapped_column(Date, nullable=False)
    NgayKetThuc: Mapped[date] = mapped_column(Date, nullable=False)
    MinSeats: Mapped[int] = mapped_column(Integer, nullable=False)
    MaxSeats: Mapped[int] = mapped_column(Integer, nullable=False)
    SoChoCon: Mapped[int] = mapped_column(Integer, nullable=False)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="MoBan")

    # Quan hệ
    tour: Mapped["Tour"] = relationship(back_populates="ds_lich")
    ds_phan_cong: Mapped[list["PhanCongHDV"]] = relationship(back_populates="lich")
    ds_dat_cho: Mapped[list["DatCho"]] = relationship(back_populates="lich")
    ds_de_xuat: Mapped[list["AIDeXuatHuongDanVien"]] = relationship(
        back_populates="lich"
    )

    def __repr__(self) -> str:
        return f"<LichKhoiHanh {self.MaLich}: tour {self.MaTour} ngay {self.NgayKhoiHanh}>"
