# -*- coding: utf-8 -*-
"""
scripts/upload_destination_images.py
Nạp kho ảnh điểm đến lên Cloudflare R2.

Trước đây frontend hotlink thẳng ảnh từ Unsplash CDN. Cách đó có ba vấn đề:
phụ thuộc vào một dịch vụ bên ngoài, không kiểm soát được ảnh có bị xoá hay
đổi hay không, và tải chậm hơn so với CDN của chính dự án. Script này tải ảnh
nguồn về một lần rồi đẩy lên R2, sau đó frontend chỉ trỏ vào R2.

Ảnh nguồn đã được tải về và kiểm tra bằng mắt: đúng địa danh Việt Nam, không
còn cảnh Alaska, Bali, Đức hay ảnh sản phẩm lẫn trong đó.

Chạy:
    cd tour-backend
    .venv/Scripts/python.exe scripts/upload_destination_images.py

Chạy lại nhiều lần được — ảnh cùng tên sẽ bị ghi đè.
"""
import io
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import boto3
from botocore.config import Config

from app.config import settings

# Console Windows mặc định là cp1252, in chữ Việt có dấu sẽ ném UnicodeEncodeError
# và làm hỏng cả script dù ảnh đã lên R2 xong.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Kích thước tải về. 1600px đủ nét cho cả ảnh hero toàn chiều rộng lẫn thẻ tour.
SOURCE_WIDTH = 1600
SOURCE_QUALITY = 80

# Khoá trên R2 -> mã ảnh Unsplash.
# Giữ nguyên thứ tự này để dễ đối chiếu với tourImages.js ở frontend.
IMAGES = {
    # Miền Bắc
    "ha-long": "photo-1528127269322-539801943592",
    "ha-giang-1": "photo-1673257860319-6b79749a6b39",
    "ha-giang-2": "photo-1721151488121-6ce08010a538",
    "ha-giang-3": "photo-1778381464278-a410e5b67195",
    "ha-giang-4": "photo-1775151319720-e47ac06a2909",
    "sa-pa-1": "photo-1609412058473-c199497c3c5d",
    "sa-pa-2": "photo-1570366583862-f91883984fde",
    "ninh-binh-1": "photo-1527428050273-21bd264db1b5",
    "ninh-binh-2": "photo-1626743656249-5d8fa287b941",

    # Miền Trung
    "da-nang": "photo-1603852452378-a4e8d84324a2",
    "hoi-an-1": "photo-1526139334526-f591a54b477c",
    "hoi-an-2": "photo-1563354860-799d15199ac3",
    "hue": "photo-1785144519452-dce4f51c79ac",
    "phong-nha": "photo-1719461208381-635ddf0a7b42",
    "nha-trang": "photo-1507525428034-b723cf961d3e",
    "quy-nhon": "photo-1506929562872-bb421503ef21",

    # Miền Nam & Tây Nguyên
    "phu-quoc-1": "photo-1693282814784-649be45a459b",
    "phu-quoc-2": "photo-1621094305060-081171d1c171",
    "da-lat": "photo-1678099006439-dba9e4d3f9f5",
}

FOLDER = "destinations"


def fetch_source(photo_id: str) -> bytes:
    """Tải ảnh gốc từ Unsplash ở kích thước đã chọn."""
    url = (
        f"https://images.unsplash.com/{photo_id}"
        f"?auto=format&fit=crop&w={SOURCE_WIDTH}&q={SOURCE_QUALITY}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "TourAI-image-loader/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def main() -> int:
    if not settings.R2_PUBLIC_URL:
        print("Thiếu R2_PUBLIC_URL trong .env — không xác định được URL công khai.")
        return 1

    client = boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
    )

    base = settings.R2_PUBLIC_URL.rstrip("/")
    ok, failed = 0, []

    for name, photo_id in IMAGES.items():
        key = f"{FOLDER}/{name}.jpg"
        try:
            data = fetch_source(photo_id)
        except Exception as exc:  # noqa: BLE001 - báo lỗi rồi đi tiếp ảnh sau
            print(f"  LỖI TẢI  {name:14} {exc}")
            failed.append(name)
            continue

        try:
            client.put_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=key,
                Body=io.BytesIO(data),
                ContentType="image/jpeg",
                CacheControl="public, max-age=31536000, immutable",
            )
        except Exception as exc:  # noqa: BLE001
            print(f"  LỖI ĐẨY  {name:14} {exc}")
            failed.append(name)
            continue

        print(f"  OK  {name:14} {len(data) // 1024:>4} KB  ->  {base}/{key}")
        ok += 1
        time.sleep(0.2)  # tránh dồn dập vào Unsplash

    print(f"\nXong: {ok}/{len(IMAGES)} ảnh đã lên R2.")
    if failed:
        print("Ảnh lỗi:", ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
