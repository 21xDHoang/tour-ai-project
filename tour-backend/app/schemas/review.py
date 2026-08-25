# -*- coding: utf-8 -*-
"""
app/schemas/review.py - DTO cho nhóm chức năng Đánh giá / Phản hồi (PhanHoi).

Quy trình kiểm duyệt: khách tạo (TrangThai=ChoDuyet) -> Admin duyệt
(DaDuyet + AnHien=True) hoặc từ chối (TuChoi). AnHien=False để ẩn hiển thị.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    """Khách hàng tạo đánh giá cho chuyến đi đã hoàn thành."""

    MaDatCho: int
    SoSao: int = Field(..., ge=1, le=5, description="Số sao 1..5")
    NoiDung: str | None = Field(None, max_length=1000)


class ReviewItem(BaseModel):
    """Đánh giá trong danh sách kiểm duyệt (kèm tên khách/tour)."""

    model_config = ConfigDict(from_attributes=True)

    MaPhanHoi: int
    MaDatCho: int
    MaKhachHang: int
    ten_khach_hang: str | None = None
    ten_tour: str | None = None
    SoSao: int
    NoiDung: str | None = None
    TrangThai: str
    AnHien: bool
    NgayTao: datetime


class ReviewUpdate(BaseModel):
    """Admin duyệt/từ chối hoặc ẩn/hiện đánh giá."""

    TrangThai: str | None = Field(
        None, description="ChoDuyet/DaDuyet/TuChoi"
    )
    AnHien: bool | None = None
