# -*- coding: utf-8 -*-
"""
app/routers/ai.py - Endpoint RESTful cho các năng lực AI (UC-10..UC-13).

  POST /api/v1/ai/advise             - AI tư vấn tour (UC-10, đăng nhập)
  POST /api/v1/ai/generate-content   - AI sinh mô tả & lịch trình (UC-11, Consultant/Admin)
  POST /api/v1/ai/analyze-feedback   - AI phân tích phản hồi (UC-12, Admin/Accountant)
  POST /api/v1/ai/suggest-guides     - AI đề xuất Top 3 HDV (UC-13, Admin)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai import (
    DeXuatHDVService,
    DeXuatResponse,
    NoiDungResponse,
    NoiDungService,
    PhanHoiService,
    PhanTichResponse,
    TuVanResponse,
    TuVanService,
)
from app.database import get_db
from app.models import DatCho, DiemDen, LichKhoiHanh, PhanHoi, Tour
from app.repositories.tour_repo import TourRepository
from app.services.guide_service import GuideService
from app.schemas.ai import (
    DeXuatHDVRequest,
    PhanTichFeedbackRequest,
    SinhNoiDungRequest,
    SinhNoiDungTuDoRequest,
    TuVanRequest,
)
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/ai", tags=["ai"])


def _suy_chuyen_mon(diem_den: str) -> str:
    """Suy chuyên môn yêu cầu từ tên điểm đến (phục vụ Matching Score UC-13)."""
    d = (diem_den or "").lower()
    if any(k in d for k in ("ha long", "bien", "dao", "nha trang", "phan thiet")):
        return "tour bien dao"
    if "da lat" in d:
        return "tour nghi duong"
    if any(k in d for k in ("sa pa", "ha giang", "cao bang", "sinh thai")):
        return "tour sinh thai"
    return "tour tham quan"


def _tour_dict(tour: Tour, diem_den: DiemDen | None) -> dict:
    return {
        "ma_tour": tour.MaTour,
        "ten_tour": tour.TenTour,
        "diem_den": diem_den.TenDiemDen if diem_den else "",
        "so_ngay": tour.SoNgay,
        "gia_hien_tai": float(tour.GiaKhuyenMai or tour.GiaCoBan),
        "mo_ta": tour.MoTa or "",
        "chuyen_mon_yeu_cau": _suy_chuyen_mon(
            diem_den.TenDiemDen if diem_den else ""
        ),
    }


def _lay_tours_kha_dung(db: Session) -> list[dict]:
    """Toàn bộ tour đang bán (TrangThai='DangBan') -> dict cho AI UC-10."""
    rows = (
        db.query(Tour, DiemDen)
        .join(DiemDen, DiemDen.MaDiemDen == Tour.MaDiemDen)
        .filter(Tour.TrangThai == "DangBan")
        .order_by(Tour.MaTour)
        .all()
    )
    return [_tour_dict(t, dd) for t, dd in rows]


def _lay_phan_hois(db: Session, ma_tour: int) -> list[str]:
    """Phản hồi ĐÃ DUYỆT (AnHien=True) của một tour dạng 'SoSao|NoiDung' (UC-12).

    Chỉ phân tích các đánh giá đã được Admin duyệt hiển thị — tránh đánh giá
    đang chờ duyệt/ẩn làm lệch kết quả cảm xúc.

    Chuỗi quan hệ: PhanHoi -> DatCho -> LichKhoiHanh (MaTour).
    """
    rows = (
        db.query(PhanHoi)
        .join(PhanHoi.dat_cho)
        .join(DatCho.lich)
        .filter(LichKhoiHanh.MaTour == ma_tour, PhanHoi.AnHien == True)  # noqa: E712
        .order_by(PhanHoi.MaPhanHoi)
        .all()
    )
    return [f"{p.SoSao}|{p.NoiDung or ''}" for p in rows]


def _hdv_dict(h) -> dict:
    """HuongDanVien -> dict cho AI UC-13."""
    return {
        "ma_hdv": h.MaHDV,
        "ho_ten": h.HoTen,
        "chuyen_mon": h.ChuyenMon or "",
        "so_nam_kinh_nghiem": h.SoNamKinhNghiem,
    }


@router.post(
    "/advise",
    response_model=TuVanResponse,
    dependencies=[Depends(get_current_user)],
)
def ai_advise(body: TuVanRequest, db: Session = Depends(get_db)):
    """UC-10: AI tư vấn tối đa 3 tour phù hợp với yêu cầu khách hàng."""
    tours = _lay_tours_kha_dung(db)
    if not tours:
        raise HTTPException(status_code=404, detail="Không có tour nào đang bán")
    return TuVanService().tu_van_tour(db, body.YeuCau, tours)


@router.post(
    "/generate-content",
    response_model=NoiDungResponse,
    dependencies=[Depends(require_roles(["Consultant", "Admin"]))],
)
def ai_generate_content(body: SinhNoiDungRequest, db: Session = Depends(get_db)):
    """UC-11: AI sinh mô tả hấp dẫn & lịch trình từng ngày cho tour."""
    tour = TourRepository.get_tour_by_id(db, body.MaTour)
    if tour is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tour")
    dd = TourRepository.get_diem_den_by_id(db, tour.MaDiemDen)
    return NoiDungService().sinh_noi_dung_tour(_tour_dict(tour, dd))


@router.post(
    "/generate-tour-draft",
    response_model=NoiDungResponse,
    dependencies=[Depends(require_roles(["Consultant", "Admin"]))],
)
def ai_generate_tour_draft(body: SinhNoiDungTuDoRequest):
    """AI sinh mô tả & lịch trình cho tour đang nhập (chưa lưu DB).

    Phục vụ form "Thêm tour mới": điền sẵn mô tả/lịch trình trước khi tạo tour.
    """
    tour = {
        "ten_tour": body.TenTour,
        "diem_den": body.TenDiemDen,
        "so_ngay": body.SoNgay,
        "mo_ta": body.MoTa or "",
    }
    return NoiDungService().sinh_noi_dung_tour(tour)


@router.post(
    "/analyze-feedback",
    response_model=PhanTichResponse,
    dependencies=[Depends(require_roles(["Admin", "Accountant"]))],
)
def ai_analyze_feedback(body: PhanTichFeedbackRequest, db: Session = Depends(get_db)):
    """UC-12: AI phân tích cảm xúc & ưu/nhược điểm từ phản hồi của tour."""
    tour = TourRepository.get_tour_by_id(db, body.MaTour)
    if tour is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tour")
    phan_hois = _lay_phan_hois(db, body.MaTour)
    if not phan_hois:
        raise HTTPException(status_code=404, detail="Tour chưa có phản hồi nào")
    return PhanHoiService().phan_tich_danh_gia_tour(
        db, body.MaTour, tour.TenTour, phan_hois
    )


@router.post(
    "/suggest-guides",
    response_model=DeXuatResponse,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def ai_suggest_guides(body: DeXuatHDVRequest, db: Session = Depends(get_db)):
    """UC-13: AI đề xuất Top 3 HDV phù hợp cho lịch khởi hành (từ HDV rảnh DR-05)."""
    lich = TourRepository.get_lich_khoi_hanh_by_id(db, body.MaLich)
    if lich is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch khởi hành")
    tour = TourRepository.get_tour_by_id(db, lich.MaTour)
    if tour is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tour của lịch")
    dd = TourRepository.get_diem_den_by_id(db, tour.MaDiemDen)
    # Chỉ đề xuất HDV RẢNH: Trạng thái cho phép VÀ không bận lịch trùng
    # khoảng thời gian với lịch đang xét (DR-05) - tái sử dụng GuideService.
    ds_hdv = GuideService.get_available_guides(db, body.MaLich)
    if not ds_hdv:
        raise HTTPException(status_code=404, detail="Không có HDV rảnh nào")
    hdvs = [_hdv_dict(h) for h in ds_hdv]
    return DeXuatHDVService().de_xuat_hdv(
        db, body.MaLich, _tour_dict(tour, dd), hdvs
    )
