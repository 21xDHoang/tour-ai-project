"""
app/utils/security.py - Băm mật khẩu (BCrypt) và tạo/xác thực JWT.

Sử dụng passlib[bcrypt]. Lưu ý: passlib 1.7.4 chỉ tương thích bcrypt < 4.1,
nên trong môi trường cài đặt cần pin `bcrypt==4.0.1`.
"""
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Băm mật khẩu bằng BCrypt (lưu vào MatKhauHash)."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Kiểm tra mật khẩu dạng văn bản với hash đã lưu."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict, expires_delta: timedelta | None = None
) -> str:
    """Tạo JWT với thời hạn mặc định lấy từ cấu hình (480 phút)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )


def decode_access_token(token: str) -> dict:
    """Giải mã JWT; ném jwt.PyJWTError nếu token không hợp lệ/hết hạn."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
