# -*- coding: utf-8 -*-
"""
app/repositories/payment_repo.py - Truy vấn dữ liệu Thanh toán & Hủy tour.

Chỉ chứa câu lệnh SQLAlchemy cho ThanhToan / HuyTour.
Logic nghiệp vụ (DR-03, DR-04) nằm ở app/services/payment_service.py.
"""
from sqlalchemy.orm import Session

from app.models import HuyTour, ThanhToan


class PaymentRepository:
    """Thao tác dữ liệu cho nhóm chức năng Thanh toán."""

    @staticmethod
    def create_thanh_toan(db: Session, **fields) -> ThanhToan:
        """Ghi nhận một giao dịch thanh toán (chưa commit)."""
        tt = ThanhToan(**fields)
        db.add(tt)
        db.flush()
        return tt

    @staticmethod
    def get_thanh_toan_by_id(db: Session, ma_thanh_toan: int) -> ThanhToan | None:
        """Lấy giao dịch thanh toán theo mã."""
        return (
            db.query(ThanhToan)
            .filter(ThanhToan.MaThanhToan == ma_thanh_toan)
            .first()
        )

    @staticmethod
    def list_thanh_toan_by_dat_cho(
        db: Session, ma_dat_cho: int
    ) -> list[ThanhToan]:
        """Lịch sử giao dịch của một đơn đặt chỗ."""
        return (
            db.query(ThanhToan)
            .filter(ThanhToan.MaDatCho == ma_dat_cho)
            .order_by(ThanhToan.NgayGiaoDich)
            .all()
        )

    @staticmethod
    def create_huy_tour(db: Session, **fields) -> HuyTour:
        """Lưu hồ sơ hủy tour (chưa commit)."""
        huy = HuyTour(**fields)
        db.add(huy)
        db.flush()
        return huy

    @staticmethod
    def get_huy_tour_by_id(db: Session, ma_huy: int) -> HuyTour | None:
        """Lấy hồ sơ hủy theo mã."""
        return db.query(HuyTour).filter(HuyTour.MaHuy == ma_huy).first()
