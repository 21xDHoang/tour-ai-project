# -*- coding: utf-8 -*-
"""
app/routers/vouchers.py - Endpoint cho Mã giảm giá / Voucher.

  GET  /api/v1/vouchers/active - danh sách mã đang còn hiệu lực (công khai)
  POST /api/v1/vouchers        - tạo mã giảm giá (Admin)
  PATCH /api/v1/vouchers/{id}  - cập nhật mã giảm giá (Admin)

Ghi chú: Voucher chỉ QUẢN LÝ + HIỂN THỊ; chưa áp vào tính tiền đơn
(ngoài phạm vi B - cần đổi schema DatCho).
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MaGiamGia
from app.schemas.voucher import VoucherCreate, VoucherItem, VoucherUpdate
from app.utils.auth import require_roles

router = APIRouter(prefix="/vouchers", tags=["vouchers"])

LOAI_GIAM_HOP_LE = {"PhanTram", "Tien"}


@router.get("/active", response_model=list[VoucherItem])
def list_active_vouchers(db: Session = Depends(get_db)):
    """Mã giảm giá còn hiệu lực (Active + chưa hết hạn + còn lượt dùng)."""
    ds = (
        db.query(MaGiamGia)
        .filter(
            MaGiamGia.TrangThai == "Active",
            MaGiamGia.HanSuDung >= date.today(),
        )
        .order_by(MaGiamGia.HanSuDung.asc())
        .all()
    )
    return [VoucherItem.model_validate(v) for v in ds]


@router.get(
    "",
    response_model=list[VoucherItem],
    dependencies=[Depends(require_roles(["Admin"]))],
)
def list_vouchers(db: Session = Depends(get_db)):
    """Toàn bộ mã giảm giá (Admin) - kể cả mã hết hạn, mới tạo trước."""
    ds = db.query(MaGiamGia).order_by(MaGiamGia.MaGiamGia.desc()).all()
    return [VoucherItem.model_validate(v) for v in ds]


@router.post(
    "",
    response_model=VoucherItem,
    status_code=201,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def create_voucher(body: VoucherCreate, db: Session = Depends(get_db)):
    """Tạo mã giảm giá mới (Admin)."""
    if body.LoaiGiam not in LOAI_GIAM_HOP_LE:
        raise HTTPException(status_code=400, detail="Loại giảm giá không hợp lệ")
    if body.LoaiGiam == "PhanTram" and body.GiaTri > 100:
        raise HTTPException(status_code=400, detail="Phần trăm giảm tối đa 100")
    trung = db.query(MaGiamGia).filter(MaGiamGia.MaCode == body.MaCode).first()
    if trung is not None:
        raise HTTPException(status_code=400, detail="Mã giảm giá đã tồn tại")
    v = MaGiamGia(**body.model_dump())
    db.add(v)
    db.commit()
    db.refresh(v)
    return VoucherItem.model_validate(v)


@router.patch(
    "/{ma_giam_gia}",
    response_model=VoucherItem,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def update_voucher(
    ma_giam_gia: int,
    body: VoucherUpdate,
    db: Session = Depends(get_db),
):
    """Cập nhật mã giảm giá (Admin)."""
    v = db.query(MaGiamGia).get(ma_giam_gia)
    if v is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã giảm giá")
    du_lieu = body.model_dump(exclude_unset=True)
    for key, value in du_lieu.items():
        setattr(v, key, value)
    db.commit()
    db.refresh(v)
    return VoucherItem.model_validate(v)
