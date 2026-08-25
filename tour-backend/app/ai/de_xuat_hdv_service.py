# -*- coding: utf-8 -*-
"""
app/ai/de_xuat_hdv_service.py - UC-13: đề xuất Top 3 HDV (Matching Score).

Bám theo Mã nguồn 3.14; bổ sung ghi nhật ký vào AI_DeXuatHuongDanVien và
Fallback dùng hàm tinh_diem_heuristic khi Gemini không khả dụng.
"""
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.adapter import AIServiceAdapter
from app.ai.ai_repo import AIRepository
from app.ai.fallback import fallback_de_xuat_logic, with_fallback


class DeXuatItem(BaseModel):
    """Một đề xuất HDV với điểm tương đồng 0-100."""
    ma_hdv: int
    diem_tuong_dong: float = Field(ge=0, le=100)
    ly_do: str


class DeXuatResponse(BaseModel):
    """Top 3 HDV được đề xuất."""
    danh_sach: list[DeXuatItem] = Field(..., min_length=1, max_length=3)
    nguon: str = Field("Gemini", description="Gemini / Fallback")


PROMPT_DEXUAT = """Can phan cong huong dan vien (HDV) cho chuyen tour:
- Tour: {ten_tour} ({so_ngay} ngay), diem den {diem_den}
- Chuyen mon yeu cau du kien: {yeu_cau}

Danh sach HDV kha dung (da loai HDV ban trong ngay):
{hdvs}

Hay chon 3 HDV phu hop nhat, tinh diem tuong dong 0-100 va neu ly do.
Tra loi bang tieng Viet."""


class DeXuatHDVService:
    """UC-13: tính Matching Score & đề xuất Top 3 HDV, ghi nhật ký, có Fallback."""

    def __init__(self):
        self.ai = AIServiceAdapter()

    def tinh_diem_heuristic(self, tour: dict, hdv: dict) -> float:
        """Fallback: 50 điểm theo chuyên môn, 50 điểm theo kinh nghiệm."""
        yeu_cau = (tour.get("chuyen_mon_yeu_cau") or "").lower()
        chuyen_mon = (hdv.get("chuyen_mon") or "").lower()
        diem_mon = 50 if (yeu_cau and yeu_cau in chuyen_mon) else 20
        diem_kn = min(hdv.get("so_nam_kinh_nghiem", 0) * 5, 50)
        return round(diem_mon + diem_kn, 2)

    def _fallback(self, db, ma_lich, tour, hdvs):
        """Fallback UC-13: đề xuất Top 3 theo điểm heuristic (không cần AI)."""
        data = fallback_de_xuat_logic(tour, hdvs)
        if db is not None:
            AIRepository.ghi_log_de_xuat(db, ma_lich, data["danh_sach"])
            db.commit()
        return DeXuatResponse(**data, nguon="Fallback")

    @with_fallback("_fallback")
    def de_xuat(self, db: Session, ma_lich: int, tour: dict,
                hdvs: list[dict]) -> DeXuatResponse:
        """Đề xuất Top 3 HDV phù hợp nhất cho một lịch khởi hành.

        - tour: dict có ten_tour, so_ngay, diem_den, chuyen_mon_yeu_cau...
        - hdvs: danh sách HDV khả dụng (đã loại HDV bận theo DR-05),
          mỗi phần tử có ma_hdv, ho_ten, chuyen_mon, so_nam_kinh_nghiem.
        - Ghi Top 3 vào AI_DeXuatHuongDanVien với XepHang 1..3.
        """
        prompt = PROMPT_DEXUAT.format(
            ten_tour=tour["ten_tour"],
            so_ngay=tour["so_ngay"],
            diem_den=tour["diem_den"],
            yeu_cau=tour.get("chuyen_mon_yeu_cau", ""),
            hdvs="\n".join(
                f"- HDV {h['ma_hdv']}: {h['ho_ten']} | {h['chuyen_mon']} | "
                f"{h['so_nam_kinh_nghiem']} nam" for h in hdvs),
        )
        schema = DeXuatResponse.model_json_schema()
        data = self.ai.generate(prompt, schema)
        result = DeXuatResponse(**data)  # validate trước khi ghi nhật ký
        AIRepository.ghi_log_de_xuat(db, ma_lich, result.model_dump()["danh_sach"])
        db.commit()
        return result

    def de_xuat_hdv(self, db: Session, ma_lich: int, tour: dict,
                    hdvs: list[dict]) -> DeXuatResponse:
        """Alias theo đặc tả BƯỚC 4 -> gọi de_xuat (UC-13)."""
        return self.de_xuat(db, ma_lich, tour, hdvs)
