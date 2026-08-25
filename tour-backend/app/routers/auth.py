# -*- coding: utf-8 -*-
"""
app/routers/auth.py - Endpoint Xác thực & tài khoản.

  POST /api/v1/auth/login    - đăng nhập -> JWT + thông tin user
  POST /api/v1/auth/register - khách hàng đăng ký tài khoản (VaiTro='Customer')
  GET  /api/v1/auth/me       - thông tin tài khoản hiện tại (cần đăng nhập)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import NguoiDung
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, UserResponse
from app.utils.auth import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Đăng nhập bằng email + mật khẩu, trả về JWT access token."""
    user = db.query(NguoiDung).filter(NguoiDung.Email == body.Email).first()
    if user is None or not verify_password(body.MatKhau, user.MatKhauHash):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    if user.TrangThai != "Active":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa")

    token = create_access_token({"sub": str(user.MaNguoiDung)})
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=UserResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Khách hàng đăng ký tài khoản mới (luôn gán VaiTro='Customer')."""
    if db.query(NguoiDung).filter(NguoiDung.Email == body.Email).first():
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    user = NguoiDung(
        HoTen=body.HoTen,
        Email=body.Email,
        MatKhauHash=hash_password(body.MatKhau),
        VaiTro="Customer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def me(user: NguoiDung = Depends(get_current_user)):
    """Lấy thông tin tài khoản đang đăng nhập."""
    return user
