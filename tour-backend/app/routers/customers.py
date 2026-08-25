# -*- coding: utf-8 -*-
"""
app/routers/customers.py - Endpoint hỗ trợ Khách hàng (BƯỚC 5).

  GET /api/v1/customers/my          - hồ sơ KhachHang của user đang đăng nhập
                                       (tự tạo nếu chưa có, khớp theo Email)
  GET /api/v1/customers/my/bookings - lịch sử đặt tour của khách hàng
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DatCho, DiemDen, KhachHang, LichKhoiHanh, NguoiDung, Tour
from app.schemas.customer import (
    CustomerBookingItem,
    KhachHangResponse,
    KhachHangUpdate,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/customers", tags=["customers"])


def _lay_hoac_tao_khach_hang(db: Session, user: NguoiDung) -> KhachHang:
    """Tìm hồ sơ KhachHang theo Email của tài khoản; tự tạo nếu chưa có."""
    kh = db.query(KhachHang).filter(KhachHang.Email == user.Email).first()
    if kh is not None:
        return kh
    kh = KhachHang(
        HoTen=user.HoTen,
        Email=user.Email,
        SoDienThoai="",
        LoaiKhach="Thuong",
        GhiChu="Tự tạo từ tài khoản đăng nhập (BƯỚC 5)",
    )
    db.add(kh)
    db.commit()
    db.refresh(kh)
    return kh


@router.get("/my", response_model=KhachHangResponse)
def get_my_customer(
    user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Hồ sơ khách hàng của user hiện tại (khớp theo Email)."""
    return _lay_hoac_tao_khach_hang(db, user)


@router.patch("/my", response_model=KhachHangResponse)
def update_my_customer(
    body: KhachHangUpdate,
    user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cập nhật hồ sơ khách hàng (họ tên, SĐT, ngày sinh, ghi chú, ảnh đại diện)."""
    kh = _lay_hoac_tao_khach_hang(db, user)
    du_lieu = body.model_dump(exclude_unset=True)
    for key, value in du_lieu.items():
        setattr(kh, key, value)
    db.commit()
    db.refresh(kh)
    return kh


@router.get("/my/bookings", response_model=list[CustomerBookingItem])
def get_my_bookings(
    user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lịch sử đặt tour của khách hàng (đơn gần nhất trước)."""
    kh = _lay_hoac_tao_khach_hang(db, user)
    rows = (
        db.query(DatCho, LichKhoiHanh, Tour, DiemDen)
        .join(LichKhoiHanh, LichKhoiHanh.MaLich == DatCho.MaLich)
        .join(Tour, Tour.MaTour == LichKhoiHanh.MaTour)
        .join(DiemDen, DiemDen.MaDiemDen == Tour.MaDiemDen)
        .filter(DatCho.MaKhachHang == kh.MaKhachHang)
        .order_by(DatCho.NgayDat.desc())
        .all()
    )
    return [
        CustomerBookingItem(
            MaDatCho=d.MaDatCho,
            MaLich=d.MaLich,
            ten_tour=t.TenTour,
            ten_diem_den=dd.TenDiemDen,
            ngay_khoi_hanh=l.NgayKhoiHanh,
            SoKhach=d.SoKhach,
            TongTien=d.TongTien,
            DaDatCoc=d.DaDatCoc,
            NgayDat=d.NgayDat,
            HanGiuCho=d.HanGiuCho,
            TrangThai=d.TrangThai,
        )
        for d, l, t, dd in rows
    ]
