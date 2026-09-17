# -*- coding: utf-8 -*-
"""
app/schemas/customer.py - DTO cho nhóm chức năng Khách hàng (BƯỚC 5).

Hỗ trợ frontend: hồ sơ khách hàng hiện tại và lịch sử đặt tour.
"""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class KhachHangResponse(BaseModel):
    """Hồ sơ khách hàng trả về cho client."""

    model_config = ConfigDict(from_attributes=True)

    MaKhachHang: int
    HoTen: str
    SoDienThoai: str
    Email: str | None = None
    NgaySinh: date | None = None
    LoaiKhach: str
    GhiChu: str | None = None
    AnhDaiDien: str | None = None


class KhachHangUpdate(BaseModel):
    """Cập nhật hồ sơ khách hàng (khách tự sửa thông tin cá nhân).

    Email không nằm ở đây vì gắn với tài khoản đăng nhập (không cho sửa tự do).
    """

    HoTen: str | None = Field(None, min_length=2, max_length=100)
    SoDienThoai: str | None = Field(None, min_length=8, max_length=20)
    NgaySinh: date | None = None
    GhiChu: str | None = Field(None, max_length=255)
    AnhDaiDien: str | None = None


class CustomerBookingItem(BaseModel):
    """Đơn đặt chỗ trong lịch sử của khách hàng (kèm tên tour & lịch)."""

    MaDatCho: int
    MaLich: int
    ten_tour: str
    ten_diem_den: str | None = None
    ngay_khoi_hanh: date | None = None
    SoKhach: int
    TongTien: Decimal
    DaDatCoc: Decimal
    NgayDat: datetime
    HanGiuCho: datetime
    TrangThai: str
    # Khai báo "đã chuyển khoản" -> ChoXacNhanCoc (tạm dừng đếm ngược 24h)
    SoGiayConLai: int | None = None
    HinhAnhChuyenKhoan: str | None = None
    # Tiền cọc tối thiểu 30% tổng giá trị đơn (DR-03) - khách cần biết chuyển
    # bao nhiêu. Cùng công thức với màn hình chi tiết đơn và webhook đối soát.
    coc_toi_thieu: Decimal | None = None
