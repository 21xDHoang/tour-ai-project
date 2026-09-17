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
    JWT_ALGORITHM = "HS256"

    # Webhook đối soát ngân hàng (P1): bí mật dùng chung giữa hệ thống ngân hàng
    # và TourAI để xác thực payload. Rỗng = endpoint public (chỉ dùng lúc chưa
    # kết nối bank thật); đặt giá trị khi tích hợp VietQR/ngrok thật.
    WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")

    # Tài khoản nhận chuyển khoản tiền cọc - hiển thị cho khách ở màn hình đặt
    # chỗ và ở "Đơn của bạn", đồng thời dùng để dựng ảnh QR VietQR.
    # BANK_ID: mã BIN ngân hàng (vd "970422") hoặc tên viết tắt VietQR chấp nhận
    # (vd "mbbank", "vietcombank") - danh sách tại https://api.vietqr.io/v2/banks
    # Rỗng cả ba = chưa cấu hình; frontend tự ẩn khối chuyển khoản.
    BANK_ID = os.getenv("BANK_ID", "")
    BANK_ACCOUNT = os.getenv("BANK_ACCOUNT", "")
    BANK_ACCOUNT_NAME = os.getenv("BANK_ACCOUNT_NAME", "")

    # Tiền tố nội dung chuyển khoản - cũng là "mã thanh toán" khách chép vào app
    # ngân hàng. Phải khớp thứ mà PaymentService.reconcile_webhook dò trong MoTa
    # để webhook tự đối soát được đúng đơn (xem payment_service.py).
    BANK_REF_PREFIX = os.getenv("BANK_REF_PREFIX", "TOURAI-")

    # Cloudflare R2 Object Storage (Tương thích S3 API)
    R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
    R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
    R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "tourai-media")
    # URL công khai truy cập ảnh (vd: https://pub-xxx.r2.dev hoặc https://cdn.tourai.vn)
    R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "")

    # Thư mục lưu trữ cục bộ dự phòng (Fallback khi chưa cấu hình R2 keys)
    LOCAL_UPLOAD_DIR = os.getenv("LOCAL_UPLOAD_DIR", "uploads")


settings = Settings()
