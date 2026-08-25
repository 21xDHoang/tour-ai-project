"""
Model AI_PhanTichPhanHoi - Bảng 2.20 (AI phân tích phản hồi).

Kết quả phân tích cảm xúc và ưu/nhược điểm từ tập phản hồi (UC-12).
NhanCamXuc: TichCuc / TrungTinh / TieuCuc.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.common import utcnow


class AIPhanTichPhanHoi(Base):
    __tablename__ = "AI_PhanTichPhanHoi"

    MaPhanTich: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    MaTour: Mapped[int] = mapped_column(ForeignKey("Tour.MaTour"), nullable=False)
    NhanCamXuc: Mapped[str] = mapped_column(String(20), nullable=False)
    UuDiem: Mapped[str | None] = mapped_column(Text, nullable=True)
    NhuocDiem: Mapped[str | None] = mapped_column(Text, nullable=True)
    SoPhanHoi: Mapped[int] = mapped_column(Integer, nullable=False)
    Model: Mapped[str] = mapped_column(
        String(50), nullable=False, default="gemini-3.6-flash"
    )
    ThoiGian: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

    # Quan hệ
    tour: Mapped["Tour"] = relationship(back_populates="ds_phan_tich")

    def __repr__(self) -> str:
        return f"<AIPhanTichPhanHoi {self.MaPhanTich}: {self.NhanCamXuc}>"
