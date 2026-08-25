# -*- coding: utf-8 -*-
"""
app/schemas/booking.py - DTO cho nhóm chức năng Đặt chỗ (DR-01, DR-02).

Số khách của đơn được suy ra từ danh sách hành khách ChiTietDatCho.
"""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ChiTietHanhKhachSchema(BaseModel):
    """Một hành khách trong đơn đặt chỗ."""

    model_config = ConfigDict(from_attributes=True)

    HoTen: str = Field(..., min_length=2, description="Họ tên hành khách")
    SoDienThoai: str | None = None
    GhiChu: str | None = None


class DatChoCreateRequest(BaseModel):
    """Yêu cầu tạo đơn đặt chỗ: lịch + khách hàng + danh sách hành khách."""

    MaLich: int
    MaKhachHang: int
    ds_hanh_khach: list[ChiTietHanhKhachSchema] = Field(min_length=1)

    @property
    def SoKhach(self) -> int:
        """Số khách = số lượng hành khách khai báo trong đơn."""
        return len(self.ds_hanh_khach)


class NguoiDatManualSchema(BaseModel):
    """Thông tin người đặt (khách ngoài) khi tư vấn viên tạo đơn thủ công."""

    HoTen: str = Field(..., min_length=2, max_length=100)
    SoDienThoai: str = Field(..., min_length=8, max_length=20)
    Email: str | None = None


class DatChoManualRequest(BaseModel):
    """Yêu cầu tạo đơn đặt chỗ thủ công từ bàn đặt tour (Tư vấn viên/Admin)."""

    MaLich: int
    nguoi_dat: NguoiDatManualSchema
    ds_hanh_khach: list[ChiTietHanhKhachSchema] = Field(
        min_length=1, description="GhiChu = sở thích riêng từng hành khách"
    )
    TongTien: Decimal | None = Field(None, gt=0, description="null = tự tính theo tour")
    # TrangThaiThanhToan: ChuaCoc / DaCoc / DaThanhToan
    TrangThaiThanhToan: str = Field("ChuaCoc")
    SoTienCoc: Decimal | None = Field(None, gt=0, description="chỉ dùng khi DaCoc")
    PhuongThuc: str = Field("TienMat", description="TienMat / ChuyenKhoan / The")

    @property
    def SoKhach(self) -> int:
        """Số khách = số lượng hành khách khai báo trong đơn."""
        return len(self.ds_hanh_khach)


class DatChoResponse(BaseModel):
    """Đơn đặt chỗ trả về cho client."""

    model_config = ConfigDict(from_attributes=True)

    MaDatCho: int
    MaKhachHang: int
    MaLich: int
    SoKhach: int
    TongTien: Decimal
    DaDatCoc: Decimal
    NgayDat: datetime
    HanGiuCho: datetime
    TrangThai: str

    # Cảnh báo nghiệp vụ (vd: đoàn dưới MinSeats) - chỉ xuất hiện khi có
    canh_bao: str | None = None


class DatChoListItem(BaseModel):
    """Đơn đặt chỗ trong danh sách quản lý (kèm tên khách/tour/lịch)."""

    MaDatCho: int
    MaKhachHang: int
    ten_khach_hang: str
    MaLich: int
    NguoiTaoID: int | None = None
    ten_nguoi_tao: str | None = None
    ten_tour: str
    ten_diem_den: str | None = None
    ngay_khoi_hanh: date | None = None
    SoKhach: int
    TongTien: Decimal
    DaDatCoc: Decimal
    NgayDat: datetime
    HanGiuCho: datetime
    TrangThai: str


class DatChoDetailResponse(DatChoResponse):
    """Chi tiết đơn đặt chỗ: thông tin đơn + danh sách hành khách."""

    ds_hanh_khach: list[ChiTietHanhKhachSchema] = Field(default_factory=list)
    # Bổ trợ cho màn hình chi tiết (không nằm trong bảng DatCho)
    coc_toi_thieu: Decimal | None = Field(
        None, description="Tiền cọc tối thiểu 30% tổng giá trị đơn (DR-03)"
    )
    dem_nguoc_giay: int | None = Field(
        None, description="Số giây còn lại của thời hạn giữ chỗ 24h (DR-02)"
    )
