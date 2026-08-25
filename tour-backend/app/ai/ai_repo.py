# -*- coding: utf-8 -*-
"""
app/ai/ai_repo.py - Ghi nhật ký xử lý AI vào CSDL Supabase.

Mỗi use case AI ghi một dòng nhật ký để kiểm soát, đối soát và đánh giá
chất lượng phản hồi (yêu cầu BƯỚC 3):
  UC-10 -> AI_TuVanTour           (TrangThai: ThanhCong / Fallback / Loi)
  UC-12 -> AI_PhanTichPhanHoi
  UC-13 -> AI_DeXuatHuongDanVien  (Top 3, XepHang 1..3)
UC-11 không có bảng riêng (nội dung sinh ra được lưu trực tiếp vào Tour).
"""
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AIDeXuatHuongDanVien, AIPhanTichPhanHoi, AITuVanTour


class AIRepository:
    """Ghi nhật ký lời gọi AI (chưa commit - Service chủ động commit)."""

    @staticmethod
    def ghi_log_tu_van(
        db: Session,
        yeu_cau: str,
        ket_qua: dict,
        trang_thai: str = "ThanhCong",
        nguoi_dung_id: int | None = None,
        khach_hang_id: int | None = None,
    ) -> AITuVanTour:
        """Nhật ký UC-10 vào bảng AI_TuVanTour."""
        log = AITuVanTour(
            NguoiDungID=nguoi_dung_id,
            KhachHangID=khach_hang_id,
            YeuCau=yeu_cau,
            KetQua=ket_qua,
            Model=settings.GEMINI_MODEL,
            TrangThai=trang_thai,
        )
        db.add(log)
        db.flush()
        return log

    @staticmethod
    def ghi_log_phan_tich(
        db: Session,
        ma_tour: int,
        nhan_cam_xuc: str,
        uu_diem: list[str],
        nhuoc_diem: list[str],
        tong_ket: str,
        so_phan_hoi: int,
    ) -> AIPhanTichPhanHoi:
        """Nhật ký UC-12 vào bảng AI_PhanTichPhanHoi."""
        log = AIPhanTichPhanHoi(
            MaTour=ma_tour,
            NhanCamXuc=nhan_cam_xuc,
            UuDiem="; ".join(uu_diem) if uu_diem else None,
            NhuocDiem="; ".join(nhuoc_diem) if nhuoc_diem else None,
            SoPhanHoi=so_phan_hoi,
            Model=settings.GEMINI_MODEL,
        )
        db.add(log)
        db.flush()
        return log

    @staticmethod
    def ghi_log_de_xuat(
        db: Session, ma_lich: int, danh_sach: list[dict]
    ) -> list[AIDeXuatHuongDanVien]:
        """Nhật ký UC-13: lưu Top 3 vào AI_DeXuatHuongDanVien.

        danh_sach mỗi phần tử {ma_hdv, diem_tuong_dong, ly_do};
        XepHang được đánh 1..n theo thứ tự danh sách.
        """
        ds: list[AIDeXuatHuongDanVien] = []
        for xep_hang, item in enumerate(danh_sach, start=1):
            log = AIDeXuatHuongDanVien(
                MaLich=ma_lich,
                MaHDV=item["ma_hdv"],
                DiemTuongDong=item["diem_tuong_dong"],
                LyDo=item.get("ly_do"),
                XepHang=xep_hang,
            )
            db.add(log)
            ds.append(log)
        db.flush()
        return ds
