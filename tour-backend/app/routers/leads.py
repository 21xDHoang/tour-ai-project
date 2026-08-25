# -*- coding: utf-8 -*-
"""
app/routers/leads.py - Endpoint cho nhóm chức năng Lead (Yêu cầu tư vấn).

  POST /api/v1/leads          - gửi yêu cầu tư vấn (công khai, web khách)
  GET  /api/v1/leads          - toàn bộ lead (Admin)
  GET  /api/v1/leads/my       - lead của tôi + lead chưa ai phụ trách
                                 (Tư vấn viên/Admin - dùng cho Kanban & Dashboard)
  PATCH /api/v1/leads/{id}    - đổi trạng thái phễu / gán phụ trách
                                 (Tư vấn viên/Admin)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import NguoiDung, YeuCauTuVan
from app.schemas.lead import LeadCreate, LeadItem, LeadUpdate
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/leads", tags=["leads"])

# Trạng thái phễu chuyển đổi của lead
TRANG_THAI_HOP_LE = {
    "Moi",
    "DangLienHe",
    "DaBaoGia",
    "DangChot",
    "ThatBai",
}


def _thanh_item(db: Session, lead: YeuCauTuVan) -> LeadItem:
    """Dựng LeadItem kèm tên người phụ trách."""
    ten = None
    if lead.NguoiPhuTrachID is not None:
        nd = db.query(NguoiDung).get(lead.NguoiPhuTrachID)
        ten = nd.HoTen if nd else None
    item = LeadItem.model_validate(lead)
    item.ten_nguoi_phu_trach = ten
    return item


@router.post("", response_model=LeadItem, status_code=201)
def create_lead(body: LeadCreate, db: Session = Depends(get_db)):
    """Tiếp nhận yêu cầu tư vấn từ web khách hàng (không cần đăng nhập)."""
    lead = YeuCauTuVan(**body.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return _thanh_item(db, lead)


@router.get(
    "",
    response_model=list[LeadItem],
    dependencies=[Depends(require_roles(["Admin"]))],
)
def list_leads(db: Session = Depends(get_db)):
    """Toàn bộ lead (Admin) - lead mới nhất trước."""
    ds = (
        db.query(YeuCauTuVan)
        .order_by(YeuCauTuVan.NgayTao.desc())
        .all()
    )
    return [_thanh_item(db, l) for l in ds]


@router.get(
    "/my",
    response_model=list[LeadItem],
    dependencies=[Depends(require_roles(["Admin", "Consultant"]))],
)
def my_leads(
    user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lead của tôi + lead chưa có người phụ trách (sẵn sàng nhận)."""
    ds = (
        db.query(YeuCauTuVan)
        .filter(
            (YeuCauTuVan.NguoiPhuTrachID == user.MaNguoiDung)
            | (YeuCauTuVan.NguoiPhuTrachID.is_(None))
        )
        .order_by(YeuCauTuVan.NgayTao.desc())
        .all()
    )
    return [_thanh_item(db, l) for l in ds]


@router.patch(
    "/{ma_yeu_cau}",
    response_model=LeadItem,
    dependencies=[Depends(require_roles(["Admin", "Consultant"]))],
)
def update_lead(
    ma_yeu_cau: int,
    body: LeadUpdate,
    db: Session = Depends(get_db),
):
    """Cập nhật trạng thái phễu hoặc gán người phụ trách."""
    lead = db.query(YeuCauTuVan).get(ma_yeu_cau)
    if lead is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu tư vấn")
    if body.TrangThai is not None:
        if body.TrangThai not in TRANG_THAI_HOP_LE:
            raise HTTPException(status_code=400, detail="Trạng thái lead không hợp lệ")
        lead.TrangThai = body.TrangThai
    if body.NguoiPhuTrachID is not None:
        nd = db.query(NguoiDung).get(body.NguoiPhuTrachID)
        if nd is None:
            raise HTTPException(status_code=404, detail="Người phụ trách không tồn tại")
        lead.NguoiPhuTrachID = body.NguoiPhuTrachID
    db.commit()
    db.refresh(lead)
    return _thanh_item(db, lead)
