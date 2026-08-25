# -*- coding: utf-8 -*-
"""
app/schemas/lead.py - DTO cho nhóm chức năng Lead (Yêu cầu tư vấn).

Tiếp nhận khách hàng tiềm năng từ Web/Chatbot/Fanpage/Zalo/Hotline.
TrangThai phễu: Moi / DangLienHe / DaBaoGia / DangChot / ThatBai.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LeadCreate(BaseModel):
    """Form tư vấn công khai trên web khách hàng (không cần đăng nhập)."""

    HoTen: str = Field(..., min_length=2, max_length=100, description="Họ tên khách")
    SoDienThoai: str = Field(..., min_length=8, max_length=20)
    Email: str | None = Field(None, max_length=120)
    NoiDung: str | None = None
    TourQuanTam: str | None = Field(None, max_length=200)
    Nguon: str = Field("Web", max_length=30)


class LeadItem(BaseModel):
    """Lead trong danh sách (kèm tên người phụ trách)."""

    model_config = ConfigDict(from_attributes=True)

    MaYeuCau: int
    HoTen: str
    SoDienThoai: str
    Email: str | None = None
    NoiDung: str | None = None
    TourQuanTam: str | None = None
    Nguon: str
    TrangThai: str
    NguoiPhuTrachID: int | None = None
    ten_nguoi_phu_trach: str | None = None
    NgayTao: datetime


class LeadUpdate(BaseModel):
    """Cập nhật lead: đổi trạng thái phễu hoặc gán/phụ trách."""

    TrangThai: str | None = Field(
        None, description="Moi/DangLienHe/DaBaoGia/DangChot/ThatBai"
    )
    NguoiPhuTrachID: int | None = Field(
        None, description="null để bỏ phụ trách"
    )
