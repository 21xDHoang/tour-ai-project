# -*- coding: utf-8 -*-
"""
app/schemas/payable.py - DTO cho nhóm chức năng Công nợ Nhà cung cấp.
"""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class PayableItem(BaseModel):
    """Một khoản nợ phải trả cho nhà cung cấp / đối tác."""

    MaPhaiTra: int
    TenDoiTac: str
    DichVu: str
    TongTien: Decimal
    DaThanhToan: Decimal
    HanThanhToan: date | None = None
    TrangThai: str
    GhiChu: str | None = None
    con_no: Decimal = Decimal("0")


class PayableCreate(BaseModel):
    """Thêm khoản công nợ nhà cung cấp."""

    TenDoiTac: str = Field(..., min_length=2, max_length=200)
    DichVu: str = Field(..., min_length=1, max_length=200)
    TongTien: Decimal = Field(..., gt=0)
    HanThanhToan: date | None = None
    GhiChu: str | None = None


class PayableUpdate(BaseModel):
    """Sửa khoản công nợ (tất cả field tùy chọn)."""

    TenDoiTac: str | None = Field(None, min_length=2, max_length=200)
    DichVu: str | None = Field(None, min_length=1, max_length=200)
    TongTien: Decimal | None = Field(None, gt=0)
    HanThanhToan: date | None = None
    GhiChu: str | None = None


class PhieuChiCreate(BaseModel):
    """Lập phiếu chi thanh toán cho một khoản nợ."""

    SoTien: Decimal = Field(..., gt=0)
    GhiChu: str | None = None
