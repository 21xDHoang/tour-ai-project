# -*- coding: utf-8 -*-
"""
demo_data.py - Nạp dữ liệu DEMO cho BƯỚC 5 + tái cấu trúc (chạy SAU seed.py).

Hai khối dữ liệu, mỗi khối idempotent độc lập:
  A) DEMO_B5 (có sẵn): 6 đơn + 8 giao dịch + 3 phản hồi -> Kế toán & Báo cáo.
  B) DEMO tái cấu trúc: 8 Lead + 4 yêu cầu tour riêng + 5 voucher
     + 1 phản hồi chờ duyệt -> Admin / Tư vấn viên / Web khách hàng.
     Đánh dấu idempotent bằng voucher mã "HE2026".

An toàn với 24 Test Case:
  - Không tạo đơn TrangThai=GiuCho (tránh ảnh hưởng scan-expired TC-04).
  - Không tạo lịch mới; chỉ giảm SoChoCon của lịch seed 1/2.
  - Test tự tạo + tự dọn dữ liệu riêng nên không đụng dữ liệu demo này.

Cách chạy (từ thư mục tour-backend):
    python demo_data.py
"""
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.database import SessionLocal
from app.models import (
    ChiTietDatCho,
    DatCho,
    DiemDen,
    HuyTour,
    LichKhoiHanh,
    MaGiamGia,
    NguoiDung,
    PhanHoi,
    ThanhToan,
    Tour,
    YeuCauTourRieng,
    YeuCauTuVan,
)

DEMO_TAG = "DEMO_B5"
MARKER_CODE = "HE2026"  # voucher đánh dấu đã nạp dữ liệu demo tái cấu trúc

# Giá hiện hành của 2 tour seed (GiaKhuyenMai)
GIA_TOUR_1 = Decimal("2890000.00")  # Ha Long - Lan Ha 3N2D
GIA_TOUR_2 = Decimal("1890000.00")  # Da Lat 2N1D

NGUOI_TAO = 1     # admin
NGUOI_XU_LY = 3   # ketoan


def _ts(y, m, d, h=9):
    """datetime naive UTC theo giờ giao dịch demo."""
    return datetime(y, m, d, h, 0, 0)


def tao_don(db, ma_khach, ma_lich, so_khach, gia_mot_nguoi, trang_thai,
            da_coc, ngay_dat, ds_hk):
    """Tạo 1 đơn đặt chỗ demo + chi tiết hành khách."""
    tong_tien = gia_mot_nguoi * so_khach
    dat = DatCho(
        MaKhachHang=ma_khach,
        MaLich=ma_lich,
        NguoiTaoID=NGUOI_TAO,
        SoKhach=so_khach,
        TongTien=tong_tien,
        DaDatCoc=da_coc,
        NgayDat=ngay_dat,
        HanGiuCho=ngay_dat + timedelta(hours=24),
        TrangThai=trang_thai,
    )
    db.add(dat)
    db.flush()  # lấy MaDatCho
    for hk in ds_hk:
        db.add(ChiTietDatCho(MaDatCho=dat.MaDatCho, **hk))
    return dat.MaDatCho


def tao_giao_dich(db, ma_dat, loai, so_tien, ngay, phuong_thuc, ghi_chu=""):
    """Tạo 1 giao dịch ThanhToan demo (đánh dấu DEMO_B5)."""
    db.add(
        ThanhToan(
            MaDatCho=ma_dat,
            LoaiGiaoDich=loai,  # Coc / ThanhToan / HoanTien
            SoTien=so_tien,
            NgayGiaoDich=ngay,
            PhuongThuc=phuong_thuc,
            NguoiXuLyID=NGUOI_XU_LY,
            GhiChu=f"{DEMO_TAG}{(' - ' + ghi_chu) if ghi_chu else ''}",
        )
    )


def tao_phan_hoi(db, ma_dat, ma_khach, so_sao, noi_dung, ngay):
    db.add(
        PhanHoi(
            MaDatCho=ma_dat,
            MaKhachHang=ma_khach,
            SoSao=so_sao,
            NoiDung=noi_dung,
            NgayTao=ngay,
        )
    )


def _nap_demo_b5(db) -> None:
    """6 đơn + 8 giao dịch + 3 phản hồi (idempotent theo ThanhToan DEMO_B5)."""
    co_demo = (
        db.query(ThanhToan).filter(ThanhToan.GhiChu.like(f"{DEMO_TAG}%")).first()
    )
    if co_demo:
        print("Dữ liệu demo BƯỚC 5 đã tồn tại -> bỏ qua (idempotent).")
        return

    t1 = db.query(Tour).filter(Tour.TenTour == "Ha Long - Lan Ha 3N2D").first()
    t2 = db.query(Tour).filter(Tour.TenTour == "Da Lat - Thanh pho ngan hoa 2N1D").first()
    if not t1 or not t2:
        print("LỖI: thiếu tour seed (chạy `python seed.py` trước).")
        sys.exit(1)
    lich1 = (
        db.query(LichKhoiHanh)
        .filter(LichKhoiHanh.MaTour == t1.MaTour,
                LichKhoiHanh.NgayKhoiHanh == "2026-09-15")
        .first()
    )
    lich2 = (
        db.query(LichKhoiHanh)
        .filter(LichKhoiHanh.MaTour == t2.MaTour,
                LichKhoiHanh.NgayKhoiHanh == "2026-09-22")
        .first()
    )
    if not lich1 or not lich2:
        print("LỖI: thiếu lịch seed (chạy `python seed.py` trước).")
        sys.exit(1)

    # KhachHang seed: 1 = Nguyen Van An, 2 = Pham Thi Bich
    # ------------------------------------------------------------
    # Đơn 1: An x 2 khách tour HL, đã thanh toán đủ + feedback 5 sao
    d1 = tao_don(
        db, 1, lich1.MaLich, 2, GIA_TOUR_1, "DaThanhToan",
        Decimal("2900000.00"), _ts(2026, 6, 1),
        [
            {"HoTen": "Nguyen Van An", "SoDienThoai": "0901111222"},
            {"HoTen": "Tran Thu Huong", "SoDienThoai": "0912000111"},
        ],
    )
    tao_giao_dich(db, d1, "Coc", Decimal("2900000.00"), _ts(2026, 6, 10), "ChuyenKhoan")
    tao_giao_dich(db, d1, "ThanhToan", Decimal("2880000.00"), _ts(2026, 6, 15), "TienMat")
    tao_phan_hoi(db, d1, 1, 5,
                 "Tour rất tuyệt, cảnh Ha Long đẹp ngoạn sức, HDV nhiệt tình, khách sạn sạch sẽ.",
                 _ts(2026, 6, 20))

    # Đơn 2: Bich x 1 khách tour HL, mới cọc 30% (còn thiếu) — Kế toán
    d2 = tao_don(
        db, 2, lich1.MaLich, 1, GIA_TOUR_1, "DaCoc",
        Decimal("900000.00"), _ts(2026, 7, 2),
        [{"HoTen": "Pham Thi Bich", "SoDienThoai": "0903333444"}],
    )
    tao_giao_dich(db, d2, "Coc", Decimal("900000.00"), _ts(2026, 7, 5), "The")

    # Đơn 3: Bich x 3 khách tour HL, mới giữ chỗ -> chờ cọc (ChoCoc)
    d3 = tao_don(
        db, 2, lich1.MaLich, 3, GIA_TOUR_1, "ChoCoc",
        Decimal("0.00"), _ts(2026, 8, 20),
        [
            {"HoTen": "Pham Thi Bich", "SoDienThoai": "0903333444"},
            {"HoTen": "Nguyen Van Lam", "SoDienThoai": "0914444555"},
            {"HoTen": "Le Thi Mai", "SoDienThoai": "0915555666"},
        ],
    )

    # Đơn 4: An x 2 khách tour DL, đã thanh toán đủ + feedback 4 sao
    d4 = tao_don(
        db, 1, lich2.MaLich, 2, GIA_TOUR_2, "DaThanhToan",
        Decimal("1890000.00"), _ts(2026, 7, 10),
        [
            {"HoTen": "Nguyen Van An", "SoDienThoai": "0901111222"},
            {"HoTen": "Pham Minh Chau", "SoDienThoai": "0917777888"},
        ],
    )
    tao_giao_dich(db, d4, "Coc", Decimal("1890000.00"), _ts(2026, 7, 20), "ChuyenKhoan")
    tao_giao_dich(db, d4, "ThanhToan", Decimal("1890000.00"), _ts(2026, 7, 22), "ChuyenKhoan")
    tao_phan_hoi(db, d4, 1, 4,
                 "Da Lat mát mẻ, homestay sạch sẽ, đi chơi hợp lý.",
                 _ts(2026, 7, 28))

    # Đơn 5: Bich x 1 khách tour DL, đã hủy (phạt 50% - hoàn 300k)
    d5 = tao_don(
        db, 2, lich2.MaLich, 1, GIA_TOUR_2, "DaHuy",
        Decimal("600000.00"), _ts(2026, 8, 1),
        [{"HoTen": "Pham Thi Bich", "SoDienThoai": "0903333444"}],
    )
    tao_giao_dich(db, d5, "Coc", Decimal("600000.00"), _ts(2026, 8, 2), "TienMat")
    db.add(
        HuyTour(
            MaDatCho=d5,
            NgayHuy=_ts(2026, 8, 3),
            LyDo="Khách thay đổi kế hoạch công việc đột xuất.",
            MucPhat=Decimal("0.5"),
            SoTienHoan=Decimal("300000.00"),
            NguoiXuLyID=NGUOI_XU_LY,
        )
    )
    tao_giao_dich(db, d5, "HoanTien", Decimal("300000.00"), _ts(2026, 8, 3), "ChuyenKhoan",
                  "hoan huy")

    # Đơn 6: An x 2 khách tour HL, đã thanh toán đủ + feedback 3 sao
    d6 = tao_don(
        db, 1, lich1.MaLich, 2, GIA_TOUR_1, "DaThanhToan",
        Decimal("1740000.00"), _ts(2026, 8, 1),
        [
            {"HoTen": "Nguyen Van An", "SoDienThoai": "0901111222"},
            {"HoTen": "Do Thi Hong", "SoDienThoai": "0918888999"},
        ],
    )
    tao_giao_dich(db, d6, "Coc", Decimal("1740000.00"), _ts(2026, 8, 5), "The")
    tao_giao_dich(db, d6, "ThanhToan", Decimal("4040000.00"), _ts(2026, 8, 8), "ChuyenKhoan")
    tao_phan_hoi(db, d6, 1, 3,
                 "Tour ổn, nhưng HDV hơi vội, thời gian ăn trưa ngắn.",
                 _ts(2026, 8, 12))

    # Giảm SoChoCon cho 2 lịch seed theo số khách đã đặt
    lich1.SoChoCon -= (2 + 1 + 3 + 2)
    lich2.SoChoCon -= (2 + 1)

    print("Đã nạp dữ liệu demo BƯỚC 5:")
    print(f"    + 6 đơn đặt chỗ (lich1: giảm 8 chỗ, lich2: giảm 3 chỗ)")
    print(f"    + 8 giao dịch ThanhToan (doanh thu 3 tháng + 1 hoàn tiền)")
    print(f"    + 3 phản hồi (5*, 4*, 3*) cho phân tích cảm xúc UC-12")


def _nap_demo_cau_truc(db) -> None:
    """8 Lead + 4 tour riêng + 5 voucher + 1 phản hồi chờ duyệt.

    Idempotent theo voucher mã MARKER_CODE (HE2026).
    """
    co_cau_truc = db.query(MaGiamGia).filter(MaGiamGia.MaCode == MARKER_CODE).first()
    if co_cau_truc:
        print("Dữ liệu demo tái cấu trúc đã tồn tại -> bỏ qua (idempotent).")
        return

    tu_van = db.query(NguoiDung).filter(NguoiDung.VaiTro == "Consultant").first()
    tu_van_id = tu_van.MaNguoiDung if tu_van else None

    # ---- 8 Lead (đủ 5 trạng thái phễu; 3 lead gán tư vấn viên) ----
    leads = [
        # (HoTen, SoDienThoai, Email, NoiDung, TourQuanTam, Nguon, TrangThai, NguoiPhuTrachID, NgayTao)
        ("Nguyen Thi Lan", "0912222333", "lan.nt@gmail.com",
         "Mình muốn đi Ha Long cuối tháng 9, còn chỗ không?",
         "Ha Long - Lan Ha 3N2D", "Web", "Moi", None, _ts(2026, 8, 24, 9)),
        ("Tran Van Minh", "0913333444", "minh.tv@yahoo.com",
         "Chat với bot hỏi tour Đà Lạt 2 ngày.",
         "Da Lat - Thanh pho ngan hoa 2N1D", "Chatbot", "DangLienHe",
         tu_van_id, _ts(2026, 8, 22, 15)),
        ("Le Thu Trang", "0914444555", "trang.lt@gmail.com",
         "Xem fanpage thấy tour HL đang khuyến mãi.",
         "Ha Long - Lan Ha 3N2D", "Fanpage", "DaBaoGia",
         tu_van_id, _ts(2026, 8, 20, 10)),
        ("Pham Quoc Bao", "0915555666", "bao.pq@gmail.com",
         "Chốt cọc tuần sau cho đoàn 6 người.",
         "Da Lat - Thanh pho ngan hoa 2N1D", "Zalo", "DangChot",
         tu_van_id, _ts(2026, 8, 19, 14)),
        ("Hoang Thi Mai", "0916666777", None,
         "Gọi hotline hỏi tour, giá cao hơn dự kiến.",
         None, "Hotline", "ThatBai", None, _ts(2026, 8, 18, 16)),
        ("Vu Dinh Khoa", "0917777888", "khoa.vd@gmail.com",
         "Đi cùng gia đình 4 người, muốn tư vấn.",
         "Ha Long - Lan Ha 3N2D", "Web", "Moi", None, _ts(2026, 8, 23, 11)),
        ("Nguyen Hong Nhung", "0918888999", "nhung.nh@outlook.com",
         "Hỏi thủ tục đặt tour và lịch còn chỗ tháng 10.",
         "Da Lat - Thanh pho ngan hoa 2N1D", "Web", "DangLienHe",
         None, _ts(2026, 8, 21, 9)),
        ("Do Thanh Son", "0919999000", "son.dt@gmail.com",
         "Đoàn công ty 15 người, cần báo giá MICE.",
         None, "Zalo", "DaBaoGia", tu_van_id, _ts(2026, 8, 17, 13)),
    ]
    for hoten, sdt, email, noidung, tour, nguon, trangthai, owner, ngay in leads:
        db.add(YeuCauTuVan(
            HoTen=hoten, SoDienThoai=sdt, Email=email, NoiDung=noidung,
            TourQuanTam=tour, Nguon=nguon, TrangThai=trangthai,
            NguoiPhuTrachID=owner, NgayTao=ngay,
        ))

    # ---- 4 yêu cầu tour riêng (Moi/DangBaoGia/DaChot/TuChoi) ----
    tours_rieng = [
        ("Nguyen Thi Lan", "0912222333", "lan.nt@gmail.com", "GiaDinh", 5,
         date(2026, 10, 10), Decimal("25000000.00"),
         "Đi 3 ngày 2 đêm, khách sạn 4 sao, có trẻ em.", "Moi", None, _ts(2026, 8, 22, 10)),
        ("Do Thanh Son", "0919999000", "son.dt@gmail.com", "DoanhNghiep", 15,
         date(2026, 11, 5), Decimal("120000000.00"),
         "Team building 2 ngày 1 đêm ngoài tỉnh, cần phòng họp.",
         "DangBaoGia", tu_van_id, _ts(2026, 8, 18, 14)),
        ("Tran Van Minh", "0913333444", "minh.tv@yahoo.com", "HoiNhom", 12,
         date(2026, 9, 25), Decimal("40000000.00"),
         "Nhóm bạn thân đi Đà Nẵng - Hội An 3 ngày.",
         "DaChot", tu_van_id, _ts(2026, 8, 10, 9)),
        ("Hoang Thi Mai", "0916666777", None, "GiaDinh", 3,
         date(2026, 9, 30), Decimal("8000000.00"),
         "Ngân sách hơi thấp so với yêu cầu.",
         "TuChoi", None, _ts(2026, 8, 12, 16)),
    ]
    for (hoten, sdt, email, loai, sl, ngay_du_kien, ngan_sach, mota,
         trang, xu_ly, ngay_tao) in tours_rieng:
        db.add(YeuCauTourRieng(
            HoTen=hoten, SoDienThoai=sdt, Email=email, LoaiDoan=loai,
            SoLuongKhach=sl, NgayDuKien=ngay_du_kien, NganSach=ngan_sach,
            MoTa=mota, TrangThai=trang, NguoiXuLyID=xu_ly, NgayTao=ngay_tao,
        ))

    # ---- 5 mã giảm giá (2% + 2 tiền Active + 1 Expired) ----
    vouchers = [
        ("HE2026", "Giảm 10% mùa hè cho tour nội địa", "PhanTram",
         Decimal("10.00"), date(2026, 10, 31), 100, "Active"),
        ("SUMMER5", "Giảm thêm 5% đặt trước 7 ngày", "PhanTram",
         Decimal("5.00"), date(2026, 9, 30), 200, "Active"),
        ("GIAM500K", "Giảm 500.000đ cho đoàn từ 4 người", "Tien",
         Decimal("500000.00"), date(2026, 12, 31), 50, "Active"),
        ("VIP1TR", "Ưu đãi 1 triệu cho khách VIP", "Tien",
         Decimal("1000000.00"), date(2026, 12, 31), 10, "Active"),
        ("CU2025", "Mã ưu đãi Tết cũ (đã hết hạn)", "PhanTram",
         Decimal("15.00"), date(2025, 12, 31), 0, "Expired"),
    ]
    for ma, mota, loai, gia_tri, han, lan, trang in vouchers:
        db.add(MaGiamGia(
            MaCode=ma, MoTa=mota, LoaiGiam=loai, GiaTri=gia_tri,
            HanSuDung=han, SoLanToiDa=lan, TrangThai=trang,
        ))

    # ---- Đánh dấu phản hồi 3 sao (đơn 6) thành chờ duyệt ----
    ph_cho_duyet = db.query(PhanHoi).filter(PhanHoi.SoSao == 3).first()
    if ph_cho_duyet is not None:
        ph_cho_duyet.TrangThai = "ChoDuyet"
        ph_cho_duyet.AnHien = False

    print("Đã nạp dữ liệu demo tái cấu trúc:")
    print("    + 8 lead (đủ 5 trạng thái phễu, 3 gán tư vấn viên)")
    print("    + 4 yêu cầu tour riêng (Moi/DangBaoGia/DaChot/TuChoi)")
    print("    + 5 mã giảm giá (2% + 2 tiền Active + 1 Expired)")
    print("    + 1 phản hồi chờ duyệt (TrangThai=ChoDuyet)")


def _nap_demo_diem_den(db) -> None:
    """Bổ sung các điểm đến phổ biến để quản trị viên tạo thêm nhiều tour.

    Idempotent theo tên (TenDiemDen unique) — thêm chạy lại nhiều lần vẫn an toàn.

    Tên điểm đến là chữ hiện thẳng cho khách nên phải có dấu. Chuỗi ở đây phải
    khớp ĐÚNG bản ghi đang có trong CSDL, nếu không lần chạy sau sẽ tạo thêm một
    điểm đến trùng tên cũ.
    """
    items = [
        ("Đà Nẵng", "Mien Trung",
         "Thanh pho bien so 1 Viet Nam, cau Rong, ban dao Son Tra, Ba Na Hills."),
        ("Hội An", "Mien Trung",
         "Pho co di san, pho den lung linh, lang nghe va am thuc dac sac."),
        ("Huế", "Mien Trung",
         "Co do voi Dai Noi, chua Thien Mu, lang co va am thuc cung dinh."),
        ("Nha Trang", "Mien Trung",
         "Vinh dep, hon dao, bien xanh, khu nghi duong Vinpearl."),
        ("Quy Nhơn", "Mien Trung",
         "Bien xanh em de, bai Ky Co, Eo Gio, thanh pho binh yen."),
        ("Mũi Né - Phan Thiết", "Mien Nam",
         "Doi cat bay, mui Ke Ga, lang chai binh minh, loai hinh di da ngoai."),
        ("Vũng Tàu", "Mien Nam",
         "Bien gan thanh pho, tuong Chua Kito Vua, ngon hai dang."),
        ("Côn Đảo", "Mien Nam",
         "Bien hoang so, rang san ho, nha tu Con Dao, du lich sinh thai."),
        ("Cần Thơ", "Mien Tay",
         "Cho noi Cai Rang, vuon trai cay, mien Tay song nuoc."),
        ("Hà Nội", "Mien Bac",
         "Thu do ngang ngan nam van hien, Ho Guom, pho co, van mieu."),
        ("Sa Pa", "Mien Bac",
         "Thi tran trong may, ruong bac thang, dinh Fansipan, ban Cat Cat."),
        ("Ninh Bình", "Mien Bac",
         "Ha Long tren can, Trang An, Tam Coc, co do Hoa Lu."),
        ("Cát Bà", "Mien Bac",
         "Dao lon nhat vinh Lan Ha, vuon quoc gia, lan chao bao."),
    ]
    for ten, khu_vuc, mo_ta in items:
        if db.query(DiemDen).filter(DiemDen.TenDiemDen == ten).first():
            continue
        db.add(DiemDen(TenDiemDen=ten, KhuVuc=khu_vuc, MoTa=mo_ta))
    print(f"    + Bo sung {len(items)} diem den pho bien (Da Nang, Hoi An, Sapa, ...)")


def main() -> None:
    db = SessionLocal()
    try:
        _nap_demo_b5(db)
        _nap_demo_cau_truc(db)
        _nap_demo_diem_den(db)
        db.commit()
        print("HOÀN TẤT. Dữ liệu demo (BƯỚC 5 + tái cấu trúc) đã sẵn sàng.")
    except Exception as exc:
        db.rollback()
        print("LỖI khi nạp dữ liệu demo:", exc)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
