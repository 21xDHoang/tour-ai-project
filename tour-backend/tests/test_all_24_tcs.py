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
from app.models import DatCho, LichKhoiHanh, PhanCongHDV
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
    lich = bc.tao_lich(date.today() + timedelta(days=20), so_cho_con=20, so_ngay=2)
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
    lich1 = bc.tao_lich(date.today() + timedelta(days=20), so_cho_con=20, so_ngay=2)
    lich2 = bc.tao_lich(date.today() + timedelta(days=21), so_cho_con=20, so_ngay=2)
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
