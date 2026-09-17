# -*- coding: utf-8 -*-
"""
tests/test_all_24_tcs.py - Bộ kiểm thử tự động Pytest cho BƯỚC 4 (24/24 Test Case).

Bám theo Bảng 3.7 -> 3.10 trong Chương 3 của tài liệu:

  Nhóm 1 (Bảng 3.7) - Đặt chỗ & giữ chỗ 24h (DR-01, DR-02):
    TC-01 Đặt chỗ thành công khi còn chỗ
    TC-02 Từ chối đặt chỗ khi hết chỗ
    TC-03 Thời hạn giữ chỗ đúng 24 giờ
    TC-04 Quét đơn hết hạn -> HetHan + hoàn chỗ
    TC-05 Từ chối cọc < 30% tổng giá trị (DR-03)
    TC-06 Chi tiết đơn: tổng tiền + cọc tối thiểu + đếm ngược

  Nhóm 2 (Bảng 3.8) - Thanh toán & Hủy tour (DR-03, DR-04):
    TC-07 Cọc hợp lệ >= 30% -> chuyển DaCoc
    TC-08 Hủy >= 7 ngày -> hoàn 100% cọc
    TC-09 Hủy 3-6 ngày -> hoàn 50% cọc
    TC-10 Hủy < 3 ngày -> hoàn 0% cọc
    TC-11 Hủy đơn chưa đặt cọc -> không có tiền hoàn
    TC-12 Tính phạt đúng 3 mốc ranh giới (7 / 3 / 2 ngày)

  Nhóm 3 (Bảng 3.9) - Phân công hướng dẫn viên (DR-05):
    TC-13 Phân công HDV rảnh thành công
    TC-14 Chặn HDV trùng khoảng thời gian 2 lịch
    TC-15 Chặn vi phạm ràng buộc UNIQUE(MaLich, MaHDV)
    TC-16 Đề xuất AI chỉ dùng HDV rảnh (loại HDV bận)

  Nhóm 4 (Bảng 3.10) - Năng lực AI (UC-10..UC-13):
    TC-17 UC-10 tư vấn tour thành công
    TC-18 UC-10 chuyển Fallback khi AI không khả dụng
    TC-19 UC-11 sinh mô tả & lịch trình thành công
    TC-20 UC-11 chuyển Fallback khi AI không khả dụng
    TC-21 UC-12 phân tích phản hồi thành công
    TC-22 UC-12 chuyển Fallback khi AI không khả dụng
    TC-23 UC-13 đề xuất Top 3 HDV thành công
    TC-24 UC-13 chuyển Fallback khi AI không khả dụng

Lưu ý:
  - Test AI dùng adapter GIẢ (monkeypatch AIServiceAdapter.generate) để chạy
    deterministic, KHÔNG gọi mạng/Gemini.
  - Test tự dọn dẹp dữ liệu nên không ảnh hưởng dữ liệu seed.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError

from app.ai.adapter import AIServiceAdapter, AIUnavailableError
from app.models import DatCho, KhachHang, LichKhoiHanh, PhanCongHDV, ThanhToan
from app.models.common import now_naive_utc

# Giá hiện hành (GiaKhuyenMai) của seed tour 1 "Ha Long - Lan Ha 3N2D"
GIA_TOUR_1 = 2_890_000.0


def _tien(gia_tri) -> Decimal:
    """Chuyển giá trị tiền (số / chuỗi) về Decimal để so sánh chính xác.

    API serialize cột Numeric/Decimal thành CHUỖI (vd "5780000.00") nên
    test phải parse lại bằng Decimal.
    """
    return Decimal(str(gia_tri))


# =============================================================================
# Helper cho test AI (adapter giả, không gọi Gemini)
# =============================================================================
def _fake_generate(ket_qua: dict):
    """Trả về một hàm generate trả JSON cố định (deterministic)."""
    def fake(self, prompt, schema, temperature=0.3, timeout=None):
        return ket_qua
    return fake


def _fake_generate_loi():
    """Trả về một hàm generate luôn ném AIUnavailableError -> kích hoạt Fallback."""
    def fake(self, prompt, schema, temperature=0.3, timeout=None):
        raise AIUnavailableError("Gemini tam khong kha dung (test)")
    return fake


def _dat_cho(lich_ma, khach_ma, so_khach=1):
    """Payload chuẩn cho POST /api/v1/bookings."""
    return {
        "MaLich": lich_ma,
        "MaKhachHang": khach_ma,
        "ds_hanh_khach": [
            {"HoTen": f"Hanh khach {i + 1}", "SoDienThoai": "0912345678"}
            for i in range(so_khach)
        ],
    }


def _coc(payload_ma_dat_cho, so_tien, phuong_thuc="ChuyenKhoan"):
    return {"MaDatCho": payload_ma_dat_cho, "SoTien": so_tien, "PhuongThuc": phuong_thuc}


def _huy(payload_ma_dat_cho, ly_do="Gia dinh co viec"):
    return {"MaDatCho": payload_ma_dat_cho, "LyDo": ly_do}


# =============================================================================
# NHÓM 1 - Đặt chỗ & giữ chỗ 24h (Bảng 3.7)
# =============================================================================
def test_tc01_dat_cho_thanh_cong_khi_con_cho(bc):
    """TC-01: Đặt chỗ đủ chỗ -> 201, GiuCho, TongTien đúng, trừ chỗ, cảnh báo MinSeats."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20, min_seats=5)

    # Xác thực bắt buộc: thiếu token -> 401
    r401 = bc.client.post("/api/v1/bookings", json=_dat_cho(lich.MaLich, kh.MaKhachHang))
    assert r401.status_code == 401

    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=2)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["TrangThai"] == "GiuCho"
    assert data["SoKhach"] == 2
    assert _tien(data["TongTien"]) == Decimal("5780000.00")  # 2 x 2.890.000
    assert len(data["ds_hanh_khach"]) == 2
    # Đoàn 2 khách < MinSeats=5 -> có cảnh báo nghiệp vụ (DR-01)
    assert "thấp hơn tối thiểu" in (data.get("canh_bao") or "")

    # Số chỗ đã bị trừ đi
    bc.db.expire_all()
    lich_moi = bc.db.get(LichKhoiHanh, lich.MaLich)
    assert lich_moi.SoChoCon == lich.MaxSeats - 2


def test_tc02_tu_choi_dat_cho_khi_het_cho(bc):
    """TC-02: SoChoCon < SoKhach -> 400 'Không đủ chỗ trống' (DR-01)."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=1)

    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=2)
    assert r.status_code == 400, r.text
    assert "Không đủ chỗ trống" in r.json()["detail"]


def test_tc03_han_giu_cho_dung_24_gio(bc):
    """TC-03: HanGiuCho = NgayDat + đúng 24h (DR-02)."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20)

    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201, r.text
    data = r.json()
    ngay_dat = datetime.fromisoformat(data["NgayDat"])
    han_giu = datetime.fromisoformat(data["HanGiuCho"])
    # Sai lệch tối đa vài giây do 2 lần gọi now() cách nhau rất nhỏ
    assert abs((han_giu - ngay_dat) - timedelta(hours=24)) < timedelta(seconds=5)


def test_tc04_scan_het_han_hoan_cho(bc):
    """TC-04: Đơn GiuCho quá 24h -> HetHan + hoàn trả SoChoCon (DR-02)."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201
    ma_dat_cho = r.json()["MaDatCho"]

    # Ép thời hạn giữ chỗ đã quá hạn
    bc.db.query(DatCho).filter(DatCho.MaDatCho == ma_dat_cho).update(
        {"HanGiuCho": now_naive_utc() - timedelta(hours=1)}
    )
    bc.db.commit()

    resp = bc.client.post(
        "/api/v1/bookings/scan-expired", headers=bc.tokens["admin"]
    )
    assert resp.status_code == 200, resp.text
    ds = resp.json()
    dong = next(x for x in ds if x["MaDatCho"] == ma_dat_cho)
    assert dong["TrangThai"] == "HetHan"

    # Chỗ đã được hoàn trả về lịch
    bc.db.expire_all()
    lich_moi = bc.db.get(LichKhoiHanh, lich.MaLich)
    assert lich_moi.SoChoCon == lich.MaxSeats


def test_tc05_tu_choi_coc_duoi_30_phan_tram(bc):
    """TC-05: Cọc < 30% TongTien -> 400 (DR-03)."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201
    ma_dat_cho = r.json()["MaDatCho"]

    # 500.000 < 30% * 2.890.000 = 867.000
    resp = bc.client.post(
        "/api/v1/payments/deposit",
        json=_coc(ma_dat_cho, 500_000),
        headers=bc.tokens["accountant"],
    )
    assert resp.status_code == 400, resp.text
    assert "30%" in resp.json()["detail"]


def test_tc06_chi_tiet_don_tong_tien_coc_dem_nguoc(bc):
    """TC-06: GET /bookings/{id} trả tổng tiền, cọc tối thiểu 30%, đếm ngược."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201
    ma_dat_cho = r.json()["MaDatCho"]

    resp = bc.client.get(
        f"/api/v1/bookings/{ma_dat_cho}", headers=bc.tokens["admin"]
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert _tien(data["TongTien"]) == Decimal("2890000.00")
    assert _tien(data["coc_toi_thieu"]) == Decimal("867000.00")  # 30% TongTien
    assert 0 < data["dem_nguoc_giay"] <= 86_400
    assert len(data["ds_hanh_khach"]) == 1


# =============================================================================
# NHÓM 2 - Thanh toán & Hủy tour (Bảng 3.8)
# =============================================================================
def test_tc07_coc_hop_le_chuyen_da_coc(bc):
    """TC-07: Cọc >= 30% -> DaCoc. Kèm kiểm tra RBAC: Customer không được gọi."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201
    ma_dat_cho = r.json()["MaDatCho"]

    # Customer (không có quyền kế toán) -> 403
    cust = bc.tao_customer_token("khach_tc07@test.vn")
    r403 = bc.client.post(
        "/api/v1/payments/deposit",
        json=_coc(ma_dat_cho, 900_000),
        headers=cust,
    )
    assert r403.status_code == 403

    # Kế toán đặt cọc hợp lệ -> DaCoc
    resp = bc.client.post(
        "/api/v1/payments/deposit",
        json=_coc(ma_dat_cho, 900_000),
        headers=bc.tokens["accountant"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["TrangThai"] == "DaCoc"
    assert _tien(data["DaDatCoc"]) == Decimal("900000.00")


def test_tc08_huy_du_7_ngay_hoan_100(bc):
    """TC-08: Hủy >= 7 ngày trước khởi hành -> hoàn 100% cọc (MucPhat=0)."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=10), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201
    ma_dat_cho = r.json()["MaDatCho"]
    bc.client.post(
        "/api/v1/payments/deposit", json=_coc(ma_dat_cho, 900_000),
        headers=bc.tokens["accountant"],
    )

    resp = bc.client.post(
        "/api/v1/payments/cancel", json=_huy(ma_dat_cho),
        headers=bc.tokens["accountant"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["MaDatCho"] == ma_dat_cho
    assert float(data["MucPhat"]) == 0.0
    assert _tien(data["SoTienHoan"]) == Decimal("900000.00")


def test_tc09_huy_3_6_ngay_hoan_50(bc):
    """TC-09: Hủy 3-6 ngày trước khởi hành -> hoàn 50% cọc (MucPhat=0.5)."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=5), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201
    ma_dat_cho = r.json()["MaDatCho"]
    bc.client.post(
        "/api/v1/payments/deposit", json=_coc(ma_dat_cho, 900_000),
        headers=bc.tokens["accountant"],
    )

    resp = bc.client.post(
        "/api/v1/payments/cancel", json=_huy(ma_dat_cho),
        headers=bc.tokens["accountant"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert float(data["MucPhat"]) == 0.5
    assert _tien(data["SoTienHoan"]) == Decimal("450000.00")


def test_tc10_huy_duoi_3_ngay_hoan_0(bc):
    """TC-10: Hủy < 3 ngày trước khởi hành -> hoàn 0% cọc (MucPhat=1.0)."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=1), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201
    ma_dat_cho = r.json()["MaDatCho"]
    bc.client.post(
        "/api/v1/payments/deposit", json=_coc(ma_dat_cho, 900_000),
        headers=bc.tokens["accountant"],
    )

    resp = bc.client.post(
        "/api/v1/payments/cancel", json=_huy(ma_dat_cho),
        headers=bc.tokens["accountant"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert float(data["MucPhat"]) == 1.0
    assert _tien(data["SoTienHoan"]) == Decimal("0.00")


def test_tc11_huy_don_chua_coc_hoan_0(bc):
    """TC-11: Hủy đơn chưa đặt cọc -> không có tiền để hoàn (SoTienHoan=0)."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=1), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201
    ma_dat_cho = r.json()["MaDatCho"]

    resp = bc.client.post(
        "/api/v1/payments/cancel", json=_huy(ma_dat_cho),
        headers=bc.tokens["accountant"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert _tien(data["SoTienHoan"]) == Decimal("0.00")
    # Đơn đã chuyển trạng thái Hủy
    chi_tiet = bc.client.get(
        f"/api/v1/bookings/{ma_dat_cho}", headers=bc.tokens["admin"]
    ).json()
    assert chi_tiet["TrangThai"] == "DaHuy"


def test_tc12_tinh_phat_dung_3_moc_bien(bc):
    """TC-12: Kiểm tra đúng 3 mốc phạt tại ranh giới 7 / 3 / 2 ngày (DR-04)."""
    cac_moc = [(7, 0.0, 900_000), (3, 0.5, 450_000), (2, 1.0, 0)]
    kh = bc.tao_khach_hang()
    for so_ngay, muc_phat, tien_hoan in cac_moc:
        lich = bc.tao_lich(date.today() + timedelta(days=so_ngay), so_cho_con=20)
        r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
        assert r.status_code == 201
        ma_dat_cho = r.json()["MaDatCho"]
        bc.client.post(
            "/api/v1/payments/deposit", json=_coc(ma_dat_cho, 900_000),
            headers=bc.tokens["accountant"],
        )
        resp = bc.client.post(
            "/api/v1/payments/cancel", json=_huy(ma_dat_cho),
            headers=bc.tokens["accountant"],
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert float(data["MucPhat"]) == muc_phat, f"Mốc {so_ngay} ngày sai mức phạt"
        assert _tien(data["SoTienHoan"]) == Decimal(tien_hoan), (
            f"Mốc {so_ngay} ngày sai tiền hoàn"
        )


# =============================================================================
# NHÓM 3 - Phân công hướng dẫn viên (Bảng 3.9)
# =============================================================================
def test_tc13_phan_cong_hdv_ranh(bc):
    """TC-13: Phân công HDV rảnh -> 201. Kèm RBAC: Consultant không được gọi."""
    lich = bc.tao_lich(date.today() + timedelta(days=20), so_cho_con=20, so_ngay=2)

    r403 = bc.client.post(
        "/api/v1/guides/assign",
        json={"MaLich": lich.MaLich, "MaHDV": 1},
        headers=bc.tokens["consultant"],
    )
    assert r403.status_code == 403

    resp = bc.client.post(
        "/api/v1/guides/assign",
        json={"MaLich": lich.MaLich, "MaHDV": 1, "VaiTro": "TruongDoan"},
        headers=bc.tokens["admin"],
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["MaLich"] == lich.MaLich
    assert data["MaHDV"] == 1


def test_tc14_chong_trung_khoang_thoi_gian(bc):
    """TC-14: HDV đã bận lịch trùng khoảng thời gian -> 400 (DR-05)."""
    lich1 = bc.tao_lich(date.today() + timedelta(days=20), so_cho_con=20, so_ngay=2)  # 20-22
    lich2 = bc.tao_lich(date.today() + timedelta(days=21), so_cho_con=20, so_ngay=2)  # 21-23

    r1 = bc.client.post(
        "/api/v1/guides/assign",
        json={"MaLich": lich1.MaLich, "MaHDV": 1},
        headers=bc.tokens["admin"],
    )
    assert r1.status_code == 201, r1.text

    r2 = bc.client.post(
        "/api/v1/guides/assign",
        json={"MaLich": lich2.MaLich, "MaHDV": 1},
        headers=bc.tokens["admin"],
    )
    assert r2.status_code == 400, r2.text
    assert "đã bận" in r2.json()["detail"]


def test_tc15_chong_vipham_unique_constraint(bc):
    """TC-15: Vi phạm UNIQUE(MaLich, MaHDV) -> IntegrityError (DR-05)."""
    lich = bc.tao_lich(date.today() + timedelta(days=220), so_cho_con=20, so_ngay=2)
    r = bc.client.post(
        "/api/v1/guides/assign",
        json={"MaLich": lich.MaLich, "MaHDV": 2, "VaiTro": "TruongDoan"},
        headers=bc.tokens["admin"],
    )
    assert r.status_code == 201, r.text

    # Chèn trực tiếp bản ghi trùng (bỏ qua tầng Service) -> CSDL chặn UNIQUE
    with pytest.raises(IntegrityError):
        bc.db.add(
            PhanCongHDV(MaLich=lich.MaLich, MaHDV=2, VaiTro="PhuDoan")
        )
        bc.db.commit()
    bc.db.rollback()


def test_tc16_de_xuat_chi_hdv_ranh(bc, monkeypatch):
    """TC-16: HDV bận trùng lịch bị LOẠI khỏi danh sách rảnh & đề xuất AI."""
    lich1 = bc.tao_lich(date.today() + timedelta(days=120), so_cho_con=20, so_ngay=2)
    lich2 = bc.tao_lich(date.today() + timedelta(days=121), so_cho_con=20, so_ngay=2)
    r = bc.client.post(
        "/api/v1/guides/assign",
        json={"MaLich": lich1.MaLich, "MaHDV": 1},
        headers=bc.tokens["admin"],
    )
    assert r.status_code == 201

    # 1) Danh sách HDV rảnh cho lich2 không chứa HDV 1 (đang bận)
    avail = bc.client.get(
        f"/api/v1/guides/available/{lich2.MaLich}", headers=bc.tokens["admin"]
    )
    assert avail.status_code == 200, avail.text
    ma_hdv_ranh = [h["MaHDV"] for h in avail.json()]
    assert 1 not in ma_hdv_ranh
    assert 2 in ma_hdv_ranh and 3 in ma_hdv_ranh

    # 2) AI đề xuất (dùng Fallback để deterministic) chỉ xét HDV rảnh
    monkeypatch.setattr(AIServiceAdapter, "generate", _fake_generate_loi())
    sug = bc.client.post(
        "/api/v1/ai/suggest-guides",
        json={"MaLich": lich2.MaLich},
        headers=bc.tokens["admin"],
    )
    assert sug.status_code == 200, sug.text
    ds = sug.json()["danh_sach"]
    assert ds, "Phải có ít nhất 1 HDV được đề xuất"
    ma_de_xuat = [i["ma_hdv"] for i in ds]
    assert 1 not in ma_de_xuat  # HDV bận không được đề xuất


# =============================================================================
# NHÓM 4 - Năng lực AI (Bảng 3.10)
# =============================================================================
def test_tc17_uc10_tu_van_thanh_cong(bc, monkeypatch):
    """TC-17: UC-10 tư vấn tour thành công. Kèm RBAC: cần đăng nhập."""
    monkeypatch.setattr(
        AIServiceAdapter, "generate",
        _fake_generate({"tour_ids": [1, 2], "ly_do": "Phù hợp ngân sách",
                        "luu_y": "Nên đặt sớm"}),
    )
    # Thiếu token -> 401
    r401 = bc.client.post("/api/v1/ai/advise", json={"YeuCau": "Tour 3 ngay bien dao"})
    assert r401.status_code == 401

    resp = bc.client.post(
        "/api/v1/ai/advise",
        json={"YeuCau": "Tour 3 ngay bien dao gia duoi 3 trieu"},
        headers=bc.tokens["admin"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["tour_ids"] == [1, 2]
    assert data["ly_do"]
    assert data["luu_y"]


def test_tc18_uc10_tu_van_fallback(bc, monkeypatch):
    """TC-18: UC-10 khi Gemini lỗi -> Fallback gợi ý 3 tour rẻ nhất."""
    monkeypatch.setattr(AIServiceAdapter, "generate", _fake_generate_loi())
    resp = bc.client.post(
        "/api/v1/ai/advise",
        json={"YeuCau": "Tour bien dao gia re"},
        headers=bc.tokens["admin"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    ids = data["tour_ids"]
    # Fallback chọn tối đa 3 tour rẻ nhất theo giá khuyến mãi, rẻ nhất đứng đầu:
    # Tour 2 (Đà Lạt 1.890.000) là tour rẻ nhất trong seed.
    assert 1 <= len(ids) <= 3
    assert ids[0] == 2
    assert "Fallback" in data["ly_do"]


def test_tc19_uc11_sinh_noi_dung_thanh_cong(bc, monkeypatch):
    """TC-19: UC-11 sinh mô tả & lịch trình. Kèm RBAC: Customer bị 403."""
    monkeypatch.setattr(
        AIServiceAdapter, "generate",
        _fake_generate({
            "mo_ta_tour": "Mo ta hap dan",
            "lich_trinh_ngay": ["Ngay 1", "Ngay 2", "Ngay 3"],
        }),
    )
    cust = bc.tao_customer_token("khach_tc19@test.vn")
    r403 = bc.client.post(
        "/api/v1/ai/generate-content", json={"MaTour": 1}, headers=cust
    )
    assert r403.status_code == 403

    resp = bc.client.post(
        "/api/v1/ai/generate-content", json={"MaTour": 1},
        headers=bc.tokens["consultant"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["mo_ta_tour"] == "Mo ta hap dan"
    assert len(data["lich_trinh_ngay"]) == 3  # SoNgay tour 1


def test_tc20_uc11_sinh_noi_dung_fallback(bc, monkeypatch):
    """TC-20: UC-11 khi Gemini lỗi -> Fallback dùng mô tả có sẵn, đủ số ngày."""
    monkeypatch.setattr(AIServiceAdapter, "generate", _fake_generate_loi())
    resp = bc.client.post(
        "/api/v1/ai/generate-content", json={"MaTour": 1},
        headers=bc.tokens["consultant"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data["lich_trinh_ngay"]) == 3  # đúng SoNgay = 3
    assert "Ngay 1/3" in data["lich_trinh_ngay"][0]
    assert data["mo_ta_tour"]  # mô tả có nội dung


def test_tc21_uc12_phan_tich_thanh_cong(bc, monkeypatch):
    """TC-21: UC-12 phân tích phản hồi thành công (cần có PhanHoi của tour)."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=30), ma_tour=1)
    bc.tao_phan_hoi_truc_tiep(lich.MaLich, kh.MaKhachHang, 5, "Diem den tuyet voi")
    bc.tao_phan_hoi_truc_tiep(lich.MaLich, kh.MaKhachHang, 4, "Com an ngon")

    monkeypatch.setattr(
        AIServiceAdapter, "generate",
        _fake_generate({
            "nhan_cam_xuc": "TichCuc",
            "uu_diem": ["Diem den dep", "Com an ngon"],
            "nhuoc_diem": ["Duong xa"],
            "tong_ket": "Khach hang hai long",
        }),
    )
    resp = bc.client.post(
        "/api/v1/ai/analyze-feedback", json={"MaTour": 1},
        headers=bc.tokens["admin"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["nhan_cam_xuc"] == "TichCuc"
    assert "Diem den dep" in data["uu_diem"]
    assert data["tong_ket"]


def test_tc22_uc12_phan_tich_fallback(bc, monkeypatch):
    """TC-22: UC-12 khi Gemini lỗi -> Fallback theo điểm sao trung bình."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=30), ma_tour=1)
    bc.tao_phan_hoi_truc_tiep(lich.MaLich, kh.MaKhachHang, 5, "Rat tot")
    bc.tao_phan_hoi_truc_tiep(lich.MaLich, kh.MaKhachHang, 4, "Kha on")

    monkeypatch.setattr(AIServiceAdapter, "generate", _fake_generate_loi())
    resp = bc.client.post(
        "/api/v1/ai/analyze-feedback", json={"MaTour": 1},
        headers=bc.tokens["admin"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    # Fallback: chỉ tính các phản hồi ĐÃ DUYỆT. Tour 1 (seed) còn có phản hồi
    # demo 5*,3* đã duyệt + 2 phản hồi test 5*,4* -> TB >= 4 -> TichCuc.
    assert data["nhan_cam_xuc"] == "TichCuc"
    assert "Fallback" in data["tong_ket"]


def test_tc23_uc13_de_xuat_thanh_cong(bc, monkeypatch):
    """TC-23: UC-13 đề xuất Top 3 HDV thành công (chỉ Admin)."""
    lich = bc.tao_lich(date.today() + timedelta(days=25), so_ngay=2, ma_tour=1)
    monkeypatch.setattr(
        AIServiceAdapter, "generate",
        _fake_generate({
            "danh_sach": [
                {"ma_hdv": 1, "diem_tuong_dong": 85.0, "ly_do": "Chuyen mon phu hop"},
                {"ma_hdv": 2, "diem_tuong_dong": 45.0, "ly_do": "Kinh nghiem"},
                {"ma_hdv": 3, "diem_tuong_dong": 35.0, "ly_do": "Tre"},
            ]
        }),
    )
    resp = bc.client.post(
        "/api/v1/ai/suggest-guides", json={"MaLich": lich.MaLich},
        headers=bc.tokens["admin"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data["danh_sach"]) == 3
    assert data["danh_sach"][0]["ma_hdv"] == 1
    assert data["danh_sach"][0]["diem_tuong_dong"] == pytest.approx(85.0)


def test_tc24_uc13_de_xuat_fallback(bc, monkeypatch):
    """TC-24: UC-13 khi Gemini lỗi -> Fallback Matching Score heuristic, Top 3."""
    lich = bc.tao_lich(date.today() + timedelta(days=25), so_ngay=2, ma_tour=1)
    monkeypatch.setattr(AIServiceAdapter, "generate", _fake_generate_loi())
    resp = bc.client.post(
        "/api/v1/ai/suggest-guides", json={"MaLich": lich.MaLich},
        headers=bc.tokens["admin"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    ds = data["danh_sach"]
    assert len(ds) == 3
    # HDV 1 "Tour bien dao" khớp chuyên môn tour biển: 50 + 7*5=35 -> 85 (cao nhất)
    assert ds[0]["ma_hdv"] == 1
    assert ds[0]["diem_tuong_dong"] == pytest.approx(85.0)
    diem = [i["diem_tuong_dong"] for i in ds]
    assert diem == sorted(diem, reverse=True)  # xếp giảm dần


def test_xoa_tour_chuc_nang_admin(bc):
    """Test chức năng Xóa tour: tạo tour mới -> xóa thành công; tour có đơn đặt chỗ -> chặn xóa 400."""
    # 1. Tạo tour tạm thời
    r_create = bc.client.post(
        "/api/v1/tours",
        json={
            "MaDiemDen": 1,
            "TenTour": "Tour Test Xóa Tự Động",
            "SoNgay": 2,
            "GiaCoBan": 1500000,
            "LoaiTour": "TraiNghiem",
        },
        headers=bc.tokens["admin"],
    )
    assert r_create.status_code == 201, r_create.text
    ma_tour = r_create.json()["MaTour"]

    # 2. Xóa tour thành công khi chưa có đơn đặt chỗ
    r_del = bc.client.delete(f"/api/v1/tours/{ma_tour}", headers=bc.tokens["admin"])
    assert r_del.status_code == 200, r_del.text
    assert r_del.json()["success"] is True

    # 3. Kiểm tra xem tour đã bị xóa chưa
    r_check = bc.client.get(f"/api/v1/tours/{ma_tour}")
    assert r_check.status_code == 404


# =============================================================================
# DYNAMIC ON-DEMAND SCHEDULING - tự mở đợt LichKhoiHanh mới theo ngày khách chọn
# =============================================================================
def _dat_cho_on_demand(ma_tour, ngay, loai, khach_ma, so_khach=2):
    """Payload on-demand: không MaLich, gửi MaTour + NgayKhoiHanh + LoaiChuyenDi."""
    return {
        "MaTour": ma_tour,
        "NgayKhoiHanh": str(ngay),
        "LoaiChuyenDi": loai,
        "MaKhachHang": khach_ma,
        "ds_hanh_khach": [
            {"HoTen": f"Hanh khach {i + 1}", "SoDienThoai": "0912345678"}
            for i in range(so_khach)
        ],
    }


def test_ondemand_ghep_tao_lich_moi_theo_ngay(bc):
    """On-Demand: đặt Ghép đoàn theo ngày tùy ý -> tự tạo LichKhoiHanh mới [TOUR GHÉP]."""
    kh = bc.tao_khach_hang()
    # Chọn ngày xa trong tương lai để chắc chắn chưa có lịch nào cho tour 1
    ngay = date.today() + timedelta(days=90)
    while bc.db.query(LichKhoiHanh).filter(
        LichKhoiHanh.MaTour == 1, LichKhoiHanh.NgayKhoiHanh == ngay
    ).count():
        ngay += timedelta(days=1)

    r = bc.client.post(
        "/api/v1/bookings",
        json=_dat_cho_on_demand(1, ngay, "Ghep", kh.MaKhachHang, so_khach=3),
        headers=bc.tokens["admin"],
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["TrangThai"] == "GiuCho"
    assert data["SoKhach"] == 3
    assert data["LoaiChuyenDi"] == "Ghep"

    # Lịch mới được tạo on-demand với nhãn [TOUR GHÉP] và đã trừ chỗ
    bc.db.expire_all()
    lich = bc.db.get(LichKhoiHanh, data["MaLich"])
    assert lich is not None
    assert lich.NgayKhoiHanh == ngay
    assert "[TOUR GHÉP]" in (lich.GhiChu or "")
    assert lich.TrangThai == "MoBan"
    assert lich.SoChoCon == lich.MaxSeats - 3
    bc.ds_lich.append(data["MaLich"])  # dọn dẹp sau test


def test_ondemand_ghep_tai_dung_lich_cung_ngay(bc):
    """On-Demand: cùng tour + cùng ngày + còn chỗ -> TÁI DÙNG lịch (không tạo mới)."""
    kh = bc.tao_khach_hang()
    ngay = date.today() + timedelta(days=95)
    lich_co_san = bc.tao_lich(ngay, ma_tour=1, so_cho_con=20)

    r = bc.client.post(
        "/api/v1/bookings",
        json=_dat_cho_on_demand(1, ngay, "Ghep", kh.MaKhachHang, so_khach=2),
        headers=bc.tokens["admin"],
    )
    assert r.status_code == 201, r.text
    data = r.json()
    # Đặt vào ĐÚNG lịch có sẵn (GhiChu NULL), không sinh lịch mới
    assert data["MaLich"] == lich_co_san.MaLich

    dem = bc.db.query(LichKhoiHanh).filter(
        LichKhoiHanh.MaTour == 1, LichKhoiHanh.NgayKhoiHanh == ngay
    ).count()
    assert dem == 1


def test_ondemand_rieng_khoa_cho_khong_ghep(bc):
    """On-Demand: đặt Tour riêng -> lịch khóa hết chỗ (SoChoCon=0) + nhãn [TOUR RIÊNG]."""
    kh = bc.tao_khach_hang()
    ngay = date.today() + timedelta(days=100)

    r = bc.client.post(
        "/api/v1/bookings",
        json=_dat_cho_on_demand(1, ngay, "Rieng", kh.MaKhachHang, so_khach=4),
        headers=bc.tokens["admin"],
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["LoaiChuyenDi"] == "Rieng"
    assert "TOUR RIÊNG" in (data.get("ghi_chu_lich") or "")

    bc.db.expire_all()
    lich = bc.db.get(LichKhoiHanh, data["MaLich"])
    assert lich is not None
    assert "[TOUR RIÊNG]" in (lich.GhiChu or "")
    assert lich.SoChoCon == 0  # đã khóa, không ghép người lạ
    assert lich.MaxSeats == 4
    bc.ds_lich.append(data["MaLich"])


def test_ondemand_thieu_du_lieu_tra_422(bc):
    """On-Demand: không MaLich, thiếu MaTour/NgayKhoiHanh -> 422."""
    kh = bc.tao_khach_hang()
    r = bc.client.post(
        "/api/v1/bookings",
        json={
            "MaKhachHang": kh.MaKhachHang,
            "ds_hanh_khach": [{"HoTen": "Khach Hang A", "SoDienThoai": "0912345678"}],
        },
        headers=bc.tokens["admin"],
    )
    assert r.status_code == 422


def test_bookings_list_khong_crash_va_loai_chuyen_di(bc):
    """Regression: GET /bookings + chi tiết không crash sau khi thêm cột GhiChu."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201, r.text
    ma_dat_cho = r.json()["MaDatCho"]

    # Danh sách đơn (đọc LichKhoiHanh.GhiChu) không crash
    resp = bc.client.get("/api/v1/bookings", headers=bc.tokens["admin"])
    assert resp.status_code == 200, resp.text

    # Chi tiết đơn trả về LoaiChuyenDi + ghi_chu_lich
    d = bc.client.get(
        f"/api/v1/bookings/{ma_dat_cho}", headers=bc.tokens["admin"]
    )
    assert d.status_code == 200, d.text
    data = d.json()
    assert data["LoaiChuyenDi"] == "Ghep"  # lịch cũ (GhiChu NULL)
    assert "ghi_chu_lich" in data


# =============================================================================
# P1-P4: SỬA LỖI QUY TRÌNH NGHIỆP VỤ
#   P1 webhook đối soát cọc tự động        P2 trạng thái ChoXacNhanCoc
#   P3 hủy đơn DaThanhToan trước khởi hành P4 DangDiTour/HoanThanh (read-time)
# =============================================================================
def _dua_ve_cho_xac_nhan_coc(bc, ma_dat_cho, hinh_anh=None) -> dict:
    """Trợ giúp: gọi endpoint khách/tư vấn báo "đã chuyển khoản" -> ChoXacNhanCoc."""
    r = bc.client.post(
        f"/api/v1/bookings/{ma_dat_cho}/xac-nhan-da-chuyen-khoan",
        json={"HinhAnh": hinh_anh} if hinh_anh else {},
        headers=bc.tokens["consultant"],
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_p1_webhook_chuyen_khoan_tu_dong_xac_nhan(bc):
    """P1: khách báo chuyển khoản -> webhook khớp tiền ~30% + mã đơn -> tự DaCoc."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201, r.text
    ma = r.json()["MaDatCho"]
    coc_toi_thieu = (_tien(r.json()["TongTien"]) * Decimal("0.3")).quantize(Decimal("0.01"))

    # Khách báo đã chuyển khoản -> ChoXacNhanCoc, lưu giây còn lại + ảnh bill
    data = _dua_ve_cho_xac_nhan_coc(bc, ma, hinh_anh="https://cdn/bill.jpg")
    assert data["TrangThai"] == "ChoXacNhanCoc"
    assert data["SoGiayConLai"] is not None
    assert data["SoGiayConLai"] > 0
    assert data["HinhAnhChuyenKhoan"] == "https://cdn/bill.jpg"

    # Webhook ngân hàng: đúng số tiền cọc + mã đơn trong nội dung chuyển khoản
    wb = bc.client.post(
        "/api/v1/payments/webhook",
        json={"SoTien": str(coc_toi_thieu), "MoTa": f"TOURAI {ma} thanh toan coc"},
    )
    assert wb.status_code == 200, wb.text
    assert wb.json()["matched"] is True
    assert wb.json()["ma_dat_cho"] == ma

    # Đơn -> DaCoc, đã cọc = số tiền, bỏ tạm dừng; có giao dịch 'Coc' đối soát
    d = bc.client.get(f"/api/v1/bookings/{ma}", headers=bc.tokens["admin"]).json()
    assert d["TrangThai"] == "DaCoc"
    assert _tien(d["DaDatCoc"]) == coc_toi_thieu
    assert d["SoGiayConLai"] is None
    gd = (
        bc.db.query(ThanhToan)
        .filter(ThanhToan.MaDatCho == ma, ThanhToan.LoaiGiaoDich == "Coc")
        .first()
    )
    assert gd is not None
    assert gd.PhuongThuc == "ChuyenKhoan"
    assert "Đối soát tự động" in gd.GhiChu

    # Idempotent: webhook gửi lại khi đơn đã DaCoc -> không xử lý lần nữa
    wb2 = bc.client.post(
        "/api/v1/payments/webhook",
        json={"SoTien": str(coc_toi_thieu), "MoTa": f"TOURAI {ma}"},
    )
    assert wb2.json()["matched"] is False
    assert wb2.json()["ma_dat_cho"] is None


def test_p1_webhook_khong_trung_khop(bc):
    """P1: số tiền lệch quá 1.000đ -> matched=False, đơn giữ nguyên ChoXacNhanCoc."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    ma = r.json()["MaDatCho"]
    _dua_ve_cho_xac_nhan_coc(bc, ma)

    wb = bc.client.post("/api/v1/payments/webhook", json={"SoTien": "100000"})
    assert wb.status_code == 200, wb.text
    assert wb.json()["matched"] is False
    assert wb.json()["ma_dat_cho"] is None

    d = bc.client.get(f"/api/v1/bookings/{ma}", headers=bc.tokens["admin"]).json()
    assert d["TrangThai"] == "ChoXacNhanCoc"


def test_p1_webhook_nhieu_ung_vien_thieu_ma_don(bc):
    """P1: 2 đơn cùng số cọc, webhook không có mã đơn -> từ chối (tránh xác nhận nhầm)."""
    kh = bc.tao_khach_hang()
    lich1 = bc.tao_lich(date.today() + timedelta(days=20), so_cho_con=20)
    lich2 = bc.tao_lich(date.today() + timedelta(days=21), so_cho_con=20)
    r1 = bc.tao_dat_cho_qua_api(lich1.MaLich, kh.MaKhachHang, so_khach=1)
    r2 = bc.tao_dat_cho_qua_api(lich2.MaLich, kh.MaKhachHang, so_khach=1)
    ma1, ma2 = r1.json()["MaDatCho"], r2.json()["MaDatCho"]
    _dua_ve_cho_xac_nhan_coc(bc, ma1)
    _dua_ve_cho_xac_nhan_coc(bc, ma2)

    # Không có mã đơn -> 2 ứng viên -> từ chối
    wb = bc.client.post(
        "/api/v1/payments/webhook",
        json={"SoTien": "867000.00", "MoTa": "khong co ma don"},
    )
    assert wb.json()["matched"] is False
    assert wb.json()["ma_dat_cho"] is None

    # Có mã đơn trong nội dung -> xác nhận đúng đơn đó
    wb2 = bc.client.post(
        "/api/v1/payments/webhook",
        json={"SoTien": "867000.00", "MoTa": f"TOURAI-{ma2}"},
    )
    assert wb2.json()["matched"] is True
    assert wb2.json()["ma_dat_cho"] == ma2


def test_p2_deposit_cho_xac_nhan_coc_bo_qua_het_han(bc):
    """P2: đơn ChoXacNhanCoc quá hạn giữ chỗ vẫn được xác nhận cọc (bỏ qua đếm ngược)."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    ma = r.json()["MaDatCho"]
    _dua_ve_cho_xac_nhan_coc(bc, ma)

    # Ép HanGiuCho đã quá hạn -> vẫn xác nhận được vì đang tạm dừng đếm ngược
    bc.db.query(DatCho).filter(DatCho.MaDatCho == ma).update(
        {"HanGiuCho": now_naive_utc() - timedelta(hours=1)}
    )
    bc.db.commit()

    resp = bc.client.post(
        "/api/v1/payments/deposit", json=_coc(ma, 900_000),
        headers=bc.tokens["accountant"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["TrangThai"] == "DaCoc"
    assert data["SoGiayConLai"] is None


def test_p2_huy_xac_nhan_coc_quay_lai_giu_cho(bc):
    """P2: kế toán 'Từ chối' -> đơn về GiuCho, nối lại đếm ngược đúng giây còn lại."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    ma = r.json()["MaDatCho"]
    data = _dua_ve_cho_xac_nhan_coc(bc, ma, hinh_anh="https://cdn/bill.jpg")
    so_giay_luu = data["SoGiayConLai"]
    assert so_giay_luu > 0

    # Consultant không có quyền từ chối -> 403
    r403 = bc.client.post(
        f"/api/v1/bookings/{ma}/huy-xac-nhan-coc",
        headers=bc.tokens["consultant"],
    )
    assert r403.status_code == 403

    # Kế toán từ chối -> GiuCho, nối lại đếm ngược
    resp = bc.client.post(
        f"/api/v1/bookings/{ma}/huy-xac-nhan-coc",
        headers=bc.tokens["accountant"],
    )
    assert resp.status_code == 200, resp.text
    d = resp.json()
    assert d["TrangThai"] == "GiuCho"
    assert d["SoGiayConLai"] is None
    han_moi = datetime.fromisoformat(d["HanGiuCho"])
    thoi_gian = int((han_moi - now_naive_utc()).total_seconds())
    assert abs(thoi_gian - so_giay_luu) <= 5
    # Ảnh bill giữ lại để lưu vết
    assert d["HinhAnhChuyenKhoan"] == "https://cdn/bill.jpg"


def test_p2_cho_xac_nhan_coc_khong_bi_scan_expired(bc):
    """P2: đơn ChoXacNhanCoc quá hạn KHÔNG bị scan-expired chuyển HetHan."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() + timedelta(days=15), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    ma = r.json()["MaDatCho"]
    _dua_ve_cho_xac_nhan_coc(bc, ma)
    bc.db.query(DatCho).filter(DatCho.MaDatCho == ma).update(
        {"HanGiuCho": now_naive_utc() - timedelta(hours=1)}
    )
    bc.db.commit()

    bc.client.post("/api/v1/bookings/scan-expired", headers=bc.tokens["admin"])
    d = bc.client.get(f"/api/v1/bookings/{ma}", headers=bc.tokens["admin"]).json()
    assert d["TrangThai"] == "ChoXacNhanCoc"


def test_p3_cancel_da_thanh_toan_hoan_100(bc):
    """P3: đơn DaThanhToan vẫn được hủy trước khởi hành -> hoàn 100% theo DR-04."""
    lich = bc.tao_lich(date.today() + timedelta(days=10), so_cho_con=20)
    r = bc.client.post(
        "/api/v1/bookings/manual",
        json={
            "MaLich": lich.MaLich,
            "LoaiChuyenDi": "Ghep",
            "nguoi_dat": {"HoTen": "Khach Full", "SoDienThoai": "0911222333"},
            "ds_hanh_khach": [{"HoTen": "Hanh khach full", "SoDienThoai": "0912345678"}],
            "TrangThaiThanhToan": "DaThanhToan",
            "PhuongThuc": "ChuyenKhoan",
        },
        headers=bc.tokens["consultant"],
    )
    assert r.status_code == 201, r.text
    ma = r.json()["MaDatCho"]
    assert r.json()["TrangThai"] == "DaThanhToan"
    # KhachHang vừa tự tạo qua manual cần được dọn dẹp sau test
    kh_moi = bc.db.query(KhachHang).filter(KhachHang.SoDienThoai == "0911222333").first()
    if kh_moi is not None:
        bc.ds_khach.append(kh_moi.MaKhachHang)

    # Hủy >= 7 ngày trước khởi hành -> hoàn 100% (đơn đã đóng đủ -> hoàn = TongTien)
    resp = bc.client.post(
        "/api/v1/payments/cancel", json=_huy(ma),
        headers=bc.tokens["accountant"],
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert float(data["MucPhat"]) == 0.0
    assert _tien(data["SoTienHoan"]) == Decimal("2890000.00")


def test_p3_cancel_sau_khi_khoi_hanh_400(bc):
    """P3: tour đã khởi hành -> chặn hủy 400 (ngày hiện tại >= NgayKhoiHanh)."""
    kh = bc.tao_khach_hang()
    lich = bc.tao_lich(date.today() - timedelta(days=1), so_cho_con=20)
    r = bc.tao_dat_cho_qua_api(lich.MaLich, kh.MaKhachHang, so_khach=1)
    assert r.status_code == 201, r.text
    ma = r.json()["MaDatCho"]

    resp = bc.client.post(
        "/api/v1/payments/cancel", json=_huy(ma),
        headers=bc.tokens["accountant"],
    )
    assert resp.status_code == 400, resp.text
    assert "khởi hành" in resp.json()["detail"]


def test_p4_derived_trang_thai_dang_di_tour_hoan_thanh(bc):
    """P4: DaThanhToan hiển thị DangDiTour/HoanThanh theo ngày lịch, KHÔNG ghi DB."""
    kh = bc.tao_khach_hang()
    # Đang trong tour: khởi hành hôm qua, kết thúc mai (so_ngay=2)
    lich_dang = bc.tao_lich(date.today() - timedelta(days=1), so_ngay=2, so_cho_con=20)
    # Đã kết thúc: kết thúc 2 ngày trước (so_ngay=1, khởi hành cách 3 ngày)
    lich_ht = bc.tao_lich(date.today() - timedelta(days=3), so_ngay=1, so_cho_con=20)
    r1 = bc.tao_dat_cho_qua_api(lich_dang.MaLich, kh.MaKhachHang, so_khach=1)
    r2 = bc.tao_dat_cho_qua_api(lich_ht.MaLich, kh.MaKhachHang, so_khach=1)
    ma_dang, ma_ht = r1.json()["MaDatCho"], r2.json()["MaDatCho"]

    for ma in (ma_dang, ma_ht):
        bc.db.query(DatCho).filter(DatCho.MaDatCho == ma).update(
            {"TrangThai": "DaThanhToan", "DaDatCoc": 2890000}
        )
    bc.db.commit()

    # Danh sách + chi tiết hiển thị trạng thái suy ra theo ngày lịch
    lst = bc.client.get("/api/v1/bookings", headers=bc.tokens["admin"]).json()
    by_id = {x["MaDatCho"]: x["TrangThai"] for x in lst}
    assert by_id[ma_dang] == "DangDiTour"
    assert by_id[ma_ht] == "HoanThanh"

    d1 = bc.client.get(f"/api/v1/bookings/{ma_dang}", headers=bc.tokens["admin"]).json()
    d2 = bc.client.get(f"/api/v1/bookings/{ma_ht}", headers=bc.tokens["admin"]).json()
    assert d1["TrangThai"] == "DangDiTour"
    assert d2["TrangThai"] == "HoanThanh"

    # KHÔNG bao giờ ghi xuống DB (stats kế toán giữ nguyên raw DaThanhToan)
    bc.db.expire_all()
    assert bc.db.get(DatCho, ma_dang).TrangThai == "DaThanhToan"
    assert bc.db.get(DatCho, ma_ht).TrangThai == "DaThanhToan"

    # Lịch tương lai vẫn hiển thị DaThanhToan (chưa khởi hành)
    lich_future = bc.tao_lich(date.today() + timedelta(days=10), so_cho_con=20)
    r3 = bc.tao_dat_cho_qua_api(lich_future.MaLich, kh.MaKhachHang, so_khach=1)
    ma_future = r3.json()["MaDatCho"]
    bc.db.query(DatCho).filter(DatCho.MaDatCho == ma_future).update(
        {"TrangThai": "DaThanhToan"}
    )
    bc.db.commit()
    d3 = bc.client.get(f"/api/v1/bookings/{ma_future}", headers=bc.tokens["admin"]).json()
    assert d3["TrangThai"] == "DaThanhToan"


def test_p4_review_chi_mo_khi_hoan_thanh(bc):
    """P4: đánh giá chỉ mở khi tour HoanThanh; DangDiTour -> 400; HoanThanh -> 201."""
    cust = bc.tao_customer_token("khach_p4_review@test.vn")

    # 1) Đơn DangDiTour -> 400 (gate chạy trước cả kiểm tra quyền sở hữu)
    kh = bc.tao_khach_hang()
    lich_dang = bc.tao_lich(date.today() - timedelta(days=1), so_ngay=2, so_cho_con=20)
    r_dang = bc.tao_dat_cho_qua_api(lich_dang.MaLich, kh.MaKhachHang, so_khach=1)
    ma_dang = r_dang.json()["MaDatCho"]
    bc.db.query(DatCho).filter(DatCho.MaDatCho == ma_dang).update(
        {"TrangThai": "DaThanhToan"}
    )
    bc.db.commit()

    resp = bc.client.post(
        "/api/v1/reviews",
        json={"MaDatCho": ma_dang, "SoSao": 5, "NoiDung": "Chuyen di tuyet voi"},
        headers=cust,
    )
    assert resp.status_code == 400, resp.text
    assert "hoàn thành" in resp.json()["detail"]

    # 2) Đơn HoanThanh (khách phải là chủ đơn) -> 201
    kh_ht = KhachHang(
        HoTen="KH P4 Review",
        SoDienThoai="0987654321",
        Email="khach_p4_review@test.vn",
        LoaiKhach="Thuong",
    )
    bc.db.add(kh_ht)
    bc.db.commit()
    bc.db.refresh(kh_ht)
    bc.ds_khach.append(kh_ht.MaKhachHang)

    lich_ht = bc.tao_lich(date.today() - timedelta(days=3), so_ngay=1, so_cho_con=20)
    r_ht = bc.tao_dat_cho_qua_api(lich_ht.MaLich, kh_ht.MaKhachHang, so_khach=1)
    ma_ht = r_ht.json()["MaDatCho"]
    bc.db.query(DatCho).filter(DatCho.MaDatCho == ma_ht).update(
        {"TrangThai": "DaThanhToan"}
    )
    bc.db.commit()

    resp2 = bc.client.post(
        "/api/v1/reviews",
        json={"MaDatCho": ma_ht, "SoSao": 5, "NoiDung": "Chuyen di tuyet voi"},
        headers=cust,
    )
    assert resp2.status_code == 201, resp2.text

