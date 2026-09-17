# -*- coding: utf-8 -*-
"""
app/routers/auth.py - Endpoint Xác thực & tài khoản.

  POST /api/v1/auth/login    - đăng nhập -> JWT + thông tin user
  POST /api/v1/auth/register - khách hàng đăng ký tài khoản (VaiTro='Customer')
                               kèm hồ sơ KhachHang
  GET  /api/v1/auth/me       - thông tin tài khoản hiện tại (cần đăng nhập)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import KhachHang, NguoiDung
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
    """
    Khách hàng đăng ký tài khoản mới (luôn gán VaiTro='Customer').

    Tạo kèm hồ sơ KhachHang ngay tại đây, trong cùng transaction với tài khoản.
    Trước đây hồ sơ chỉ được tạo lười ở lần đầu gọi /customers/my và khi đó
    SoDienThoai rỗng — mà bàn đặt tour thủ công lại dò khách theo SĐT
    (booking_service._tim_hoac_tao_khach_hang), nên hồ sơ rỗng SĐT làm hỏng
    luôn khả năng khớp khách của nhân viên.
    """
    if db.query(NguoiDung).filter(NguoiDung.Email == body.Email).first():
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    user = NguoiDung(
        HoTen=body.HoTen,
        Email=body.Email,
        MatKhauHash=hash_password(body.MatKhau),
        VaiTro="Customer",
    )
    db.add(user)

    # Hồ sơ khách: khớp theo EMAIL, tuyệt đối không khớp theo SĐT.
    # Nếu khớp theo SĐT thì một người đăng ký bằng số của người khác (gõ nhầm,
    # hoặc cố ý) sẽ được gán vào hồ sơ của người đó — và /customers/my/bookings
    # trả về toàn bộ lịch sử đặt tour của hồ sơ ấy. Đó là rò rỉ dữ liệu chứ
    # không phải gộp trùng. Email là thứ duy nhất đã được xác thực ở bước này.
    kh = db.query(KhachHang).filter(KhachHang.Email == body.Email).first()
    if kh is None:
        db.add(
            KhachHang(
                HoTen=body.HoTen,
                Email=body.Email,
                SoDienThoai=body.SoDienThoai,
                LoaiKhach="Thuong",
                GhiChu="Tạo khi khách đăng ký tài khoản",
            )
        )
    elif not (kh.SoDienThoai or "").strip():
        # Hồ sơ có sẵn (thường là khách cũ chưa từng có tài khoản) đang trống
        # SĐT thì điền vào. Cùng email nghĩa là cùng người, nên không rủi ro.
        kh.SoDienThoai = body.SoDienThoai

    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def me(user: NguoiDung = Depends(get_current_user)):
    """Lấy thông tin tài khoản đang đăng nhập."""
    return user
