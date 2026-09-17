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


class BankInfoResponse(BaseModel):
    """Tài khoản nhận chuyển khoản cọc - khách đọc để tự chuyển tiền.

    Trả về cho frontend dựng khối "Thanh toán cọc": số tài khoản, chủ tài khoản,
    và tiền tố nội dung chuyển khoản. Frontend ghép tiền tố với mã đơn thành
    "mã thanh toán" (vd TOURAI-899) - đúng chuỗi mà reconcile_webhook dò trong
    MoTa để đối soát tự động.

    Cả ba trường rỗng = chưa cấu hình ngân hàng; frontend tự ẩn khối.
    """

    BankId: str = ""
    SoTaiKhoan: str = ""
    ChuTaiKhoan: str = ""
    TienToNoiDung: str = "TOURAI-"


class VietQRWebhookRequest(BaseModel):
    """Payload webhook ngân hàng (VietQR/UNC) gửi về khi có biến động số dư.

    - SoTien: số tiền vào tài khoản.
    - MoTa: nội dung chuyển khoản - thường chứa mã đơn (vd "#12" / "TOURAI-12")
      để hệ thống đối soát chính xác.
    """

    SoTien: Decimal = Field(..., gt=0, description="Số tiền nhận được")
    MaGiaoDich: str | None = None
    MoTa: str | None = None
    ThoiGian: datetime | None = None


class VietQRWebhookResponse(BaseModel):
    """Kết quả đối soát webhook: matched=True khi tìm được đơn để tự xác nhận cọc."""

    matched: bool
    ma_dat_cho: int | None = None
