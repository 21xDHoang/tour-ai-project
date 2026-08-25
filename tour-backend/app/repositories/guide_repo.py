# -*- coding: utf-8 -*-
"""
app/repositories/guide_repo.py - Truy vấn dữ liệu Hướng dẫn viên & Phân công.

Chỉ chứa câu lệnh SQLAlchemy cho HuongDanVien / PhanCongHDV / LichKhoiHanh.
Logic chống trùng lịch (DR-05) nằm ở app/services/guide_service.py.
"""
from sqlalchemy.orm import Session

from app.models import DatCho, HuongDanVien, LichKhoiHanh, PhanCongHDV, PhanHoi, Tour


class GuideRepository:
    """Thao tác dữ liệu cho nhóm chức năng Hướng dẫn viên."""

    @staticmethod
    def get_hdv_by_id(db: Session, ma_hdv: int) -> HuongDanVien | None:
        """Lấy hướng dẫn viên theo mã."""
        return (
            db.query(HuongDanVien).filter(HuongDanVien.MaHDV == ma_hdv).first()
        )

    @staticmethod
    def list_hdv(
        db: Session, trang_thai: tuple[str, ...] | str | None = None
    ) -> list[HuongDanVien]:
        """Danh sách hướng dẫn viên, có thể lọc theo trạng thái công tác.

        - trang_thai='Ranh' hoặc ('Ranh','Active'): chỉ HDV đang rảnh.
        - trang_thai=None: lấy toàn bộ.
        """
        q = db.query(HuongDanVien)
        if trang_thai is not None:
            if isinstance(trang_thai, tuple):
                q = q.filter(HuongDanVien.TrangThai.in_(trang_thai))
            else:
                q = q.filter(HuongDanVien.TrangThai == trang_thai)
        return q.order_by(HuongDanVien.HoTen).all()

    @staticmethod
    def get_assigned_lich_for_hdv(db: Session, ma_hdv: int) -> list[LichKhoiHanh]:
        """Các lịch khởi hành mà HDV đang được phân công (để kiểm tra trùng lịch)."""
        return (
            db.query(LichKhoiHanh)
            .join(PhanCongHDV, PhanCongHDV.MaLich == LichKhoiHanh.MaLich)
            .filter(PhanCongHDV.MaHDV == ma_hdv)
            .order_by(LichKhoiHanh.NgayKhoiHanh)
            .all()
        )

    @staticmethod
    def create_phan_cong(db: Session, **fields) -> PhanCongHDV:
        """Phân công HDV vào lịch (chưa commit)."""
        pc = PhanCongHDV(**fields)
        db.add(pc)
        db.flush()
        return pc

    @staticmethod
    def list_phan_cong(db: Session, ma_lich: int | None = None) -> list[PhanCongHDV]:
        """Danh sách phân công; có thể lọc theo lịch khởi hành."""
        q = db.query(PhanCongHDV)
        if ma_lich is not None:
            q = q.filter(PhanCongHDV.MaLich == ma_lich)
        return q.all()

    @staticmethod
    def count_phan_cong(db: Session, ma_hdv: int) -> int:
        """Tổng số lịch mà HDV được phân công."""
        return (
            db.query(PhanCongHDV)
            .filter(PhanCongHDV.MaHDV == ma_hdv)
            .count()
        )

    @staticmethod
    def list_phan_cong_history(
        db: Session, ma_hdv: int
    ) -> list[tuple[PhanCongHDV, LichKhoiHanh, Tour]]:
        """Lịch sử phân công của HDV (kèm lịch khởi hành + tour), mới nhất trước."""
        return (
            db.query(PhanCongHDV, LichKhoiHanh, Tour)
            .join(LichKhoiHanh, PhanCongHDV.MaLich == LichKhoiHanh.MaLich)
            .join(Tour, LichKhoiHanh.MaTour == Tour.MaTour)
            .filter(PhanCongHDV.MaHDV == ma_hdv)
            .order_by(LichKhoiHanh.NgayKhoiHanh.desc())
            .all()
        )

    @staticmethod
    def get_feedback_for_hdv(db: Session, ma_hdv: int) -> list[PhanHoi]:
        """Phản hồi đã duyệt của các tour mà HDV đã dẫn.

        Chuỗi quan hệ: PhanHoi -> DatCho -> LichKhoiHanh -> PhanCongHDV(MaHDV).
        """
        return (
            db.query(PhanHoi)
            .join(PhanHoi.dat_cho)
            .join(DatCho.lich)
            .join(PhanCongHDV, PhanCongHDV.MaLich == LichKhoiHanh.MaLich)
            .filter(PhanCongHDV.MaHDV == ma_hdv, PhanHoi.AnHien == True)  # noqa: E712
            .order_by(PhanHoi.MaPhanHoi)
            .all()
        )
