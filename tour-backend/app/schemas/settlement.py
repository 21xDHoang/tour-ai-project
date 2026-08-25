# -*- coding: utf-8 -*-
"""
app/schemas/settlement.py - DTO cho nhóm chức năng Quyết toán đoàn tour (P&L).
"""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class QuyetToanItem(BaseModel):
    """Một quyết toán đoàn tour (kèm thông tin tour + derived P&L)."""

    MaQuyetToan: int
    MaLich: int
    ten_tour: str | None = None
    ten_diem_den: str | None = None
    ngay_khoi_hanh: date | None = None
    ngay_ket_thuc: date | None = None
    ten_hdv: str | None = None
    DoanhThuThucTe: Decimal = Decimal("0")
    ChiPhiXe: Decimal = Decimal("0")
    ChiPhiKhachSan: Decimal = Decimal("0")
    ChiPhiAnUong: Decimal = Decimal("0")
    ChiPhiVe: Decimal = Decimal("0")
    ThuLaoHDV: Decimal = Decimal("0")
    TamUngHDV: Decimal = Decimal("0")
    HDVChiThucTe: Decimal = Decimal("0")
    HoaDonAnh: str | None = None
    TrangThai: str = "ChoQuyetToan"
    NgayKhoaSo: datetime | None = None
    GhiChu: str | None = None
    # Derived
    tong_chi_phi: Decimal = Decimal("0")
    loi_nhuan_gop: Decimal = Decimal("0")
    ty_suat_ln: float | None = None
    chenh_lech_tam_ung: Decimal = Decimal("0")


class QuyetToanUpsert(BaseModel):
    """Tạo/cập nhật quyết toán cho một lịch khởi hành."""

    MaLich: int
    DoanhThuThucTe: Decimal = Field(0, ge=0)
    ChiPhiXe: Decimal = Field(0, ge=0)
    ChiPhiKhachSan: Decimal = Field(0, ge=0)
    ChiPhiAnUong: Decimal = Field(0, ge=0)
    ChiPhiVe: Decimal = Field(0, ge=0)
    ThuLaoHDV: Decimal = Field(0, ge=0)
    TamUngHDV: Decimal = Field(0, ge=0)
    HDVChiThucTe: Decimal = Field(0, ge=0)
    HoaDonAnh: str | None = None
    GhiChu: str | None = None
