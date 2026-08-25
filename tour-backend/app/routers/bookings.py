# -*- coding: utf-8 -*-
"""
app/routers/bookings.py - Endpoint RESTful cho Đặt chỗ (DR-01, DR-02).

  POST /api/v1/bookings          - tạo đơn đặt chỗ + giữ chỗ 24h
  POST /api/v1/bookings/scan-expired - quét đơn quá hạn -> HetHan + hoàn chỗ
  GET  /api/v1/bookings/{id}     - chi tiết đơn + tổng tiền + cọc tối thiểu + đếm ngược
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DatCho, DiemDen, KhachHang, LichKhoiHanh, NguoiDung, Tour
from app.models.common import now_naive_utc
from app.repositories.booking_repo import BookingRepository
from app.schemas.booking import (
    ChiTietHanhKhachSchema,
    DatChoCreateRequest,
    DatChoDetailResponse,
    DatChoListItem,
    DatChoManualRequest,
    DatChoResponse,
)
from app.services.booking_service import BookingService
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/bookings", tags=["bookings"])

TI_LE_COC = Decimal("0.3")


@router.post(
    "",
    response_model=DatChoDetailResponse,
    status_code=201,
    dependencies=[Depends(get_current_user)],
)
def create_booking(
    body: DatChoCreateRequest,
    user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tạo đơn đặt chỗ: lưu hành khách, trừ chỗ, khóa giữ chỗ 24h (DR-01/02)."""
    return BookingService.create_booking(db, body, nguoi_tao_id=user.MaNguoiDung)


@router.post(
    "/manual",
    response_model=DatChoDetailResponse,
    status_code=201,
    dependencies=[Depends(require_roles(["Consultant", "Admin"]))],
)
def create_manual_booking(
    body: DatChoManualRequest,
    user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tạo đơn thủ công cho khách ngoài (gọi điện/Zalo/gặp trực tiếp).

    Tư vấn viên/Admin nhập thông tin người đặt + danh sách hành khách + trạng
    thái thanh toán. Nếu đã cọc/thanh toán thì tự ghi giao dịch ThanhToan.
    """
    return BookingService.create_manual_booking(
        db, body, nguoi_tao_id=user.MaNguoiDung
    )


@router.get(
    "",
    response_model=list[DatChoListItem],
    dependencies=[Depends(require_roles(["Admin", "Accountant", "Consultant"]))],
)
def list_bookings(db: Session = Depends(get_db)):
    """Danh sách đơn đặt chỗ kèm tên khách/tour/lịch (quản lý/kế toán/tư vấn)."""
    rows = (
        db.query(DatCho, KhachHang, LichKhoiHanh, Tour, DiemDen, NguoiDung)
        .join(KhachHang, KhachHang.MaKhachHang == DatCho.MaKhachHang)
        .join(LichKhoiHanh, LichKhoiHanh.MaLich == DatCho.MaLich)
        .join(Tour, Tour.MaTour == LichKhoiHanh.MaTour)
        .join(DiemDen, DiemDen.MaDiemDen == Tour.MaDiemDen)
        .outerjoin(NguoiDung, NguoiDung.MaNguoiDung == DatCho.NguoiTaoID)
        .order_by(DatCho.NgayDat.desc())
        .all()
    )
    return [
        DatChoListItem(
            MaDatCho=d.MaDatCho,
            MaKhachHang=d.MaKhachHang,
            ten_khach_hang=kh.HoTen,
            MaLich=d.MaLich,
            NguoiTaoID=d.NguoiTaoID,
            ten_nguoi_tao=nd.HoTen if nd else None,
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
        for d, kh, l, t, dd, nd in rows
    ]


@router.post(
    "/scan-expired",
    response_model=list[DatChoResponse],
    dependencies=[Depends(require_roles(["Admin", "Accountant"]))],
)
def scan_expired_bookings(db: Session = Depends(get_db)):
    """Quét các đơn 'GiuCho' quá 24h -> chuyển 'HetHan' và hoàn trả chỗ (DR-02)."""
    ds = BookingService.check_expired_bookings(db)
    return [DatChoResponse.model_validate(d) for d in ds]


@router.get(
    "/{ma_dat_cho}",
    response_model=DatChoDetailResponse,
    dependencies=[Depends(get_current_user)],
)
def get_booking_detail(ma_dat_cho: int, db: Session = Depends(get_db)):
    """Chi tiết đơn: tổng tiền, tiền cọc tối thiểu, đếm ngược giữ chỗ và hành khách."""
    dat = BookingRepository.get_dat_cho_by_id(db, ma_dat_cho)
    if dat is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt chỗ")

    chi_tiets = BookingRepository.list_chi_tiet(db, ma_dat_cho)
    base = DatChoResponse.model_validate(dat).model_dump()
    base["canh_bao"] = None
    base["ds_hanh_khach"] = [
        ChiTietHanhKhachSchema.model_validate(ct) for ct in chi_tiets
    ]
    base["coc_toi_thieu"] = (Decimal(dat.TongTien) * TI_LE_COC).quantize(
        Decimal("0.01")
    )
    base["dem_nguoc_giay"] = max(
        0, int((dat.HanGiuCho - now_naive_utc()).total_seconds())
    )
    return DatChoDetailResponse(**base)
