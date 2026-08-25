# -*- coding: utf-8 -*-
"""
app/ai/phan_hoi_service.py - UC-12: phân tích cảm xúc & ưu/nhược điểm.

Bám theo Mã nguồn 3.13; bổ sung ghi nhật ký vào AI_PhanTichPhanHoi và
Fallback theo điểm sao trung bình khi Gemini không khả dụng.
"""
from typing import Literal

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.adapter import AIServiceAdapter
from app.ai.ai_repo import AIRepository
from app.ai.fallback import fallback_phan_tich_logic, with_fallback


class PhanTichResponse(BaseModel):
    """Kết quả phân tích phản hồi của một tour."""
    nhan_cam_xuc: Literal["TichCuc", "TrungLap", "TieuCuc"]
    uu_diem: list[str] = Field(default_factory=list)
    nhuoc_diem: list[str] = Field(default_factory=list)
    tong_ket: str
    nguon: str = Field("Gemini", description="Gemini / Fallback")


PROMPT_PHANHOI = """Duoi day la {n} phan hoi cua khach hang ve tour "{ten_tour}":
{noi_dung}
Hay phan tich: (1) cam xuc chung la TichCuc/TrungLap/TieuCuc;
(2) liet ke toi da 4 uu diem; (3) liet ke toi da 4 nhuoc diem;
(4) viet mot cau tong ket. Tra loi bang tieng Viet."""

PROMPT_PHANHOI_HDV = """Duoi day la {n} phan hoi cua khach hang ve hướng dẫn viên "{ten_hdv}":
{noi_dung}
Hay phan tich: (1) cam xuc chung la TichCuc/TrungLap/TieuCuc;
(2) liet ke toi da 4 uu diem; (3) liet ke toi da 4 nhuoc diem;
(4) viet mot cau tong ket. Tra loi bang tieng Viet."""


class PhanHoiService:
    """UC-12: phân tích phản hồi, ghi nhật ký AI_PhanTichPhanHoi, có Fallback."""

    def __init__(self):
        self.ai = AIServiceAdapter()

    def _fallback(self, db, ma_tour, ten_tour, phan_hois):
        """Fallback UC-12: thống kê theo điểm sao trung bình (không cần AI).

        Chú ý: tham số phải KHỚP THỨ TỰ với lời gọi từ decorator
        with_fallback (args[1:]) là (db, ma_tour, ten_tour, phan_hois).
        """
        data = fallback_phan_tich_logic(ten_tour, phan_hois)
        if db is not None and ma_tour is not None:
            AIRepository.ghi_log_phan_tich(
                db, ma_tour, data["nhan_cam_xuc"], data["uu_diem"],
                data["nhuoc_diem"], data["tong_ket"], len(phan_hois),
            )
            db.commit()
        return PhanTichResponse(**data, nguon="Fallback")

    @with_fallback("_fallback")
    def phan_tich(self, db: Session, ma_tour: int, ten_tour: str,
                  phan_hois: list[str]) -> PhanTichResponse:
        """Phân tích cảm xúc + ưu/nhược điểm từ tập phản hồi của một tour.

        - phan_hois: danh sách chuỗi dạng "so_sao|noi_dung" (so_sao từ 1..5).
        - Ghi nhật ký 'ThanhCong' vào AI_PhanTichPhanHoi, 'Fallback' nếu
          phải dùng phương án dự phòng.
        """
        prompt = PROMPT_PHANHOI.format(
            n=len(phan_hois),
            ten_tour=ten_tour,
            noi_dung="\n- ".join(phan_hois),
        )
        schema = PhanTichResponse.model_json_schema()
        data = self.ai.generate(prompt, schema)
        result = PhanTichResponse(**data)  # validate trước khi ghi nhật ký
        AIRepository.ghi_log_phan_tich(
            db, ma_tour, result.nhan_cam_xuc, result.uu_diem,
            result.nhuoc_diem, result.tong_ket, len(phan_hois),
        )
        db.commit()
        return result

    def phan_tich_danh_gia_tour(self, db: Session, ma_tour: int,
                                ten_tour: str,
                                phan_hois: list[str]) -> PhanTichResponse:
        """Alias theo đặc tả BƯỚC 4 -> gọi phan_tich (UC-12)."""
        return self.phan_tich(db, ma_tour, ten_tour, phan_hois)

    def _fallback_hdv(self, ten_hdv, phan_hois):
        """Fallback phân tích cấp HDV (không cần AI, không ghi nhật ký DB)."""
        data = fallback_phan_tich_logic(ten_hdv, phan_hois)
        return PhanTichResponse(**data, nguon="Fallback")

    @with_fallback("_fallback_hdv")
    def phan_tich_hdv(self, ten_hdv: str, phan_hois: list[str]) -> PhanTichResponse:
        """Phân tích cảm xúc + ưu/nhược điểm từ phản hồi về một HDV.

        Không ghi nhật ký (bảng AI_PhanTichPhanHoi khóa theo MaTour, không
        phù hợp phân tích cấp HDV).
        """
        prompt = PROMPT_PHANHOI_HDV.format(
            n=len(phan_hois),
            ten_hdv=ten_hdv,
            noi_dung="\n- ".join(phan_hois),
        )
        schema = PhanTichResponse.model_json_schema()
        data = self.ai.generate(prompt, schema)
        return PhanTichResponse(**data)
