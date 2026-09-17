# -*- coding: utf-8 -*-
"""
app/routers/bookings.py - Endpoint RESTful cho Đặt chỗ (DR-01, DR-02).

  POST /api/v1/bookings          - tạo đơn đặt chỗ + giữ chỗ 24h
  POST /api/v1/bookings/scan-expired - quét đơn quá hạn -> HetHan + hoàn chỗ
  GET  /api/v1/bookings/{id}     - chi tiết đơn + tổng tiền + cọc tối thiểu + đếm ngược
"""
from datetime import timedelta
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
    XacNhanChuyenKhoanRequest,
)
from app.services.booking_service import BookingService, trang_thai_hien_thi
from app.services.payment_service import TI_LE_COC_TOI_THIEU
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/bookings", tags=["bookings"])


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
            LoaiChuyenDi="Rieng" if "[TOUR RIÊNG]" in (l.GhiChu or "") else "Ghep",
            ghi_chu_lich=l.GhiChu,
            SoKhach=d.SoKhach,
            TongTien=d.TongTien,
            DaDatCoc=d.DaDatCoc,
            NgayDat=d.NgayDat,
            HanGiuCho=d.HanGiuCho,
            TrangThai=trang_thai_hien_thi(d, l),
            SoGiayConLai=d.SoGiayConLai,
            HinhAnhChuyenKhoan=d.HinhAnhChuyenKhoan,
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


@router.post(
    "/{ma_dat_cho}/xac-nhan-da-chuyen-khoan",
    response_model=DatChoResponse,
    dependencies=[Depends(get_current_user)],
)
def xac_nhan_da_chuyen_khoan(
    ma_dat_cho: int,
    body: XacNhanChuyenKhoanRequest,
    user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """P2: Khách/Tư vấn khai báo "đã chuyển khoản cọc" -> tạm dừng đếm ngược 24h.

    - Đơn phải ở GiuCho.
    - Khách thường chỉ thao tác được đơn của chính mình; Consultant/Admin được tự do.
    - Lưu số giây còn lại vào SoGiayConLai để khi kế toán 'Từ chối' nối lại đúng.
    - HanGiuCho GIỮ NGUYÊN: đếm ngược không chạy vì scan-expired chỉ quét GiuCho,
      còn frontend không render countdown cho trạng thái ChoXacNhanCoc.
    """
    dat = BookingRepository.get_dat_cho_by_id(db, ma_dat_cho)
    if dat is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt chỗ")
    if dat.TrangThai != "GiuCho":
        raise HTTPException(
            status_code=400,
            detail="Đơn không ở trạng thái giữ chỗ (GiuCho) để khai báo chuyển khoản",
        )

    # Quyền: staff được làm mọi đơn; khách thường chỉ được làm đơn của chính mình.
    if user.VaiTro not in ("Consultant", "Admin"):
        kh = db.query(KhachHang).filter(KhachHang.Email == user.Email).first()
        if kh is None or kh.MaKhachHang != dat.MaKhachHang:
            raise HTTPException(status_code=403, detail="Bạn không có quyền thao tác đơn này")

    dat.SoGiayConLai = max(
        0, int((dat.HanGiuCho - now_naive_utc()).total_seconds())
    )
    dat.HinhAnhChuyenKhoan = body.HinhAnh
    dat.TrangThai = "ChoXacNhanCoc"
    db.commit()
    db.refresh(dat)
    return dat


@router.post(
    "/{ma_dat_cho}/huy-xac-nhan-coc",
    response_model=DatChoResponse,
    dependencies=[Depends(require_roles(["Accountant", "Admin"]))],
)
def huy_xac_nhan_coc(
    ma_dat_cho: int,
    db: Session = Depends(get_db),
):
    """P2: Kế toán 'Từ chối' xác nhận cọc -> đơn quay lại GiuCho, nối lại đếm ngược.

    - Đơn phải ở ChoXacNhanCoc.
    - HanGiuCho = bây giờ + số giây còn lại lúc khách báo (mặc định 24h nếu trống).
    - Giữ HinhAnhChuyenKhoan để lưu vết; SoGiayConLai trả về None.
    """
    dat = BookingRepository.get_dat_cho_by_id(db, ma_dat_cho)
    if dat is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt chỗ")
    if dat.TrangThai != "ChoXacNhanCoc":
        raise HTTPException(
            status_code=400,
            detail="Đơn không ở trạng thái chờ xác nhận cọc (ChoXacNhanCoc)",
        )

    so_giay = dat.SoGiayConLai if dat.SoGiayConLai is not None else 86400
    dat.HanGiuCho = now_naive_utc() + timedelta(seconds=so_giay)
    dat.TrangThai = "GiuCho"
    dat.SoGiayConLai = None
    db.commit()
    db.refresh(dat)
    return dat


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

    lich = db.query(LichKhoiHanh).filter(LichKhoiHanh.MaLich == dat.MaLich).first()
    chi_tiets = BookingRepository.list_chi_tiet(db, ma_dat_cho)
    base = DatChoResponse.model_validate(dat).model_dump()
    # P4: DaThanhToan hiển thị theo tiến trình tour (DangDiTour/HoanThanh)
    base["TrangThai"] = trang_thai_hien_thi(dat, lich)
    base["canh_bao"] = None
    base["LoaiChuyenDi"] = "Rieng" if lich and "[TOUR RIÊNG]" in (lich.GhiChu or "") else "Ghep"
    base["ghi_chu_lich"] = lich.GhiChu if lich else None
    base["ds_hanh_khach"] = [
        ChiTietHanhKhachSchema.model_validate(ct) for ct in chi_tiets
    ]
    base["coc_toi_thieu"] = (Decimal(dat.TongTien) * TI_LE_COC_TOI_THIEU).quantize(
        Decimal("0.01")
    )
    base["dem_nguoc_giay"] = max(
        0, int((dat.HanGiuCho - now_naive_utc()).total_seconds())
    )
    return DatChoDetailResponse(**base)
