"""
Model YeuCauTourRieng - Bảng yêu cầu tour thiết kế riêng (Custom Tour).

Tiếp nhận yêu cầu từ khách đoàn/gia đình/doanh nghiệp (MICE): cấu hình
số lượng khách, ngày dự kiến, ngân sách. Tư vấn viên/Admin theo dõi xử lý.
"""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.common import utcnow


class YeuCauTourRieng(Base):
    __tablename__ = "YeuCauTourRieng"

    MaYeuCau: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    HoTen: Mapped[str] = mapped_column(String(100), nullable=False)
    SoDienThoai: Mapped[str] = mapped_column(String(20), nullable=False)
    Email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # LoaiDoan: GiaDinh / DoanhNghiep / HoiNhom / TanTrang
    LoaiDoan: Mapped[str] = mapped_column(String(30), nullable=False, default="GiaDinh")
    SoLuongKhach: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    NgayDuKien: Mapped[date | None] = mapped_column(Date, nullable=True)
    NganSach: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    MoTa: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Lịch trình chi tiết từng ngày (JSON):
    # {SoNguoiLon, SoTreEm, CacNgay: [{Ngay, DiemDen, NoiLuuTru, BuaAn, YeuCauKhac}]}
    ChiTietLichTrinh: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Giá chốt do tư vấn viên báo giá (khác NganSach là ngân sách khách đưa ra)
    GiaChot: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    # TrangThai: Moi / DangBaoGia / DaChot / TuChoi
    TrangThai: Mapped[str] = mapped_column(
        String(20), nullable=False, default="Moi"
    )
    NguoiXuLyID: Mapped[int | None] = mapped_column(
        ForeignKey("NguoiDung.MaNguoiDung"), nullable=True
    )
    NgayTao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

    # Quan hệ
    nguoi_xu_ly: Mapped["NguoiDung"] = relationship(back_populates="ds_tour_rieng")

    def __repr__(self) -> str:
        return f"<YeuCauTourRieng {self.MaYeuCau}: {self.HoTen} - {self.LoaiDoan}>"
