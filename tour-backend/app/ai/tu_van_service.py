# -*- coding: utf-8 -*-
"""
app/ai/tu_van_service.py - UC-10: AI tư vấn tour theo ngân sách & sở thích.

Bám theo Mã nguồn 3.11; bổ sung ghi nhật ký vào AI_TuVanTour và Fallback
khi Gemini không khả dụng (không chặn luồng nghiệp vụ).
"""
import json

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.adapter import AIServiceAdapter
from app.ai.ai_repo import AIRepository
from app.ai.fallback import fallback_tu_van_logic, with_fallback


class TuVanResponse(BaseModel):
    """Kết quả tư vấn: tối đa 3 tour + lý do."""
    tour_ids: list[int] = Field(default_factory=list, max_length=3)
    ly_do: str = Field(description="Giải thích vì sao phù hợp")
    luu_y: str = Field(description="Lưu ý thêm cho khách hàng")
    nguon: str = Field("Gemini", description="Gemini / Fallback")


PROMPT_TUVAN = """Bạn là trợ lý tư vấn tour của hệ thống TourAI.
Yeu cau khach hang: {yeu_cau}
Danh sach tour kha dung:
{tours}
Hay chon toi da 3 tour phu hop nhat voi ngan sach, so ngay va so thich.
Chi dung cac tour trong danh sach, tra loi bang tieng Viet."""


class TuVanService:
    """UC-10: tư vấn tour, ghi nhật ký AI_TuVanTour, có Fallback."""

    def __init__(self):
        self.ai = AIServiceAdapter()

    def _fallback(self, db, yeu_cau, tours, nguoi_dung_id=None,
                  khach_hang_id=None):
        """Fallback UC-10: gợi ý theo giá thấp nhất (không cần AI)."""
        data = fallback_tu_van_logic(yeu_cau, tours)
        if db is not None:
            AIRepository.ghi_log_tu_van(
                db, yeu_cau, data, trang_thai="Fallback",
                nguoi_dung_id=nguoi_dung_id, khach_hang_id=khach_hang_id,
            )
            db.commit()
        return TuVanResponse(**data, nguon="Fallback")

    @with_fallback("_fallback")
    def tu_van(self, db: Session, yeu_cau: str, tours: list[dict],
               nguoi_dung_id: int | None = None,
               khach_hang_id: int | None = None) -> TuVanResponse:
        """Tư vấn tối đa 3 tour phù hợp nhất với yêu cầu khách hàng.

        - tours: danh sách tour khả dụng, mỗi phần tử có ma_tour, ten_tour,
          diem_den, so_ngay, gia_hien_tai, mo_ta, chuyen_mon_yeu_cau...
        - Ghi nhật ký 'ThanhCong' vào AI_TuVanTour khi AI phản hồi thành công,
          'Fallback' khi phải dùng phương án dự phòng.
        """
        prompt = PROMPT_TUVAN.format(
            yeu_cau=yeu_cau,
            tours=json.dumps(tours, ensure_ascii=False, indent=2),
        )
        schema = TuVanResponse.model_json_schema()
        data = self.ai.generate(prompt, schema)
        result = TuVanResponse(**data)  # validate trước khi ghi nhật ký
        AIRepository.ghi_log_tu_van(
            db, yeu_cau, data, trang_thai="ThanhCong",
            nguoi_dung_id=nguoi_dung_id, khach_hang_id=khach_hang_id,
        )
        db.commit()
        return result

    def tu_van_tour(self, db: Session, yeu_cau: str, tours: list[dict],
                    nguoi_dung_id: int | None = None,
                    khach_hang_id: int | None = None) -> TuVanResponse:
        """Alias theo đặc tả BƯỚC 4 -> gọi tu_van (UC-10)."""
        return self.tu_van(
            db, yeu_cau, tours,
            nguoi_dung_id=nguoi_dung_id, khach_hang_id=khach_hang_id,
        )
