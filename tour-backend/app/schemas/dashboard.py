# -*- coding: utf-8 -*-
"""
app/schemas/dashboard.py - DTO cho Dashboard & KPI.

Dashboard tổng quan (Admin) và KPI nhân viên (Admin xem tất cả, Tư vấn viên
xem của mình). Mọi số liệu đều suy từ dữ liệu có sẵn (DatCho, ThanhToan,
YeuCauTuVan, YeuCauTourRieng) - không cần bảng mới.
"""
from decimal import Decimal

from pydantic import BaseModel, Field


class DashboardSummary(BaseModel):
    """Thẻ thống kê trên màn hình Tổng quan Admin."""

    doanh_thu_hom_nay: Decimal = Field(default=Decimal("0"))
    doanh_thu_thang: Decimal = Field(default=Decimal("0"))
    don_moi_7_ngay: int = 0
    khach_dang_di_tour: int = 0
    lead_moi_7_ngay: int = 0
    tong_khach_hang: int = 0
    tong_tour_dang_ban: int = 0


class KpiItem(BaseModel):
    """KPI của một nhân viên (Consultant)."""

    MaNguoiDung: int
    HoTen: str
    VaiTro: str = "Consultant"
    so_lead: int = 0
    lead_dang_chot: int = 0
    so_don: int = 0
    so_don_da_thanh_toan: int = 0
    so_tour_rieng: int = 0
    tour_rieng_da_chot: int = 0
