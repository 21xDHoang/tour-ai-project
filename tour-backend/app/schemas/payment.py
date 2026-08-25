# -*- coding: utf-8 -*-
"""
app/schemas/payment.py - DTO cho nhóm chức năng Thanh toán (DR-03).

Coc: đặt cọc tối thiểu 30% TongTien.
ThanhToan: thanh toán phần còn lại.
"""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ThanhToanCocRequest(BaseModel):
    """Yêu cầu đặt cọc (tối thiểu 30% tổng giá trị đơn - DR-03)."""

    SoTien: Decimal = Field(..., gt=0, description="Số tiền đặt cọc")
    PhuongThuc: str = Field(..., description="TienMat / ChuyenKhoan / The")


class CocRequest(BaseModel):
    """Payload endpoint POST /api/v1/payments/deposit (có MaDatCho)."""

    MaDatCho: int
    SoTien: Decimal = Field(..., gt=0, description="Số tiền đặt cọc")
    PhuongThuc: str = Field(..., description="TienMat / ChuyenKhoan / The")


class FullPaymentRequest(BaseModel):
    """Payload endpoint POST /api/v1/payments/full-payment."""

    MaDatCho: int
    SoTien: Decimal = Field(..., gt=0, description="Số tiền thanh toán phần còn lại")
    PhuongThuc: str = Field(..., description="TienMat / ChuyenKhoan / The")


class ThanhToanDuRequest(BaseModel):
    """Yêu cầu thanh toán số tiền còn lại."""

    SoTien: Decimal = Field(..., gt=0, description="Số tiền thanh toán")
    PhuongThuc: str = Field(..., description="TienMat / ChuyenKhoan / The")


class ThanhToanResponse(BaseModel):
    """Giao dịch thanh toán trả về cho client."""

    model_config = ConfigDict(from_attributes=True)

    MaThanhToan: int
    MaDatCho: int
    LoaiGiaoDich: str
    SoTien: Decimal
    NgayGiaoDich: datetime
    PhuongThuc: str
    NguoiXuLyID: int
    GhiChu: str | None = None
