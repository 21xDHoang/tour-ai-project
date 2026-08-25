# -*- coding: utf-8 -*-
"""
app/schemas/admin.py - DTO cho nhóm quản trị hệ thống (Admin).

Hồ sơ khách hàng (CRM), cấp phát tài khoản, và quản lý lịch khởi hành.
"""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.booking import ChiTietHanhKhachSchema


class CustomerProfile(BaseModel):
    """Hồ sơ khách hàng kèm số liệu chi tiêu tổng hợp."""

    model_config = ConfigDict(from_attributes=True)

    MaKhachHang: int
    HoTen: str
    SoDienThoai: str
    Email: str | None = None
    LoaiKhach: str
    GhiChu: str | None = None
    tong_tien_da_chi: Decimal = Field(default=Decimal("0"))
    so_don: int = 0
    so_don_da_thanh_toan: int = 0


class UserItem(BaseModel):
    """Tài khoản người dùng trong danh sách quản trị."""

    model_config = ConfigDict(from_attributes=True)

    MaNguoiDung: int
    HoTen: str
    Email: str
    VaiTro: str
    TrangThai: str
    NgayTao: datetime
    HeSoLuong: Decimal | None = None
    LuongCoBan: Decimal | None = None
    PhuCap: Decimal | None = None


class UserUpdate(BaseModel):
    """Khóa/mở tài khoản, đổi vai trò hoặc cập nhật cấu hình lương."""

    TrangThai: str | None = Field(None, description="Active/Locked")
    VaiTro: str | None = Field(None, description="Admin/Consultant/Accountant/Customer/TaiXe")
    HeSoLuong: Decimal | None = Field(None, ge=0)
    LuongCoBan: Decimal | None = Field(None, ge=0)
    PhuCap: Decimal | None = Field(None, ge=0)


class ScheduleAdminItem(BaseModel):
    """Lịch khởi hành trong màn hình quản lý (kèm tên tour/điểm đến + thống kê đặt)."""

    MaLich: int
    MaTour: int
    ten_tour: str
    ten_diem_den: str | None = None
    NgayKhoiHanh: date
    NgayKetThuc: date
    MinSeats: int
    MaxSeats: int
    SoChoCon: int
    TrangThai: str
    # Thống kê đặt chỗ (dẫn xuất)
    so_don: int = 0                      # tổng đơn còn hiệu lực (chưa hủy/hết hạn)
    so_khach_da_chot: int = 0            # số khách đã cọc + đã thanh toán đủ
    so_khach_giu_cho: int = 0            # số khách đang giữ chỗ / chờ cọc
    # HDV đã phân công cho lịch (dẫn xuất)
    ten_hdv: str | None = None           # "HoTen (VaiTro), ..." hoặc None nếu chưa phân công


class ScheduleBookingItem(BaseModel):
    """Đơn đặt chỗ trong danh sách đoàn của một lịch khởi hành."""

    MaDatCho: int
    MaKhachHang: int
    ten_khach_hang: str
    SoDienThoai: str
    Email: str | None = None
    SoKhach: int
    TongTien: Decimal
    DaDatCoc: Decimal
    TrangThai: str
    NgayDat: datetime
    ds_hanh_khach: list[ChiTietHanhKhachSchema] = Field(default_factory=list)


class ScheduleUpdate(BaseModel):
    """Mở bán/ngừng bán hoặc điều chỉnh chỗ trống của lịch."""

    TrangThai: str | None = Field(None, description="MoBan/NgungBan")
    SoChoCon: int | None = Field(None, ge=0)
