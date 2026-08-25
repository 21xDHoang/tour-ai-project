"""
app/config.py - Nạp cấu hình từ file .env.

Chỉ chạy trên máy chủ (backend), khóa Gemini API / mật khẩu CSDL / khóa JWT
không bao giờ lộ ra phía frontend.
"""
import os

from dotenv import load_dotenv

load_dotenv()  # nạp biến môi trường (chỉ chạy trên máy chủ)


class Settings:
    """Tập trung toàn bộ cấu hình nhạy cảm đọc từ biến môi trường."""

    # Chuỗi kết nối Supabase PostgreSQL
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:password@localhost:5432/postgres",
    )

    # Google Gemini API
    # Lưu ý: dòng gemini-1.5-flash / gemini-2.5-flash đã bị Google ngừng cấp
    # cho tài khoản mới (2026), dùng gemini-3.6-flash theo khuyến nghị của API.
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    # Thời gian chờ tối đa (giây) cho một lời gọi Gemini - dùng trong Fallback
    GEMINI_TIMEOUT = int(os.getenv("GEMINI_TIMEOUT", "30"))
    # Bật/tắt cơ chế Dự phòng (Fallback) khi AI lỗi/không có mạng
    AI_FALLBACK_ENABLED = os.getenv("AI_FALLBACK_ENABLED", "true").lower() == "true"

    # Nhà cung cấp AI: "gemini" (mặc định) hoặc "deepseek"
    AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini")

    # DeepSeek API (OpenAI-compatible)
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")

    # JWT xác thực
    JWT_SECRET = os.getenv("JWT_SECRET_KEY", "tourai_super_secret_jwt_key_2026")
    JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))

    # Thuật toán ký JWT
    JWT_ALGORITHM = "HS256"


settings = Settings()
