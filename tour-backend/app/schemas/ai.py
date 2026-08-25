# -*- coding: utf-8 -*-
"""
app/schemas/ai.py - DTO cho các endpoint AI (UC-10..UC-13).

Các response (TuVanResponse, NoiDungResponse, PhanTichResponse, DeXuatResponse)
được tái dùng từ app/ai/ - đã định nghĩa theo Mã nguồn 3.11..3.14.
"""
from pydantic import BaseModel, Field


class TuVanRequest(BaseModel):
    """Yêu cầu AI tư vấn tour (UC-10)."""

    YeuCau: str = Field(..., min_length=5, description="Yêu cầu của khách hàng")


class SinhNoiDungRequest(BaseModel):
    """Yêu cầu AI sinh mô tả & lịch trình cho tour (UC-11)."""

    MaTour: int


class SinhNoiDungTuDoRequest(BaseModel):
    """Yêu cầu AI sinh mô tả & lịch trình cho tour ĐANG TẠO (chưa có MaTour)."""

    TenTour: str = Field(..., min_length=2, max_length=200)
    TenDiemDen: str = Field(..., min_length=1, max_length=200)
    SoNgay: int = Field(..., ge=1, le=30)
    MoTa: str | None = None


class PhanTichFeedbackRequest(BaseModel):
    """Yêu cầu AI phân tích phản hồi của một tour (UC-12)."""

    MaTour: int


class DeXuatHDVRequest(BaseModel):
    """Yêu cầu AI đề xuất Top 3 HDV cho một lịch khởi hành (UC-13)."""

    MaLich: int
