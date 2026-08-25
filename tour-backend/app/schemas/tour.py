# -*- coding: utf-8 -*-
"""
app/schemas/tour.py - DTO cho nhóm chức năng Tour & Lịch khởi hành.

Bao gồm request/response cho Tour, Điểm đến và Lịch khởi hành.
"""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class DiemDenResponse(BaseModel):
    """Điểm đến (danh mục)."""

    model_config = ConfigDict(from_attributes=True)

    MaDiemDen: int
    TenDiemDen: str
    KhuVuc: str | None = None
    MoTa: str | None = None


class DiemDenCreate(BaseModel):
    """Tạo mới một điểm đến (Admin)."""

    TenDiemDen: str = Field(..., min_length=2, max_length=200)
    KhuVuc: str | None = Field(None, max_length=100)
    MoTa: str | None = None


class DiemDenUpdate(BaseModel):
    """Cập nhật một phần thông tin điểm đến (Admin)."""

    TenDiemDen: str | None = Field(None, min_length=2, max_length=200)
    KhuVuc: str | None = Field(None, max_length=100)
    MoTa: str | None = None


class LichKhoiHanhCreate(BaseModel):
    """Tạo mới một đợt khởi hành cho tour."""

    MaTour: int
    NgayKhoiHanh: date
    NgayKetThuc: date
    MinSeats: int = Field(..., ge=1, description="Số khách tối thiểu để khởi hành")
    MaxSeats: int = Field(..., ge=1, description="Số chỗ tối đa")
    SoChoCon: int = Field(..., ge=0, description="Số chỗ còn trống")
    TrangThai: str = Field("MoBan", description="MoBan / DatKich / HoanThanh / DaHuy")


class LichKhoiHanhResponse(BaseModel):
    """Đợt khởi hành trả về cho client."""

    model_config = ConfigDict(from_attributes=True)

    MaLich: int
    MaTour: int
    NgayKhoiHanh: date
    NgayKetThuc: date
    MinSeats: int
    MaxSeats: int
    SoChoCon: int
    TrangThai: str


class TourCreate(BaseModel):
    """Tạo mới một tour."""

    MaDiemDen: int
    TenTour: str
    MoTa: str | None = None
    LichTrinhTomTat: str | None = None
    SoNgay: int = Field(..., ge=1)
    GiaCoBan: Decimal = Field(..., gt=0)
    GiaKhuyenMai: Decimal | None = Field(None, gt=0)
    TrangThai: str = Field("DangBan", description="DangBan / NgungBan")
    LoaiTour: str | None = Field(None, max_length=30, description="TraiNghiem / NghiDuong / VanHoaLichSu")


class TourUpdate(BaseModel):
    """Cập nhật một phần thông tin tour."""

    MaDiemDen: int | None = None
    TenTour: str | None = None
    MoTa: str | None = None
    LichTrinhTomTat: str | None = None
    SoNgay: int | None = Field(None, ge=1)
    GiaCoBan: Decimal | None = Field(None, gt=0)
    GiaKhuyenMai: Decimal | None = Field(None, gt=0)
    TrangThai: str | None = None
    LoaiTour: str | None = Field(None, max_length=30)


class TourResponse(BaseModel):
    """Tour trả về cho client, kèm tên điểm đến và các lịch còn chỗ."""

    model_config = ConfigDict(from_attributes=True)

    MaTour: int
    MaDiemDen: int
    TenTour: str
    MoTa: str | None = None
    LichTrinhTomTat: str | None = None
    SoNgay: int
    GiaCoBan: Decimal
    GiaKhuyenMai: Decimal | None = None
    TrangThai: str
    LoaiTour: str | None = None

    # Trường bổ trợ khi lấy chi tiết tour (không nằm trong bảng Tour)
    ten_diem_den: str | None = None
    ds_lich: list[LichKhoiHanhResponse] = Field(default_factory=list)
