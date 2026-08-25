# -*- coding: utf-8 -*-
"""
verify_step2.py - Kiểm thử xác minh logic nghiệp vụ BƯỚC 2 (DR-01..DR-05).

Chạy trên Supabase PostgreSQL thật, tự tạo dữ liệu test (có tiền tố "TEST Verify")
và DỌN SẠCH dữ liệu test sau khi chạy (dữ liệu seed không bị thay đổi).

Cách chạy (từ thư mục tour-backend):
    .\\.venv\\Scripts\\python.exe verify_step2.py

Các kịch bản:
  TC-01: Đặt đơn tour Hạ Long 2 khách -> trừ chỗ, giữ chỗ 24h (DR-01, DR-02).
  TC-02: Cọc dưới 30% -> bị từ chối (DR-03).
  TC-03: Cọc >= 30% -> DaCoc + ghi giao dịch 'Coc' (DR-03).
  TC-04: Hủy tour ở 3 mốc (>=7, 3-6, <3 ngày) -> hoàn tiền/phạt đúng (DR-04).
  TC-05: Hết hạn giữ chỗ 24h -> HetHan + hoàn chỗ (DR-02).
  TC-06: Phân công 1 HDV cho 2 lịch trùng thời gian -> bị chặn (DR-05).
  TC-07: get_available_guides loại HDV đã bận lịch (DR-05).
"""
import sys
from datetime import date, timedelta
from decimal import Decimal

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from fastapi import HTTPException

from app.database import SessionLocal
from app.models import (
    ChiTietDatCho,
    DatCho,
    DiemDen,
    HuyTour,
    HuongDanVien,
    KhachHang,
    LichKhoiHanh,
    NguoiDung,
    PhanCongHDV,
    ThanhToan,
    Tour,
)
from app.models.common import now_naive_utc
from app.repositories.booking_repo import BookingRepository
from app.repositories.payment_repo import PaymentRepository
from app.repositories.tour_repo import TourRepository
from app.schemas.booking import ChiTietHanhKhachSchema, DatChoCreateRequest
from app.schemas.cancellation import HuyTourRequest
from app.schemas.guide import PhanCongHDVRequest
from app.schemas.payment import ThanhToanCocRequest
from app.services.booking_service import BookingService
from app.services.guide_service import GuideService
from app.services.payment_service import PaymentService

# ---- Bộ đếm kết quả ----
passed = 0
failed = 0


def check(ten: str, ok: bool, chi_tiet: str = "") -> None:
    """In một dòng kết quả kiểm thử và cập nhật bộ đếm."""
    global passed, failed
    mark = "PASS" if ok else "FAIL"
    if ok:
        passed += 1
    else:
        failed += 1
    print(f"    [{mark}] {ten}" + (f"  -> {chi_tiet}" if chi_tiet else ""))


def _dat_va_coc(
    db,
    lich,
    kh,
    admin,
    ketoan,
    so_khach: int = 1,
    so_tien_coc: Decimal = Decimal("300000"),
) -> int:
    """Tiện ích: tạo đơn giữ chỗ + đặt cọc hợp lệ -> trả về MaDatCho."""
    ds_hk = [
        ChiTietHanhKhachSchema(
            HoTen=f"HK Verify #{i}", SoDienThoai="0900000000"
        )
        for i in range(1, so_khach + 1)
    ]
    res = BookingService.create_booking(
        db,
        DatChoCreateRequest(
            MaLich=lich.MaLich,
            MaKhachHang=kh.MaKhachHang,
            ds_hanh_khach=ds_hk,
        ),
        admin.MaNguoiDung,
    )
    PaymentService.confirm_deposit(
        db,
        res.MaDatCho,
        ThanhToanCocRequest(SoTien=so_tien_coc, PhuongThuc="ChuyenKhoan"),
        ketoan.MaNguoiDung,
    )
    return res.MaDatCho


def main() -> int:
    global passed, failed

    print("=" * 78)
    print("VERIFY BƯỚC 2 - KIỂM THỬ LOGIC NGHIỆP VỤ (DR-01..DR-05)")
    print("=" * 78)

    db = SessionLocal()

    # ---- Các biến để dọn dẹp (track id dữ liệu test) ----
    dat_cho_test_ids: list[int] = []
    lich_test_ids: list[int] = []
    tour_test = None
    diem_test = None
    kh_test = None
    lich_halong = None
    so_cho_halong_ban_dau = 0

    try:
        # =========================================================
        # 0) Kiểm tra dữ liệu seed đã tồn tại
        # =========================================================
        admin = (
            db.query(NguoiDung)
            .filter(NguoiDung.Email == "admin@tour.vn")
            .first()
        )
        ketoan = (
            db.query(NguoiDung)
            .filter(NguoiDung.Email == "ketoan@tour.vn")
            .first()
        )
        if admin is None or ketoan is None:
            print(
                "\n    LỖI: Chưa có dữ liệu seed. Hãy chạy 'python seed.py' trước."
            )
            return 1

        tour_halong = (
            db.query(Tour)
            .filter(Tour.TenTour == "Ha Long - Lan Ha 3N2D")
            .first()
        )
        if tour_halong is None:
            print("\n    LỖI: Không tìm thấy tour seed 'Ha Long - Lan Ha 3N2D'.")
            return 1
        lich_halong = (
            db.query(LichKhoiHanh)
            .filter(
                LichKhoiHanh.MaTour == tour_halong.MaTour,
                LichKhoiHanh.NgayKhoiHanh == date(2026, 9, 15),
            )
            .first()
        )
        if lich_halong is None:
            lich_halong = (
                db.query(LichKhoiHanh)
                .filter(LichKhoiHanh.MaTour == tour_halong.MaTour)
                .first()
            )
        so_cho_halong_ban_dau = lich_halong.SoChoCon
        print(
            f"\n[0] Sẵn sàng: lịch Ha Long ngày {lich_halong.NgayKhoiHanh}, "
            f"SoChoCon={so_cho_halong_ban_dau}, admin id={admin.MaNguoiDung}, "
            f"kế toán id={ketoan.MaNguoiDung}"
        )

        # =========================================================
        # 1) Tạo dữ liệu test riêng (sẽ dọn sau)
        # =========================================================
        print("\n[1] Tạo dữ liệu test (TEST Verify) ...")
        diem_test = DiemDen(
            TenDiemDen="TEST Verify Diem Den",
            KhuVuc="Mien Test",
            MoTa="Du lieu kiem thu, se duoc xoa",
        )
        db.add(diem_test)
        db.flush()

        tour_test = Tour(
            MaDiemDen=diem_test.MaDiemDen,
            TenTour="TEST Verify Tour",
            MoTa="Tour phục vụ kiểm thử verify_step2",
            LichTrinhTomTat="Test",
            SoNgay=3,
            GiaCoBan=Decimal("1000000"),
            GiaKhuyenMai=None,
            TrangThai="DangBan",
        )
        db.add(tour_test)
        db.flush()

        kh_test = KhachHang(
            HoTen="TEST Verify Khach Hang",
            SoDienThoai="0909999999",
            Email="verify.test@tour.vn",
            LoaiKhach="Thuong",
            GhiChu="Du lieu kiem thu, se duoc xoa",
        )
        db.add(kh_test)
        db.flush()

        # 5 lịch test với ngày tương đối so với hôm nay
        hom_nay = date.today()
        lich_cfg = [
            ("lich_a", hom_nay + timedelta(days=10), hom_nay + timedelta(days=12)),
            ("lich_b", hom_nay + timedelta(days=4), hom_nay + timedelta(days=6)),
            ("lich_c", hom_nay + timedelta(days=1), hom_nay + timedelta(days=3)),
            ("lich_d", hom_nay + timedelta(days=11), hom_nay + timedelta(days=13)),
            ("lich_e", hom_nay + timedelta(days=20), hom_nay + timedelta(days=22)),
        ]
        lichs = {}
        for ten, ngay_di, ngay_ve in lich_cfg:
            lichs[ten] = LichKhoiHanh(
                MaTour=tour_test.MaTour,
                NgayKhoiHanh=ngay_di,
                NgayKetThuc=ngay_ve,
                MinSeats=1,
                MaxSeats=30,
                SoChoCon=30,
                TrangThai="MoBan",
            )
            db.add(lichs[ten])
            db.flush()
            lich_test_ids.append(lichs[ten].MaLich)
        lich_a, lich_b = lichs["lich_a"], lichs["lich_b"]
        lich_c, lich_d, lich_e = lichs["lich_c"], lichs["lich_d"], lichs["lich_e"]
        db.commit()

        # =========================================================
        # TC-01: Đặt đơn tour Hạ Long 2 khách (DR-01, DR-02)
        # =========================================================
        print("\n[TC-01] Đặt 1 đơn tour Hạ Long với 2 khách (DR-01, DR-02)")
        ds_hk = [
            ChiTietHanhKhachSchema(HoTen="Nguyen Van A", SoDienThoai="0911111111"),
            ChiTietHanhKhachSchema(HoTen="Tran Thi B", SoDienThoai="0922222222"),
        ]
        res1 = BookingService.create_booking(
            db,
            DatChoCreateRequest(
                MaLich=lich_halong.MaLich,
                MaKhachHang=kh_test.MaKhachHang,
                ds_hanh_khach=ds_hk,
            ),
            admin.MaNguoiDung,
        )
        dat_cho_test_ids.append(res1.MaDatCho)
        check(
            "TC-01a: SoKhach = 2 (suy ra từ danh sách hành khách)",
            res1.SoKhach == 2,
            f"SoKhach={res1.SoKhach}",
        )
        check(
            "TC-01b: TrangThai = GiuCho (giữ chỗ 24h - DR-02)",
            res1.TrangThai == "GiuCho",
            f"TrangThai={res1.TrangThai}",
        )
        check(
            "TC-01c: HanGiuCho trong tương lai (now + 24h)",
            res1.HanGiuCho > now_naive_utc(),
            f"HanGiuCho={res1.HanGiuCho}",
        )
        check(
            "TC-01d: TongTien = 2 x GiaKhuyenMai 2.890.000 = 5.780.000",
            res1.TongTien == Decimal("5780000"),
            f"TongTien={res1.TongTien}",
        )
        check(
            "TC-01e: SoChoCon lịch giảm 2 (DR-01)",
            lich_halong.SoChoCon == so_cho_halong_ban_dau - 2,
            f"SoChoCon={lich_halong.SoChoCon}",
        )
        check(
            "TC-01f: Lưu đủ 2 hành khách vào ChiTietDatCho",
            len(res1.ds_hanh_khach) == 2,
            f"số hành khách={len(res1.ds_hanh_khach)}",
        )

        # =========================================================
        # TC-02: Cọc dưới 30% -> từ chối (DR-03)
        # =========================================================
        print("\n[TC-02] Cọc 100.000đ (< 30% của 5.780.000đ) bị từ chối (DR-03)")
        try:
            PaymentService.confirm_deposit(
                db,
                res1.MaDatCho,
                ThanhToanCocRequest(SoTien=Decimal("100000"), PhuongThuc="ChuyenKhoan"),
                ketoan.MaNguoiDung,
            )
            check("TC-02: cọc dưới 30% bị từ chối", False, "Không ném lỗi -> SAI")
        except HTTPException as exc:
            ok = exc.status_code == 400 and "30%" in str(exc.detail)
            check(
                "TC-02: cọc dưới 30% bị từ chối",
                ok,
                f"status={exc.status_code}, detail={exc.detail}",
            )

        # =========================================================
        # TC-03: Cọc 1.800.000đ (>= 30%) -> DaCoc (DR-03)
        # =========================================================
        print("\n[TC-03] Cọc 1.800.000đ (>= 30%) -> đơn chuyển DaCoc (DR-03)")
        dat1 = PaymentService.confirm_deposit(
            db,
            res1.MaDatCho,
            ThanhToanCocRequest(SoTien=Decimal("1800000"), PhuongThuc="ChuyenKhoan"),
            ketoan.MaNguoiDung,
        )
        check(
            "TC-03a: TrangThai -> DaCoc",
            dat1.TrangThai == "DaCoc",
            f"TrangThai={dat1.TrangThai}",
        )
        check(
            "TC-03b: DaDatCoc = 1.800.000",
            dat1.DaDatCoc == Decimal("1800000"),
            f"DaDatCoc={dat1.DaDatCoc}",
        )
        tts1 = PaymentRepository.list_thanh_toan_by_dat_cho(db, res1.MaDatCho)
        check(
            "TC-03c: Ghi nhận giao dịch loại 'Coc'",
            any(t.LoaiGiaoDich == "Coc" for t in tts1),
            f"số giao dịch={len(tts1)}",
        )

        # =========================================================
        # TC-04: Hủy tour ở 3 mốc thời gian (DR-04)
        # =========================================================
        print("\n[TC-04] Hủy tour ở 3 mốc thời gian (DR-04)")

        # Mốc 1: >= 7 ngày -> hoàn 100% cọc
        ma_a = _dat_va_coc(db, lich_a, kh_test, admin, ketoan)
        dat_cho_test_ids.append(ma_a)
        huy_a = PaymentService.process_cancellation(
            db, ma_a, HuyTourRequest(LyDo="Kiem thu moc >= 7 ngay", NguoiXuLyID=ketoan.MaNguoiDung)
        )
        check(
            "TC-04a: hủy >= 7 ngày -> MucPhat 0.0, hoàn 100% cọc",
            huy_a.MucPhat == Decimal("0") and huy_a.SoTienHoan == Decimal("300000"),
            f"MucPhat={huy_a.MucPhat}, SoTienHoan={huy_a.SoTienHoan}",
        )

        # Mốc 2: 3-6 ngày -> phạt 50% cọc
        ma_b = _dat_va_coc(db, lich_b, kh_test, admin, ketoan)
        dat_cho_test_ids.append(ma_b)
        huy_b = PaymentService.process_cancellation(
            db, ma_b, HuyTourRequest(LyDo="Kiem thu moc 3-6 ngay", NguoiXuLyID=ketoan.MaNguoiDung)
        )
        check(
            "TC-04b: hủy 3-6 ngày -> MucPhat 0.5, hoàn 50% cọc",
            huy_b.MucPhat == Decimal("0.5")
            and huy_b.SoTienHoan == Decimal("150000"),
            f"MucPhat={huy_b.MucPhat}, SoTienHoan={huy_b.SoTienHoan}",
        )

        # Mốc 3: < 3 ngày -> phạt 100% cọc
        ma_c = _dat_va_coc(db, lich_c, kh_test, admin, ketoan)
        dat_cho_test_ids.append(ma_c)
        huy_c = PaymentService.process_cancellation(
            db, ma_c, HuyTourRequest(LyDo="Kiem thu moc < 3 ngay", NguoiXuLyID=ketoan.MaNguoiDung)
        )
        check(
            "TC-04c: hủy < 3 ngày -> MucPhat 1.0, hoàn 0đ",
            huy_c.MucPhat == Decimal("1.0") and huy_c.SoTienHoan == Decimal("0"),
            f"MucPhat={huy_c.MucPhat}, SoTienHoan={huy_c.SoTienHoan}",
        )

        # Kiểm tra đơn sau hủy ở trạng thái DaHuy + trả lại chỗ
        dat_a = BookingRepository.get_dat_cho_by_id(db, ma_a)
        lich_a_sau = TourRepository.get_lich_khoi_hanh_by_id(db, lich_a.MaLich)
        check(
            "TC-04d: đơn hủy chuyển TrangThai = DaHuy",
            dat_a.TrangThai == "DaHuy",
            f"TrangThai={dat_a.TrangThai}",
        )
        check(
            "TC-04e: hoàn trả SoChoCon cho lịch sau hủy",
            lich_a_sau.SoChoCon == 30,
            f"SoChoCon={lich_a_sau.SoChoCon}",
        )

        # =========================================================
        # TC-05: Hết hạn giữ chỗ 24h -> HetHan + hoàn chỗ (DR-02)
        # =========================================================
        print("\n[TC-05] Đơn giữ chỗ hết hạn 24h -> HetHan + hoàn chỗ (DR-02)")
        res_e = BookingService.create_booking(
            db,
            DatChoCreateRequest(
                MaLich=lich_e.MaLich,
                MaKhachHang=kh_test.MaKhachHang,
                ds_hanh_khach=[ChiTietHanhKhachSchema(HoTen="HK TC05")],
            ),
            admin.MaNguoiDung,
        )
        dat_cho_test_ids.append(res_e.MaDatCho)
        dat_e = BookingRepository.get_dat_cho_by_id(db, res_e.MaDatCho)
        check(
            "TC-05a: đơn vừa tạo ở GiuCho, SoChoCon lịch giảm 1",
            dat_e.TrangThai == "GiuCho" and lich_e.SoChoCon == 29,
            f"TrangThai={dat_e.TrangThai}, SoChoCon={lich_e.SoChoCon}",
        )

        # Giả lập: đơn đã tồn tại quá 24h -> đẩy HanGiuCho về quá khứ
        dat_e.HanGiuCho = now_naive_utc() - timedelta(hours=1)
        db.commit()

        ds_xu_ly = BookingService.check_expired_bookings(db)
        dat_e2 = BookingRepository.get_dat_cho_by_id(db, res_e.MaDatCho)
        lich_e_sau = TourRepository.get_lich_khoi_hanh_by_id(db, lich_e.MaLich)
        check(
            "TC-05b: đơn được quét và chuyển HetHan",
            dat_e2.TrangThai == "HetHan",
            f"TrangThai={dat_e2.TrangThai}",
        )
        check(
            "TC-05c: SoChoCon được hoàn trả về 30",
            lich_e_sau.SoChoCon == 30,
            f"SoChoCon={lich_e_sau.SoChoCon}",
        )
        check(
            "TC-05d: đơn nằm trong danh sách đã xử lý",
            any(d.MaDatCho == res_e.MaDatCho for d in ds_xu_ly),
            f"số đơn xử lý={len(ds_xu_ly)}",
        )

        # =========================================================
        # TC-06: Phân công HDV trùng lịch bị chặn (DR-05)
        # =========================================================
        print("\n[TC-06] Phân công HDV - chặn trùng khoảng thời gian (DR-05)")
        hdv_tuan = (
            db.query(HuongDanVien)
            .filter(HuongDanVien.SoDienThoai == "0912345678")
            .first()
        )
        if hdv_tuan is None:
            print("    LỖI: Không tìm thấy HDV seed 'Hoang Minh Tuan'.")
            return 1

        pc1 = GuideService.assign_guide(
            db,
            PhanCongHDVRequest(
                MaLich=lich_a.MaLich, MaHDV=hdv_tuan.MaHDV, VaiTro="TruongDoan"
            ),
        )
        check(
            "TC-06a: phân công lịch A (10-12/ngày) thành công",
            pc1.MaPhanCong > 0,
            f"MaPhanCong={pc1.MaPhanCong}",
        )

        try:
            GuideService.assign_guide(
                db,
                PhanCongHDVRequest(
                    MaLich=lich_d.MaLich, MaHDV=hdv_tuan.MaHDV, VaiTro="TruongDoan"
                ),
            )
            check(
                "TC-06b: lịch D (11-13) trùng lịch A -> bị chặn",
                False,
                "Không ném lỗi -> SAI",
            )
        except HTTPException as exc:
            ok = exc.status_code == 400
            check(
                "TC-06b: lịch D (11-13) trùng lịch A -> bị chặn",
                ok,
                f"status={exc.status_code}, detail={exc.detail}",
            )

        pc3 = GuideService.assign_guide(
            db,
            PhanCongHDVRequest(
                MaLich=lich_e.MaLich, MaHDV=hdv_tuan.MaHDV, VaiTro="PhuDoan"
            ),
        )
        check(
            "TC-06c: phân công lịch E (20-22) không trùng -> thành công",
            pc3.MaPhanCong > 0,
            f"MaPhanCong={pc3.MaPhanCong}",
        )

        # =========================================================
        # TC-07: get_available_guides loại HDV bận lịch (DR-05)
        # =========================================================
        print("\n[TC-07] get_available_guides - loại HDV đã bận lịch (DR-05)")
        ds_lich_d = GuideService.get_available_guides(db, lich_d.MaLich)
        ds_lich_b = GuideService.get_available_guides(db, lich_b.MaLich)
        check(
            "TC-07a: HDV bận lịch A không xuất hiện trong HDV rảnh của lịch D",
            all(g.MaHDV != hdv_tuan.MaHDV for g in ds_lich_d),
            f"số HDV rảnh cho lịch D={len(ds_lich_d)}",
        )
        check(
            "TC-07b: HDV rảnh cho lịch B (không trùng) vẫn xuất hiện",
            any(g.MaHDV == hdv_tuan.MaHDV for g in ds_lich_b),
            f"số HDV rảnh cho lịch B={len(ds_lich_b)}",
        )

    finally:
        # =========================================================
        # DỌN DẸP: xóa toàn bộ dữ liệu test + khôi phục SoChoCon seed
        # =========================================================
        try:
            print("\n[Cleanup] Dọn dẹp dữ liệu test ...")
            if dat_cho_test_ids:
                db.query(HuyTour).filter(
                    HuyTour.MaDatCho.in_(dat_cho_test_ids)
                ).delete(synchronize_session=False)
                db.query(ThanhToan).filter(
                    ThanhToan.MaDatCho.in_(dat_cho_test_ids)
                ).delete(synchronize_session=False)
                db.query(ChiTietDatCho).filter(
                    ChiTietDatCho.MaDatCho.in_(dat_cho_test_ids)
                ).delete(synchronize_session=False)
                db.query(DatCho).filter(
                    DatCho.MaDatCho.in_(dat_cho_test_ids)
                ).delete(synchronize_session=False)
            if lich_test_ids:
                db.query(PhanCongHDV).filter(
                    PhanCongHDV.MaLich.in_(lich_test_ids)
                ).delete(synchronize_session=False)
                db.query(LichKhoiHanh).filter(
                    LichKhoiHanh.MaLich.in_(lich_test_ids)
                ).delete(synchronize_session=False)
            if tour_test is not None:
                db.query(Tour).filter(Tour.MaTour == tour_test.MaTour).delete(
                    synchronize_session=False
                )
            if diem_test is not None:
                db.query(DiemDen).filter(
                    DiemDen.MaDiemDen == diem_test.MaDiemDen
                ).delete(synchronize_session=False)
            if kh_test is not None:
                db.query(KhachHang).filter(
                    KhachHang.MaKhachHang == kh_test.MaKhachHang
                ).delete(synchronize_session=False)
            # Khôi phục SoChoCon lịch seed Ha Long
            if lich_halong is not None:
                lh = (
                    db.query(LichKhoiHanh)
                    .filter(LichKhoiHanh.MaLich == lich_halong.MaLich)
                    .first()
                )
                if lh is not None:
                    lh.SoChoCon = so_cho_halong_ban_dau
            db.commit()
            print("    -> Đã dọn dẹp xong dữ liệu test, dữ liệu seed được khôi phục.")
        except Exception as exc:
            db.rollback()
            print(f"    CẢNH BÁO cleanup: {exc}")
        finally:
            db.close()

    # =========================================================
    # TỔNG KẾT
    # =========================================================
    print("\n" + "=" * 78)
    print(f"KẾT QUẢ: {passed} PASS / {failed} FAIL / tổng {passed + failed} mục kiểm tra")
    if failed == 0:
        print("=> TOÀN BỘ LOGIC NGHIỆP VỤ DR-01..DR-05 HOẠT ĐỘNG ĐÚNG.")
    else:
        print("=> CÓ MỘT SỐ KIỂM TRA THẤT BẠI, cần xem lại phần FAIL.")
    print("=" * 78)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
