# -*- coding: utf-8 -*-
"""
app/routers/reviews.py - Endpoint cho Đánh giá / Phản hồi (PhanHoi).

  GET   /api/v1/reviews        - danh sách phản hồi để kiểm duyệt (Admin)
  PATCH /api/v1/reviews/{id}   - duyệt/từ chối/ẩn hiện (Admin)
  POST  /api/v1/reviews        - khách tạo đánh giá (Customer, ChoDuyet)

Quy trình: khách gửi -> TrangThai=ChoDuyet -> Admin duyệt mới hiển thị.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DatCho, DiemDen, KhachHang, LichKhoiHanh, NguoiDung, PhanHoi, Tour
from app.schemas.review import ReviewCreate, ReviewItem, ReviewUpdate
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/reviews", tags=["reviews"])

TRANG_THAI_HOP_LE = {"ChoDuyet", "DaDuyet", "TuChoi"}


def _thanh_item(db: Session, ph: PhanHoi) -> ReviewItem:
    """Dựng ReviewItem kèm tên khách hàng và tên tour của đơn."""
    ten_kh, ten_tour = None, None
    dat = db.query(DatCho).get(ph.MaDatCho)
    if dat is not None:
        kh = db.query(KhachHang).get(dat.MaKhachHang)
        ten_kh = kh.HoTen if kh else None
        lich = db.query(LichKhoiHanh).get(dat.MaLich)
        if lich is not None:
            tour = db.query(Tour).get(lich.MaTour)
            ten_tour = tour.TenTour if tour else None
    item = ReviewItem.model_validate(ph)
    item.ten_khach_hang = ten_kh
    item.ten_tour = ten_tour
    return item


@router.get(
    "",
    response_model=list[ReviewItem],
    dependencies=[Depends(require_roles(["Admin"]))],
)
def list_reviews(db: Session = Depends(get_db)):
    """Toàn bộ phản hồi cho màn hình kiểm duyệt - mới nhất trước."""
    ds = db.query(PhanHoi).order_by(PhanHoi.NgayTao.desc()).all()
    return [_thanh_item(db, ph) for ph in ds]


@router.patch(
    "/{ma_phan_hoi}",
    response_model=ReviewItem,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def update_review(
    ma_phan_hoi: int,
    body: ReviewUpdate,
    db: Session = Depends(get_db),
):
    """Duyệt (DaDuyet), từ chối (TuChoi) hoặc ẩn/hiện đánh giá."""
    ph = db.query(PhanHoi).get(ma_phan_hoi)
    if ph is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy phản hồi")
    if body.TrangThai is not None:
        if body.TrangThai not in TRANG_THAI_HOP_LE:
            raise HTTPException(status_code=400, detail="Trạng thái phản hồi không hợp lệ")
        ph.TrangThai = body.TrangThai
    if body.AnHien is not None:
        ph.AnHien = body.AnHien
    db.commit()
    db.refresh(ph)
    return _thanh_item(db, ph)


@router.post(
    "",
    response_model=ReviewItem,
    status_code=201,
    dependencies=[Depends(require_roles(["Customer"]))],
)
def create_review(
    body: ReviewCreate,
    user: NguoiDung = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Khách tạo đánh giá cho đơn đã hoàn thành (mặc định chờ duyệt)."""
    dat = db.query(DatCho).get(body.MaDatCho)
    if dat is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt chỗ")
    if dat.TrangThai != "DaThanhToan":
        raise HTTPException(
            status_code=400,
            detail="Chỉ được đánh giá chuyến đi đã thanh toán hoàn tất",
        )
    kh = db.query(KhachHang).filter(KhachHang.Email == user.Email).first()
    if kh is None:
        raise HTTPException(status_code=403, detail="Tài khoản chưa có hồ sơ khách hàng")
    if dat.MaKhachHang != kh.MaKhachHang:
        raise HTTPException(
            status_code=403, detail="Chỉ được đánh giá đơn của chính mình"
        )
    ph = PhanHoi(
        MaDatCho=body.MaDatCho,
        MaKhachHang=kh.MaKhachHang,
        SoSao=body.SoSao,
        NoiDung=body.NoiDung,
        TrangThai="ChoDuyet",
        AnHien=False,
    )
    db.add(ph)
    db.commit()
    db.refresh(ph)
    return _thanh_item(db, ph)
