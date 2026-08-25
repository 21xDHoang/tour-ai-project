# -*- coding: utf-8 -*-
"""
app/schemas/guide.py - DTO cho nhóm chức năng Hướng dẫn viên.

Gồm phân công (DR-05), hồ sơ HDV chi tiết (định danh / năng lực / tài chính)
và các thống kê dẫn xuất (lịch sử tour, rảnh/bận, đánh giá).
"""
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class PhanCongHDVRequest(BaseModel):
    """Yêu cầu phân công hướng dẫn viên vào một lịch khởi hành."""

    MaLich: int
    MaHDV: int
    VaiTro: str = Field("TruongDoan", description="TruongDoan / PhuDoan")
    GhiChu: str | None = None


class PhanCongHDVResponse(BaseModel):
    """Bản ghi phân công trả về cho client."""

    model_config = ConfigDict(from_attributes=True)

    MaPhanCong: int
    MaLich: int
    MaHDV: int
    VaiTro: str
    GhiChu: str | None = None


class HDVResponse(BaseModel):
    """Hồ sơ hướng dẫn viên đầy đủ (định danh + năng lực + tài chính)."""

    model_config = ConfigDict(from_attributes=True)

    MaHDV: int
    HoTen: str
    SoDienThoai: str
    Email: str | None = None
    SoNamKinhNghiem: int
    ChuyenMon: str | None = None
    TrangThai: str

    # Định danh
    MaNV: str | None = None
    CCCD: str | None = None
    NgaySinh: date | None = None
    HoChieu: str | None = None
    DiaChi: str | None = None
    TrangThaiLamViec: str

    # Năng lực & chuyên môn
    TheHDV: str | None = None
    TuyenDiem: str | None = None
    KyNang: str | None = None

    # Tài chính
    DinhMucThuLao: Decimal | None = None
    CongTacPhi: Decimal | None = None
    ThongTinThanhToan: str | None = None


class HDVListItem(HDVResponse):
    """HDV trong danh sách + thống kê nhanh (dẫn xuất)."""

    tong_so_tour: int = 0
    trang_thai_hoat_dong: str = "Ranh"  # Ranh / Ban / DangDanTour / NghiPhep


class HDVLichSuItem(BaseModel):
    """Một phân công trong lịch sử điều hành của HDV."""

    MaPhanCong: int
    MaLich: int
    ten_tour: str
    ngay_khoi_hanh: date
    ngay_ket_thuc: date
    VaiTro: str
    trang_thai_lich: str
    GhiChu: str | None = None


class HDVDetailResponse(HDVResponse):
    """HDV chi tiết + lịch sử phân công + thống kê đánh giá."""

    lich_su: list[HDVLichSuItem] = Field(default_factory=list)
    tong_so_tour_da_dan: int = 0
    diem_trung_binh: float | None = None
    so_phan_hoi: int = 0


class HDVCreate(BaseModel):
    """Tạo mới hướng dẫn viên (Admin)."""

    HoTen: str = Field(..., min_length=2, max_length=100)
    SoDienThoai: str = Field(..., min_length=8, max_length=20)
    Email: str | None = None
    SoNamKinhNghiem: int = Field(0, ge=0)
    ChuyenMon: str | None = None
    TrangThai: str = Field("Ranh")
    MaNV: str | None = Field(None, max_length=20)
    CCCD: str | None = Field(None, max_length=20)
    NgaySinh: date | None = None
    HoChieu: str | None = Field(None, max_length=20)
    DiaChi: str | None = Field(None, max_length=255)
    TrangThaiLamViec: str = Field("ChinhThuc")
    TheHDV: str | None = Field(None, max_length=50)
    TuyenDiem: str | None = None
    KyNang: str | None = None
    DinhMucThuLao: Decimal | None = Field(None, ge=0)
    CongTacPhi: Decimal | None = Field(None, ge=0)
    ThongTinThanhToan: str | None = Field(None, max_length=255)


class HDVUpdate(BaseModel):
    """Cập nhật hồ sơ hướng dẫn viên (Admin). Tất cả field tùy chọn."""

    HoTen: str | None = Field(None, min_length=2, max_length=100)
    SoDienThoai: str | None = Field(None, min_length=8, max_length=20)
    Email: str | None = None
    SoNamKinhNghiem: int | None = Field(None, ge=0)
    ChuyenMon: str | None = None
    TrangThai: str | None = None
    MaNV: str | None = Field(None, max_length=20)
    CCCD: str | None = Field(None, max_length=20)
    NgaySinh: date | None = None
    HoChieu: str | None = Field(None, max_length=20)
    DiaChi: str | None = Field(None, max_length=255)
    TrangThaiLamViec: str | None = None
    TheHDV: str | None = Field(None, max_length=50)
    TuyenDiem: str | None = None
    KyNang: str | None = None
    DinhMucThuLao: Decimal | None = Field(None, ge=0)
    CongTacPhi: Decimal | None = Field(None, ge=0)
    ThongTinThanhToan: str | None = Field(None, max_length=255)
