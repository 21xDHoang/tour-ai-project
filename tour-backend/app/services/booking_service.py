# -*- coding: utf-8 -*-
"""
app/services/booking_service.py - Nghiệp vụ Đặt chỗ.

Hiện thực các quy tắc miền:
  DR-01: SoChoCon phải đủ cho SoKhach; cảnh báo khi đoàn dưới MinSeats.
  DR-02: Đơn giữ chỗ 24 giờ (HanGiuCho); quá hạn tự chuyển HetHan và hoàn chỗ.
  Dynamic On-Demand: Tự động mở đợt LichKhoiHanh mới khi khách tự chọn ngày (Ghép đoàn hoặc Tour riêng).
"""
from datetime import date, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import KhachHang, LichKhoiHanh, Tour
from app.models.common import now_naive_utc
from app.repositories.booking_repo import BookingRepository
from app.repositories.payment_repo import PaymentRepository
from app.repositories.tour_repo import TourRepository
from app.services.payment_service import TI_LE_COC_TOI_THIEU
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


def trang_thai_hien_thi(dat, lich) -> str:
    """Trạng thái HIỂN THỊ của đơn (read-time, không ghi DB).

    P4: đơn DaThanhToan được nâng cấp theo tiến trình tour:
      - chưa khởi hành      -> DaThanhToan
      - đang trong ngày tour-> DangDiTour  (hom_nay >= NgayKhoiHanh)
      - đã kết thúc         -> HoanThanh   (hom_nay > NgayKetThuc)
    Các trạng thái khác trả về nguyên bản. Trạng thái này KHÔNG BAO GIỜ
    được ghi xuống DB để stats kế toán giữ đúng raw "DaThanhToan".
    """
    if dat.TrangThai == "DaThanhToan" and lich is not None:
        hom_nay = date.today()
        if hom_nay > lich.NgayKetThuc:
            return "HoanThanh"
        if hom_nay >= lich.NgayKhoiHanh:
            return "DangDiTour"
        return "DaThanhToan"
    return dat.TrangThai


def _lam_tron_tien(gia_tri) -> Decimal:
    """Làm tròn tiền về 2 chữ số thập phân (khớp cột Numeric(12,2))."""
    return Decimal(gia_tri).quantize(Decimal("0.01"))


def _coc_toi_thieu(tong_tien) -> Decimal:
    """Tiền cọc tối thiểu 30% của một đơn (DR-03).

    Dùng chung tỷ lệ với lúc kế toán xác nhận cọc và với webhook đối soát —
    ba nơi phải ra cùng một con số, nếu không khách chuyển đúng 30% mà hệ
    thống lại bảo thiếu.
    """
    return (Decimal(tong_tien) * TI_LE_COC_TOI_THIEU).quantize(Decimal("0.01"))


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


def _resolve_or_create_lich(
    db: Session,
    ma_lich: int | None,
    ma_tour: int | None,
    ngay_khoi_hanh: date | None,
    loai_chuyen_di: str,
    so_khach: int,
) -> LichKhoiHanh:
    """Xác định lịch có sẵn hoặc tự động tạo đợt LichKhoiHanh mới theo nhu cầu."""
    if ma_lich:
        lich = TourRepository.get_lich_khoi_hanh_by_id(db, ma_lich)
        if lich is None:
            raise HTTPException(404, "Không tìm thấy lịch khởi hành")
        if lich.TrangThai != "MoBan":
            raise HTTPException(400, "Lịch khởi hành không mở bán")
        return lich

    if not ma_tour or not ngay_khoi_hanh:
        raise HTTPException(
            422, "Vui lòng chọn lịch khởi hành có sẵn hoặc ngày khởi hành mong muốn"
        )

    tour = TourRepository.get_tour_by_id(db, ma_tour)
    if tour is None or tour.TrangThai == "DaXoa":
        raise HTTPException(404, "Không tìm thấy chương trình tour")

    # Nếu là tour ghép -> tìm xem đã có lịch ghép nào cùng ngày còn đủ chỗ không
    if loai_chuyen_di == "Ghep":
        lich_co_san = (
            db.query(LichKhoiHanh)
            .filter(
                LichKhoiHanh.MaTour == ma_tour,
                LichKhoiHanh.NgayKhoiHanh == ngay_khoi_hanh,
                LichKhoiHanh.TrangThai == "MoBan",
                LichKhoiHanh.SoChoCon >= so_khach,
                # Lịch cũ (GhiChu NULL) hoặc lịch GHÉP đều tái dùng được;
                # chỉ loại trừ lịch [TOUR RIÊNG]
                or_(
                    LichKhoiHanh.GhiChu.is_(None),
                    ~LichKhoiHanh.GhiChu.ilike("%TOUR RIÊNG%"),
                ),
            )
            .first()
        )
        if lich_co_san:
            return lich_co_san

    # Tự động tạo LichKhoiHanh mới on-demand
    so_ngay = tour.SoNgay or 1
    ngay_ket_thuc = ngay_khoi_hanh + timedelta(days=so_ngay - 1)

    if loai_chuyen_di == "Rieng":
        so_cho_toi_da = so_khach
        so_cho_con = so_khach
        ghi_chu = "[TOUR RIÊNG] Phục vụ riêng theo đoàn khách (Không ghép đoàn)"
        min_seats = 1
    else:
        so_cho_toi_da = max(20, so_khach)
        so_cho_con = so_cho_toi_da
        ghi_chu = "[TOUR GHÉP] Đợt khởi hành ghép đoàn mở theo yêu cầu của khách"
        min_seats = 5

    lich_moi = LichKhoiHanh(
        MaTour=ma_tour,
        NgayKhoiHanh=ngay_khoi_hanh,
        NgayKetThuc=ngay_ket_thuc,
        MaxSeats=so_cho_toi_da,
        SoChoCon=so_cho_con,
        MinSeats=min_seats,
        TrangThai="MoBan",
        GhiChu=ghi_chu,
    )
    db.add(lich_moi)
    db.flush()
    return lich_moi


class BookingService:
    """Service Đặt chỗ - chứa toàn bộ logic nghiệp vụ."""

    @staticmethod
    def create_booking(
        db: Session, request: DatChoCreateRequest, nguoi_tao_id: int
    ) -> DatChoDetailResponse:
        """Tạo đơn đặt chỗ mới (hỗ trợ cả lịch có sẵn và tự chọn ngày On-Demand).

        - Lấy số khách từ danh sách hành khách (request.SoKhach).
        - Tìm hoặc tự động tạo LichKhoiHanh (Ghép đoàn / Tour riêng).
        - DR-01: nếu SoChoCon < SoKhach -> từ chối 400.
        - DR-02: đơn ở trạng thái GiuCho, HanGiuCho = hiện tại + 24 giờ.
        - TongTien = SoKhach x GiaHienTai (giá khuyến mãi nếu có).
        - Trừ SoChoCon và lưu từng hành khách vào ChiTietDatCho.
        """
        so_khach = request.SoKhach
        lich = _resolve_or_create_lich(
            db=db,
            ma_lich=request.MaLich,
            ma_tour=request.MaTour,
            ngay_khoi_hanh=request.NgayKhoiHanh,
            loai_chuyen_di=request.LoaiChuyenDi,
            so_khach=so_khach,
        )

        khach_hang = (
            db.query(KhachHang)
            .filter(KhachHang.MaKhachHang == request.MaKhachHang)
            .first()
        )
        if khach_hang is None:
            raise HTTPException(404, "Không tìm thấy khách hàng")

        # ---- DR-01: kiểm tra số chỗ trống ----
        if lich.SoChoCon < so_khach:
            raise HTTPException(400, "Không đủ chỗ trống")

        # Cảnh báo khi đoàn ghép dưới ngưỡng tối thiểu để khởi hành
        canh_bao = None
        if request.LoaiChuyenDi == "Ghep" and so_khach < lich.MinSeats:
            canh_bao = (
                f"Đoàn chỉ có {so_khach} khách, thấp hơn tối thiểu "
                f"{lich.MinSeats} khách (MinSeats) để đủ điều kiện khởi hành. "
                "Hệ thống đang tiếp tục mở bán để ghép thêm du khách cho chuyến đi."
            )

        tour = TourRepository.get_tour_by_id(db, lich.MaTour)
        if tour is None:
            raise HTTPException(404, "Không tìm thấy tour của lịch khởi hành")

        tong_tien = _lam_tron_tien(_gia_hien_tai(tour) * so_khach)

        # ---- DR-02: giữ chỗ 24 giờ ----
        dat = BookingRepository.create_dat_cho(
            db,
            MaKhachHang=request.MaKhachHang,
            MaLich=lich.MaLich,
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
        base["LoaiChuyenDi"] = "Rieng" if "[TOUR RIÊNG]" in (lich.GhiChu or "") else "Ghep"
        base["ghi_chu_lich"] = lich.GhiChu
        base["ds_hanh_khach"] = [
            ChiTietHanhKhachSchema.model_validate(ct) for ct in chi_tiets
        ]
        base["coc_toi_thieu"] = _coc_toi_thieu(dat.TongTien)
        return DatChoDetailResponse(**base)

    @staticmethod
    def create_manual_booking(
        db: Session, request: DatChoManualRequest, nguoi_tao_id: int
    ) -> DatChoDetailResponse:
        """Tạo đơn đặt chỗ thủ công từ bàn đặt tour (Tư vấn viên/Admin).

        Khác `create_booking` ở chỗ: khách do tư vấn viên nhập (tìm hoặc tạo theo
        SĐT), có thể chọn trạng thái thanh toán ngay và tự ghi giao dịch ThanhToan.
        """
        so_khach = request.SoKhach
        lich = _resolve_or_create_lich(
            db=db,
            ma_lich=request.MaLich,
            ma_tour=request.MaTour,
            ngay_khoi_hanh=request.NgayKhoiHanh,
            loai_chuyen_di=request.LoaiChuyenDi,
            so_khach=so_khach,
        )

        khach_hang = _tim_hoac_tao_khach_hang(db, request.nguoi_dat)

        # ---- DR-01: kiểm tra số chỗ trống ----
        if lich.SoChoCon < so_khach:
            raise HTTPException(400, "Không đủ chỗ trống")

        canh_bao = None
        if request.LoaiChuyenDi == "Ghep" and so_khach < lich.MinSeats:
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
        giao_dich = None

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
            MaLich=lich.MaLich,
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
        base["LoaiChuyenDi"] = "Rieng" if "[TOUR RIÊNG]" in (lich.GhiChu or "") else "Ghep"
        base["ghi_chu_lich"] = lich.GhiChu
        base["ds_hanh_khach"] = [
            ChiTietHanhKhachSchema.model_validate(ct) for ct in chi_tiets
        ]
        base["coc_toi_thieu"] = _coc_toi_thieu(dat.TongTien)
        return DatChoDetailResponse(**base)

    @staticmethod
    def check_expired_bookings(db: Session) -> list:
        """Quét và xử lý các đơn giữ chỗ đã hết hạn (DR-02)."""
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
