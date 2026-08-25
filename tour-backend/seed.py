# -*- coding: utf-8 -*-
"""
seed.py - Khởi tạo 15 bảng và nạp dữ liệu mẫu trên Supabase PostgreSQL.

Cách chạy (từ thư mục tour-backend):
    python seed.py

Dữ liệu mẫu khớp Mã nguồn 3.9 trong tài liệu:
    3 tài khoản NguoiDung (Admin / Consultant / Accountant) - mật khẩu BCrypt hợp lệ
    2 Khách hàng, 3 Điểm đến, 2 Tour, 2 Lịch khởi hành, 3 Hướng dẫn viên
"""
import sys

from sqlalchemy import inspect

from app.database import Base, SessionLocal, engine
from app.models import (
    CamNang,
    DiemDen,
    HuongDanVien,
    KhachHang,
    LichKhoiHanh,
    NguoiDung,
    PhanCongHDV,
    Tour,
)
from app.utils.security import hash_password

# 19 bảng: 15 bảng theo Data Dictionary (Bảng 2.6..2.20) + 4 bảng mới
EXPECTED_TABLES = [
    "NguoiDung",
    "KhachHang",
    "DiemDen",
    "Tour",
    "LichKhoiHanh",
    "HuongDanVien",
    "PhanCongHDV",
    "DatCho",
    "ChiTietDatCho",
    "ThanhToan",
    "HuyTour",
    "PhanHoi",
    "MaGiamGia",
    "YeuCauTuVan",
    "YeuCauTourRieng",
    "AI_TuVanTour",
    "AI_DeXuatHuongDanVien",
    "AI_PhanTichPhanHoi",
    "CamNang",
]

# Mật khẩu mặc định cho 4 tài khoản mẫu (chỉ dùng cho môi trường phát triển)
SEED_PASSWORDS = {
    "admin@tour.vn": "Admin@123",
    "tuvan@tour.vn": "Tuvan@123",
    "ketoan@tour.vn": "Ketoan@123",
    "an.nguyen@gmail.com": "An@123",
}


def seed_nguoi_dung(db) -> None:
    """4 tài khoản: Admin, Consultant, Accountant, Customer (BCrypt hợp lệ)."""
    users = [
        ("Nguyen Quan Tri", "admin@tour.vn", "Admin"),
        ("Tran Thi Tu Van", "tuvan@tour.vn", "Consultant"),
        ("Le Van Ke Toan", "ketoan@tour.vn", "Accountant"),
        ("Nguyen Van An", "an.nguyen@gmail.com", "Customer"),
    ]
    for hoten, email, vaitro in users:
        if db.query(NguoiDung).filter(NguoiDung.Email == email).first():
            print(f"    - Bo qua NguoiDung {email} (da ton tai)")
            continue
        db.add(
            NguoiDung(
                HoTen=hoten,
                Email=email,
                MatKhauHash=hash_password(SEED_PASSWORDS[email]),
                VaiTro=vaitro,
                TrangThai="Active",
            )
        )
        print(f"    + Tao NguoiDung {email} ({vaitro})")


def seed_khach_hang(db) -> None:
    """2 khách hàng: Nguyen Van An, Pham Thi Bich."""
    items = [
        ("Nguyen Van An", "0901111222", "an.nguyen@gmail.com",
         "1990-05-12", "Thuong", "Khach le"),
        ("Pham Thi Bich", "0903333444", "bich.pham@gmail.com",
         "1995-11-03", "ThanThiet", "Khach than thiet"),
    ]
    for hoten, sdt, email, ngaysinh, loai, ghichu in items:
        exists = db.query(KhachHang).filter(KhachHang.SoDienThoai == sdt).first()
        if exists:
            print(f"    - Bo qua KhachHang {hoten} (da ton tai)")
            continue
        db.add(
            KhachHang(
                HoTen=hoten,
                SoDienThoai=sdt,
                Email=email,
                NgaySinh=ngaysinh,
                LoaiKhach=loai,
                GhiChu=ghichu,
            )
        )
        print(f"    + Tao KhachHang {hoten}")


def seed_diem_den(db) -> None:
    """3 điểm đến: Vinh Ha Long, Da Lat, Phu Quoc."""
    items = [
        ("Vinh Ha Long", "Mien Bac",
         "Di san thien nhien the gioi, he thong vinh dao da voi hung vi."),
        ("Da Lat", "Tay Nguyen",
         "Thanh pho ngan hoa, khi hau mat me quanh nam."),
        ("Phu Quoc", "Mien Nam",
         "Dao ngoc voi bai bien cat trang va he sinh thai bien da dang."),
    ]
    for ten, khu_vuc, mo_ta in items:
        if db.query(DiemDen).filter(DiemDen.TenDiemDen == ten).first():
            print(f"    - Bo qua DiemDen {ten} (da ton tai)")
            continue
        db.add(DiemDen(TenDiemDen=ten, KhuVuc=khu_vuc, MoTa=mo_ta))
        print(f"    + Tao DiemDen {ten}")


def seed_tour(db) -> None:
    """2 tour gắn với điểm đến Ha Long (MaDiemDen=1) và Da Lat (MaDiemDen=2)."""
    hl = db.query(DiemDen).filter(DiemDen.TenDiemDen == "Vinh Ha Long").first()
    dl = db.query(DiemDen).filter(DiemDen.TenDiemDen == "Da Lat").first()
    items = [
        (hl.MaDiemDen, "Ha Long - Lan Ha 3N2D",
         "Tour kham pha vinh Ha Long va Lan Ha.",
         "Ngay 1: Ha Noi - Ha Long; Ngay 2: vinh Lan Ha; Ngay 3: tro ve.",
         3, 3200000, 2890000, "DangBan"),
        (dl.MaDiemDen, "Da Lat - Thanh pho ngan hoa 2N1D",
         "Tour nghi duong va tham quan Da Lat.",
         "Ngay 1: Ga Da Lat, ho Xuan Huong; Ngay 2: Thung lung Tinh Yeu.",
         2, 2100000, 1890000, "DangBan"),
    ]
    for mad, ten, mo_ta, lich, so_ngay, gia, khuyen_mai, trang in items:
        if db.query(Tour).filter(Tour.TenTour == ten).first():
            print(f"    - Bo qua Tour {ten} (da ton tai)")
            continue
        db.add(
            Tour(
                MaDiemDen=mad,
                TenTour=ten,
                MoTa=mo_ta,
                LichTrinhTomTat=lich,
                SoNgay=so_ngay,
                GiaCoBan=gia,
                GiaKhuyenMai=khuyen_mai,
                TrangThai=trang,
            )
        )
        print(f"    + Tao Tour {ten}")


def seed_lich_khoi_hanh(db) -> None:
    """2 lịch khởi hành cho 2 tour."""
    t1 = db.query(Tour).filter(Tour.TenTour == "Ha Long - Lan Ha 3N2D").first()
    t2 = db.query(Tour).filter(Tour.TenTour == "Da Lat - Thanh pho ngan hoa 2N1D").first()
    items = [
        (t1.MaTour, "2026-09-15", "2026-09-17", 5, 30, 22, "MoBan"),
        (t2.MaTour, "2026-09-22", "2026-09-23", 4, 25, 18, "MoBan"),
    ]
    for ma_tour, ngay_di, ngay_ve, min_s, max_s, so_cho, trang in items:
        exists = (
            db.query(LichKhoiHanh)
            .filter(
                LichKhoiHanh.MaTour == ma_tour,
                LichKhoiHanh.NgayKhoiHanh == ngay_di,
            )
            .first()
        )
        if exists:
            print(f"    - Bo qua LichKhoiHanh tour {ma_tour} ngay {ngay_di} (da ton tai)")
            continue
        db.add(
            LichKhoiHanh(
                MaTour=ma_tour,
                NgayKhoiHanh=ngay_di,
                NgayKetThuc=ngay_ve,
                MinSeats=min_s,
                MaxSeats=max_s,
                SoChoCon=so_cho,
                TrangThai=trang,
            )
        )
        print(f"    + Tao LichKhoiHanh tour {ma_tour} ngay {ngay_di}")


def seed_huong_dan_vien(db) -> None:
    """3 hướng dẫn viên (kèm hồ sơ định danh / năng lực / tài chính).

    Idempotent: nếu HDV đã tồn tại (theo SĐT) thì cập nhật lại hồ sơ chi tiết.
    """
    items = [
        {
            "HoTen": "Hoang Minh Tuan", "SoDienThoai": "0912345678",
            "Email": "tuan.hm@tour.vn", "SoNamKinhNghiem": 7,
            "ChuyenMon": "Tour bien dao", "TrangThai": "Ranh",
            "MaNV": "NV001", "CCCD": "001234567801", "NgaySinh": "1990-03-15",
            "HoChieu": "B1234567", "DiaChi": "Ha Noi",
            "TrangThaiLamViec": "ChinhThuc", "TheHDV": "HDV-001",
            "TuyenDiem": "Ha Long, Phu Quoc, Nha Trang",
            "KyNang": "Tieng Anh, so cuu, dan chuong trinh",
            "DinhMucThuLao": 1500000, "CongTacPhi": 500000,
            "ThongTinThanhToan": "Vietcombank 00123456789 - Hoang Minh Tuan",
        },
        {
            "HoTen": "Do Thu Ha", "SoDienThoai": "0918765432",
            "Email": "ha.dt@tour.vn", "SoNamKinhNghiem": 5,
            "ChuyenMon": "Tour nghi duong", "TrangThai": "Ranh",
            "MaNV": "NV002", "CCCD": "001234567802", "NgaySinh": "1992-07-20",
            "HoChieu": "B2345678", "DiaChi": "TP. Ho Chi Minh",
            "TrangThaiLamViec": "ChinhThuc", "TheHDV": "HDV-002",
            "TuyenDiem": "Da Lat, Da Nang, resort",
            "KyNang": "Tieng Anh, am thuc dia phuong",
            "DinhMucThuLao": 1300000, "CongTacPhi": 400000,
            "ThongTinThanhToan": "BIDV 00223456789 - Do Thu Ha",
        },
        {
            "HoTen": "Vu Quang Huy", "SoDienThoai": "0981122334",
            "Email": "huy.vq@tour.vn", "SoNamKinhNghiem": 3,
            "ChuyenMon": "Tour sinh thai", "TrangThai": "Ranh",
            "MaNV": "NV003", "CCCD": "001234567803", "NgaySinh": "1995-11-02",
            "HoChieu": "B3456789", "DiaChi": "Da Nang",
            "TrangThaiLamViec": "ThuViec", "TheHDV": "HDV-003",
            "TuyenDiem": "Mien Tay song nuoc, sinh thai",
            "KyNang": "Tieng Anh, sinh thai, che bien mon an",
            "DinhMucThuLao": 1100000, "CongTacPhi": 400000,
            "ThongTinThanhToan": "Techcombank 00323456789 - Vu Quang Huy",
        },
    ]
    for d in items:
        hdv = (
            db.query(HuongDanVien)
            .filter(HuongDanVien.SoDienThoai == d["SoDienThoai"])
            .first()
        )
        if hdv is None:
            db.add(HuongDanVien(**d))
            print(f"    + Tao HuongDanVien {d['HoTen']}")
        else:
            for k, v in d.items():
                setattr(hdv, k, v)
            print(f"    + Cap nhat ho so HuongDanVien {d['HoTen']}")


def seed_phan_cong_demo(db) -> None:
    """Vài phân công demo (lịch sử tour đã dẫn) - idempotent theo MaLich+MaHDV.

    Tạo 2 lịch ĐÃ HOÀN THÀNH trong quá khứ để "lịch sử tour đã dẫn" có dữ liệu.
    Chỉ dùng ngày quá khứ (không trùng lịch tương lai của test DR-05).
    """
    hl = db.query(Tour).filter(Tour.TenTour == "Ha Long - Lan Ha 3N2D").first()
    dl = db.query(Tour).filter(Tour.TenTour == "Da Lat - Thanh pho ngan hoa 2N1D").first()
    if hl is None or dl is None:
        return

    def _lich_hoan_thanh(ma_tour, ngay_di, ngay_ve):
        lich = (
            db.query(LichKhoiHanh)
            .filter(LichKhoiHanh.MaTour == ma_tour, LichKhoiHanh.NgayKhoiHanh == ngay_di)
            .first()
        )
        if lich is None:
            lich = LichKhoiHanh(
                MaTour=ma_tour, NgayKhoiHanh=ngay_di, NgayKetThuc=ngay_ve,
                MinSeats=1, MaxSeats=20, SoChoCon=0, TrangThai="HoanThanh",
            )
            db.add(lich)
            db.flush()
            print(f"    + Tao lich da dan tour {ma_tour} ({ngay_di})")
        return lich

    lich_hl = _lich_hoan_thanh(hl.MaTour, "2026-08-10", "2026-08-12")
    lich_dl = _lich_hoan_thanh(dl.MaTour, "2026-08-15", "2026-08-16")

    def _gan(sdt, lich, vai_tro="TruongDoan"):
        hdv = db.query(HuongDanVien).filter(HuongDanVien.SoDienThoai == sdt).first()
        if hdv is None or lich is None:
            return
        if (
            db.query(PhanCongHDV)
            .filter(PhanCongHDV.MaLich == lich.MaLich, PhanCongHDV.MaHDV == hdv.MaHDV)
            .first()
        ):
            return
        db.add(PhanCongHDV(MaLich=lich.MaLich, MaHDV=hdv.MaHDV, VaiTro=vai_tro))
        print(f"    + Phan cong {hdv.HoTen} -> lich {lich.MaLich}")

    _gan("0912345678", lich_hl, "TruongDoan")
    _gan("0918765432", lich_dl, "TruongDoan")


def seed_cam_nang(db) -> None:
    """4 bài viết cẩm nang mặc định (idempotent theo TieuDe)."""
    items = [
        (
            "Chuẩn bị trước chuyến đi",
            "Những việc cần làm để chuyến đi suôn sẻ ngay từ đầu.",
            "TruocChuyenDi",
            "- Đặt tour sớm ít nhất 7 ngày để chủ động sắp xếp lịch trình\n"
            "- Chuẩn bị giấy tờ tùy thân (CCCD/CMND) cho từng hành khách\n"
            "- Kiểm tra thời tiết điểm đến để mang trang phục phù hợp",
        ),
        (
            "Chi phí & thanh toán",
            "Hướng dẫn các khoản chi phí và quy trình thanh toán.",
            "ChiPhiThanhToan",
            "- Đặt tour giữ chỗ 24 giờ miễn phí, không mất phí\n"
            "- Đặt cọc tối thiểu 30% giá trị đơn để xác nhận chỗ\n"
            "- Hoàn tất thanh toán đủ trước ngày khởi hành",
        ),
        (
            "An toàn trong chuyến đi",
            "Các lưu ý đảm bảo an toàn cho cả đoàn.",
            "AnToan",
            "- Luôn nghe hướng dẫn của hướng dẫn viên trong suốt hành trình\n"
            "- Lưu số hotline hỗ trợ để liên hệ khi cần\n"
            "- Mua bảo hiểm du lịch cho từng hành khách",
        ),
        (
            "Quy trình đặt tour chuẩn",
            "6 bước đặt tour đơn giản trên TourAI.",
            "QuyTrinhDatTour",
            "1. Chọn tour & lịch khởi hành còn chỗ\n"
            "2. Khai báo thông tin hành khách\n"
            "3. Đặt chỗ (giữ 24h miễn phí)\n"
            "4. Kế toán xác nhận cọc tối thiểu 30%\n"
            "5. Nhận thông báo & hoàn tất thanh toán\n"
            "6. Lên đường và chia sẻ đánh giá",
        ),
    ]
    for tieu_de, mo_ta, danh_muc, noi_dung in items:
        if db.query(CamNang).filter(CamNang.TieuDe == tieu_de).first():
            print(f"    - Bo qua CamNang {tieu_de} (da ton tai)")
            continue
        db.add(
            CamNang(
                TieuDe=tieu_de,
                MoTaNgan=mo_ta,
                NoiDung=noi_dung,
                HinhAnhURL=None,
                DanhMuc=danh_muc,
                TrangThai="Hien",
            )
        )
        print(f"    + Tao CamNang {tieu_de}")


def seed_tour_loai(db) -> None:
    """Gán LoaiTour cho tour hiện có + bổ sung tour cho các danh mục còn thiếu.

    LoaiTour: TraiNghiem (trải nghiệm) / NghiDuong (nghỉ dưỡng) / VanHoaLichSu.
    Idempotent - chạy nhiều lần không trùng.
    """
    # 1) Backfill loại hình cho tour đã tồn tại
    map_theo_ten = {
        "Ha Long - Lan Ha 3N2D": "TraiNghiem",
        "Da Lat - Thanh pho ngan hoa 2N1D": "NghiDuong",
    }
    for t in db.query(Tour).all():
        if t.LoaiTour is None and t.TenTour in map_theo_ten:
            t.LoaiTour = map_theo_ten[t.TenTour]
            print(f"    + Gan LoaiTour={t.LoaiTour} cho Tour {t.TenTour}")

    # 2) Điểm đến Cố đô Huế (cho loại văn hóa lịch sử)
    hue = db.query(DiemDen).filter(DiemDen.TenDiemDen == "Co do Hue").first()
    if hue is None:
        hue = DiemDen(
            TenDiemDen="Co do Hue",
            KhuVuc="Mien Trung",
            MoTa="Di san van hoa the gioi, kinh thanh Hue va he thong lang tam.",
        )
        db.add(hue)
        db.flush()
        print("    + Tao DiemDen Co do Hue")
    db.flush()

    phu_quoc = db.query(DiemDen).filter(DiemDen.TenDiemDen == "Phu Quoc").first()

    def _them_tour(diem_den, ten, mo_ta, lich_trinh, so_ngay, gia, khuyen_mai,
                   loai, ngay_di, ngay_ve):
        if db.query(Tour).filter(Tour.TenTour == ten).first():
            print(f"    - Bo qua Tour {ten} (da ton tai)")
            return
        t = Tour(
            MaDiemDen=diem_den.MaDiemDen,
            TenTour=ten,
            MoTa=mo_ta,
            LichTrinhTomTat=lich_trinh,
            SoNgay=so_ngay,
            GiaCoBan=gia,
            GiaKhuyenMai=khuyen_mai,
            TrangThai="DangBan",
            LoaiTour=loai,
        )
        db.add(t)
        db.flush()
        if not db.query(LichKhoiHanh).filter(LichKhoiHanh.MaTour == t.MaTour).first():
            db.add(
                LichKhoiHanh(
                    MaTour=t.MaTour,
                    NgayKhoiHanh=ngay_di,
                    NgayKetThuc=ngay_ve,
                    MinSeats=5,
                    MaxSeats=30,
                    SoChoCon=20,
                    TrangThai="MoBan",
                )
            )
        print(f"    + Tao Tour {ten} ({loai}) + lich")

    _them_tour(
        hue, "Hue - Co do va lang tam 2N1D",
        "Kham pha di tich Co do Hue va lang tam cac vua Nguyen.",
        "Ngay 1: Dai Noi, chua Thien Mu; Ngay 2: lang Khai Dinh, Minh Mang.",
        2, 2500000, 2290000, "VanHoaLichSu", "2026-09-25", "2026-09-26",
    )
    if phu_quoc is not None:
        _them_tour(
            phu_quoc, "Phu Quoc - Nghi duong bien dao 3N2D",
            "Nghi duong tai dao ngoc voi bai bien cat trang va khu Grand World.",
            "Ngay 1: Bai Sao; Ngay 2: hon Thom; Ngay 3: Grand World.",
            3, 5200000, 4790000, "NghiDuong", "2026-09-20", "2026-09-22",
        )


def report() -> None:
    """In báo cáo tổng số dòng của 15 bảng."""
    db = SessionLocal()
    try:
        print("\n" + "=" * 70)
        print("[3] BÁO CÁO DỮ LIỆU TRÊN SUPABASE")
        print("=" * 70)
        counts = {
            "NguoiDung": db.query(NguoiDung).count(),
            "KhachHang": db.query(KhachHang).count(),
            "DiemDen": db.query(DiemDen).count(),
            "Tour": db.query(Tour).count(),
            "LichKhoiHanh": db.query(LichKhoiHanh).count(),
            "HuongDanVien": db.query(HuongDanVien).count(),
            "CamNang": db.query(CamNang).count(),
        }
        for name in EXPECTED_TABLES:
            n = counts.get(name, 0)
            print(f"    - {name}: {n} dòng")
    finally:
        db.close()


def main() -> None:
    print("=" * 70)
    print("TOUR AI - KHỞI TẠO CSDL & NẠP DỮ LIỆU MẪU")
    print("=" * 70)

    # 1) Kiểm tra kết nối + tạo 15 bảng
    print("\n[1] Kết nối Supabase và tạo 15 bảng (Base.metadata.create_all)...")
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        print("\n    LỖI KẾT NỐI/TẠO BẢNG:", exc)
        sys.exit(1)

    insp = inspect(engine)
    existing = set(insp.get_table_names())
    print(f"    -> Số bảng hiện có trong CSDL: {len(existing)}")
    ok = True
    for t in EXPECTED_TABLES:
        status = "OK" if t in existing else "THIEU"
        if t not in existing:
            ok = False
        print(f"      [{status}] {t}")
    if not ok:
        print("\n    CẢNH BÁO: một số bảng chưa được tạo. Dừng lại.")
        sys.exit(1)

    # 2) Nạp dữ liệu mẫu (idempotent)
    print("\n[2] Nạp dữ liệu mẫu ...")
    db = SessionLocal()
    try:
        seed_nguoi_dung(db)
        seed_khach_hang(db)
        seed_diem_den(db)
        db.flush()  # đảm bảo DiemDen có MaDiemDen để seed_tour tham chiếu
        seed_tour(db)
        db.flush()  # đảm bảo Tour có MaTour để seed_lich_khoi_hanh tham chiếu
        seed_lich_khoi_hanh(db)
        seed_huong_dan_vien(db)
        seed_cam_nang(db)
        seed_tour_loai(db)
        seed_phan_cong_demo(db)
        db.commit()
        print("\n    -> Đã nạp xong dữ liệu mẫu.")
    except Exception as exc:
        db.rollback()
        print("\n    LỖI khi nạp dữ liệu:", exc)
        sys.exit(1)
    finally:
        db.close()

    # 3) Báo cáo
    report()
    print("\nHOÀN TẤT. 15 bảng đã sẵn sàng trên Supabase.")


if __name__ == "__main__":
    main()
