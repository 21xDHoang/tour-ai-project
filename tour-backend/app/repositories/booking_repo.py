# -*- coding: utf-8 -*-
"""
app/repositories/booking_repo.py - Truy vấn dữ liệu Đặt chỗ.

Chỉ chứa câu lệnh SQLAlchemy cho DatCho / ChiTietDatCho.
Logic nghiệp vụ (DR-01, DR-02) nằm ở app/services/booking_service.py.
"""
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import ChiTietDatCho, DatCho


class BookingRepository:
    """Thao tác dữ liệu cho nhóm chức năng Đặt chỗ."""

    @staticmethod
    def create_dat_cho(db: Session, **fields) -> DatCho:
        """Tạo đơn đặt chỗ (chưa commit)."""
        dat = DatCho(**fields)
        db.add(dat)
        db.flush()  # lấy MaDatCho ngay lập tức
        return dat

    @staticmethod
    def add_chi_tiet(db: Session, ma_dat_cho: int, hanh_khach) -> ChiTietDatCho:
        """Thêm một hành khách vào đơn đặt chỗ (chưa commit)."""
        ct = ChiTietDatCho(
            MaDatCho=ma_dat_cho,
            HoTen=hanh_khach.HoTen,
            SoDienThoai=hanh_khach.SoDienThoai,
            GhiChu=hanh_khach.GhiChu,
        )
        db.add(ct)
        return ct

    @staticmethod
    def get_dat_cho_by_id(db: Session, ma_dat_cho: int) -> DatCho | None:
        """Lấy đơn đặt chỗ theo mã."""
        return db.query(DatCho).filter(DatCho.MaDatCho == ma_dat_cho).first()

    @staticmethod
    def list_chi_tiet(db: Session, ma_dat_cho: int) -> list[ChiTietDatCho]:
        """Danh sách hành khách của một đơn."""
        return (
            db.query(ChiTietDatCho)
            .filter(ChiTietDatCho.MaDatCho == ma_dat_cho)
            .order_by(ChiTietDatCho.MaChiTiet)
            .all()
        )

    @staticmethod
    def get_expired_bookings(db: Session, now: datetime) -> list[DatCho]:
        """Các đơn đang GIỮ CHỖ (GiuCho) nhưng đã hết hạn 24 giờ (DR-02)."""
        return (
            db.query(DatCho)
            .filter(DatCho.TrangThai == "GiuCho", DatCho.HanGiuCho < now)
            .all()
        )
