"""
Model AI_TuVanTour - Bảng 2.18 (Nhật ký tư vấn AI).

Lưu nhật ký và kết quả tư vấn tour của AI (UC-10) để kiểm soát,
đối soát và đánh giá chất lượng phản hồi của mô hình.
KetQua: JSON có cấu trúc (danh sách tour gợi ý + lý do).
TrangThai: ThanhCong / Loi / Fallback.
"""
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.common import utcnow


class AITuVanTour(Base):
    __tablename__ = "AI_TuVanTour"

    MaTuVan: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    NguoiDungID: Mapped[int | None] = mapped_column(
        ForeignKey("NguoiDung.MaNguoiDung"), nullable=True
    )
    KhachHangID: Mapped[int | None] = mapped_column(
        ForeignKey("KhachHang.MaKhachHang"), nullable=True
    )
    YeuCau: Mapped[str] = mapped_column(Text, nullable=False)
    KetQua: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    Model: Mapped[str] = mapped_column(
        String(50), nullable=False, default="gemini-3.6-flash"
    )
    ThoiGian: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="ThanhCong")

    # Quan hệ (có thể rỗng)
    nguoi_dung: Mapped["NguoiDung | None"] = relationship(back_populates="ds_tu_van")
    khach_hang: Mapped["KhachHang | None"] = relationship(back_populates="ds_tu_van")

    def __repr__(self) -> str:
        return f"<AITuVanTour {self.MaTuVan}: {self.TrangThai}>"
