# -*- coding: utf-8 -*-
"""
app/schemas/custom_tour.py - DTO cho nhóm chức năng Tour thiết kế riêng.

Yêu cầu từ khách đoàn/gia đình/doanh nghiệp (MICE). Trạng thái xử lý:
Moi / DangBaoGia / DaChot / TuChoi.
"""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ChiTietNgaySchema(BaseModel):
    """Lịch trình chi tiết của một ngày trong tour riêng."""

    Ngay: str = Field(..., description="Nhãn ngày, vd 'Ngay 1'")
    DiemDen: str = Field(..., description="Điểm đến trong ngày")
    NoiLuuTru: str | None = None
    BuaAn: str | None = None
    YeuCauKhac: str | None = None


class ChiTietLichTrinhSchema(BaseModel):
    """Lịch trình dự kiến: số khách người lớn/trẻ em + chi tiết từng ngày."""

    SoNguoiLon: int = Field(1, ge=0)
    SoTreEm: int = Field(0, ge=0)
    CacNgay: list[ChiTietNgaySchema] = Field(default_factory=list)


class CustomTourCreate(BaseModel):
    """Form yêu cầu tour riêng công khai trên web khách hàng."""

    HoTen: str = Field(..., min_length=2, max_length=100)
    SoDienThoai: str = Field(..., min_length=8, max_length=20)
    Email: str | None = Field(None, max_length=120)
    LoaiDoan: str = Field("GiaDinh", max_length=30)
    SoLuongKhach: int = Field(1, ge=1, le=500)
    NgayDuKien: date | None = None
    NganSach: Decimal | None = Field(None, gt=0, description="Ngân sách dự kiến")
    MoTa: str | None = None
    ChiTietLichTrinh: ChiTietLichTrinhSchema | None = None


class CustomTourItem(BaseModel):
    """Yêu cầu tour riêng trong danh sách (kèm tên người xử lý)."""

    model_config = ConfigDict(from_attributes=True)

    MaYeuCau: int
    HoTen: str
    SoDienThoai: str
    Email: str | None = None
    LoaiDoan: str
    SoLuongKhach: int
    NgayDuKien: date | None = None
    NganSach: Decimal | None = None
    MoTa: str | None = None
    ChiTietLichTrinh: dict | None = None
    GiaChot: Decimal | None = None
    TrangThai: str
    NguoiXuLyID: int | None = None
    ten_nguoi_xu_ly: str | None = None
    NgayTao: datetime


class CustomTourUpdate(BaseModel):
    """Cập nhật yêu cầu tour riêng: chỉnh sửa toàn bộ thông tin + trạng thái.

    Tất cả trường đều tùy chọn (partial update).
    """

    HoTen: str | None = Field(None, min_length=2, max_length=100)
    SoDienThoai: str | None = Field(None, min_length=8, max_length=20)
    Email: str | None = Field(None, max_length=120)
    LoaiDoan: str | None = Field(None, max_length=30)
    SoLuongKhach: int | None = Field(None, ge=1, le=500)
    NgayDuKien: date | None = None
    NganSach: Decimal | None = Field(None, gt=0)
    MoTa: str | None = None
    ChiTietLichTrinh: ChiTietLichTrinhSchema | None = None
    GiaChot: Decimal | None = Field(None, gt=0, description="Giá chốt do tư vấn viên báo")
    TrangThai: str | None = Field(
        None, description="Moi/DangBaoGia/DaChot/TuChoi"
    )
    NguoiXuLyID: int | None = Field(None, description="null để bỏ xử lý")
