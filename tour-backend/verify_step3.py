# -*- coding: utf-8 -*-
"""
verify_step3.py - Kiểm thử xác minh tầng AI Services Layer (BƯỚC 3).

Chạy trên Supabase PostgreSQL thật + Google Gemini API (gemini-3.6-flash).
Các use case AI UC-10..13 gọi Gemini thật; nếu AI lỗi/không có mạng, hệ thống
tự động chuyển Fallback (không chặn luồng nghiệp vụ) -> vẫn PASS.

Cách chạy (từ thư mục tour-backend):
    .\\.venv\\Scripts\\python.exe verify_step3.py

Các kịch bản:
  A. Adapter & Structured JSON Outputs (gọi Gemini thật).
  B. UC-10 tư vấn tour  -> ghi AI_TuVanTour.
  C. UC-11 sinh mô tả & lịch trình -> đúng SoNgay ngày.
  D. UC-12 phân tích phản hồi -> ghi AI_PhanTichPhanHoi.
  E. UC-13 đề xuất Top 3 HDV -> ghi AI_DeXuatHuongDanVien (XepHang 1..3).
  F. Fallback logic thuần túy (không cần AI).
  G. Decorator with_fallback kích hoạt khi AI lỗi + ghi TrangThai='Fallback'.
  H. Tắt AI_FALLBACK_ENABLED -> lỗi AI lan lên (không fallback).
"""
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from sqlalchemy import func

from app.ai import (
    AIUnavailableError,
    AIServiceAdapter,
    DeXuatHDVService,
    DeXuatResponse,
    NoiDungResponse,
    NoiDungService,
    PhanHoiService,
    PhanTichResponse,
    TuVanResponse,
    TuVanService,
    fallback_de_xuat_logic,
    fallback_noi_dung_logic,
    fallback_phan_tich_logic,
    fallback_tu_van_logic,
)
from app.config import settings
from app.database import SessionLocal
from app.models import (
    AIDeXuatHuongDanVien,
    AIPhanTichPhanHoi,
    AITuVanTour,
    DiemDen,
    HuongDanVien,
    Tour,
)

# Cho model gemini-3.6-flash đủ thời gian trả Structured Outputs (tránh 504 giả)
settings.GEMINI_TIMEOUT = 90

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


print("=" * 70)
print("VERIFY BƯỚC 3 - AI SERVICES LAYER (Gemini " + settings.GEMINI_MODEL + ")")
print("=" * 70)

db = SessionLocal()
try:
    # ---------- Chuẩn bị dữ liệu thật từ Supabase ----------
    rows = (
        db.query(Tour, DiemDen)
        .join(DiemDen, DiemDen.MaDiemDen == Tour.MaDiemDen)
        .order_by(Tour.MaTour)
        .all()
    )
    tours = [
        {
            "ma_tour": t.MaTour,
            "ten_tour": t.TenTour,
            "diem_den": dd.TenDiemDen,
            "so_ngay": t.SoNgay,
            "gia_hien_tai": float(t.GiaKhuyenMai or t.GiaCoBan),
            "mo_ta": t.MoTa or "",
        }
        for t, dd in rows
    ]
    tour_hl = dict(tours[0])  # Ha Long - Lan Ha 3N2D (3 ngày)
    tour_hdv = dict(tour_hl)
    tour_hdv["chuyen_mon_yeu_cau"] = "tour bien dao"

    ds_hdv = db.query(HuongDanVien).order_by(HuongDanVien.MaHDV).all()
    hdvs = [
        {
            "ma_hdv": h.MaHDV,
            "ho_ten": h.HoTen,
            "chuyen_mon": h.ChuyenMon or "",
            "so_nam_kinh_nghiem": h.SoNamKinhNghiem,
        }
        for h in ds_hdv
    ]

    print(f"\n[Chuẩn bị] {len(tours)} tour, {len(hdvs)} HDV từ Supabase.")

    # ---------- A. Adapter & Structured Outputs ----------
    print("\nA. Adapter & Structured JSON Outputs (gọi Gemini thật)")
    adapter = AIServiceAdapter()
    try:
        data = adapter.generate(
            "Tra loi JSON cho cau: mot tour du lich bien 3 ngay",
            {
                "type": "object",
                "properties": {
                    "ten": {"type": "string"},
                    "so_ngay": {"type": "integer"},
                },
                "required": ["ten", "so_ngay"],
            },
        )
        ok = isinstance(data, dict) and "ten" in data and "so_ngay" in data
        check("A.1 Gemini trả JSON đúng schema (Structured Outputs)", ok, str(data))
    except AIUnavailableError as exc:
        check("A.1 Gemini trả JSON đúng schema (Structured Outputs)", False,
              f"AI offline: {str(exc)[:120]}")

    # ---------- B. UC-10 ----------
    print("\nB. UC-10 - AI tư vấn tour (ghi AI_TuVanTour)")
    svc10 = TuVanService()
    dem_truoc = db.query(AITuVanTour).count()
    r10 = svc10.tu_van(
        db,
        "Muon di bien 3 ngay, ngan sach khoang 3 trieu, gia dinh",
        tours,
        nguoi_dung_id=1,
    )
    dem_sau = db.query(AITuVanTour).count()
    ma_tour_hop_le = {t["ma_tour"] for t in tours}
    ok = (
        isinstance(r10, TuVanResponse)
        and 0 < len(r10.tour_ids) <= 3
        and all(x in ma_tour_hop_le for x in r10.tour_ids)
    )
    check("B.1 Kết quả tư vấn tối đa 3 tour hợp lệ", ok, f"tour_ids={r10.tour_ids}")
    check("B.2 Có lý do và lưu ý bằng tiếng Việt",
          bool(r10.ly_do.strip()) and bool(r10.luu_y.strip()))
    check("B.3 Ghi nhật ký AI_TuVanTour", dem_sau == dem_truoc + 1,
          f"TrangThai gần nhất={db.query(AITuVanTour).order_by(AITuVanTour.MaTuVan.desc()).first().TrangThai}")

    # ---------- C. UC-11 ----------
    print("\nC. UC-11 - AI sinh mô tả & lịch trình từng ngày")
    r11 = NoiDungService().sinh_noi_dung(tour_hl)
    ok = isinstance(r11, NoiDungResponse) and bool(r11.mo_ta_tour.strip())
    check("C.1 Trả về mô tả tour", ok, r11.mo_ta_tour[:60] + "...")
    check("C.2 Lịch trình đúng SoNgay (3 ngày)",
          len(r11.lich_trinh_ngay) == tour_hl["so_ngay"],
          f"len={len(r11.lich_trinh_ngay)}")

    # ---------- D. UC-12 ----------
    print("\nD. UC-12 - AI phân tích phản hồi (ghi AI_PhanTichPhanHoi)")
    phan_hois = [
        "5|Phong sach, canh dep, HDV nhiet tinh",
        "4|An uong ngon, chi phi hop ly",
        "3|Tuyen di dai mot chut",
    ]
    svc12 = PhanHoiService()
    dem_truoc = db.query(AIPhanTichPhanHoi).count()
    r12 = svc12.phan_tich(db, 1, tour_hl["ten_tour"], phan_hois)
    dem_sau = db.query(AIPhanTichPhanHoi).count()
    ok = (
        isinstance(r12, PhanTichResponse)
        and r12.nhan_cam_xuc in {"TichCuc", "TrungLap", "TieuCuc"}
    )
    check("D.1 Nhãn cảm xúc hợp lệ", ok, f"nhan_cam_xuc={r12.nhan_cam_xuc}")
    check("D.2 Ghi nhật ký AI_PhanTichPhanHoi", dem_sau == dem_truoc + 1,
          f"SoPhanHoi={r12.tong_ket}")

    # ---------- E. UC-13 ----------
    print("\nE. UC-13 - AI đề xuất Top 3 HDV (ghi AI_DeXuatHuongDanVien)")
    svc13 = DeXuatHDVService()
    dem_truoc = db.query(AIDeXuatHuongDanVien).count()
    r13 = svc13.de_xuat(db, 1, tour_hdv, hdvs)
    dem_sau = db.query(AIDeXuatHuongDanVien).count()
    ma_hdv_hop_le = {h["ma_hdv"] for h in hdvs}
    ok = (
        isinstance(r13, DeXuatResponse)
        and len(r13.danh_sach) == 3
        and all(0 <= i.diem_tuong_dong <= 100 for i in r13.danh_sach)
        and all(i.ma_hdv in ma_hdv_hop_le for i in r13.danh_sach)
    )
    check("E.1 Top 3 HDV với điểm 0-100 hợp lệ", ok,
          f"[{', '.join(str(i.ma_hdv) + ':' + str(i.diem_tuong_dong) for i in r13.danh_sach)}]")
    check("E.2 Ghi 3 dòng AI_DeXuatHuongDanVien (XepHang 1..3)",
          dem_sau == dem_truoc + 3,
          f"3 đề xuất cho MaLich=1")

    # ---------- F. Fallback logic thuần túy ----------
    print("\nF. Fallback logic (không cần AI)")
    fb10 = fallback_tu_van_logic("ngan sach thap", tours)
    check("F.1 fallback_tu_van: chọn tour giá thấp nhất",
          fb10["tour_ids"] == [2, 1], f"tour_ids={fb10['tour_ids']} (2=1.89tr, 1=2.89tr)")
    fb11 = fallback_noi_dung_logic(tour_hl)
    check("F.2 fallback_noi_dung: đủ lịch trình theo SoNgay",
          len(fb11["lich_trinh_ngay"]) == 3)
    fb12 = fallback_phan_tich_logic(
        "t", ["5|x", "3|y"]
    )
    check("F.3 fallback_phan_tich: TB=4.0 -> TichCuc",
          fb12["nhan_cam_xuc"] == "TichCuc", fb12["tong_ket"])
    fb13 = fallback_de_xuat_logic(tour_hdv, hdvs)
    check("F.4 fallback_de_xuat: HDV đúng chuyên môn đứng đầu",
          fb13["danh_sach"][0]["ma_hdv"] == 1,
          f"Top1=HDV{fb13['danh_sach'][0]['ma_hdv']} ({fb13['danh_sach'][0]['diem_tuong_dong']})")

    # ---------- G. Decorator with_fallback kích hoạt ----------
    print("\nG. with_fallback khi AI lỗi (giả lập mất mạng)")

    class FakeAI:
        """Adapter giả luôn ném AIUnavailableError để mô phỏng AI lỗi."""

        def generate(self, prompt, schema, temperature=0.3, timeout=None):
            raise AIUnavailableError("fake: mat mang / loi API")

    svc_g = TuVanService()
    svc_g.ai = FakeAI()
    dem_truoc = db.query(AITuVanTour).count()
    r_g = svc_g.tu_van(db, "Ngan sach thap", tours, nguoi_dung_id=1)
    dem_sau = db.query(AITuVanTour).count()
    log_g = (
        db.query(AITuVanTour).order_by(AITuVanTour.MaTuVan.desc()).first()
    )
    check("G.1 Chuyển sang Fallback khi AI lỗi", r_g.ly_do.startswith("Fallback"),
          r_g.ly_do)
    check("G.2 Fallback vẫn ghi nhật ký AI_TuVanTour", dem_sau == dem_truoc + 1)
    check("G.3 Nhật ký có TrangThai='Fallback'", log_g.TrangThai == "Fallback",
          log_g.TrangThai)

    # ---------- H. Tắt Fallback ----------
    print("\nH. AI_FALLBACK_ENABLED=False -> lỗi lan lên (không fallback)")
    svc_h = TuVanService()
    svc_h.ai = FakeAI()
    old = settings.AI_FALLBACK_ENABLED
    settings.AI_FALLBACK_ENABLED = False
    lan_len = False
    try:
        try:
            svc_h.tu_van(db, "Ngan sach thap", tours)
        except AIUnavailableError:
            lan_len = True
    finally:
        settings.AI_FALLBACK_ENABLED = old
    check("H.1 Tắt fallback: AIUnavailableError lan lên", lan_len)

    # ---------- Tổng kết ----------
    print("\n" + "=" * 70)
    print(f"KẾT QUẢ: {passed} PASS / {failed} FAIL / Tổng {passed + failed}")
    print("=" * 70)
finally:
    db.close()

sys.exit(1 if failed else 0)
