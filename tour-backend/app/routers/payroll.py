# -*- coding: utf-8 -*-
"""
app/routers/payroll.py - Endpoint cho Quản lý nhân viên & lương.

  GET   /api/v1/payroll/employees        - danh sách nhân viên (VP/tài xế + HDV)
  GET   /api/v1/payroll/sheet?thang=&nam= - bảng lương tháng
  POST  /api/v1/payroll/sheet            - lưu bảng lương tháng (tính TongLuong)
  PATCH /api/v1/payroll/sheet/{id}       - sửa thưởng/trạng thái, tính lại lương
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BangLuong, HuongDanVien, NguoiDung
from app.schemas.payroll import (
    BangLuongItem,
    BangLuongUpdate,
    BangLuongUpsert,
    PayrollEmployeeItem,
)
from app.utils.auth import require_roles

router = APIRouter(prefix="/payroll", tags=["payroll"])

VAITRO_NHAN_VIEN = ("Admin", "Consultant", "Accountant", "TaiXe")
KE_TOAN_ADMIN = ["Admin", "Accountant"]


def _tinh_luong(db: Session, ma_nguoi_dung, ma_hdv, so_cong, so_cong_chuan,
                so_tour, thuong) -> Decimal:
    """Tính TongLuong theo loại nhân viên."""
    thuong_dec = Decimal(thuong or 0)
    if ma_nguoi_dung is not None:
        nd = db.query(NguoiDung).get(ma_nguoi_dung)
        if nd is None:
            raise HTTPException(404, "Không tìm thấy nhân viên")
        lcb = Decimal(nd.LuongCoBan or 0)
        phu_cap = Decimal(nd.PhuCap or 0)
        so_ngay = Decimal(so_cong_chuan) if so_cong_chuan > 0 else Decimal(1)
        return (lcb * Decimal(so_cong or 0) / so_ngay + phu_cap + thuong_dec).quantize(
            Decimal("0.01")
        )
    if ma_hdv is not None:
        h = db.query(HuongDanVien).get(ma_hdv)
        if h is None:
            raise HTTPException(404, "Không tìm thấy hướng dẫn viên")
        thu_lao = Decimal(h.DinhMucThuLao or 0)
        cong_tac = Decimal(h.CongTacPhi or 0)
        return (Decimal(so_tour or 0) * thu_lao + cong_tac + thuong_dec).quantize(
            Decimal("0.01")
        )
    raise HTTPException(400, "Phải chỉ định ma_nguoi_dung hoặc ma_hdv")


def _thanh_sheet(db: Session, thang: int, nam: int) -> list[BangLuongItem]:
    rows = (
        db.query(BangLuong)
        .filter(BangLuong.Thang == thang, BangLuong.Nam == nam)
        .order_by(BangLuong.MaBangLuong)
        .all()
    )
    ket_qua = []
    for b in rows:
        loai = "NguoiDung" if b.MaNguoiDung is not None else "HDV"
        ho_ten = None
        if b.MaNguoiDung is not None:
            nd = db.query(NguoiDung).get(b.MaNguoiDung)
            ho_ten = nd.HoTen if nd else None
        elif b.MaHDV is not None:
            h = db.query(HuongDanVien).get(b.MaHDV)
            ho_ten = h.HoTen if h else None
        ket_qua.append(
            BangLuongItem(
                MaBangLuong=b.MaBangLuong,
                Thang=b.Thang,
                Nam=b.Nam,
                MaNguoiDung=b.MaNguoiDung,
                MaHDV=b.MaHDV,
                loai=loai,
                ho_ten=ho_ten,
                SoCong=b.SoCong,
                SoCongChuan=b.SoCongChuan,
                SoTour=b.SoTour,
                Thuong=b.Thuong,
                TongLuong=b.TongLuong,
                TrangThai=b.TrangThai,
                GhiChu=b.GhiChu,
            )
        )
    return ket_qua


@router.get(
    "/employees",
    response_model=list[PayrollEmployeeItem],
    dependencies=[Depends(require_roles(KE_TOAN_ADMIN))],
)
def list_employees(db: Session = Depends(get_db)):
    """Danh sách nhân viên (văn phòng/tài xế) + hướng dẫn viên kèm cấu hình lương."""
    ket_qua = []
    nds = (
        db.query(NguoiDung)
        .filter(NguoiDung.VaiTro.in_(VAITRO_NHAN_VIEN))
        .order_by(NguoiDung.MaNguoiDung)
        .all()
    )
    for nd in nds:
        ket_qua.append(
            PayrollEmployeeItem(
                loai="NguoiDung",
                ma=nd.MaNguoiDung,
                ho_ten=nd.HoTen,
                vai_tro=nd.VaiTro,
                he_so_luong=nd.HeSoLuong,
                luong_co_ban=nd.LuongCoBan,
                phu_cap=nd.PhuCap,
            )
        )
    hdvs = db.query(HuongDanVien).order_by(HuongDanVien.MaHDV).all()
    for h in hdvs:
        ket_qua.append(
            PayrollEmployeeItem(
                loai="HDV",
                ma=h.MaHDV,
                ho_ten=h.HoTen,
                dinh_muc_thu_lao=h.DinhMucThuLao,
                cong_tac_phi=h.CongTacPhi,
            )
        )
    return ket_qua


@router.get(
    "/sheet",
    response_model=list[BangLuongItem],
    dependencies=[Depends(require_roles(KE_TOAN_ADMIN))],
)
def get_sheet(thang: int, nam: int, db: Session = Depends(get_db)):
    """Bảng lương của một tháng/năm."""
    return _thanh_sheet(db, thang, nam)


@router.post(
    "/sheet",
    response_model=list[BangLuongItem],
    dependencies=[Depends(require_roles(KE_TOAN_ADMIN))],
)
def upsert_sheet(body: BangLuongUpsert, db: Session = Depends(get_db)):
    """Lưu bảng lương tháng (upsert theo thang+nam+người), backend tính TongLuong."""
    for it in body.danh_sach:
        tong = _tinh_luong(
            db, it.ma_nguoi_dung, it.ma_hdv, it.so_cong, 26, it.so_tour, it.thuong
        )
        q = db.query(BangLuong).filter(
            BangLuong.Thang == body.thang, BangLuong.Nam == body.nam
        )
        if it.ma_nguoi_dung is not None:
            q = q.filter(BangLuong.MaNguoiDung == it.ma_nguoi_dung)
        else:
            q = q.filter(BangLuong.MaHDV == it.ma_hdv)
        b = q.first()
        if b is None:
            b = BangLuong(
                Thang=body.thang,
                Nam=body.nam,
                MaNguoiDung=it.ma_nguoi_dung,
                MaHDV=it.ma_hdv,
            )
            db.add(b)
        b.SoCong = it.so_cong
        b.SoTour = it.so_tour
        b.Thuong = it.thuong
        b.TongLuong = tong
        if it.ghi_chu is not None:
            b.GhiChu = it.ghi_chu
        db.flush()
    db.commit()
    return _thanh_sheet(db, body.thang, body.nam)


@router.patch(
    "/sheet/{ma_bang_luong}",
    response_model=BangLuongItem,
    dependencies=[Depends(require_roles(KE_TOAN_ADMIN))],
)
def update_sheet(ma_bang_luong: int, body: BangLuongUpdate, db: Session = Depends(get_db)):
    """Sửa thưởng/trạng thái của một dòng lương, tính lại TongLuong."""
    b = db.query(BangLuong).get(ma_bang_luong)
    if b is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy dòng lương")
    if body.Thuong is not None:
        b.Thuong = body.Thuong
    if body.TrangThai is not None:
        b.TrangThai = body.TrangThai
    if body.GhiChu is not None:
        b.GhiChu = body.GhiChu
    b.TongLuong = _tinh_luong(
        db, b.MaNguoiDung, b.MaHDV, b.SoCong, b.SoCongChuan, b.SoTour, b.Thuong
    )
    db.commit()
    db.refresh(b)
    return BangLuongItem(
        MaBangLuong=b.MaBangLuong, Thang=b.Thang, Nam=b.Nam,
        MaNguoiDung=b.MaNguoiDung, MaHDV=b.MaHDV,
        loai="NguoiDung" if b.MaNguoiDung is not None else "HDV",
        ho_ten=None, SoCong=b.SoCong, SoCongChuan=b.SoCongChuan, SoTour=b.SoTour,
        Thuong=b.Thuong, TongLuong=b.TongLuong, TrangThai=b.TrangThai, GhiChu=b.GhiChu,
    )
