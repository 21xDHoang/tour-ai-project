# -*- coding: utf-8 -*-
"""
app/routers/payables.py - Endpoint cho Công nợ Nhà cung cấp (Accounts Payable).

  GET  /api/v1/payables            - danh sách nợ phải trả
  POST /api/v1/payables            - thêm khoản nợ
  PATCH /api/v1/payables/{id}      - sửa khoản nợ
  POST /api/v1/payables/{id}/pay   - lập phiếu chi (trừ nợ + sinh PhiChi vào sổ quỹ)
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CongNoNhaCungCap, NguoiDung, PhiChi
from app.schemas.payable import PayableCreate, PayableItem, PayableUpdate, PhieuChiCreate
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/payables", tags=["payables"])

KE_TOAN_ADMIN = ["Admin", "Accountant"]


def _cap_nhat_trang_thai(p: CongNoNhaCungCap) -> None:
    con_no = Decimal(p.TongTien) - Decimal(p.DaThanhToan)
    if con_no <= 0:
        p.TrangThai = "DaTatToan"
    elif Decimal(p.DaThanhToan) > 0:
        p.TrangThai = "TraMotPhan"
    else:
        p.TrangThai = "ChuaTra"


def _thanh_item(p: CongNoNhaCungCap) -> PayableItem:
    return PayableItem(
        MaPhaiTra=p.MaPhaiTra,
        TenDoiTac=p.TenDoiTac,
        DichVu=p.DichVu,
        TongTien=p.TongTien,
        DaThanhToan=p.DaThanhToan,
        HanThanhToan=p.HanThanhToan,
        TrangThai=p.TrangThai,
        GhiChu=p.GhiChu,
        con_no=Decimal(p.TongTien) - Decimal(p.DaThanhToan),
    )


@router.get(
    "",
    response_model=list[PayableItem],
    dependencies=[Depends(require_roles(KE_TOAN_ADMIN))],
)
def list_payables(db: Session = Depends(get_db)):
    """Danh sách công nợ nhà cung cấp (mới nhất trước)."""
    ds = db.query(CongNoNhaCungCap).order_by(CongNoNhaCungCap.MaPhaiTra.desc()).all()
    return [_thanh_item(p) for p in ds]


@router.post(
    "",
    response_model=PayableItem,
    status_code=201,
    dependencies=[Depends(require_roles(KE_TOAN_ADMIN))],
)
def create_payable(body: PayableCreate, db: Session = Depends(get_db)):
    """Thêm khoản công nợ nhà cung cấp."""
    p = CongNoNhaCungCap(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _thanh_item(p)


@router.patch(
    "/{ma_phai_tra}",
    response_model=PayableItem,
    dependencies=[Depends(require_roles(KE_TOAN_ADMIN))],
)
def update_payable(ma_phai_tra: int, body: PayableUpdate, db: Session = Depends(get_db)):
    """Sửa khoản công nợ (tổng tiền, hạn, ghi chú...)."""
    p = db.query(CongNoNhaCungCap).get(ma_phai_tra)
    if p is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy khoản nợ")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    _cap_nhat_trang_thai(p)
    db.commit()
    db.refresh(p)
    return _thanh_item(p)


@router.post(
    "/{ma_phai_tra}/pay",
    response_model=PayableItem,
    dependencies=[Depends(require_roles(KE_TOAN_ADMIN))],
)
def pay_payable(
    ma_phai_tra: int,
    body: PhieuChiCreate,
    user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lập phiếu chi thanh toán: trừ nợ + sinh bản ghi PhiChi vào Sổ quỹ."""
    p = db.query(CongNoNhaCungCap).get(ma_phai_tra)
    if p is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy khoản nợ")
    con_no = Decimal(p.TongTien) - Decimal(p.DaThanhToan)
    if body.SoTien > con_no:
        raise HTTPException(status_code=400, detail="Số tiền chi vượt quá số còn nợ")

    p.DaThanhToan = Decimal(p.DaThanhToan) + body.SoTien
    _cap_nhat_trang_thai(p)
    db.add(
        PhiChi(
            MaPhaiTra=ma_phai_tra,
            SoTien=body.SoTien,
            GhiChu=body.GhiChu,
            NguoiXuLyID=user.MaNguoiDung,
        )
    )
    db.commit()
    db.refresh(p)
    return _thanh_item(p)
