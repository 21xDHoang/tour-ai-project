"""
Model PhanCongHDV - Bảng 2.12 (Phân công hướng dẫn viên).

Ràng buộc UNIQUE(MaLich, MaHDV) hiện thực DR-05: một HDV chỉ được phân công
một lần cho cùng một lịch khởi hành.
"""
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PhanCongHDV(Base):
    __tablename__ = "PhanCongHDV"
    __table_args__ = (
        # DR-05: chặn trùng lịch hướng dẫn viên
        UniqueConstraint("MaLich", "MaHDV", name="uq_PhanCong_MaLich_MaHDV"),
    )

    MaPhanCong: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaLich: Mapped[int] = mapped_column(
        ForeignKey("LichKhoiHanh.MaLich"), nullable=False
    )
    MaHDV: Mapped[int] = mapped_column(
        ForeignKey("HuongDanVien.MaHDV"), nullable=False
    )
    VaiTro: Mapped[str] = mapped_column(String(50), nullable=False, default="TruongDoan")
    GhiChu: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Quan hệ
    lich: Mapped["LichKhoiHanh"] = relationship(back_populates="ds_phan_cong")
    hdv: Mapped["HuongDanVien"] = relationship(back_populates="ds_phan_cong")

    def __repr__(self) -> str:
        return f"<PhanCongHDV {self.MaPhanCong}: lich {self.MaLich} - HDV {self.MaHDV}>"
