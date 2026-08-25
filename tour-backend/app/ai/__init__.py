# -*- coding: utf-8 -*-
"""
app/ai/ - Tầng Trí tuệ Nhân tạo (AI Services Layer) - BƯỚC 3.

Các module:
  adapter.py             : AIServiceAdapter - điểm truy cập duy nhất tới Gemini
  fallback.py            : cơ chế Dự phòng (with_fallback) + logic fallback
  ai_repo.py             : ghi nhật ký xử lý AI vào CSDL Supabase
  tu_van_service.py      : UC-10 - AI tư vấn tour
  noi_dung_service.py    : UC-11 - AI sinh mô tả & lịch trình
  phan_hoi_service.py    : UC-12 - AI phân tích phản hồi
  de_xuat_hdv_service.py : UC-13 - AI đề xuất Top 3 hướng dẫn viên
"""
from app.ai.adapter import AIServiceAdapter, AIUnavailableError
from app.ai.de_xuat_hdv_service import DeXuatHDVService, DeXuatResponse
from app.ai.fallback import (
    fallback_de_xuat_logic,
    fallback_noi_dung_logic,
    fallback_phan_tich_logic,
    fallback_tu_van_logic,
    with_fallback,
)
from app.ai.noi_dung_service import NoiDungResponse, NoiDungService
from app.ai.phan_hoi_service import PhanHoiService, PhanTichResponse
from app.ai.tu_van_service import TuVanResponse, TuVanService

__all__ = [
    "AIServiceAdapter",
    "AIUnavailableError",
    "TuVanService",
    "TuVanResponse",
    "NoiDungService",
    "NoiDungResponse",
    "PhanHoiService",
    "PhanTichResponse",
    "DeXuatHDVService",
    "DeXuatResponse",
    "with_fallback",
    "fallback_tu_van_logic",
    "fallback_noi_dung_logic",
    "fallback_phan_tich_logic",
    "fallback_de_xuat_logic",
]
