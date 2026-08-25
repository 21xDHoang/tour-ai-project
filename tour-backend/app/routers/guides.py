# -*- coding: utf-8 -*-
"""
app/routers/guides.py - Endpoint RESTful cho Hướng dẫn viên.

  GET  /api/v1/guides                       - danh sách HDV + trạng thái hoạt động (Admin)
  GET  /api/v1/guides/{ma_hdv}              - hồ sơ chi tiết + lịch sử + đánh giá (Admin)
  POST /api/v1/guides                       - thêm HDV (Admin)
  PATCH /api/v1/guides/{ma_hdv}             - sửa hồ sơ HDV (Admin)
  POST /api/v1/guides/{ma_hdv}/analyze-feedback - AI phân tích phản hồi HDV (Admin)
  GET  /api/v1/guides/available/{ma_lich}   - HDV rảnh trong khoảng thời gian lịch (DR-05)
  POST /api/v1/guides/assign                - phân công HDV vào lịch (Admin, chặn trùng)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai import PhanHoiService, PhanTichResponse
from app.database import get_db
from app.models import HuongDanVien
from app.schemas.guide import (
    HDVCreate,
    HDVDetailResponse,
    HDVListItem,
    HDVResponse,
    HDVUpdate,
    PhanCongHDVRequest,
    PhanCongHDVResponse,
)
from app.services.guide_service import GuideService
from app.utils.auth import require_roles

router = APIRouter(prefix="/guides", tags=["guides"])


@router.get(
    "",
    response_model=list[HDVListItem],
    dependencies=[Depends(require_roles(["Admin"]))],
)
def list_guides(db: Session = Depends(get_db)):
    """Danh sách hướng dẫn viên kèm tổng số tour và trạng thái hoạt động."""
    return GuideService.list_hdv_chi_tiet(db)


@router.get(
    "/{ma_hdv}",
    response_model=HDVDetailResponse,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def get_guide_detail(ma_hdv: int, db: Session = Depends(get_db)):
    """Hồ sơ chi tiết HDV + lịch sử phân công + thống kê đánh giá."""
    return GuideService.get_hdv_detail(db, ma_hdv)


@router.post(
    "",
    response_model=HDVResponse,
    status_code=201,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def create_guide(body: HDVCreate, db: Session = Depends(get_db)):
    """Thêm hướng dẫn viên mới (chặn trùng số điện thoại)."""
    trung = (
        db.query(HuongDanVien)
        .filter(HuongDanVien.SoDienThoai == body.SoDienThoai)
        .first()
    )
    if trung is not None:
        raise HTTPException(status_code=409, detail="Số điện thoại HDV đã tồn tại")
    hdv = HuongDanVien(**body.model_dump())
    db.add(hdv)
    db.commit()
    db.refresh(hdv)
    return HDVResponse.model_validate(hdv)


@router.patch(
    "/{ma_hdv}",
    response_model=HDVResponse,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def update_guide(ma_hdv: int, body: HDVUpdate, db: Session = Depends(get_db)):
    """Cập nhật hồ sơ hướng dẫn viên (partial)."""
    hdv = db.query(HuongDanVien).filter(HuongDanVien.MaHDV == ma_hdv).first()
    if hdv is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn viên")
    du_lieu = body.model_dump(exclude_unset=True)
    for key, value in du_lieu.items():
        setattr(hdv, key, value)
    db.commit()
    db.refresh(hdv)
    return HDVResponse.model_validate(hdv)


@router.post(
    "/{ma_hdv}/analyze-feedback",
    response_model=PhanTichResponse,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def analyze_guide_feedback(ma_hdv: int, db: Session = Depends(get_db)):
    """AI phân tích phản hồi của khách về một hướng dẫn viên."""
    hdv = db.query(HuongDanVien).filter(HuongDanVien.MaHDV == ma_hdv).first()
    if hdv is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy hướng dẫn viên")
    phan_hois = GuideService.lay_phan_hoi_hdv(db, ma_hdv)
    if not phan_hois:
        raise HTTPException(status_code=404, detail="HDV chưa có phản hồi nào")
    return PhanHoiService().phan_tich_hdv(hdv.HoTen, phan_hois)


@router.get(
    "/available/{ma_lich}",
    response_model=list[HDVResponse],
    dependencies=[Depends(require_roles(["Admin"]))],
)
def get_available_guides(ma_lich: int, db: Session = Depends(get_db)):
    """Danh sách HDV rảnh (không bận lịch trùng thời gian với lịch đang xét - DR-05)."""
    ds = GuideService.get_available_guides(db, ma_lich)
    return [HDVResponse.model_validate(h) for h in ds]


@router.post(
    "/assign",
    response_model=PhanCongHDVResponse,
    status_code=201,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def assign_guide(body: PhanCongHDVRequest, db: Session = Depends(get_db)):
    """Phân công HDV vào lịch khởi hành; từ chối 400 nếu trùng khoảng thời gian (DR-05)."""
    return GuideService.assign_guide(db, body)
