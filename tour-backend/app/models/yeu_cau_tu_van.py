"""
Model YeuCauTuVan - Bảng Lead (yêu cầu tư vấn).

Tiếp nhận khách hàng tiềm năng từ nhiều kênh: Web form, Chatbot AI,
Fanpage, Zalo OA, Hotline. Trạng thái theo phễu chuyển đổi.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.common import utcnow


class YeuCauTuVan(Base):
    __tablename__ = "YeuCauTuVan"

    MaYeuCau: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    HoTen: Mapped[str] = mapped_column(String(100), nullable=False)
    SoDienThoai: Mapped[str] = mapped_column(String(20), nullable=False)
    Email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    NoiDung: Mapped[str | None] = mapped_column(Text, nullable=True)
    TourQuanTam: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Nguon: Web / Chatbot / Fanpage / Zalo / Hotline
    Nguon: Mapped[str] = mapped_column(String(30), nullable=False, default="Web")
    # TrangThai: Moi / DangLienHe / DaBaoGia / DangChot / ThatBai
    TrangThai: Mapped[str] = mapped_column(
        String(20), nullable=False, default="Moi"
    )
    NguoiPhuTrachID: Mapped[int | None] = mapped_column(
        ForeignKey("NguoiDung.MaNguoiDung"), nullable=True
    )
    NgayTao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

    # Quan hệ
    nguoi_phu_trach: Mapped["NguoiDung"] = relationship(back_populates="ds_lead")

    def __repr__(self) -> str:
        return f"<YeuCauTuVan {self.MaYeuCau}: {self.HoTen} ({self.TrangThai})>"
