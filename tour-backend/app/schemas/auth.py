# -*- coding: utf-8 -*-
"""
app/schemas/auth.py - DTO cho nhóm chức năng Xác thực & Người dùng.

Bao gồm request/response cho đăng nhập, đăng ký và thông tin người dùng.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    """Yêu cầu đăng nhập: email + mật khẩu."""

    Email: str = Field(..., description="Email đăng nhập")
    MatKhau: str = Field(..., description="Mật khẩu")


class RegisterRequest(BaseModel):
    """Yêu cầu tạo tài khoản mới."""

    HoTen: str = Field(..., min_length=2, description="Họ tên người dùng")
    Email: str = Field(..., description="Email duy nhất")
    MatKhau: str = Field(..., min_length=6, description="Mật khẩu")
    VaiTro: str = Field(
        "Customer", description="Vai trò: Admin / Consultant / Accountant / Customer"
    )


class TokenResponse(BaseModel):
    """Phản hồi đăng nhập thành công: JWT access token."""

    access_token: str = Field(..., description="JWT token")
    token_type: str = Field("bearer", description="Loại token")


class LoginResponse(TokenResponse):
    """Phản hồi đăng nhập: token + thông tin người dùng (MaNguoiDung, HoTen, Email, VaiTro)."""

    user: UserResponse


class UserResponse(BaseModel):
    """Thông tin người dùng trả về cho client."""

    model_config = ConfigDict(from_attributes=True)

    MaNguoiDung: int
    HoTen: str
    Email: str
    VaiTro: str
    TrangThai: str
    NgayTao: datetime
