# -*- coding: utf-8 -*-
"""
app/routers/admin_ops.py - Endpoint quản trị hệ thống (Admin).

  GET   /api/v1/admin/customers      - hồ sơ khách hàng kèm chi tiêu (CRM)
  GET   /api/v1/admin/users          - danh sách tài khoản
  PATCH /api/v1/admin/users/{id}     - khóa/mở tài khoản, đổi vai trò
  GET   /api/v1/admin/schedules      - toàn bộ lịch khởi hành (lịch)
  PATCH /api/v1/admin/schedules/{id} - mở bán/ngừng bán, điều chỉnh chỗ
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    ChiTietDatCho,
    DatCho,
    DiemDen,
    HuongDanVien,
    KhachHang,
    LichKhoiHanh,
    NguoiDung,
    PhanCongHDV,
    Tour,
)
from app.schemas.admin import (
    CustomerProfile,
    ScheduleAdminItem,
    ScheduleBookingItem,
    ScheduleUpdate,
    UserItem,
    UserUpdate,
)
from app.schemas.booking import ChiTietHanhKhachSchema
from app.utils.auth import require_roles

router = APIRouter(prefix="/admin", tags=["admin"])

TRANG_THAI_LICH_HOP_LE = {"MoBan", "NgungBan"}
VAI_TRO_HOP_LE = {"Admin", "Consultant", "Accountant", "Customer", "TaiXe"}


@router.get(
    "/customers",
    response_model=list[CustomerProfile],
    dependencies=[Depends(require_roles(["Admin"]))],
)
def list_customers(db: Session = Depends(get_db)):
    """Hồ sơ toàn bộ khách hàng kèm tổng chi tiêu & số đơn (CRM)."""
    ds = db.query(KhachHang).order_by(KhachHang.HoTen.asc()).all()
    ket_qua = []
    for kh in ds:
        tong = (
            db.query(func.coalesce(func.sum(DatCho.TongTien), 0))
            .filter(
                DatCho.MaKhachHang == kh.MaKhachHang,
                DatCho.TrangThai != "DaHuy",
            )
            .scalar()
        )
        so_don = (
            db.query(func.count(DatCho.MaDatCho))
            .filter(DatCho.MaKhachHang == kh.MaKhachHang)
            .scalar()
            or 0
        )
        so_da_tt = (
            db.query(func.count(DatCho.MaDatCho))
            .filter(
                DatCho.MaKhachHang == kh.MaKhachHang,
                DatCho.TrangThai == "DaThanhToan",
            )
            .scalar()
            or 0
        )
        item = CustomerProfile.model_validate(kh)
        item.tong_tien_da_chi = Decimal(tong or 0)
        item.so_don = so_don
        item.so_don_da_thanh_toan = so_da_tt
        ket_qua.append(item)
    return ket_qua


@router.get(
    "/users",
    response_model=list[UserItem],
    dependencies=[Depends(require_roles(["Admin"]))],
)
def list_users(db: Session = Depends(get_db)):
    """Danh sách tài khoản người dùng (cấp phát & phân quyền)."""
    ds = db.query(NguoiDung).order_by(NguoiDung.NgayTao.asc()).all()
    return [UserItem.model_validate(nd) for nd in ds]


@router.patch(
    "/users/{ma_nguoi_dung}",
    response_model=UserItem,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def update_user(
    ma_nguoi_dung: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
):
    """Khóa/mở tài khoản hoặc đổi vai trò (không cho khóa chính mình)."""
    nd = db.query(NguoiDung).get(ma_nguoi_dung)
    if nd is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    if body.TrangThai is not None:
        if body.TrangThai not in {"Active", "Locked"}:
            raise HTTPException(status_code=400, detail="Trạng thái tài khoản không hợp lệ")
        nd.TrangThai = body.TrangThai
    if body.VaiTro is not None:
        if body.VaiTro not in VAI_TRO_HOP_LE:
            raise HTTPException(status_code=400, detail="Vai trò không hợp lệ")
        nd.VaiTro = body.VaiTro
    for k in ("HeSoLuong", "LuongCoBan", "PhuCap"):
        if getattr(body, k) is not None:
            setattr(nd, k, getattr(body, k))
    db.commit()
    db.refresh(nd)
    return UserItem.model_validate(nd)


@router.get(
    "/schedules",
    response_model=list[ScheduleAdminItem],
    dependencies=[Depends(require_roles(["Admin"]))],
)
def list_admin_schedules(db: Session = Depends(get_db)):
    """Toàn bộ lịch khởi hành kèm tên tour/điểm đến + thống kê đặt chỗ."""
    rows = (
        db.query(LichKhoiHanh, Tour, DiemDen)
        .join(Tour, Tour.MaTour == LichKhoiHanh.MaTour)
        .join(DiemDen, DiemDen.MaDiemDen == Tour.MaDiemDen)
        .order_by(LichKhoiHanh.NgayKhoiHanh.asc())
        .all()
    )
    ket_qua = []
    for l, t, dd in rows:
        so_don = (
            db.query(func.count(DatCho.MaDatCho))
            .filter(DatCho.MaLich == l.MaLich, DatCho.TrangThai.notin_(("DaHuy", "HetHan")))
            .scalar()
            or 0
        )
        so_khach_da_chot = (
            db.query(func.coalesce(func.sum(DatCho.SoKhach), 0))
            .filter(
                DatCho.MaLich == l.MaLich,
                DatCho.TrangThai.in_(("DaCoc", "DaThanhToan")),
            )
            .scalar()
            or 0
        )
        so_khach_giu_cho = (
            db.query(func.coalesce(func.sum(DatCho.SoKhach), 0))
            .filter(
                DatCho.MaLich == l.MaLich,
                DatCho.TrangThai.in_(("GiuCho", "ChoCoc")),
            )
            .scalar()
            or 0
        )
        hdv_rows = (
            db.query(HuongDanVien.HoTen, PhanCongHDV.VaiTro)
            .join(PhanCongHDV, PhanCongHDV.MaHDV == HuongDanVien.MaHDV)
            .filter(PhanCongHDV.MaLich == l.MaLich)
            .order_by(PhanCongHDV.MaPhanCong)
            .all()
        )
        ten_hdv = ", ".join(f"{h} ({v})" for h, v in hdv_rows) if hdv_rows else None
        ket_qua.append(
            ScheduleAdminItem(
                MaLich=l.MaLich,
                MaTour=t.MaTour,
                ten_tour=t.TenTour,
                ten_diem_den=dd.TenDiemDen,
                NgayKhoiHanh=l.NgayKhoiHanh,
                NgayKetThuc=l.NgayKetThuc,
                MinSeats=l.MinSeats,
                MaxSeats=l.MaxSeats,
                SoChoCon=l.SoChoCon,
                TrangThai=l.TrangThai,
                so_don=so_don,
                so_khach_da_chot=int(so_khach_da_chot),
                so_khach_giu_cho=int(so_khach_giu_cho),
                ten_hdv=ten_hdv,
            )
        )
    return ket_qua


@router.get(
    "/schedules/{ma_lich}/bookings",
    response_model=list[ScheduleBookingItem],
    dependencies=[Depends(require_roles(["Admin"]))],
)
def list_schedule_bookings(ma_lich: int, db: Session = Depends(get_db)):
    """Danh sách đơn đặt chỗ còn hiệu lực của một lịch khởi hành (đoàn đi).

    Bao gồm cả đơn giữ chỗ/chờ cọc và đơn đã cọc/thanh toán; bỏ đơn đã hủy/hết hạn.
    """
    lich = db.query(LichKhoiHanh).get(ma_lich)
    if lich is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch khởi hành")

    rows = (
        db.query(DatCho, KhachHang)
        .join(KhachHang, KhachHang.MaKhachHang == DatCho.MaKhachHang)
        .filter(DatCho.MaLich == ma_lich, DatCho.TrangThai.notin_(("DaHuy", "HetHan")))
        .order_by(DatCho.NgayDat.desc())
        .all()
    )
    ket_qua = []
    for d, kh in rows:
        hanh_khach = (
            db.query(ChiTietDatCho)
            .filter(ChiTietDatCho.MaDatCho == d.MaDatCho)
            .order_by(ChiTietDatCho.MaChiTiet)
            .all()
        )
        ket_qua.append(
            ScheduleBookingItem(
                MaDatCho=d.MaDatCho,
                MaKhachHang=d.MaKhachHang,
                ten_khach_hang=kh.HoTen,
                SoDienThoai=kh.SoDienThoai,
                Email=kh.Email,
                SoKhach=d.SoKhach,
                TongTien=d.TongTien,
                DaDatCoc=d.DaDatCoc,
                TrangThai=d.TrangThai,
                NgayDat=d.NgayDat,
                ds_hanh_khach=[
                    ChiTietHanhKhachSchema.model_validate(h) for h in hanh_khach
                ],
            )
        )
    return ket_qua


@router.patch(
    "/schedules/{ma_lich}",
    response_model=ScheduleAdminItem,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def update_schedule(
    ma_lich: int,
    body: ScheduleUpdate,
    db: Session = Depends(get_db),
):
    """Mở bán/ngừng bán hoặc điều chỉnh chỗ trống của lịch."""
    lich = db.query(LichKhoiHanh).get(ma_lich)
    if lich is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch khởi hành")
    if body.TrangThai is not None:
        if body.TrangThai not in TRANG_THAI_LICH_HOP_LE:
            raise HTTPException(status_code=400, detail="Trạng thái lịch không hợp lệ")
        lich.TrangThai = body.TrangThai
    if body.SoChoCon is not None:
        if body.SoChoCon > lich.MaxSeats:
            raise HTTPException(status_code=400, detail="Chỗ trống không được vượt MaxSeats")
        lich.SoChoCon = body.SoChoCon
    db.commit()
    db.refresh(lich)
    tour = db.query(Tour).get(lich.MaTour)
    dd = db.query(DiemDen).get(tour.MaDiemDen) if tour else None
    return ScheduleAdminItem(
        MaLich=lich.MaLich,
        MaTour=lich.MaTour,
        ten_tour=tour.TenTour if tour else "",
        ten_diem_den=dd.TenDiemDen if dd else None,
        NgayKhoiHanh=lich.NgayKhoiHanh,
        NgayKetThuc=lich.NgayKetThuc,
        MinSeats=lich.MinSeats,
        MaxSeats=lich.MaxSeats,
        SoChoCon=lich.SoChoCon,
        TrangThai=lich.TrangThai,
    )
