# -*- coding: utf-8 -*-
"""
app/ai/fallback.py - Cơ chế Dự phòng (Fallback) khi Gemini không khả dụng.

Bám theo Mã nguồn 3.15 trong tài liệu, mở rộng đủ 4 use case:
  UC-10 -> fallback_tu_van_logic   : gợi ý theo giá thấp nhất
  UC-11 -> fallback_noi_dung_logic : dùng mô tả/lịch trình mẫu có sẵn
  UC-12 -> fallback_phan_tich_logic: thống kê điểm sao trung bình (1-5)
  UC-13 -> fallback_de_xuat_logic  : Matching Score heuristic (không cần AI)

Các hàm *_logic là logic thuần túy trả dict. Mỗi Service định nghĩa method
_fallback (nhận self, ghi nhật ký TrangThai='Fallback' vào CSDL) và bọc
phương thức chính bằng decorator with_fallback("_fallback").
"""
from functools import wraps
import logging

from pydantic import BaseModel, ValidationError

from app.ai.adapter import AIUnavailableError
from app.config import settings

logger = logging.getLogger("ai")


def with_fallback(fallback_spec):
    """Bọc hàm gọi AI: nếu lỗi AI hoặc kết quả không hợp lệ -> chạy fallback.

    fallback_spec có thể là:
      - callable: gọi trực tiếp fallback_spec(*args, **kwargs)
                  (dùng khi fallback là hàm thường nhận self đầu tiên);
      - str     : tên method fallback trên instance, gọi với
                  getattr(instance, name)(*args[1:], **kwargs).

    Nếu settings.AI_FALLBACK_ENABLED=False -> để lỗi lan lên (không fallback).
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            # Thử tối đa 3 lần khi AI trả JSON sai schema (lỗi validate) — mô
            # hình tạo sinh đôi khi trả sai lần đầu nhưng đúng lần sau; lỗi kết
            # nối (AIUnavailableError) thì không thử lại mà fallback ngay.
            for attempt in range(1, 4):
                try:
                    result = func(*args, **kwargs)
                    # Gắn nhãn nguồn AI đúng provider (DeepSeek/Gemini) khi thành công
                    if isinstance(result, BaseModel) and hasattr(result, "nguon"):
                        result.nguon = (
                            "DeepSeek" if settings.AI_PROVIDER == "deepseek" else "Gemini"
                        )
                    return result
                except ValidationError as exc:
                    last_exc = exc
                    logger.warning("AI trả JSON sai schema (lần %d): %s", attempt, exc)
                except AIUnavailableError as exc:
                    last_exc = exc
                    break

            if not settings.AI_FALLBACK_ENABLED and last_exc is not None:
                raise last_exc
            if callable(fallback_spec):
                return fallback_spec(*args, **kwargs)
            return getattr(args[0], fallback_spec)(*args[1:], **kwargs)
        return wrapper
    return decorator


# ---- Fallback UC-10: gợi ý tour theo giá (không cần AI) ----
def fallback_tu_van_logic(yeu_cau: str, tours: list[dict]) -> dict:
    """Chọn 3 tour có gia_hien_tai thấp nhất (không cần AI)."""
    tours_sort = sorted(tours, key=lambda t: t["gia_hien_tai"])
    return {
        "tour_ids": [t["ma_tour"] for t in tours_sort[:3]],
        "ly_do": "Fallback: goi y theo gia thap nhat.",
        "luu_y": "AI tam gian doan, ket qua co the chua toi uu.",
    }


# ---- Fallback UC-11: sinh nội dung từ mô tả gốc ----
def fallback_noi_dung_logic(tour: dict) -> dict:
    """Dùng mô tả có sẵn, sinh lịch trình mẫu từng ngày (không cần AI)."""
    mo_ta = tour.get("mo_ta") or f"Tour du lich tai {tour.get('diem_den', '')}"
    so_ngay = tour["so_ngay"]
    lich = [
        f"Ngay {i + 1}/{so_ngay}: tham quan va nghi ngoi theo lich trinh."
        for i in range(so_ngay)
    ]
    return {"mo_ta_tour": mo_ta, "lich_trinh_ngay": lich}


# ---- Fallback UC-12: phân tích theo điểm sao trung bình ----
def fallback_phan_tich_logic(ten_tour: str, phan_hois: list[str]) -> dict:
    """phan_hois dang 'sao|noi_dung'. Nhan cam xuc theo diem TB (1-5)."""
    avg = sum(int(p.split("|")[0]) for p in phan_hois) / len(phan_hois)
    nhan = "TichCuc" if avg >= 4 else ("TrungLap" if avg >= 3 else "TieuCuc")
    return {
        "nhan_cam_xuc": nhan,
        "uu_diem": [],
        "nhuoc_diem": [],
        "tong_ket": f"Fallback: diem trung binh {avg:.1f}/5.",
    }


# ---- Fallback UC-13: Matching Score heuristic (chuyên môn + kinh nghiệm) ----
def fallback_de_xuat_logic(tour: dict, hdvs: list[dict]) -> dict:
    """Tính điểm heuristic (50 chuyên môn + 50 kinh nghiệm), chọn Top 3."""
    yeu_cau = (tour.get("chuyen_mon_yeu_cau") or "").lower()

    def diem(hdv: dict) -> float:
        chuyen_mon = (hdv.get("chuyen_mon") or "").lower()
        diem_mon = 50 if (yeu_cau and yeu_cau in chuyen_mon) else 20
        diem_kn = min(hdv.get("so_nam_kinh_nghiem", 0) * 5, 50)
        return round(diem_mon + diem_kn, 2)

    ds = sorted(hdvs, key=diem, reverse=True)[:3]
    return {
        "danh_sach": [
            {
                "ma_hdv": h["ma_hdv"],
                "diem_tuong_dong": diem(h),
                "ly_do": "Fallback: diem theo chuyen mon va kinh nghiem.",
            }
            for h in ds
        ]
    }
