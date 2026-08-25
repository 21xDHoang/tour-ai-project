# -*- coding: utf-8 -*-
"""
app/schemas/cancellation.py - DTO cho nhóm chức năng Hủy tour (DR-04).

Chính sách phạt:
  - Hủy >= 7 ngày trước khởi hành: hoàn 100% cọc, MucPhat = 0.0
  - Hủy 3-6 ngày trước khởi hành: phạt 50% cọc, MucPhat = 0.5
  - Hủy < 3 ngày trước khởi hành: phạt 100% cọc, MucPhat = 1.0
"""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class HuyTourRequest(BaseModel):
    """Yêu cầu hủy một đơn đặt chỗ."""

    LyDo: str = Field(..., min_length=3, description="Lý do hủy tour")
    NguoiXuLyID: int | None = Field(
        None, description="Người xử lý (nếu để trống service sẽ tự chọn kế toán)"
    )


class CancelRequest(BaseModel):
    """Payload endpoint POST /api/v1/payments/cancel (có MaDatCho)."""

    MaDatCho: int
    LyDo: str = Field(..., min_length=3, description="Lý do hủy tour")


class HuyTourResponse(BaseModel):
    """Hồ sơ hủy tour trả về cho client."""

    model_config = ConfigDict(from_attributes=True)

    MaHuy: int
    MaDatCho: int
    NgayHuy: datetime
    LyDo: str | None = None
    MucPhat: Decimal
    SoTienHoan: Decimal
    NguoiXuLyID: int
