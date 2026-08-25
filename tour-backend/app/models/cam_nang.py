"""
Model CamNang - Bảng bài viết Cẩm nang du lịch (CMS).

Quản trị viên Thêm/Sửa/Xóa bài viết; web khách hàng hiển thị những bài
TrangThai = "Hien". Nội dung lưu dạng text theo quy ước:
  - đoạn cách nhau bởi dòng trống;
  - dòng bắt đầu "- " là gạch đầu dòng;
  - dòng bắt đầu "1. " ... là bước đánh số.
Hình ảnh minh họa qua URL (không upload file).
"""
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.common import utcnow


class CamNang(Base):
    __tablename__ = "CamNang"

    MaBaiViet: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    TieuDe: Mapped[str] = mapped_column(String(200), nullable=False)
    MoTaNgan: Mapped[str | None] = mapped_column(String(500), nullable=True)
    NoiDung: Mapped[str] = mapped_column(Text, nullable=False)
    HinhAnhURL: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # DanhMuc: TruocChuyenDi / ChiPhiThanhToan / AnToan / QuyTrinhDatTour / MeoDuLich
    DanhMuc: Mapped[str] = mapped_column(String(50), nullable=False, default="Chung")
    # TrangThai: Hien / An
    TrangThai: Mapped[str] = mapped_column(String(20), nullable=False, default="Hien")
    NgayTao: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    NgayCapNhat: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<CamNang {self.MaBaiViet}: {self.TieuDe} ({self.TrangThai})>"
