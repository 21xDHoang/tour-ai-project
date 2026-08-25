# -*- coding: utf-8 -*-
"""
app/schemas/payroll.py - DTO cho nhóm chức năng Quản lý nhân viên & lương.
"""
from decimal import Decimal

from pydantic import BaseModel, Field


class PayrollEmployeeItem(BaseModel):
    """Nhân viên trong danh sách quản lý lương (văn phòng/tài xế hoặc HDV)."""

    loai: str  # "NguoiDung" | "HDV"
    ma: int    # MaNguoiDung hoặc MaHDV
    ho_ten: str
    vai_tro: str | None = None          # với NguoiDung
    he_so_luong: Decimal | None = None  # với NguoiDung
    luong_co_ban: Decimal | None = None
    phu_cap: Decimal | None = None
    dinh_muc_thu_lao: Decimal | None = None  # với HDV
    cong_tac_phi: Decimal | None = None      # với HDV


class BangLuongItem(BaseModel):
    """Một dòng lương tháng."""

    MaBangLuong: int
    Thang: int
    Nam: int
    MaNguoiDung: int | None = None
    MaHDV: int | None = None
    loai: str | None = None
    ho_ten: str | None = None
    SoCong: int = 0
    SoCongChuan: int = 26
    SoTour: int = 0
    Thuong: Decimal = Decimal("0")
    TongLuong: Decimal = Decimal("0")
    TrangThai: str = "ChoDuyet"
    GhiChu: str | None = None


class BangLuongUpsertItem(BaseModel):
    """Một nhân viên cần lưu lương (tháng/năm)."""

    ma_nguoi_dung: int | None = None
    ma_hdv: int | None = None
    so_cong: int = 0
    so_tour: int = 0
    thuong: Decimal = Decimal("0")
    ghi_chu: str | None = None


class BangLuongUpsert(BaseModel):
    """Gửi bảng lương của một tháng/năm."""

    thang: int = Field(..., ge=1, le=12)
    nam: int = Field(..., ge=2000, le=2100)
    danh_sach: list[BangLuongUpsertItem]


class BangLuongUpdate(BaseModel):
    """Sửa một dòng lương (thưởng, trạng thái duyệt, ghi chú)."""

    Thuong: Decimal | None = Field(None, ge=0)
    TrangThai: str | None = None
    GhiChu: str | None = None
