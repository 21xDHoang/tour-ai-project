# -*- coding: utf-8 -*-
"""
tests/conftest.py - Fixture & bộ khung dữ liệu dùng chung cho 24 Test Case (BƯỚC 4).

Nguyên tắc:
  - Mỗi test tự TẠO dữ liệu riêng (LichKhoiHanh, KhachHang, NguoiDung test...)
    và tự DỌN DẸP theo thứ tự FK (ChiTiet -> ThanhToan/HuyTour/PhanHoi -> DatCho
    -> PhanCongHDV/AI log -> LichKhoiHanh -> KhachHang -> NguoiDung) nên
    KHÔNG làm ảnh hưởng dữ liệu seed.
  - Đăng nhập seed user để lấy JWT (admin/consultant/accountant); khách hàng
    test đăng ký qua /auth/register và được dọn sau mỗi test.
"""
from __future__ import annotations

import sys
from datetime import date, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func

# Đảm bảo import được package `app` khi chạy pytest từ thư mục tour-backend
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402
    AIDeXuatHuongDanVien,
    AIPhanTichPhanHoi,
    AITuVanTour,
    ChiTietDatCho,
    DatCho,
    HuyTour,
    KhachHang,
    LichKhoiHanh,
    NguoiDung,
    PhanCongHDV,
    PhanHoi,
    ThanhToan,
)
from app.models.common import now_naive_utc  # noqa: E402
from app.utils.security import hash_password  # noqa: E402

# Tài khoản seed (đã xác minh trong CSDL)
SEED_USERS = {
    "admin": ("admin@tour.vn", "Admin@123"),
    "consultant": ("tuvan@tour.vn", "Tuvan@123"),
    "accountant": ("ketoan@tour.vn", "Ketoan@123"),
}

# Giá hiện hành của seed tour 1 (GiaKhuyenMai) - dùng để khẳng định TongTien
GIA_TOUR_1 = 2_890_000.0


def _login(client, email, mat_khau) -> dict:
    """Đăng nhập -> header Authorization: Bearer <jwt>."""
    r = client.post(
        "/api/v1/auth/login",
        json={"Email": email, "MatKhau": mat_khau},
    )
    assert r.status_code == 200, f"Login thất bại: {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="session")
def client():
    """TestClient của ứng dụng FastAPI (chạy lifespan)."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def tokens(client) -> dict:
    """JWT header cho 3 vai trò seed (Admin / Consultant / Accountant)."""
    return {
        role: _login(client, em, pw) for role, (em, pw) in SEED_USERS.items()
    }


@pytest.fixture
def db():
    """Phiên SQLAlchemy riêng cho mỗi test (setup + dọn dẹp)."""
    session = SessionLocal()
    yield session
    session.close()


class BoiCanh:
    """Bộ khung dữ liệu test: tạo entity và dọn dẹp đúng thứ tự FK."""

    def __init__(self, db, client, tokens):
        self.db = db
        self.client = client
        self.tokens = tokens
        # Các lịch do test tạo -> nguồn quy chiếu cho mọi thao tác dọn dẹp
        self.ds_lich: list[int] = []
        self.ds_khach: list[int] = []
        self.ds_nguoi_dung: list[int] = []
        # Điểm khởi đầu của bảng nhật ký AI để chỉ xóa dòng do test sinh ra
        self.ai_max = {
            "tu_van": db.query(func.max(AITuVanTour.MaTuVan)).scalar() or 0,
            "phan_tich": db.query(func.max(AIPhanTichPhanHoi.MaPhanTich)).scalar() or 0,
            "de_xuat": db.query(func.max(AIDeXuatHuongDanVien.MaDeXuat)).scalar() or 0,
        }

    # ------------------------------------------------------------- tạo dữ liệu
    def tao_lich(self, ngay_khoi_hanh, ma_tour=1, so_cho_con=20,
                 min_seats=1, so_ngay=1) -> LichKhoiHanh:
        """Tạo lịch khởi hành mới (ngày kết thúc = khởi hành + so_ngay)."""
        lich = LichKhoiHanh(
            MaTour=ma_tour,
            NgayKhoiHanh=ngay_khoi_hanh,
            NgayKetThuc=ngay_khoi_hanh + timedelta(days=so_ngay),
            MinSeats=min_seats,
            MaxSeats=so_cho_con,
            SoChoCon=so_cho_con,
            TrangThai="MoBan",
        )
        self.db.add(lich)
        self.db.commit()
        self.db.refresh(lich)
        self.ds_lich.append(lich.MaLich)
        return lich

    def tao_khach_hang(self, ho_ten="Khach Hang Test") -> KhachHang:
        kh = KhachHang(HoTen=ho_ten, SoDienThoai="0900000000", LoaiKhach="Thuong")
        self.db.add(kh)
        self.db.commit()
        self.db.refresh(kh)
        self.ds_khach.append(kh.MaKhachHang)
        return kh

    def tao_dat_cho_qua_api(self, ma_lich, ma_khach_hang, so_khach=1):
        """Gọi POST /api/v1/bookings bằng token Admin; trả về response."""
        payload = {
            "MaLich": ma_lich,
            "MaKhachHang": ma_khach_hang,
            "ds_hanh_khach": [
                {"HoTen": f"Hanh khach {i + 1}", "SoDienThoai": "0912345678"}
                for i in range(so_khach)
            ],
        }
        return self.client.post(
            "/api/v1/bookings", json=payload, headers=self.tokens["admin"]
        )

    def tao_phan_hoi_truc_tiep(self, ma_lich, ma_khach_hang, so_sao, noi_dung) -> PhanHoi:
        """Tạo DatCho (hoàn tất) + PhanHoi trực tiếp qua DB cho UC-12."""
        now = now_naive_utc()
        dat = DatCho(
            MaKhachHang=ma_khach_hang,
            MaLich=ma_lich,
            NguoiTaoID=1,  # admin seed
            SoKhach=1,
            TongTien=0,
            DaDatCoc=0,
            NgayDat=now,
            HanGiuCho=now + timedelta(hours=24),
            TrangThai="DaThanhToan",
        )
        self.db.add(dat)
        self.db.commit()
        self.db.refresh(dat)
        ph = PhanHoi(
            MaDatCho=dat.MaDatCho,
            MaKhachHang=ma_khach_hang,
            SoSao=so_sao,
            NoiDung=noi_dung,
        )
        self.db.add(ph)
        self.db.commit()
        self.db.refresh(ph)
        return ph

    def tao_customer_token(self, email) -> dict:
        """Đăng ký một khách hàng mới (Customer) qua API + đăng nhập."""
        r = self.client.post(
            "/api/v1/auth/register",
            json={"HoTen": "Khach Hang Test", "Email": email, "MatKhau": "Test@123"},
        )
        assert r.status_code == 201, r.text
        self.ds_nguoi_dung.append(r.json()["MaNguoiDung"])
        return _login(self.client, email, "Test@123")

    # ------------------------------------------------------------- dọn dẹp
    def don_dep(self):
        """Xóa toàn bộ dữ liệu test theo thứ tự FK (không đụng dữ liệu seed)."""
        self.db.expire_all()
        lich_ids = self.ds_lich
        if lich_ids:
            # Id của các đơn đặt chỗ trên lịch do test tạo
            dat_ids = [
                r[0]
                for r in self.db.query(DatCho.MaDatCho)
                .filter(DatCho.MaLich.in_(lich_ids))
                .all()
            ]
            if dat_ids:
                self.db.query(HuyTour).filter(
                    HuyTour.MaDatCho.in_(dat_ids)
                ).delete(synchronize_session=False)
                self.db.query(ThanhToan).filter(
                    ThanhToan.MaDatCho.in_(dat_ids)
                ).delete(synchronize_session=False)
                self.db.query(PhanHoi).filter(
                    PhanHoi.MaDatCho.in_(dat_ids)
                ).delete(synchronize_session=False)
                self.db.query(ChiTietDatCho).filter(
                    ChiTietDatCho.MaDatCho.in_(dat_ids)
                ).delete(synchronize_session=False)
                self.db.query(DatCho).filter(
                    DatCho.MaDatCho.in_(dat_ids)
                ).delete(synchronize_session=False)
            self.db.query(PhanCongHDV).filter(
                PhanCongHDV.MaLich.in_(lich_ids)
            ).delete(synchronize_session=False)
            self.db.query(AIDeXuatHuongDanVien).filter(
                AIDeXuatHuongDanVien.MaLich.in_(lich_ids)
            ).delete(synchronize_session=False)
            self.db.query(LichKhoiHanh).filter(
                LichKhoiHanh.MaLich.in_(lich_ids)
            ).delete(synchronize_session=False)

        # Nhật ký AI do test sinh ra (so với điểm khởi đầu đã chụp)
        self.db.query(AITuVanTour).filter(
            AITuVanTour.MaTuVan > self.ai_max["tu_van"]
        ).delete(synchronize_session=False)
        self.db.query(AIPhanTichPhanHoi).filter(
            AIPhanTichPhanHoi.MaPhanTich > self.ai_max["phan_tich"]
        ).delete(synchronize_session=False)

        if self.ds_khach:
            self.db.query(KhachHang).filter(
                KhachHang.MaKhachHang.in_(self.ds_khach)
            ).delete(synchronize_session=False)
        if self.ds_nguoi_dung:
            self.db.query(NguoiDung).filter(
                NguoiDung.MaNguoiDung.in_(self.ds_nguoi_dung)
            ).delete(synchronize_session=False)

        self.db.commit()


@pytest.fixture
def bc(client, db, tokens) -> BoiCanh:
    """Bộ khung dữ liệu test; tự dọn dẹp sau mỗi test."""
    b = BoiCanh(db, client, tokens)
    yield b
    b.don_dep()
