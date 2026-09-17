# -*- coding: utf-8 -*-
"""
app/routers/payments.py - Endpoint RESTful cho Thanh toán & Hủy tour.

  POST /api/v1/payments/deposit       - xác nhận cọc >= 30% (Accountant/Admin) DR-03
  POST /api/v1/payments/full-payment  - thanh toán phần còn lại (Accountant/Admin)
  POST /api/v1/payments/cancel        - hủy tour, tính phạt & hoàn tiền (Accountant/Admin) DR-04
"""
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import NguoiDung
from app.schemas.booking import DatChoResponse
from app.schemas.cancellation import CancelRequest, HuyTourRequest, HuyTourResponse
from app.schemas.payment import (
    BankInfoResponse,
    CocRequest,
    FullPaymentRequest,
    ThanhToanCocRequest,
    ThanhToanDuRequest,
    VietQRWebhookRequest,
    VietQRWebhookResponse,
)
from app.services.payment_service import PaymentService
from app.utils.auth import require_roles

router = APIRouter(prefix="/payments", tags=["payments"])

# Chỉ kế toán/Admin được thao tác tiền bạc
KE_TOAN_ADMIN = ["Accountant", "Admin"]


def kiem_tra_webhook_secret(x_secret: str | None = Header(None)):
    """Xác thực webhook ngân hàng bằng secret (P1).

    - Nếu chưa cấu hình WEBHOOK_SECRET (rỗng) -> endpoint public, không check.
    - Khi có secret -> yêu cầu header X-Webhook-Secret khớp, sai trả 403.
    """
    if settings.WEBHOOK_SECRET and x_secret != settings.WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Webhook secret không hợp lệ")
    return None


@router.get("/bank-info", response_model=BankInfoResponse)
def bank_info():
    """Tài khoản nhận chuyển khoản cọc (PUBLIC - khách chưa đăng nhập vẫn xem được).

    Không phải bí mật: số tài khoản này vốn hiển thị cho khách để họ chuyển
    tiền. Trả về rỗng nếu chưa cấu hình ngân hàng, frontend tự ẩn khối.
    """
    return BankInfoResponse(
        BankId=settings.BANK_ID,
        SoTaiKhoan=settings.BANK_ACCOUNT,
        ChuTaiKhoan=settings.BANK_ACCOUNT_NAME,
        TienToNoiDung=settings.BANK_REF_PREFIX,
    )


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


@router.post(
    "/webhook",
    response_model=VietQRWebhookResponse,
    dependencies=[Depends(kiem_tra_webhook_secret)],
)
def vietqr_webhook(
    body: VietQRWebhookRequest,
    db: Session = Depends(get_db),
):
    """P1: Webhook biến động số dư ngân hàng (VietQR/UNC) -> đối soát tự động.

    Khi khách chuyển khoản cọc, ngân hàng gửi payload về đây; hệ thống khớp
    số tiền (~30% TongTien, sai số ±1.000đ) + mã đơn trong MoTa rồi tự xác
    nhận cọc cho đơn đang ChoXacNhanCoc -> DaCoc (không cần kế toán thao tác).

    Endpoint PUBLIC theo thiết kế đợt này (WEBHOOK_SECRET rỗng); bật secret
    header khi kết nối ngân hàng thật.
    """
    return PaymentService.reconcile_webhook(db, body)
