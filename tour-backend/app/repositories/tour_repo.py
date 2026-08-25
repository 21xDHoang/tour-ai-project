# -*- coding: utf-8 -*-
"""
app/repositories/tour_repo.py - Truy vấn dữ liệu Tour, Điểm đến, Lịch khởi hành.

Chỉ chứa câu lệnh SQLAlchemy, KHÔNG chứa logic nghiệp vụ (logic nằm ở Service).
"""
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import DiemDen, LichKhoiHanh, Tour


class TourRepository:
    """Thao tác đọc dữ liệu cho nhóm chức năng Tour."""

    @staticmethod
    def get_tour_by_id(db: Session, ma_tour: int) -> Tour | None:
        """Lấy tour theo mã."""
        return db.query(Tour).filter(Tour.MaTour == ma_tour).first()

    @staticmethod
    def get_diem_den_by_id(db: Session, ma_diem_den: int) -> DiemDen | None:
        """Lấy điểm đến theo mã."""
        return (
            db.query(DiemDen).filter(DiemDen.MaDiemDen == ma_diem_den).first()
        )

    @staticmethod
    def list_diem_den(db: Session) -> list[DiemDen]:
        """Danh sách toàn bộ điểm đến."""
        return db.query(DiemDen).order_by(DiemDen.TenDiemDen).all()

    @staticmethod
    def search_tours(
        db: Session,
        tu_khoa: str | None = None,
        khu_vuc: str | None = None,
        gia_toi_da: Decimal | None = None,
        trang_thai: str | None = "DangBan",
        loai_tour: str | None = None,
    ) -> list[Tour]:
        """Tìm kiếm tour theo nhiều bộ lọc.

        - tu_khoa: khớp gần đúng TenTour (không phân biệt hoa thường)
        - khu_vuc: khớp chính xác DiemDen.KhuVuc
        - gia_toi_da: giá hiện hành (GiaKhuyenMai nếu có, ngược lại GiaCoBan) <= giá tối đa
        - trang_thai: lọc theo Tour.TrangThai (mặc định chỉ tour đang bán)
        - loai_tour: lọc theo LoaiTour (TraiNghiem / NghiDuong / VanHoaLichSu)
        """
        gia_hien_tai = func.coalesce(Tour.GiaKhuyenMai, Tour.GiaCoBan)
        q = db.query(Tour).join(DiemDen, Tour.MaDiemDen == DiemDen.MaDiemDen)

        if tu_khoa:
            q = q.filter(Tour.TenTour.ilike(f"%{tu_khoa.strip()}%"))
        if khu_vuc:
            q = q.filter(DiemDen.KhuVuc == khu_vuc)
        if gia_toi_da is not None:
            q = q.filter(gia_hien_tai <= gia_toi_da)
        if trang_thai:
            q = q.filter(Tour.TrangThai == trang_thai)
        if loai_tour:
            q = q.filter(Tour.LoaiTour == loai_tour)

        return q.order_by(Tour.TenTour).all()

    @staticmethod
    def get_lich_khoi_hanh_by_id(db: Session, ma_lich: int) -> LichKhoiHanh | None:
        """Lấy lịch khởi hành theo mã."""
        return db.query(LichKhoiHanh).filter(LichKhoiHanh.MaLich == ma_lich).first()

    @staticmethod
    def get_tour_detail(
        db: Session, ma_tour: int
    ) -> tuple[Tour | None, DiemDen | None, list[LichKhoiHanh]]:
        """Chi tiết tour: thông tin tour + điểm đến + các lịch còn chỗ (SoChoCon > 0).

        Trả về (tour, diem_den, ds_lich). Nếu không tìm thấy tour, trả về (None, None, []).
        """
        tour = db.query(Tour).filter(Tour.MaTour == ma_tour).first()
        if tour is None:
            return None, None, []

        diem_den = (
            db.query(DiemDen).filter(DiemDen.MaDiemDen == tour.MaDiemDen).first()
        )
        ds_lich = (
            db.query(LichKhoiHanh)
            .filter(
                LichKhoiHanh.MaTour == ma_tour,
                LichKhoiHanh.TrangThai == "MoBan",
                LichKhoiHanh.SoChoCon > 0,
            )
            .order_by(LichKhoiHanh.NgayKhoiHanh)
            .all()
        )
        return tour, diem_den, ds_lich
