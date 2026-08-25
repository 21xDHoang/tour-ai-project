# -*- coding: utf-8 -*-
"""
app/schemas/cam_nang.py - DTO cho nhóm chức năng Cẩm nang du lịch (CMS).

DanhMuc: TruocChuyenDi / ChiPhiThanhToan / AnToan / QuyTrinhDatTour / MeoDuLich.
TrangThai: Hien / An.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CamNangCreate(BaseModel):
    """Tạo bài viết cẩm nang mới (chỉ Admin)."""

    TieuDe: str = Field(..., min_length=2, max_length=200)
    MoTaNgan: str | None = Field(None, max_length=500)
    NoiDung: str = Field(..., description="Nội dung text theo quy ước đoạn/gạch đầu dòng")
    HinhAnhURL: str | None = Field(None, max_length=500)
    DanhMuc: str = Field("Chung", max_length=50)
    TrangThai: str = Field("Hien", max_length=20)


class CamNangItem(BaseModel):
    """Bài viết cẩm nang trả về cho client."""

    model_config = ConfigDict(from_attributes=True)

    MaBaiViet: int
    TieuDe: str
    MoTaNgan: str | None = None
    NoiDung: str
    HinhAnhURL: str | None = None
    DanhMuc: str
    TrangThai: str
    NgayTao: datetime
    NgayCapNhat: datetime | None = None


class CamNangUpdate(BaseModel):
    """Cập nhật bài viết (chỉ Admin). Tất cả trường đều tùy chọn."""

    TieuDe: str | None = Field(None, min_length=2, max_length=200)
    MoTaNgan: str | None = Field(None, max_length=500)
    NoiDung: str | None = None
    HinhAnhURL: str | None = Field(None, max_length=500)
    DanhMuc: str | None = Field(None, max_length=50)
    TrangThai: str | None = Field(None, max_length=20)
