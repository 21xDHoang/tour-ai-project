"""
Model DatCho - Bảng 2.13 (Đặt chỗ).

Đơn đặt chỗ khóa giữ chỗ 24 giờ (DR-02): HanGiuCho = NgayDat + 24h.
TrangThai: ChoCoc / DaCoc / DaThanhToan / DaHuy.
DaDatCoc tối thiểu 30% TongTien (DR-03) - kiểm tra ở tầng Service.
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.common import utcnow


class DatCho(Base):
    __tablename__ = "DatCho"

    MaDatCho: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaKhachHang: Mapped[int] = mapped_column(
        ForeignKey("KhachHang.MaKhachHang"), nullable=False
    )
    MaLich: Mapped[int] = mapped_column(
        ForeignKey("LichKhoiHanh.MaLich"), nullable=False
    )
    NguoiTaoID: Mapped[int] = mapped_column(
        ForeignKey("NguoiDung.MaNguoiDung"), nullable=False
    )
    SoKhach: Mapped[int] = mapped_column(Integer, nullable=False)
    TongTien: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    DaDatCoc: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    NgayDat: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    HanGiuCho: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="ChoCoc")
    # Khi khách báo "đã chuyển khoản" -> TrangThai=ChoXacNhanCoc, tạm dừng đếm
    # ngược 24h: SoGiayConLai lưu giây còn lại để nối lại khi kế toán từ chối.
    SoGiayConLai: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # URL ảnh chụp bill/ủy nhiệm chi khi khách khai báo đã chuyển khoản
    HinhAnhChuyenKhoan: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Quan hệ
    khach_hang: Mapped["KhachHang"] = relationship(back_populates="ds_dat_cho")
    lich: Mapped["LichKhoiHanh"] = relationship(back_populates="ds_dat_cho")
    nguoi_tao: Mapped["NguoiDung"] = relationship(back_populates="ds_dat_cho")
    ds_chi_tiet: Mapped[list["ChiTietDatCho"]] = relationship(back_populates="dat_cho")
    ds_thanh_toan: Mapped[list["ThanhToan"]] = relationship(back_populates="dat_cho")
    ds_huy: Mapped[list["HuyTour"]] = relationship(back_populates="dat_cho")
    ds_phan_hoi: Mapped[list["PhanHoi"]] = relationship(back_populates="dat_cho")

    def __repr__(self) -> str:
        return f"<DatCho {self.MaDatCho}: KH {self.MaKhachHang} - lich {self.MaLich}>"
