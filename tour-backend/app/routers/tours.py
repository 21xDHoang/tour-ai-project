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
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AIPhanTichPhanHoi, DatCho, DiemDen, LichKhoiHanh, PhanCongHDV, Tour
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


def _diem_den_dto(diem: DiemDen, so_luong_tour: int) -> DiemDenResponse:
    """Bọc DiemDen + số tour tham chiếu thành DiemDenResponse.

    Luôn gán tường minh SoLuongTour (không trông cậy vào default của Pydantic
    khi ORM thiếu attribute).
    """
    dto = DiemDenResponse.model_validate(diem)
    dto.SoLuongTour = so_luong_tour
    return dto


@router.get("/destinations/all", response_model=list[DiemDenResponse])
def list_destinations(db: Session = Depends(get_db)):
    """Danh mục toàn bộ điểm đến (kèm số tour tham chiếu)."""
    ds = TourRepository.list_diem_den(db)
    dem = TourRepository.dem_tour_theo_diem_den(db)
    return [_diem_den_dto(d, dem.get(d.MaDiemDen, 0)) for d in ds]


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
    return _diem_den_dto(diem, 0)


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
    return _diem_den_dto(
        diem, TourRepository.count_tour_by_diem_den(db, diem.MaDiemDen)
    )


@router.delete(
    "/destinations/{ma_diem_den}",
    dependencies=[Depends(require_roles(["Admin"]))],
)
def delete_destination(ma_diem_den: int, db: Session = Depends(get_db)):
    """Xóa điểm đến (chỉ Admin).

    Chặn (409) khi điểm đến còn bất kỳ Tour nào tham chiếu — vì FK
    Tour.MaDiemDen NOT NULL nên hard-delete sẽ lỗi nếu còn dòng Tour.
    """
    diem = (
        db.query(DiemDen).filter(DiemDen.MaDiemDen == ma_diem_den).first()
    )
    if diem is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy điểm đến")

    so_luong = TourRepository.count_tour_by_diem_den(db, ma_diem_den)
    if so_luong > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Không thể xóa điểm đến '{diem.TenDiemDen}' vì đang có "
                f"{so_luong} tour tham chiếu. Hãy xóa hoặc chuyển các tour "
                "đó sang điểm đến khác trước."
            ),
        )

    try:
        db.delete(diem)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Không thể xóa điểm đến vì còn dữ liệu liên quan",
        )
    return {
        "success": True,
        "message": f"Đã xóa điểm đến '{diem.TenDiemDen}'",
        "ma_diem_den": ma_diem_den,
    }


@router.get("", response_model=list[TourResponse])
def search_tours(
    tu_khoa: str | None = None,
    khu_vuc: str | None = None,
    gia_toi_da: Decimal | None = None,
    so_ngay: int | None = None,
    loai_tour: str | None = None,
    trang_thai: str | None = None,
    db: Session = Depends(get_db),
):
    """Tìm kiếm & lọc tour theo từ khóa, khu vực, giá tối đa, số ngày, loại hình, trạng thái."""
    ds = TourRepository.search_tours(
        db,
        tu_khoa=tu_khoa,
        khu_vuc=khu_vuc,
        gia_toi_da=gia_toi_da,
        trang_thai=trang_thai or "DangBan",
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
        raise HTTPException(status_code=404, detail="Không tìm thấy tour hoặc tour đã bị ẩn")

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
    tour = db.query(Tour).filter(Tour.MaTour == ma_tour, Tour.TrangThai != "DaXoa").first()
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


@router.delete(
    "/{ma_tour}",
    status_code=200,
    dependencies=[Depends(require_roles(["Admin"]))],
)
def delete_tour(ma_tour: int, db: Session = Depends(get_db)):
    """Xóa chương trình tour (chỉ Admin).

    Logic thông minh:
    - Nếu tour chưa có đơn đặt chỗ nào -> Xóa cứng (Hard delete) hoàn toàn.
    - Nếu tour đã có đơn đặt chỗ trong quá khứ -> Xóa mềm (Soft delete: TrangThai='DaXoa')
      và đóng tất cả lịch mở bán. Tour sẽ tự động biến mất và ẩn hoàn toàn khỏi
      trang web khách hàng mà vẫn bảo toàn dữ liệu tài chính/đơn hàng.
    """
    tour = db.query(Tour).filter(Tour.MaTour == ma_tour).first()
    if tour is None or tour.TrangThai == "DaXoa":
        raise HTTPException(status_code=404, detail="Không tìm thấy tour hoặc tour đã bị xóa")

    # Kiểm tra xem có đơn đặt chỗ nào liên kết với các lịch khởi hành của tour này không
    ds_ma_lich = [
        l.MaLich
        for l in db.query(LichKhoiHanh.MaLich)
        .filter(LichKhoiHanh.MaTour == ma_tour)
        .all()
    ]

    has_booking = False
    if ds_ma_lich:
        count_datcho = (
            db.query(DatCho).filter(DatCho.MaLich.in_(ds_ma_lich)).count()
        )
        if count_datcho > 0:
            has_booking = True

    ten_tour = tour.TenTour
    if has_booking:
        # Xóa mềm: đánh dấu DaXoa & đóng các lịch mở bán
        tour.TrangThai = "DaXoa"
        db.query(LichKhoiHanh).filter(
            LichKhoiHanh.MaTour == ma_tour,
            LichKhoiHanh.TrangThai == "MoBan",
        ).update({"TrangThai": "Dong"}, synchronize_session=False)
        db.commit()
        return {
            "success": True,
            "message": f"Đã xóa và tự động ẩn tour '{ten_tour}' khỏi trang web!",
            "ma_tour": ma_tour,
            "mode": "soft_delete",
        }
    else:
        # Xóa cứng: dọn dẹp các lịch rỗng, phân công và bản ghi tour
        if ds_ma_lich:
            db.query(PhanCongHDV).filter(PhanCongHDV.MaLich.in_(ds_ma_lich)).delete(
                synchronize_session=False
            )
            db.query(LichKhoiHanh).filter(
                LichKhoiHanh.MaTour == ma_tour
            ).delete(synchronize_session=False)

        db.query(AIPhanTichPhanHoi).filter(
            AIPhanTichPhanHoi.MaTour == ma_tour
        ).delete(synchronize_session=False)

        db.delete(tour)
        db.commit()

        return {
            "success": True,
            "message": f"Đã xóa vĩnh viễn tour '{ten_tour}' khỏi hệ thống!",
            "ma_tour": ma_tour,
            "mode": "hard_delete",
        }

