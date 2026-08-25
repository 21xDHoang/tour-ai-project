# -*- coding: utf-8 -*-
"""
app/ai/noi_dung_service.py - UC-11: sinh mô tả & lịch trình từng ngày.

Bám theo Mã nguồn 3.12; có Fallback dùng mô tả có sẵn. UC-11 không có bảng
nhật ký riêng - nội dung sinh ra được lưu trực tiếp vào cột MoTa /
LichTrinhTomTat của bảng Tour.
"""
from pydantic import BaseModel, Field

from app.ai.adapter import AIServiceAdapter
from app.ai.fallback import fallback_noi_dung_logic, with_fallback


class NoiDungResponse(BaseModel):
    """Mô tả tour và lịch trình chi tiết từng ngày."""
    mo_ta_tour: str = Field(description="Đoạn mô tả hấp dẫn, ngắn gọn")
    lich_trinh_ngay: list[str] = Field(
        description="Một phần tử cho mỗi ngày tour")
    nguon: str = Field("Gemini", description="Gemini / Fallback")


PROMPT_NOIDUNG = """Sinh noi dung gioi thieu cho tour du lich:
- Ten tour: {ten_tour}
- Diem den: {diem_den}
- So ngay: {so_ngay}
- Thong tin co ban: {mo_ta}
Viet bang tieng Viet. So phan tu lich_trinh_ngay phai dung bang {so_ngay}.
Khong them thong tin ngoai du lieu duoc cung cap."""


class NoiDungService:
    """UC-11: sinh mô tả hấp dẫn + lịch trình từng ngày, có Fallback."""

    def __init__(self):
        self.ai = AIServiceAdapter()

    def _fallback(self, tour: dict):
        """Fallback UC-11: dùng mô tả gốc + lịch trình mẫu (không cần AI)."""
        data = fallback_noi_dung_logic(tour)
        return NoiDungResponse(**data, nguon="Fallback")

    @with_fallback("_fallback")
    def sinh_noi_dung(self, tour: dict) -> NoiDungResponse:
        """Sinh nội dung giới thiệu cho một tour.

        - tour: dict có ten_tour, diem_den, so_ngay, mo_ta (tùy chọn).
        - Lịch trình được chuẩn hóa đúng bằng SoNgay ngày của tour.
        """
        prompt = PROMPT_NOIDUNG.format(
            ten_tour=tour["ten_tour"],
            diem_den=tour["diem_den"],
            so_ngay=tour["so_ngay"],
            mo_ta=tour.get("mo_ta", ""),
        )
        schema = NoiDungResponse.model_json_schema()
        data = self.ai.generate(prompt, schema)
        result = NoiDungResponse(**data)
        # Chuan hoa lai so ngay neu mo hinh tra thieu/thua
        n = tour["so_ngay"]
        result.lich_trinh_ngay = (result.lich_trinh_ngay + [""] * n)[:n]
        return result

    def sinh_noi_dung_tour(self, tour: dict) -> NoiDungResponse:
        """Alias theo đặc tả BƯỚC 4 -> gọi sinh_noi_dung (UC-11)."""
        return self.sinh_noi_dung(tour)
