# -*- coding: utf-8 -*-
"""
app/utils/auth.py - Xác thực JWT (Bearer) & Phân quyền RBAC cho 4 vai trò.

Các hàm băm/kiểm tra mật khẩu và tạo/giải mã JWT nằm ở app/utils/security.py;
module này cung cấp 2 dependency FastAPI dùng chung cho mọi router:
  - get_current_user: xác thực Bearer Token -> trả về NguoiDung hiện tại
    (401 "Token không hợp lệ hoặc đã hết hạn" nếu thiếu/sai/hết hạn).
  - require_roles(...): factory phân quyền theo VaiTro
    (Admin / Consultant / Accountant / Customer), 403 nếu không được phép.
"""
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import NguoiDung
from app.utils.security import (
    create_access_token,  # noqa: F401 - tái xuất cho router auth
    decode_access_token,
    hash_password,  # noqa: F401 - tái xuất cho router auth
    verify_password,  # noqa: F401 - tái xuất cho router auth
)

THONG_BAO_LOI_TOKEN = "Token không hợp lệ hoặc đã hết hạn"

# Xác thực qua header "Authorization: Bearer <token>"
_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> NguoiDung:
    """Giải mã Bearer Token, truy vấn CSDL và trả về người dùng hiện tại."""
    if credentials is None:
        raise HTTPException(status_code=401, detail=THONG_BAO_LOI_TOKEN)
    try:
        payload = decode_access_token(credentials.credentials)
        ma_nguoi_dung = payload.get("sub")
        if ma_nguoi_dung is None:
            raise HTTPException(status_code=401, detail=THONG_BAO_LOI_TOKEN)
        user = (
            db.query(NguoiDung)
            .filter(NguoiDung.MaNguoiDung == int(ma_nguoi_dung))
            .first()
        )
    except (jwt.PyJWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail=THONG_BAO_LOI_TOKEN)
    if user is None:
        raise HTTPException(status_code=401, detail=THONG_BAO_LOI_TOKEN)
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> NguoiDung | None:
    """Xác thực người dùng nếu có token, hoặc trả về None nếu là khách ẩn danh."""
    if credentials is None:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        ma_nguoi_dung = payload.get("sub")
        if ma_nguoi_dung is None:
            return None
        return (
            db.query(NguoiDung)
            .filter(NguoiDung.MaNguoiDung == int(ma_nguoi_dung))
            .first()
        )
    except Exception:
        return None


def require_roles(allowed_roles: list[str]):
    """Factory trả về dependency kiểm tra VaiTro người dùng (RBAC).

    Ví dụ: `require_roles(["Admin", "Consultant"])` - chỉ Admin/Consultant
    được đi tiếp, các vai trò khác nhận 403.
    """
    def checker(user: NguoiDung = Depends(get_current_user)) -> NguoiDung:
        if user.VaiTro not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền thực hiện thao tác này",
            )
        return user

    return checker
