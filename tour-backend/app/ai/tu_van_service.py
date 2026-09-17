# -*- coding: utf-8 -*-
"""
app/ai/tu_van_service.py - UC-10: AI tư vấn tour theo ngân sách & sở thích.

Bám theo Mã nguồn 3.11; bổ sung ghi nhật ký vào AI_TuVanTour và Fallback
khi Gemini không khả dụng (không chặn luồng nghiệp vụ).
"""
import json

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.ai.adapter import AIServiceAdapter
from app.ai.ai_repo import AIRepository
from app.ai.fallback import fallback_tu_van_logic, with_fallback


class TourGoiY(BaseModel):
    """Một tour trong danh sách gợi ý (định dạng hiển thị cho chatbot)."""
    ma_tour: int
    ten_tour: str
    ly_do: str = Field(default="", description="Lý do/ghi chú ngắn cho tour này")


class TuVanResponse(BaseModel):
    """Kết quả tư vấn: tối đa 3 tour + lý do.

    - Các trường chuẩn UC-10 (tour_ids/ly_do/luu_y/nguon) được giữ nguyên để
      tương thích test (TC-17/18) và nhật ký AI_TuVanTour.
    - phan_hoi + tours_goi_y là định dạng hiển thị cho ChatBox (giao diện mới),
      do Service tự ghép từ tour_ids — không cần model AI sinh ra.
    """
    tour_ids: list[int] = Field(default_factory=list, max_length=3)
    ly_do: str = Field(description="Giải thích vì sao phù hợp")
    luu_y: str = Field(description="Lưu ý thêm cho khách hàng")
    phan_hoi: str = Field("", description="Câu trả lời hội thoại cho chatbot")
    tours_goi_y: list[TourGoiY] = Field(
        default_factory=list, description="Các tour đề xuất để UI vẽ thẻ gợi ý"
    )
    nguon: str = Field("Gemini", description="Gemini / Fallback")

    model_config = ConfigDict(validate_assignment=True)  # ép dict -> TourGoiY khi gán


class _TuVanCore(BaseModel):
    """Lược đồ gửi cho model AI (chỉ phần lõi UC-10).

    Không gửi phan_hoi/tours_goi_y xuống model — 2 trường hiển thị này do
    Service tự ghép từ dữ liệu tour thật (đúng tên tour, đỡ tốn token).
    """
    tour_ids: list[int] = Field(default_factory=list, max_length=3)
    ly_do: str = Field(description="Giải thích vì sao phù hợp")
    luu_y: str = Field("", description="Lưu ý thêm cho khách hàng")


PROMPT_TUVAN = """Bạn là trợ lý tư vấn tour của hệ thống TourAI.
Yeu cau khach hang: {yeu_cau}
Danh sach tour kha dung:
{tours}
Hay chon toi da 3 tour phu hop nhat voi ngan sach, so ngay va so thich.
Chi dung cac tour trong danh sach, tra loi bang tieng Viet."""


def _tao_phan_hoi(ly_do: str, luu_y: str = "") -> str:
    """Ghép câu trả lời hội thoại cho ChatBox từ kết quả UC-10."""
    doan = [f"Dựa theo yêu cầu của bạn, tôi gợi ý:\n\n{ly_do}"]
    if luu_y:
        doan.append(f"Lưu ý: {luu_y}")
    return "\n\n".join(doan)


def _tao_ds_goi_y(tours: list[dict], tour_ids: list[int]) -> list[dict]:
    """Dựng tours_goi_y (ma_tour, ten_tour, ly_do) từ tour_ids đã biết.

    Lấy tên tour thật từ danh sách tours thay vì tin model nhắc lại -> luôn
    đúng; mỗi thẻ kèm ghi chú ngắn (điểm đến · số ngày).
    """
    by_id = {t["ma_tour"]: t for t in tours}
    ds: list[dict] = []
    for tid in tour_ids:
        t = by_id.get(tid)
        ghi_chu = ""
        if t:
            phan = []
            if t.get("diem_den"):
                phan.append(t["diem_den"])
            if t.get("so_ngay"):
                phan.append(f"{t['so_ngay']} ngày")
            ghi_chu = " · ".join(phan)
        ds.append({
            "ma_tour": tid,
            "ten_tour": (t["ten_tour"] if t else f"Tour #{tid}"),
            "ly_do": ghi_chu,
        })
    return ds


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
        resp = TuVanResponse(**data, nguon="Fallback")
        resp.phan_hoi = _tao_phan_hoi(resp.ly_do, resp.luu_y)
        resp.tours_goi_y = _tao_ds_goi_y(tours, resp.tour_ids)
        return resp

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
        schema = _TuVanCore.model_json_schema()
        data = self.ai.generate(prompt, schema)
        result = TuVanResponse(**data)  # validate trước khi ghi nhật ký
        # Bổ sung định dạng hiển thị cho ChatBox (phan_hoi + tours_goi_y).
        result.phan_hoi = _tao_phan_hoi(result.ly_do, result.luu_y)
        result.tours_goi_y = _tao_ds_goi_y(tours, result.tour_ids)
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
