# -*- coding: utf-8 -*-
"""
app/routers/dashboard.py - Endpoint Dashboard tổng quan & KPI nhân viên.

  GET /api/v1/dashboard/summary      - thẻ thống kê cho Admin
  GET /api/v1/dashboard/kpi/consultants - bảng KPI các Tư vấn viên (Admin)
  GET /api/v1/dashboard/kpi/my       - KPI của bản thân (Consultant/Admin)

Mọi số liệu đều suy từ dữ liệu có sẵn (DatCho, ThanhToan, YeuCauTuVan,
YeuCauTourRieng) - không cần bảng mới.
"""
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    DatCho,
    KhachHang,
    LichKhoiHanh,
    NguoiDung,
    ThanhToan,
    Tour,
    YeuCauTourRieng,
    YeuCauTuVan,
)
from app.schemas.dashboard import DashboardSummary, KpiItem
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummary,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def dashboard_summary(db: Session = Depends(get_db)):
    """Các thẻ thống kê cho màn hình Tổng quan Admin."""
    nay = datetime.utcnow().date()
    dau_hom_nay = datetime(nay.year, nay.month, nay.day)
    cuoi_hom_nay = dau_hom_nay + timedelta(days=1)
    dau_thang = datetime(nay.year, nay.month, 1)
    cuoi_thang = (dau_thang + timedelta(days=32)).replace(day=1)

    def tong_thu(tu, den) -> Decimal:
        """Tổng tiền thu (loại trừ HoanTien) trong khoảng [tu, den)."""
        gia_tri = (
            db.query(func.coalesce(func.sum(ThanhToan.SoTien), 0))
            .filter(
                ThanhToan.LoaiGiaoDich != "HoanTien",
                ThanhToan.NgayGiaoDich >= tu,
                ThanhToan.NgayGiaoDich < den,
            )
            .scalar()
        )
        return Decimal(gia_tri or 0)

    tu_7_ngay = datetime.utcnow() - timedelta(days=7)
    khach_dang_di = (
        db.query(func.coalesce(func.sum(DatCho.SoKhach), 0))
        .join(LichKhoiHanh, LichKhoiHanh.MaLich == DatCho.MaLich)
        .filter(
            DatCho.TrangThai != "DaHuy",
            LichKhoiHanh.NgayKhoiHanh <= nay,
            LichKhoiHanh.NgayKetThuc >= nay,
        )
        .scalar()
    )

    return DashboardSummary(
        doanh_thu_hom_nay=tong_thu(dau_hom_nay, cuoi_hom_nay),
        doanh_thu_thang=tong_thu(dau_thang, cuoi_thang),
        don_moi_7_ngay=(
            db.query(func.count(DatCho.MaDatCho))
            .filter(DatCho.NgayDat >= tu_7_ngay)
            .scalar()
            or 0
        ),
        khach_dang_di_tour=int(khach_dang_di or 0),
        lead_moi_7_ngay=(
            db.query(func.count(YeuCauTuVan.MaYeuCau))
            .filter(YeuCauTuVan.NgayTao >= tu_7_ngay)
            .scalar()
            or 0
        ),
        tong_khach_hang=db.query(func.count(KhachHang.MaKhachHang)).scalar() or 0,
        tong_tour_dang_ban=(
            db.query(func.count(Tour.MaTour)).filter(Tour.TrangThai == "DangBan").scalar()
            or 0
        ),
    )


def _tinh_kpi(db: Session, ma_nguoi_dung: int) -> KpiItem:
    """KPI của một nhân viên (lead phụ trách, đơn tạo, tour riêng xử lý)."""
    nd = db.query(NguoiDung).get(ma_nguoi_dung)
    kpi = KpiItem(
        MaNguoiDung=ma_nguoi_dung,
        HoTen=nd.HoTen if nd else "",
        VaiTro=nd.VaiTro if nd else "Consultant",
    )
    kpi.so_lead = (
        db.query(func.count(YeuCauTuVan.MaYeuCau))
        .filter(YeuCauTuVan.NguoiPhuTrachID == ma_nguoi_dung)
        .scalar()
        or 0
    )
    kpi.lead_dang_chot = (
        db.query(func.count(YeuCauTuVan.MaYeuCau))
        .filter(
            YeuCauTuVan.NguoiPhuTrachID == ma_nguoi_dung,
            YeuCauTuVan.TrangThai == "DangChot",
        )
        .scalar()
        or 0
    )
    kpi.so_don = (
        db.query(func.count(DatCho.MaDatCho))
        .filter(DatCho.NguoiTaoID == ma_nguoi_dung)
        .scalar()
        or 0
    )
    kpi.so_don_da_thanh_toan = (
        db.query(func.count(DatCho.MaDatCho))
        .filter(
            DatCho.NguoiTaoID == ma_nguoi_dung,
            DatCho.TrangThai == "DaThanhToan",
        )
        .scalar()
        or 0
    )
    kpi.so_tour_rieng = (
        db.query(func.count(YeuCauTourRieng.MaYeuCau))
        .filter(YeuCauTourRieng.NguoiXuLyID == ma_nguoi_dung)
        .scalar()
        or 0
    )
    kpi.tour_rieng_da_chot = (
        db.query(func.count(YeuCauTourRieng.MaYeuCau))
        .filter(
            YeuCauTourRieng.NguoiXuLyID == ma_nguoi_dung,
            YeuCauTourRieng.TrangThai == "DaChot",
        )
        .scalar()
        or 0
    )
    return kpi


@router.get(
    "/kpi/consultants",
    response_model=list[KpiItem],
    dependencies=[Depends(require_roles(["Admin"]))],
)
def kpi_consultants(db: Session = Depends(get_db)):
    """Bảng KPI của tất cả nhân viên (Admin)."""
    nhan_vien = (
        db.query(NguoiDung)
        .filter(NguoiDung.VaiTro.in_(["Consultant", "Admin"]))
        .order_by(NguoiDung.HoTen.asc())
        .all()
    )
    return [_tinh_kpi(db, nd.MaNguoiDung) for nd in nhan_vien]


@router.get(
    "/kpi/my",
    response_model=KpiItem,
    dependencies=[Depends(require_roles(["Admin", "Consultant"]))],
)
def kpi_my(
    user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """KPI của bản thân (Tư vấn viên xem trên Dashboard cá nhân)."""
    return _tinh_kpi(db, user.MaNguoiDung)
