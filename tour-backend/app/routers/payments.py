# -*- coding: utf-8 -*-
"""
app/routers/payments.py - Endpoint RESTful cho Thanh toán & Hủy tour.

  POST /api/v1/payments/deposit       - xác nhận cọc >= 30% (Accountant/Admin) DR-03
  POST /api/v1/payments/full-payment  - thanh toán phần còn lại (Accountant/Admin)
  POST /api/v1/payments/cancel        - hủy tour, tính phạt & hoàn tiền (Accountant/Admin) DR-04
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import NguoiDung
from app.schemas.booking import DatChoResponse
from app.schemas.cancellation import CancelRequest, HuyTourRequest, HuyTourResponse
from app.schemas.payment import (
    CocRequest,
    FullPaymentRequest,
    ThanhToanCocRequest,
    ThanhToanDuRequest,
)
from app.services.payment_service import PaymentService
from app.utils.auth import require_roles

router = APIRouter(prefix="/payments", tags=["payments"])

# Chỉ kế toán/Admin được thao tác tiền bạc
KE_TOAN_ADMIN = ["Accountant", "Admin"]


@router.post(
    "/deposit",
    response_model=DatChoResponse,
    dependencies=[Depends(require_roles(KE_TOAN_ADMIN))],
)
def deposit(
    body: CocRequest,
    user: NguoiDung = Depends(require_roles(KE_TOAN_ADMIN)),
    db: Session = Depends(get_db),
):
    """Xác nhận đặt cọc tối thiểu 30% tổng giá trị đơn -> chuyển 'DaCoc' (DR-03)."""
    return PaymentService.confirm_deposit(
        db,
        body.MaDatCho,
        ThanhToanCocRequest(SoTien=body.SoTien, PhuongThuc=body.PhuongThuc),
        nguoi_xu_ly_id=user.MaNguoiDung,
    )


@router.post(
    "/full-payment",
    response_model=DatChoResponse,
    dependencies=[Depends(require_roles(KE_TOAN_ADMIN))],
)
def full_payment(
    body: FullPaymentRequest,
    user: NguoiDung = Depends(require_roles(KE_TOAN_ADMIN)),
    db: Session = Depends(get_db),
):
    """Xác nhận thanh toán đủ phần còn lại -> chuyển 'DaThanhToan'."""
    return PaymentService.confirm_full_payment(
        db,
        body.MaDatCho,
        ThanhToanDuRequest(SoTien=body.SoTien, PhuongThuc=body.PhuongThuc),
        nguoi_xu_ly_id=user.MaNguoiDung,
    )


@router.post(
    "/cancel",
    response_model=HuyTourResponse,
    dependencies=[Depends(require_roles(KE_TOAN_ADMIN))],
)
def cancel_tour(
    body: CancelRequest,
    user: NguoiDung = Depends(require_roles(KE_TOAN_ADMIN)),
    db: Session = Depends(get_db),
):
    """Hủy tour, tính mức phạt & tiền hoàn theo khoảng cách ngày khởi hành (DR-04)."""
    return PaymentService.process_cancellation(
        db,
        body.MaDatCho,
        HuyTourRequest(LyDo=body.LyDo, NguoiXuLyID=user.MaNguoiDung),
    )
