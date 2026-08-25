"""
Model HuongDanVien - Bảng 2.11 (Hướng dẫn viên).

Hồ sơ hướng dẫn viên: kinh nghiệm, chuyên môn, trạng thái công tác.
TrangThai: Ranh / Ban / NghiPhep (phục vụ lọc HDV rảnh - UC-13, DR-05).
"""
from decimal import Decimal
from datetime import date

from sqlalchemy import Date, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HuongDanVien(Base):
    __tablename__ = "HuongDanVien"

    MaHDV: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    HoTen: Mapped[str] = mapped_column(String(100), nullable=False)
    SoDienThoai: Mapped[str] = mapped_column(String(20), nullable=False)
    Email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    SoNamKinhNghiem: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ChuyenMon: Mapped[str | None] = mapped_column(String(200), nullable=True)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="Ranh")

    # ---- Định danh ----
    MaNV: Mapped[str | None] = mapped_column(String(20), nullable=True)
    CCCD: Mapped[str | None] = mapped_column(String(20), nullable=True)
    NgaySinh: Mapped[date | None] = mapped_column(Date, nullable=True)
    HoChieu: Mapped[str | None] = mapped_column(String(20), nullable=True)
    DiaChi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # TrangThaiLamViec: ChinhThuc / ThuViec (loại hợp đồng)
    TrangThaiLamViec: Mapped[str] = mapped_column(String(20), nullable=False, default="ChinhThuc")

    # ---- Hồ sơ năng lực & chuyên môn ----
    TheHDV: Mapped[str | None] = mapped_column(String(50), nullable=True)
    TuyenDiem: Mapped[str | None] = mapped_column(Text, nullable=True)
    KyNang: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ---- Tài chính ----
    DinhMucThuLao: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    CongTacPhi: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    ThongTinThanhToan: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Quan hệ: 1-N với PhanCongHDV, AI_DeXuatHuongDanVien
    ds_phan_cong: Mapped[list["PhanCongHDV"]] = relationship(back_populates="hdv")
    ds_de_xuat: Mapped[list["AIDeXuatHuongDanVien"]] = relationship(
        back_populates="hdv"
    )

    def __repr__(self) -> str:
        return f"<HuongDanVien {self.MaHDV}: {self.HoTen}>"
