# -*- coding: utf-8 -*-
"""
app/routers/custom_tours.py - Endpoint cho Tour thiết kế riêng (Custom Tour).

  POST /api/v1/custom-tour-requests - gửi yêu cầu tour riêng (công khai)
  GET  /api/v1/custom-tour-requests - toàn bộ (Admin/Consultant)
  GET  /api/v1/custom-tour-requests/my - của tôi + chưa ai xử lý (Consultant)
  PATCH /api/v1/custom-tour-requests/{id} - đổi trạng thái / gán xử lý
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import NguoiDung, YeuCauTourRieng
from app.schemas.custom_tour import CustomTourCreate, CustomTourItem, CustomTourUpdate
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/custom-tour-requests", tags=["custom-tours"])

# Trạng thái xử lý yêu cầu tour riêng
TRANG_THAI_HOP_LE = {"Moi", "DangBaoGia", "DaChot", "TuChoi"}


def _thanh_item(db: Session, yc: YeuCauTourRieng) -> CustomTourItem:
    """Dựng CustomTourItem kèm tên người xử lý."""
    ten = None
    if yc.NguoiXuLyID is not None:
        nd = db.query(NguoiDung).get(yc.NguoiXuLyID)
        ten = nd.HoTen if nd else None
    item = CustomTourItem.model_validate(yc)
    item.ten_nguoi_xu_ly = ten
    return item


@router.post("", response_model=CustomTourItem, status_code=201)
def create_custom_tour(body: CustomTourCreate, db: Session = Depends(get_db)):
    """Tiếp nhận yêu cầu tour thiết kế riêng từ web khách hàng."""
    yc = YeuCauTourRieng(**body.model_dump())
    db.add(yc)
    db.commit()
    db.refresh(yc)
    return _thanh_item(db, yc)


@router.get(
    "",
    response_model=list[CustomTourItem],
    dependencies=[Depends(require_roles(["Admin", "Consultant"]))],
)
def list_custom_tours(db: Session = Depends(get_db)):
    """Toàn bộ yêu cầu tour riêng - mới nhất trước."""
    ds = db.query(YeuCauTourRieng).order_by(YeuCauTourRieng.NgayTao.desc()).all()
    return [_thanh_item(db, y) for y in ds]


@router.get(
    "/my",
    response_model=list[CustomTourItem],
    dependencies=[Depends(require_roles(["Consultant", "Admin"]))],
)
def my_custom_tours(
    user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Yêu cầu do tôi xử lý + chưa ai nhận (sẵn sàng nhận)."""
    ds = (
        db.query(YeuCauTourRieng)
        .filter(
            (YeuCauTourRieng.NguoiXuLyID == user.MaNguoiDung)
            | (YeuCauTourRieng.NguoiXuLyID.is_(None))
        )
        .order_by(YeuCauTourRieng.NgayTao.desc())
        .all()
    )
    return [_thanh_item(db, y) for y in ds]


@router.patch(
    "/{ma_yeu_cau}",
    response_model=CustomTourItem,
    dependencies=[Depends(require_roles(["Consultant", "Admin"]))],
)
def update_custom_tour(
    ma_yeu_cau: int,
    body: CustomTourUpdate,
    db: Session = Depends(get_db),
):
    """Cập nhật toàn bộ thông tin yêu cầu tour riêng (chỉnh sửa + trạng thái)."""
    yc = db.query(YeuCauTourRieng).get(ma_yeu_cau)
    if yc is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu tour riêng")

    du_lieu = body.model_dump(exclude_unset=True)

    if du_lieu.get("TrangThai") is not None:
        if du_lieu["TrangThai"] not in TRANG_THAI_HOP_LE:
            raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")
    if du_lieu.get("NguoiXuLyID") is not None:
        nd = db.query(NguoiDung).get(du_lieu["NguoiXuLyID"])
        if nd is None:
            raise HTTPException(status_code=404, detail="Người xử lý không tồn tại")

    for key, value in du_lieu.items():
        setattr(yc, key, value)
    db.commit()
    db.refresh(yc)
    return _thanh_item(db, yc)
