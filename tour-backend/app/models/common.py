"""Hàm tiện ích dùng chung cho các model."""
from datetime import datetime, timezone


def utcnow() -> datetime:
    """Thời điểm hiện tại theo UTC (default cho cột DATETIME)."""
    return datetime.now(timezone.utc)


def now_naive_utc() -> datetime:
    """Thời điểm hiện tại theo UTC ở dạng NAIVE (không tzinfo).

    Các cột DateTime trong CSDL được khai báo KHÔNG có timezone, nên khi
    đọc từ DB trả về datetime naive. Dùng hàm này cho mọi so sánh/gán
    trong Service để tránh lỗi "can't compare offset-naive and offset-aware".
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
