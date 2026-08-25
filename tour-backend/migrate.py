# -*- coding: utf-8 -*-
"""
migrate.py - Migration cho BƯỚC tái cấu trúc (chạy SAU seed.py).

Lý do: `Base.metadata.create_all` chỉ TẠO bảng chưa có, KHÔNG thêm cột vào
bảng đã tồn tại. Script này:

  1. create_all -> tạo 3 bảng mới: MaGiamGia, YeuCauTuVan, YeuCauTourRieng.
  2. ALTER TABLE "PhanHoi" ADD COLUMN IF NOT EXISTS TrangThai / AnHien
     (idempotent - chạy nhiều lần không lỗi).

Cách chạy (từ thư mục tour-backend):
    python migrate.py
"""
import sys

from sqlalchemy import text

from app.database import Base, engine
from app.models import (  # noqa: F401  (đảm bảo model được đăng ký)
    CamNang,
    MaGiamGia,
    YeuCauTourRieng,
    YeuCauTuVan,
)

ALTERS = [
    (
        "PhanHoi.TrangThai",
        'ALTER TABLE "PhanHoi" ADD COLUMN IF NOT EXISTS "TrangThai" '
        "VARCHAR(20) NOT NULL DEFAULT 'DaDuyet'",
    ),
    (
        "PhanHoi.AnHien",
        'ALTER TABLE "PhanHoi" ADD COLUMN IF NOT EXISTS "AnHien" BOOLEAN '
        "NOT NULL DEFAULT TRUE",
    ),
    (
        "YeuCauTourRieng.ChiTietLichTrinh",
        'ALTER TABLE "YeuCauTourRieng" ADD COLUMN IF NOT EXISTS "ChiTietLichTrinh" JSON NULL',
    ),
    (
        "YeuCauTourRieng.GiaChot",
        'ALTER TABLE "YeuCauTourRieng" ADD COLUMN IF NOT EXISTS "GiaChot" NUMERIC(12,2) NULL',
    ),
    (
        "Tour.LoaiTour",
        'ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "LoaiTour" VARCHAR(30) NULL',
    ),
    (
        "KhachHang.AnhDaiDien",
        'ALTER TABLE "KhachHang" ADD COLUMN IF NOT EXISTS "AnhDaiDien" TEXT NULL',
    ),
    # ---- HuongDanVien: hồ sơ chi tiết (định danh / năng lực / tài chính) ----
    ("HuongDanVien.MaNV", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "MaNV" VARCHAR(20) NULL'),
    ("HuongDanVien.CCCD", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "CCCD" VARCHAR(20) NULL'),
    ("HuongDanVien.NgaySinh", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "NgaySinh" DATE NULL'),
    ("HuongDanVien.HoChieu", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "HoChieu" VARCHAR(20) NULL'),
    ("HuongDanVien.DiaChi", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "DiaChi" VARCHAR(255) NULL'),
    ("HuongDanVien.TrangThaiLamViec", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "TrangThaiLamViec" VARCHAR(20) NOT NULL DEFAULT \'ChinhThuc\''),
    ("HuongDanVien.TheHDV", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "TheHDV" VARCHAR(50) NULL'),
    ("HuongDanVien.TuyenDiem", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "TuyenDiem" TEXT NULL'),
    ("HuongDanVien.KyNang", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "KyNang" TEXT NULL'),
    ("HuongDanVien.DinhMucThuLao", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "DinhMucThuLao" NUMERIC(12,2) NULL'),
    ("HuongDanVien.CongTacPhi", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "CongTacPhi" NUMERIC(12,2) NULL'),
    ("HuongDanVien.ThongTinThanhToan", 'ALTER TABLE "HuongDanVien" ADD COLUMN IF NOT EXISTS "ThongTinThanhToan" VARCHAR(255) NULL'),
    # ---- NguoiDung: cấu hình lương ----
    ("NguoiDung.HeSoLuong", 'ALTER TABLE "NguoiDung" ADD COLUMN IF NOT EXISTS "HeSoLuong" NUMERIC(6,2) NOT NULL DEFAULT 1'),
    ("NguoiDung.LuongCoBan", 'ALTER TABLE "NguoiDung" ADD COLUMN IF NOT EXISTS "LuongCoBan" NUMERIC(12,2) NOT NULL DEFAULT 0'),
    ("NguoiDung.PhuCap", 'ALTER TABLE "NguoiDung" ADD COLUMN IF NOT EXISTS "PhuCap" NUMERIC(12,2) NOT NULL DEFAULT 0'),
]


def main() -> None:
    print("=" * 60)
    print("TOUR AI - MIGRATION BƯỚC TÁI CẤU TRÚC")
    print("=" * 60)

    # 1) Tạo các bảng mới (nếu chưa có)
    try:
        Base.metadata.create_all(bind=engine)
        print("\n[1] create_all -> tạo bảng mới: OK")
    except Exception as exc:
        print("    LỖI create_all:", exc)
        sys.exit(1)

    # 2) ALTER PhanHoi (idempotent)
    print("\n[2] ALTER TABLE PhanHoi ...")
    with engine.begin() as conn:
        for name, stmt in ALTERS:
            try:
                conn.execute(text(stmt))
                print(f"    + {name}: OK")
            except Exception as exc:
                print(f"    - {name}: {exc}")

    print("\nHOÀN TẤT. Các cột/bảng mới đã sẵn sàng trên Supabase.")


if __name__ == "__main__":
    main()
