# -*- coding: utf-8 -*-
"""
app/services/guide_service.py - Nghiệp vụ Hướng dẫn viên & Phân công.

Hiện thực 1 quy tắc miền:
  DR-05: Một HDV không được phân công cho 2 lịch khởi hành TRÙNG khoảng
         thời gian (NgayKhoiHanh..NgayKetThuc). Ràng buộc UNIQUE(MaLich, MaHDV)
         chặn trùng lịch hoàn toàn; Service bổ sung chặn trùng khoảng thời gian.

Trạng thái HDV được coi là RẢNH khi TrangThai thuộc ('Ranh', 'Active') -
tương thích cả quy ước Data Dictionary (Ranh/Ban/NghiPhep) lẫn yêu cầu 'Active'.
"""
from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import HuongDanVien
from app.repositories.guide_repo import GuideRepository
from app.repositories.tour_repo import TourRepository
from app.schemas.guide import (
    HDVDetailResponse,
    HDVLichSuItem,
    HDVListItem,
    HDVResponse,
    PhanCongHDVRequest,
)

# Các trạng thái cho phép HDV nhận lịch mới
TRANG_THAI_RANH = ("Ranh", "Active")


def _trung_khoang(
    start1: date, end1: date, start2: date, end2: date
) -> bool:
    """Hai khoảng ngày [start,end] có giao nhau hay không (tính cả 2 đầu mút)."""
    return max(start1, start2) <= min(end1, end2)


class GuideService:
    """Service Hướng dẫn viên - chứa toàn bộ logic nghiệp vụ."""

    @staticmethod
    def assign_guide(db: Session, request: PhanCongHDVRequest):
        """Phân công HDV vào một lịch khởi hành (DR-05).

        Nếu HDV đã được phân công một lịch khác có khoảng thời gian trùng
        với lịch mới -> từ chối 400.
        """
        lich = TourRepository.get_lich_khoi_hanh_by_id(db, request.MaLich)
        if lich is None:
            raise HTTPException(404, "Không tìm thấy lịch khởi hành")

        hdv = GuideRepository.get_hdv_by_id(db, request.MaHDV)
        if hdv is None:
            raise HTTPException(404, "Không tìm thấy hướng dẫn viên")

        # ---- DR-05: chặn trùng khoảng thời gian ----
        ds_lich_da_giao = GuideRepository.get_assigned_lich_for_hdv(db, request.MaHDV)
        for lich_cu in ds_lich_da_giao:
            if _trung_khoang(
                lich.NgayKhoiHanh,
                lich.NgayKetThuc,
                lich_cu.NgayKhoiHanh,
                lich_cu.NgayKetThuc,
            ):
                raise HTTPException(
                    400,
                    "Hướng dẫn viên đã bận lịch khác trong khoảng thời gian này",
                )

        pc = GuideRepository.create_phan_cong(
            db,
            MaLich=request.MaLich,
            MaHDV=request.MaHDV,
            VaiTro=request.VaiTro,
            GhiChu=request.GhiChu,
        )
        db.commit()
        db.refresh(pc)
        return pc

    @staticmethod
    def get_available_guides(db: Session, ma_lich: int) -> list[HuongDanVien]:
        """Danh sách HDV RẢNH (DR-05) cho một lịch khởi hành.

        Rảnh = TrangThai thuộc ('Ranh','Active') VÀ không có lịch nào đã phân
        công trùng khoảng thời gian với lịch đang xét.
        """
        lich = TourRepository.get_lich_khoi_hanh_by_id(db, ma_lich)
        if lich is None:
            raise HTTPException(404, "Không tìm thấy lịch khởi hành")

        ds_hdv = GuideRepository.list_hdv(db, trang_thai=TRANG_THAI_RANH)
        ket_qua: list[HuongDanVien] = []
        for hdv in ds_hdv:
            ds_lich_da_giao = GuideRepository.get_assigned_lich_for_hdv(
                db, hdv.MaHDV
            )
            bi_trung = any(
                _trung_khoang(
                    lich.NgayKhoiHanh,
                    lich.NgayKetThuc,
                    lich_cu.NgayKhoiHanh,
                    lich_cu.NgayKetThuc,
                )
                for lich_cu in ds_lich_da_giao
            )
            if not bi_trung:
                ket_qua.append(hdv)
        return ket_qua

    @staticmethod
    def _trang_thai_hoat_dong(db: Session, hdv: HuongDanVien) -> str:
        """Trạng thái hoạt động dẫn xuất: NghiPhep / DangDanTour / Ban / Ranh."""
        if hdv.TrangThai == "NghiPhep":
            return "NghiPhep"
        today = date.today()
        for lich in GuideRepository.get_assigned_lich_for_hdv(db, hdv.MaHDV):
            if lich.TrangThai != "DaHuy" and lich.NgayKhoiHanh <= today <= lich.NgayKetThuc:
                return "DangDanTour"
        if hdv.TrangThai == "Ban":
            return "Ban"
        return "Ranh"

    @staticmethod
    def list_hdv_chi_tiet(db: Session) -> list[HDVListItem]:
        """Danh sách HDV kèm tổng số tour + trạng thái hoạt động."""
        ds = GuideRepository.list_hdv(db)
        ket_qua = []
        for hdv in ds:
            base = HDVResponse.model_validate(hdv).model_dump()
            base["tong_so_tour"] = GuideRepository.count_phan_cong(db, hdv.MaHDV)
            base["trang_thai_hoat_dong"] = GuideService._trang_thai_hoat_dong(db, hdv)
            ket_qua.append(HDVListItem(**base))
        return ket_qua

    @staticmethod
    def get_hdv_detail(db: Session, ma_hdv: int) -> HDVDetailResponse:
        """Hồ sơ chi tiết HDV + lịch sử + thống kê đánh giá."""
        hdv = GuideRepository.get_hdv_by_id(db, ma_hdv)
        if hdv is None:
            raise HTTPException(404, "Không tìm thấy hướng dẫn viên")

        base = HDVResponse.model_validate(hdv).model_dump()

        # Lịch sử phân công + đếm tour đã dẫn (tính theo ngày quá khứ)
        rows = GuideRepository.list_phan_cong_history(db, ma_hdv)
        lich_su = []
        tong_da_dan = 0
        today = date.today()
        for pc, lich, tour in rows:
            lich_su.append(
                HDVLichSuItem(
                    MaPhanCong=pc.MaPhanCong,
                    MaLich=lich.MaLich,
                    ten_tour=tour.TenTour,
                    ngay_khoi_hanh=lich.NgayKhoiHanh,
                    ngay_ket_thuc=lich.NgayKetThuc,
                    VaiTro=pc.VaiTro,
                    trang_thai_lich=lich.TrangThai,
                    GhiChu=pc.GhiChu,
                )
            )
            if lich.NgayKetThuc < today:
                tong_da_dan += 1
        base["lich_su"] = lich_su
        base["tong_so_tour_da_dan"] = tong_da_dan

        # Đánh giá: điểm TB + số phản hồi
        phan_hois = GuideRepository.get_feedback_for_hdv(db, ma_hdv)
        if phan_hois:
            base["so_phan_hoi"] = len(phan_hois)
            base["diem_trung_binh"] = round(
                sum(p.SoSao for p in phan_hois) / len(phan_hois), 1
            )

        return HDVDetailResponse(**base)

    @staticmethod
    def lay_phan_hoi_hdv(db: Session, ma_hdv: int) -> list[str]:
        """Phản hồi của HDV dạng 'SoSao|NoiDung' để đưa vào AI."""
        phan_hois = GuideRepository.get_feedback_for_hdv(db, ma_hdv)
        return [f"{p.SoSao}|{p.NoiDung or ''}" for p in phan_hois]
