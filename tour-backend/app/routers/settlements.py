# -*- coding: utf-8 -*-
"""
app/routers/settlements.py - Endpoint cho Quyết toán đoàn tour (Tour P&L).

  GET  /api/v1/settlements            - danh sách chuyến đã hoàn thành + P&L
  POST /api/v1/settlements            - tạo/cập nhật quyết toán cho 1 lịch
  PATCH /api/v1/settlements/{id}      - sửa chi phí/tạm ứng (chặn nếu đã khóa sổ)
  POST /api/v1/settlements/{id}/lock  - khóa sổ tour
"""
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    DiemDen,
    HuongDanVien,
    LichKhoiHanh,
    PhanCongHDV,
    QuyetToanTour,
    Tour,
)
from app.models.common import utcnow
from app.schemas.settlement import QuyetToanItem, QuyetToanUpsert
from app.utils.auth import require_roles

router = APIRouter(prefix="/settlements", tags=["settlements"])


def _ten_hdv(db: Session, ma_lich: int) -> str | None:
    pc = (
        db.query(PhanCongHDV)
        .filter(PhanCongHDV.MaLich == ma_lich)
        .order_by(PhanCongHDV.MaPhanCong)
        .first()
    )
    if pc is None:
        return None
    h = db.query(HuongDanVien).get(pc.MaHDV)
    return h.HoTen if h else None


def _thanh_item(db, lich, tour, diem_den, qt) -> QuyetToanItem:
    ten_hdv = _ten_hdv(db, lich.MaLich)
    if qt is None:
        return QuyetToanItem(
            MaQuyetToan=0,
            MaLich=lich.MaLich,
            ten_tour=tour.TenTour,
            ten_diem_den=diem_den.TenDiemDen if diem_den else None,
            ngay_khoi_hanh=lich.NgayKhoiHanh,
            ngay_ket_thuc=lich.NgayKetThuc,
            ten_hdv=ten_hdv,
            TrangThai="ChuaQuyetToan",
        )

    tong_chi = (
        Decimal(qt.ChiPhiXe)
        + Decimal(qt.ChiPhiKhachSan)
        + Decimal(qt.ChiPhiAnUong)
        + Decimal(qt.ChiPhiVe)
        + Decimal(qt.ThuLaoHDV)
    )
    loi_nhuan = Decimal(qt.DoanhThuThucTe) - tong_chi
    ty_suat = float(loi_nhuan / Decimal(qt.DoanhThuThucTe)) if Decimal(qt.DoanhThuThucTe) > 0 else None
    chenh = Decimal(qt.TamUngHDV) - Decimal(qt.HDVChiThucTe)

    return QuyetToanItem(
        MaQuyetToan=qt.MaQuyetToan,
        MaLich=qt.MaLich,
        ten_tour=tour.TenTour,
        ten_diem_den=diem_den.TenDiemDen if diem_den else None,
        ngay_khoi_hanh=lich.NgayKhoiHanh,
        ngay_ket_thuc=lich.NgayKetThuc,
        ten_hdv=ten_hdv,
        DoanhThuThucTe=qt.DoanhThuThucTe,
        ChiPhiXe=qt.ChiPhiXe,
        ChiPhiKhachSan=qt.ChiPhiKhachSan,
        ChiPhiAnUong=qt.ChiPhiAnUong,
        ChiPhiVe=qt.ChiPhiVe,
        ThuLaoHDV=qt.ThuLaoHDV,
        TamUngHDV=qt.TamUngHDV,
        HDVChiThucTe=qt.HDVChiThucTe,
        HoaDonAnh=qt.HoaDonAnh,
        TrangThai=qt.TrangThai,
        NgayKhoaSo=qt.NgayKhoaSo,
        GhiChu=qt.GhiChu,
        tong_chi_phi=tong_chi,
        loi_nhuan_gop=loi_nhuan,
        ty_suat_ln=ty_suat,
        chenh_lech_tam_ung=chenh,
    )


@router.get(
    "",
    response_model=list[QuyetToanItem],
    dependencies=[Depends(require_roles(["Admin", "Accountant"]))],
)
def list_settlements(db: Session = Depends(get_db)):
    """Danh sách các chuyến đã hoàn thành + quyết toán P&L (chưa quyết toán vẫn hiện)."""
    rows = (
        db.query(LichKhoiHanh, Tour, DiemDen, QuyetToanTour)
        .join(Tour, Tour.MaTour == LichKhoiHanh.MaTour)
        .join(DiemDen, DiemDen.MaDiemDen == Tour.MaDiemDen)
        .outerjoin(QuyetToanTour, QuyetToanTour.MaLich == LichKhoiHanh.MaLich)
        .filter(LichKhoiHanh.NgayKetThuc < date.today())
        .order_by(LichKhoiHanh.NgayKhoiHanh.desc())
        .all()
    )
    return [_thanh_item(db, l, t, dd, qt) for l, t, dd, qt in rows]


@router.post(
    "",
    response_model=QuyetToanItem,
    dependencies=[Depends(require_roles(["Admin", "Accountant"]))],
)
def upsert_settlement(body: QuyetToanUpsert, db: Session = Depends(get_db)):
    """Tạo hoặc cập nhật quyết toán cho một lịch khởi hành (upsert theo MaLich)."""
    lich = db.query(LichKhoiHanh).get(body.MaLich)
    if lich is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch khởi hành")

    qt = db.query(QuyetToanTour).filter(QuyetToanTour.MaLich == body.MaLich).first()
    if qt is None:
        qt = QuyetToanTour(MaLich=body.MaLich)
        db.add(qt)
    if qt.TrangThai == "DaKhoaSo":
        raise HTTPException(status_code=400, detail="Quyết toán đã khóa sổ, không thể sửa")

    for k, v in body.model_dump(exclude={"MaLich"}).items():
        setattr(qt, k, v)
    db.commit()

    tour = db.query(Tour).get(lich.MaTour)
    dd = db.query(DiemDen).get(tour.MaDiemDen) if tour else None
    return _thanh_item(db, lich, tour, dd, qt)


@router.patch(
    "/{ma_quyet_toan}",
    response_model=QuyetToanItem,
    dependencies=[Depends(require_roles(["Admin", "Accountant"]))],
)
def update_settlement(ma_quyet_toan: int, body: QuyetToanUpsert, db: Session = Depends(get_db)):
    """Sửa số liệu quyết toán (chặn nếu đã khóa sổ)."""
    qt = db.query(QuyetToanTour).get(ma_quyet_toan)
    if qt is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy quyết toán")
    if qt.TrangThai == "DaKhoaSo":
        raise HTTPException(status_code=400, detail="Quyết toán đã khóa sổ, không thể sửa")
    for k, v in body.model_dump(exclude_unset=True).items():
        if k != "MaLich":
            setattr(qt, k, v)
    db.commit()
    lich = db.query(LichKhoiHanh).get(qt.MaLich)
    tour = db.query(Tour).get(lich.MaTour)
    dd = db.query(DiemDen).get(tour.MaDiemDen) if tour else None
    return _thanh_item(db, lich, tour, dd, qt)


@router.post(
    "/{ma_quyet_toan}/lock",
    response_model=QuyetToanItem,
    dependencies=[Depends(require_roles(["Admin", "Accountant"]))],
)
def lock_settlement(ma_quyet_toan: int, db: Session = Depends(get_db)):
    """Khóa sổ tour: đổi trạng thái sang Đã khóa sổ."""
    qt = db.query(QuyetToanTour).get(ma_quyet_toan)
    if qt is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy quyết toán")
    qt.TrangThai = "DaKhoaSo"
    qt.NgayKhoaSo = utcnow()
    db.commit()
    lich = db.query(LichKhoiHanh).get(qt.MaLich)
    tour = db.query(Tour).get(lich.MaTour)
    dd = db.query(DiemDen).get(tour.MaDiemDen) if tour else None
    return _thanh_item(db, lich, tour, dd, qt)
