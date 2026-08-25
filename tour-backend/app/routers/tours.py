# -*- coding: utf-8 -*-
"""
app/routers/tours.py - Endpoint RESTful cho Tour & Điểm đến.

  GET  /api/v1/tours                - tìm kiếm & lọc tour
  GET  /api/v1/tours/destinations/all - danh mục điểm đến
  GET  /api/v1/tours/{id}           - chi tiết tour + lịch còn chỗ
  POST /api/v1/tours                - thêm tour mới (Admin)
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DiemDen, Tour
from app.repositories.tour_repo import TourRepository
from app.schemas.tour import (
    DiemDenCreate,
    DiemDenResponse,
    DiemDenUpdate,
    LichKhoiHanhResponse,
    TourCreate,
    TourResponse,
    TourUpdate,
)
from app.utils.auth import require_roles

router = APIRouter(prefix="/tours", tags=["tours"])


@router.get("/destinations/all", response_model=list[DiemDenResponse])
def list_destinations(db: Session = Depends(get_db)):
    """Danh mục toàn bộ điểm đến."""
    return TourRepository.list_diem_den(db)


@router.post(
    "/destinations",
    response_model=DiemDenResponse,
    status_code=201,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def create_destination(body: DiemDenCreate, db: Session = Depends(get_db)):
    """Thêm điểm đến mới (chỉ Admin)."""
    ten = body.TenDiemDen.strip()
    if db.query(DiemDen).filter(DiemDen.TenDiemDen == ten).first():
        raise HTTPException(status_code=409, detail="Tên điểm đến đã tồn tại")
    diem = DiemDen(TenDiemDen=ten, KhuVuc=body.KhuVuc, MoTa=body.MoTa)
    db.add(diem)
    db.commit()
    db.refresh(diem)
    return diem


@router.patch(
    "/destinations/{ma_diem_den}",
    response_model=DiemDenResponse,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def update_destination(
    ma_diem_den: int, body: DiemDenUpdate, db: Session = Depends(get_db)
):
    """Cập nhật điểm đến (chỉ Admin)."""
    diem = (
        db.query(DiemDen).filter(DiemDen.MaDiemDen == ma_diem_den).first()
    )
    if diem is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy điểm đến")

    du_lieu = body.model_dump(exclude_unset=True)
    if "TenDiemDen" in du_lieu:
        ten = (du_lieu["TenDiemDen"] or "").strip()
        if not ten:
            raise HTTPException(status_code=422, detail="Tên điểm đến không được để trống")
        trung = (
            db.query(DiemDen)
            .filter(DiemDen.TenDiemDen == ten, DiemDen.MaDiemDen != ma_diem_den)
            .first()
        )
        if trung:
            raise HTTPException(status_code=409, detail="Tên điểm đến đã tồn tại")
        du_lieu["TenDiemDen"] = ten

    for k, v in du_lieu.items():
        setattr(diem, k, v)
    db.commit()
    db.refresh(diem)
    return diem


@router.get("", response_model=list[TourResponse])
def search_tours(
    tu_khoa: str | None = None,
    khu_vuc: str | None = None,
    gia_toi_da: Decimal | None = None,
    so_ngay: int | None = None,
    loai_tour: str | None = None,
    db: Session = Depends(get_db),
):
    """Tìm kiếm & lọc tour theo từ khóa, khu vực, giá tối đa, số ngày, loại hình."""
    ds = TourRepository.search_tours(
        db, tu_khoa=tu_khoa, khu_vuc=khu_vuc, gia_toi_da=gia_toi_da,
        loai_tour=loai_tour,
    )
    if so_ngay is not None:
        ds = [t for t in ds if t.SoNgay == so_ngay]

    ket_qua = []
    for t in ds:
        resp = TourResponse.model_validate(t)
        dd = TourRepository.get_diem_den_by_id(db, t.MaDiemDen)
        resp.ten_diem_den = dd.TenDiemDen if dd else None
        ket_qua.append(resp)
    return ket_qua


@router.get("/{ma_tour}", response_model=TourResponse)
def get_tour_detail(ma_tour: int, db: Session = Depends(get_db)):
    """Chi tiết tour kèm tên điểm đến và danh sách lịch còn chỗ (SoChoCon > 0)."""
    tour, diem_den, ds_lich = TourRepository.get_tour_detail(db, ma_tour)
    if tour is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tour")

    resp = TourResponse.model_validate(tour)
    resp.ten_diem_den = diem_den.TenDiemDen if diem_den else None
    resp.ds_lich = [LichKhoiHanhResponse.model_validate(l) for l in ds_lich]
    return resp


@router.post(
    "",
    response_model=TourResponse,
    status_code=201,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def create_tour(body: TourCreate, db: Session = Depends(get_db)):
    """Thêm chương trình tour mới (chỉ Admin)."""
    tour = Tour(**body.model_dump())
    db.add(tour)
    db.commit()
    db.refresh(tour)

    resp = TourResponse.model_validate(tour)
    dd = TourRepository.get_diem_den_by_id(db, tour.MaDiemDen)
    resp.ten_diem_den = dd.TenDiemDen if dd else None
    return resp


@router.patch(
    "/{ma_tour}",
    response_model=TourResponse,
    dependencies=[Depends(require_roles(["Admin", "Consultant"]))],
)
def update_tour(ma_tour: int, body: TourUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin tour (mô tả, lịch trình, giá...) - Admin/Consultant."""
    tour = db.query(Tour).filter(Tour.MaTour == ma_tour).first()
    if tour is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tour")
    du_lieu = body.model_dump(exclude_unset=True)
    for key, value in du_lieu.items():
        setattr(tour, key, value)
    db.commit()
    db.refresh(tour)

    resp = TourResponse.model_validate(tour)
    dd = TourRepository.get_diem_den_by_id(db, tour.MaDiemDen)
    resp.ten_diem_den = dd.TenDiemDen if dd else None
    return resp
