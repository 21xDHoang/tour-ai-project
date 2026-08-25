# -*- coding: utf-8 -*-
"""
app/routers/cam_nang.py - Endpoint cho Cẩm nang du lịch (CMS).

  GET    /api/v1/cam-nang/active - bài viết đang hiển thị (công khai)
  GET    /api/v1/cam-nang         - toàn bộ bài viết (Admin)
  POST   /api/v1/cam-nang         - tạo bài viết (Admin)
  PATCH  /api/v1/cam-nang/{id}    - cập nhật bài viết (Admin)
  DELETE /api/v1/cam-nang/{id}    - xóa bài viết (Admin)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CamNang
from app.models.common import utcnow
from app.schemas.cam_nang import CamNangCreate, CamNangItem, CamNangUpdate
from app.utils.auth import require_roles

router = APIRouter(prefix="/cam-nang", tags=["cam-nang"])

TRANG_THAI_HOP_LE = {"Hien", "An"}
DANH_MUC_HOP_LE = {
    "Chung",
    "TruocChuyenDi",
    "ChiPhiThanhToan",
    "AnToan",
    "QuyTrinhDatTour",
    "MeoDuLich",
}


@router.get("/active", response_model=list[CamNangItem])
def list_active_cam_nang(db: Session = Depends(get_db)):
    """Bài viết đang hiển thị trên web khách hàng (mới tạo trước)."""
    ds = (
        db.query(CamNang)
        .filter(CamNang.TrangThai == "Hien")
        .order_by(CamNang.MaBaiViet.desc())
        .all()
    )
    return [CamNangItem.model_validate(b) for b in ds]


@router.get(
    "",
    response_model=list[CamNangItem],
    dependencies=[Depends(require_roles(["Admin"]))],
)
def list_cam_nang(db: Session = Depends(get_db)):
    """Toàn bộ bài viết (Admin) - kể cả bài ẩn."""
    ds = db.query(CamNang).order_by(CamNang.MaBaiViet.desc()).all()
    return [CamNangItem.model_validate(b) for b in ds]


@router.post(
    "",
    response_model=CamNangItem,
    status_code=201,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def create_cam_nang(body: CamNangCreate, db: Session = Depends(get_db)):
    """Tạo bài viết cẩm nang mới (Admin)."""
    if not body.TieuDe.strip():
        raise HTTPException(status_code=400, detail="Tiêu đề không được để trống")
    if body.TrangThai not in TRANG_THAI_HOP_LE:
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")
    if body.DanhMuc not in DANH_MUC_HOP_LE:
        raise HTTPException(status_code=400, detail="Danh mục không hợp lệ")
    bai = CamNang(**body.model_dump())
    db.add(bai)
    db.commit()
    db.refresh(bai)
    return CamNangItem.model_validate(bai)


@router.patch(
    "/{ma_bai_viet}",
    response_model=CamNangItem,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def update_cam_nang(
    ma_bai_viet: int,
    body: CamNangUpdate,
    db: Session = Depends(get_db),
):
    """Cập nhật bài viết cẩm nang (Admin)."""
    bai = db.query(CamNang).get(ma_bai_viet)
    if bai is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    du_lieu = body.model_dump(exclude_unset=True)
    if du_lieu.get("TrangThai") not in (None, *TRANG_THAI_HOP_LE):
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")
    if du_lieu.get("DanhMuc") not in (None, *DANH_MUC_HOP_LE):
        raise HTTPException(status_code=400, detail="Danh mục không hợp lệ")
    for key, value in du_lieu.items():
        setattr(bai, key, value)
    bai.NgayCapNhat = utcnow()
    db.commit()
    db.refresh(bai)
    return CamNangItem.model_validate(bai)


@router.delete(
    "/{ma_bai_viet}",
    dependencies=[Depends(require_roles(["Admin"]))],
)
def delete_cam_nang(ma_bai_viet: int, db: Session = Depends(get_db)):
    """Xóa bài viết cẩm nang (Admin)."""
    bai = db.query(CamNang).get(ma_bai_viet)
    if bai is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    db.delete(bai)
    db.commit()
    return {"ok": True}
