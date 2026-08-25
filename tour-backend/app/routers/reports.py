# -*- coding: utf-8 -*-
"""
app/routers/reports.py - Endpoint Báo cáo tài chính (BƯỚC 5).

  GET /api/v1/reports/revenue - doanh thu & dòng tiền theo tháng (Admin/Accountant)
"""
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    CongNoNhaCungCap,
    DatCho,
    KhachHang,
    LichKhoiHanh,
    NguoiDung,
    PhiChi,
    ThanhToan,
    Tour,
)
from app.schemas.report import (
    PaymentMethodItem,
    ReceivableItem,
    RevenueItem,
    TransactionItem,
)
from app.utils.auth import require_roles

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get(
    "/revenue",
    response_model=list[RevenueItem],
    dependencies=[Depends(require_roles(["Admin", "Accountant"]))],
)
def revenue_by_month(db: Session = Depends(get_db)):
    """Tổng hợp dòng tiền theo tháng từ bảng ThanhToan.

    - doanh_thu: tổng tiền thu vào (LoaiGiaoDich khác HoanTien)
    - hoan_tien: tổng tiền hoàn ra (HoanTien)
    - dong_tien: doanh_thu - hoan_tien (ròng)
    """
    rows = (
        db.query(
            func.extract("year", ThanhToan.NgayGiaoDich).label("nam"),
            func.extract("month", ThanhToan.NgayGiaoDich).label("thang"),
            ThanhToan.LoaiGiaoDich,
            func.sum(ThanhToan.SoTien).label("tong"),
        )
        .group_by("nam", "thang", ThanhToan.LoaiGiaoDich)
        .all()
    )
    bang: dict[str, dict] = {}
    for nam, thang, loai, tong in rows:
        key = f"{int(nam):04d}-{int(thang):02d}"
        nhom = bang.setdefault(
            key, {"doanh_thu": Decimal("0"), "hoan_tien": Decimal("0")}
        )
        if loai == "HoanTien":
            nhom["hoan_tien"] += Decimal(tong)
        else:
            nhom["doanh_thu"] += Decimal(tong)

    return [
        RevenueItem(
            thang=key,
            doanh_thu=nhom["doanh_thu"],
            hoan_tien=nhom["hoan_tien"],
            dong_tien=nhom["doanh_thu"] - nhom["hoan_tien"],
        )
        for key, nhom in sorted(bang.items())
    ]


@router.get(
    "/transactions",
    response_model=list[TransactionItem],
    dependencies=[Depends(require_roles(["Admin", "Accountant"]))],
)
def list_transactions(
    loai_giao_dich: str | None = None,
    phuong_thuc: str | None = None,
    tu_thang: str | None = None,
    den_thang: str | None = None,
    ma_dat_cho: int | None = None,
    db: Session = Depends(get_db),
):
    """Sổ quỹ: giao dịch thu (ThanhToan) + chi (PhiChi), kèm người xử lý & đối tượng."""
    items = []

    # ---- Thu (từ khách) ----
    q = (
        db.query(ThanhToan, KhachHang, NguoiDung)
        .join(DatCho, DatCho.MaDatCho == ThanhToan.MaDatCho)
        .join(KhachHang, KhachHang.MaKhachHang == DatCho.MaKhachHang)
        .outerjoin(NguoiDung, NguoiDung.MaNguoiDung == ThanhToan.NguoiXuLyID)
    )
    if ma_dat_cho is not None:
        q = q.filter(ThanhToan.MaDatCho == ma_dat_cho)
    if loai_giao_dich and loai_giao_dich != "ChiPhi":
        q = q.filter(ThanhToan.LoaiGiaoDich == loai_giao_dich)
    if phuong_thuc:
        q = q.filter(ThanhToan.PhuongThuc == phuong_thuc)
    if tu_thang:
        q = q.filter(func.to_char(ThanhToan.NgayGiaoDich, "YYYY-MM") >= tu_thang)
    if den_thang:
        q = q.filter(func.to_char(ThanhToan.NgayGiaoDich, "YYYY-MM") <= den_thang)
    for t, kh, nd in q.all():
        items.append(
            TransactionItem(
                key=f"tt-{t.MaThanhToan}",
                nguon="Thu",
                MaDatCho=t.MaDatCho,
                LoaiGiaoDich=t.LoaiGiaoDich,
                SoTien=t.SoTien,
                NgayGiaoDich=t.NgayGiaoDich,
                PhuongThuc=t.PhuongThuc,
                NguoiXuLyID=t.NguoiXuLyID,
                ten_nguoi_xu_ly=nd.HoTen if nd else None,
                ten_khach_hang=kh.HoTen if kh else None,
                GhiChu=t.GhiChu,
            )
        )

    # ---- Chi (cho nhà cung cấp) ----
    if ma_dat_cho is None and phuong_thuc is None and (loai_giao_dich in (None, "ChiPhi")):
        q2 = (
            db.query(PhiChi, CongNoNhaCungCap, NguoiDung)
            .outerjoin(CongNoNhaCungCap, CongNoNhaCungCap.MaPhaiTra == PhiChi.MaPhaiTra)
            .outerjoin(NguoiDung, NguoiDung.MaNguoiDung == PhiChi.NguoiXuLyID)
        )
        if tu_thang:
            q2 = q2.filter(func.to_char(PhiChi.NgayChi, "YYYY-MM") >= tu_thang)
        if den_thang:
            q2 = q2.filter(func.to_char(PhiChi.NgayChi, "YYYY-MM") <= den_thang)
        for p, ncc, nd in q2.all():
            items.append(
                TransactionItem(
                    key=f"pc-{p.MaPhieuChi}",
                    nguon="Chi",
                    MaDatCho=None,
                    LoaiGiaoDich="ChiPhi",
                    SoTien=-Decimal(p.SoTien),
                    NgayGiaoDich=p.NgayChi,
                    PhuongThuc=None,
                    NguoiXuLyID=p.NguoiXuLyID,
                    ten_nguoi_xu_ly=nd.HoTen if nd else None,
                    ten_khach_hang=ncc.TenDoiTac if ncc else None,
                    GhiChu=p.GhiChu,
                )
            )

    items.sort(key=lambda x: x.NgayGiaoDich, reverse=True)
    return items


@router.get(
    "/receivables",
    response_model=list[ReceivableItem],
    dependencies=[Depends(require_roles(["Admin", "Accountant"]))],
)
def list_receivables(db: Session = Depends(get_db)):
    """Công nợ: đơn đã cọc (DaCoc) nhưng còn thiếu tiền (TongTien - DaDatCoc > 0)."""
    rows = (
        db.query(DatCho, KhachHang, Tour)
        .join(KhachHang, KhachHang.MaKhachHang == DatCho.MaKhachHang)
        .join(LichKhoiHanh, LichKhoiHanh.MaLich == DatCho.MaLich)
        .join(Tour, Tour.MaTour == LichKhoiHanh.MaTour)
        .filter(DatCho.TrangThai == "DaCoc")
        .all()
    )
    ket_qua = []
    for d, kh, t in rows:
        con_lai = Decimal(d.TongTien) - Decimal(d.DaDatCoc)
        if con_lai > 0:
            ket_qua.append(
                ReceivableItem(
                    MaDatCho=d.MaDatCho,
                    ten_khach_hang=kh.HoTen,
                    ten_tour=t.TenTour,
                    TongTien=d.TongTien,
                    DaDatCoc=d.DaDatCoc,
                    con_lai=con_lai,
                )
            )
    return ket_qua


@router.get(
    "/payment-methods",
    response_model=list[PaymentMethodItem],
    dependencies=[Depends(require_roles(["Admin", "Accountant"]))],
)
def payment_methods(db: Session = Depends(get_db)):
    """Tổng tiền thu vào theo phương thức thanh toán."""
    rows = (
        db.query(ThanhToan.PhuongThuc, func.sum(ThanhToan.SoTien))
        .group_by(ThanhToan.PhuongThuc)
        .all()
    )
    return [
        PaymentMethodItem(phuong_thuc=p, tong_tien=Decimal(tong))
        for p, tong in rows
    ]
