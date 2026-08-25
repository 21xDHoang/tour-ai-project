# -*- coding: utf-8 -*-
"""
app/schemas/voucher.py - DTO cho nhóm chức năng Mã giảm giá / Voucher.

LoaiGiam: PhanTram (giảm theo %) hoặc Tien (giảm số tiền cố định).
TrangThai: Active / Expired.
"""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class VoucherCreate(BaseModel):
    """Tạo mã giảm giá mới (chỉ Admin)."""

    MaCode: str = Field(..., min_length=2, max_length=50, description="Mã coupon")
    MoTa: str | None = None
    LoaiGiam: str = Field("PhanTram", max_length=20)
    GiaTri: Decimal = Field(..., gt=0)
    HanSuDung: date
    SoLanToiDa: int = Field(1, ge=1)
    TrangThai: str = Field("Active", max_length=20)


class VoucherItem(BaseModel):
    """Mã giảm giá trả về cho client (bao gồm số lần đã dùng)."""

    model_config = ConfigDict(from_attributes=True)

    MaGiamGia: int
    MaCode: str
    MoTa: str | None = None
    LoaiGiam: str
    GiaTri: Decimal
    HanSuDung: date
    SoLanToiDa: int
    SoLanDaDung: int
    TrangThai: str


class VoucherUpdate(BaseModel):
    """Cập nhật mã giảm giá (chỉ Admin). Tất cả trường đều tùy chọn."""

    MoTa: str | None = None
    LoaiGiam: str | None = None
    GiaTri: Decimal | None = Field(None, gt=0)
    HanSuDung: date | None = None
    SoLanToiDa: int | None = Field(None, ge=1)
    TrangThai: str | None = None
