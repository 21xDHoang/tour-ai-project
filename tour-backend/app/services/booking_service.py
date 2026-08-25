# -*- coding: utf-8 -*-
"""
app/services/booking_service.py - Nghiệp vụ Đặt chỗ.

Hiện thực 2 quy tắc miền:
  DR-01: SoChoCon phải đủ cho SoKhach; cảnh báo khi đoàn dưới MinSeats.
  DR-02: Đơn giữ chỗ 24 giờ (HanGiuCho); quá hạn tự chuyển HetHan và hoàn chỗ.
"""
from datetime import timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import KhachHang, LichKhoiHanh
from app.models.common import now_naive_utc
from app.repositories.booking_repo import BookingRepository
from app.repositories.payment_repo import PaymentRepository
from app.repositories.tour_repo import TourRepository
from app.schemas.booking import (
    ChiTietHanhKhachSchema,
    DatChoCreateRequest,
    DatChoDetailResponse,
    DatChoManualRequest,
    DatChoResponse,
    NguoiDatManualSchema,
)

# Số giờ giữ chỗ theo DR-02
GIO_GIU_CHO = 24


def _gia_hien_tai(tour) -> Decimal:
    """Giá hiện hành của tour: ưu tiên GiaKhuyenMai, nếu không có dùng GiaCoBan."""
    if tour.GiaKhuyenMai is not None:
        return Decimal(tour.GiaKhuyenMai)
    return Decimal(tour.GiaCoBan)


def _lam_tron_tien(gia_tri) -> Decimal:
    """Làm tròn tiền về 2 chữ số thập phân (khớp cột Numeric(12,2))."""
    return Decimal(gia_tri).quantize(Decimal("0.01"))


def _tim_hoac_tao_khach_hang(db: Session, nguoi_dat: NguoiDatManualSchema) -> KhachHang:
    """Tìm khách theo SĐT; nếu chưa có thì tạo mới (khách ngoài từ bàn đặt tour)."""
    khach = (
        db.query(KhachHang)
        .filter(KhachHang.SoDienThoai == nguoi_dat.SoDienThoai)
        .first()
    )
    if khach is not None:
        return khach
    khach = KhachHang(
        HoTen=nguoi_dat.HoTen,
        SoDienThoai=nguoi_dat.SoDienThoai,
        Email=nguoi_dat.Email,
        LoaiKhach="Thuong",
        GhiChu="Tạo từ bàn đặt tour thủ công",
    )
    db.add(khach)
    db.flush()  # lấy MaKhachHang
    return khach


class BookingService:
    """Service Đặt chỗ - chứa toàn bộ logic nghiệp vụ."""

    @staticmethod
    def create_booking(
        db: Session, request: DatChoCreateRequest, nguoi_tao_id: int
    ) -> DatChoDetailResponse:
        """Tạo đơn đặt chỗ mới.

        - Lấy số khách từ danh sách hành khách (request.SoKhach).
        - DR-01: nếu SoChoCon < SoKhach -> từ chối 400.
        - DR-02: đơn ở trạng thái GiuCho, HanGiuCho = hiện tại + 24 giờ.
        - TongTien = SoKhach x GiaHienTai (giá khuyến mãi nếu có).
        - Trừ SoChoCon và lưu từng hành khách vào ChiTietDatCho.
        """
        lich = TourRepository.get_lich_khoi_hanh_by_id(db, request.MaLich)
        if lich is None:
            raise HTTPException(404, "Không tìm thấy lịch khởi hành")
        if lich.TrangThai != "MoBan":
            raise HTTPException(400, "Lịch khởi hành không mở bán")

        khach_hang = (
            db.query(KhachHang)
            .filter(KhachHang.MaKhachHang == request.MaKhachHang)
            .first()
        )
        if khach_hang is None:
            raise HTTPException(404, "Không tìm thấy khách hàng")

        so_khach = request.SoKhach

        # ---- DR-01: kiểm tra số chỗ trống ----
        if lich.SoChoCon < so_khach:
            raise HTTPException(400, "Không đủ chỗ trống")

        # Cảnh báo khi đoàn dưới ngưỡng tối thiểu để khởi hành
        canh_bao = None
        if so_khach < lich.MinSeats:
            canh_bao = (
                f"Đoàn chỉ có {so_khach} khách, thấp hơn tối thiểu "
                f"{lich.MinSeats} khách (MinSeats) để đủ điều kiện khởi hành."
            )

        tour = TourRepository.get_tour_by_id(db, lich.MaTour)
        if tour is None:
            raise HTTPException(404, "Không tìm thấy tour của lịch khởi hành")

        tong_tien = _lam_tron_tien(_gia_hien_tai(tour) * so_khach)

        # ---- DR-02: giữ chỗ 24 giờ ----
        dat = BookingRepository.create_dat_cho(
            db,
            MaKhachHang=request.MaKhachHang,
            MaLich=request.MaLich,
            NguoiTaoID=nguoi_tao_id,
            SoKhach=so_khach,
            TongTien=tong_tien,
            DaDatCoc=Decimal("0"),
            HanGiuCho=now_naive_utc() + timedelta(hours=GIO_GIU_CHO),
            TrangThai="GiuCho",
        )

        # Trừ chỗ trống của lịch
        lich.SoChoCon -= so_khach

        # Lưu danh sách hành khách
        for hk in request.ds_hanh_khach:
            BookingRepository.add_chi_tiet(db, dat.MaDatCho, hk)

        db.commit()
        db.refresh(dat)

        chi_tiets = BookingRepository.list_chi_tiet(db, dat.MaDatCho)
        base = DatChoResponse.model_validate(dat).model_dump()
        base["canh_bao"] = canh_bao
        base["ds_hanh_khach"] = [
            ChiTietHanhKhachSchema.model_validate(ct) for ct in chi_tiets
        ]
        return DatChoDetailResponse(**base)

    @staticmethod
    def create_manual_booking(
        db: Session, request: DatChoManualRequest, nguoi_tao_id: int
    ) -> DatChoDetailResponse:
        """Tạo đơn đặt chỗ thủ công từ bàn đặt tour (Tư vấn viên/Admin).

        Khác `create_booking` ở chỗ: khách do tư vấn viên nhập (tìm hoặc tạo theo
        SĐT), có thể chọn trạng thái thanh toán ngay và tự ghi giao dịch ThanhToan.
        Giá tự tính theo tour nếu không truyền TongTien. Giữ nguyên DR-01/02/03.
        """
        lich = TourRepository.get_lich_khoi_hanh_by_id(db, request.MaLich)
        if lich is None:
            raise HTTPException(404, "Không tìm thấy lịch khởi hành")
        if lich.TrangThai != "MoBan":
            raise HTTPException(400, "Lịch khởi hành không mở bán")

        khach_hang = _tim_hoac_tao_khach_hang(db, request.nguoi_dat)

        so_khach = request.SoKhach

        # ---- DR-01: kiểm tra số chỗ trống ----
        if lich.SoChoCon < so_khach:
            raise HTTPException(400, "Không đủ chỗ trống")

        canh_bao = None
        if so_khach < lich.MinSeats:
            canh_bao = (
                f"Đoàn chỉ có {so_khach} khách, thấp hơn tối thiểu "
                f"{lich.MinSeats} khách (MinSeats) để đủ điều kiện khởi hành."
            )

        tour = TourRepository.get_tour_by_id(db, lich.MaTour)
        if tour is None:
            raise HTTPException(404, "Không tìm thấy tour của lịch khởi hành")

        if request.TongTien is not None:
            tong_tien = _lam_tron_tien(request.TongTien)
        else:
            tong_tien = _lam_tron_tien(_gia_hien_tai(tour) * so_khach)

        # ---- Xác định trạng thái + giao dịch theo TrangThaiThanhToan ----
        trang_thai = "GiuCho"
        da_dat_coc = Decimal("0")
        giao_dich = None  # (LoaiGiaoDich, SoTien, GhiChu) hoặc None

        if request.TrangThaiThanhToan == "DaCoc":
            toi_thieu = _lam_tron_tien(tong_tien * Decimal("0.3"))
            if request.SoTienCoc is not None:
                so_tien_coc = _lam_tron_tien(request.SoTienCoc)
            else:
                so_tien_coc = toi_thieu
            # ---- DR-03: cọc tối thiểu 30% ----
            if so_tien_coc < toi_thieu:
                raise HTTPException(
                    400,
                    f"Tiền cọc tối thiểu phải đạt 30% tổng giá trị đơn (tối thiểu "
                    f"{toi_thieu:,}đ, nhận được {so_tien_coc:,}đ)",
                )
            trang_thai = "DaCoc"
            da_dat_coc = so_tien_coc
            giao_dich = ("Coc", so_tien_coc, "Đặt cọc tour (thủ công)")
        elif request.TrangThaiThanhToan == "DaThanhToan":
            trang_thai = "DaThanhToan"
            da_dat_coc = tong_tien
            giao_dich = ("ThanhToan", tong_tien, "Thanh toán đủ (thủ công)")
        elif request.TrangThaiThanhToan != "ChuaCoc":
            raise HTTPException(400, "Trạng thái thanh toán không hợp lệ")

        dat = BookingRepository.create_dat_cho(
            db,
            MaKhachHang=khach_hang.MaKhachHang,
            MaLich=request.MaLich,
            NguoiTaoID=nguoi_tao_id,
            SoKhach=so_khach,
            TongTien=tong_tien,
            DaDatCoc=da_dat_coc,
            HanGiuCho=now_naive_utc() + timedelta(hours=GIO_GIU_CHO),
            TrangThai=trang_thai,
        )

        lich.SoChoCon -= so_khach

        for hk in request.ds_hanh_khach:
            BookingRepository.add_chi_tiet(db, dat.MaDatCho, hk)

        if giao_dich is not None:
            loai, so_tien, ghi_chu = giao_dich
            PaymentRepository.create_thanh_toan(
                db,
                MaDatCho=dat.MaDatCho,
                LoaiGiaoDich=loai,
                SoTien=so_tien,
                PhuongThuc=request.PhuongThuc,
                NguoiXuLyID=nguoi_tao_id,
                GhiChu=ghi_chu,
            )

        db.commit()
        db.refresh(dat)

        chi_tiets = BookingRepository.list_chi_tiet(db, dat.MaDatCho)
        base = DatChoResponse.model_validate(dat).model_dump()
        base["canh_bao"] = canh_bao
        base["ds_hanh_khach"] = [
            ChiTietHanhKhachSchema.model_validate(ct) for ct in chi_tiets
        ]
        return DatChoDetailResponse(**base)

    @staticmethod
    def check_expired_bookings(db: Session) -> list:
        """Quét và xử lý các đơn giữ chỗ đã hết hạn (DR-02).

        Đơn GiuCho có HanGiuCho < hiện tại sẽ được:
          - đổi TrangThai sang 'HetHan'
          - hoàn trả SoChoCon += SoKhach cho lịch khởi hành.
        Trả về danh sách đơn đã bị xử lý.
        """
        now = now_naive_utc()
        ds_het_han = BookingRepository.get_expired_bookings(db, now)
        for dat in ds_het_han:
            lich = (
                db.query(LichKhoiHanh)
                .filter(LichKhoiHanh.MaLich == dat.MaLich)
                .first()
            )
            if lich is not None:
                lich.SoChoCon += dat.SoKhach
            dat.TrangThai = "HetHan"
        db.commit()
        return ds_het_han
