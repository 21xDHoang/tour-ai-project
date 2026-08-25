# -*- coding: utf-8 -*-
"""
app/schemas/report.py - DTO cho nhóm Báo cáo (BƯỚC 5).

Hỗ trợ màn hình Dashboard: doanh thu & dòng tiền theo tháng.
"""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class RevenueItem(BaseModel):
    """Dòng tiền một tháng (thang định dạng 'YYYY-MM')."""

    thang: str
    doanh_thu: Decimal
    hoan_tien: Decimal
    dong_tien: Decimal


class TransactionItem(BaseModel):
    """Một giao dịch trong sổ quỹ (thu từ khách hoặc chi cho nhà cung cấp)."""

    key: str                       # "tt-{MaThanhToan}" hoặc "pc-{MaPhieuChi}"
    nguon: str                     # "Thu" / "Chi"
    MaDatCho: int | None = None
    LoaiGiaoDich: str              # Coc / ThanhToan / HoanTien / ChiPhi
    SoTien: Decimal                # âm cho chi
    NgayGiaoDich: datetime
    PhuongThuc: str | None = None
    NguoiXuLyID: int | None = None
    ten_nguoi_xu_ly: str | None = None
    ten_khach_hang: str | None = None  # khách (thu) hoặc đối tác (chi)
    GhiChu: str | None = None


class ReceivableItem(BaseModel):
    """Công nợ: đơn đã cọc nhưng chưa thanh toán đủ."""

    MaDatCho: int
    ten_khach_hang: str
    ten_tour: str
    TongTien: Decimal
    DaDatCoc: Decimal
    con_lai: Decimal


class PaymentMethodItem(BaseModel):
    """Tổng tiền theo phương thức thanh toán."""

    phuong_thuc: str
    tong_tien: Decimal
