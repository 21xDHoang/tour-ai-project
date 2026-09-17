# -*- coding: utf-8 -*-
"""
app/services/storage_service.py - Dịch vụ lưu trữ file ảnh trên Cloudflare R2.

- Sử dụng thư viện boto3 tương thích hoàn toàn với giao thức S3 của Cloudflare R2.
- Hỗ trợ cơ chế tự động Fallback sang lưu cục bộ (Local Storage) khi chưa điền khóa R2 trong .env.
- Đảm bảo trả về Public URL trực tiếp để lưu vào CSDL và render trên Frontend.
"""
import os
import uuid
from datetime import datetime
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, UploadFile, status

from app.config import settings

# Danh sách các định dạng ảnh hợp lệ
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

# Giới hạn kích thước file (tối đa 10 MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


class StorageService:
    def __init__(self):
        self.r2_client = None
        self._init_r2_client()

    def _is_r2_configured(self) -> bool:
        """Kiểm tra đã cấu hình đủ khóa Cloudflare R2 hay chưa."""
        return bool(
            settings.R2_ACCOUNT_ID
            and settings.R2_ACCESS_KEY_ID
            and settings.R2_SECRET_ACCESS_KEY
        )

    def _init_r2_client(self):
        """Khởi tạo S3 Client kết nối đến Cloudflare R2 Endpoint."""
        if not self._is_r2_configured():
            return

        endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        self.r2_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )

    def _generate_unique_filename(self, original_filename: str, content_type: str, folder: str = "tours") -> tuple[str, str]:
        """Sinh tên file và đường dẫn key duy nhất tránh bị trùng lặp."""
        ext = ALLOWED_IMAGE_TYPES.get(content_type)
        if not ext:
            ext = Path(original_filename).suffix.lower() or ".jpg"

        unique_id = uuid.uuid4().hex[:12]
        date_prefix = datetime.utcnow().strftime("%Y/%m")
        filename = f"{unique_id}{ext}"
        object_key = f"{folder}/{date_prefix}/{filename}"
        return filename, object_key

    async def upload_image(self, file: UploadFile, folder: str = "tours") -> dict:
        """
        Tiếp nhận file ảnh và tải lên Cloudflare R2 (hoặc Fallback lưu cục bộ).
        
        Returns:
            dict: {"url": str, "key": str, "storage": "Cloudflare R2" | "Local Fallback"}
        """
        # 1. Kiểm tra MIME type
        content_type = file.content_type or ""
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Định dạng ảnh không hỗ trợ ({content_type}). Chỉ chấp nhận JPG, PNG, WEBP, GIF.",
            )

        # 2. Đọc nội dung file
        content = await file.read()
        file_size = len(content)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kích thước ảnh ({file_size / (1024 * 1024):.1f}MB) vượt quá giới hạn 10MB.",
            )

        filename, object_key = self._generate_unique_filename(file.filename or "image.jpg", content_type, folder)

        # 3. Tải lên Cloudflare R2 nếu đã cấu hình
        if self._is_r2_configured():
            try:
                if not self.r2_client:
                    self._init_r2_client()

                self.r2_client.put_object(
                    Bucket=settings.R2_BUCKET_NAME,
                    Key=object_key,
                    Body=content,
                    ContentType=content_type,
                )

                # Xây dựng Public URL
                if settings.R2_PUBLIC_URL:
                    base_url = settings.R2_PUBLIC_URL.rstrip("/")
                    public_url = f"{base_url}/{object_key}"
                else:
                    public_url = f"https://{settings.R2_BUCKET_NAME}.{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{object_key}"

                return {
                    "url": public_url,
                    "key": object_key,
                    "filename": filename,
                    "size_bytes": file_size,
                    "storage": "Cloudflare R2",
                }
            except ClientError as e:
                # Nếu R2 lỗi thì fallback xuống lưu cục bộ
                print(f"[R2 Upload Error]: {e} -> Chuyển sang lưu cục bộ dự phòng.")

        # 4. Fallback: Lưu vào thư mục uploads cục bộ
        local_dir = Path(settings.LOCAL_UPLOAD_DIR) / folder
        local_dir.mkdir(parents=True, exist_ok=True)
        local_path = local_dir / filename

        with open(local_path, "wb") as f:
            f.write(content)

        # Đường dẫn tĩnh qua FastAPI static mount
        local_url = f"http://localhost:8000/{settings.LOCAL_UPLOAD_DIR}/{folder}/{filename}"

        return {
            "url": local_url,
            "key": f"{folder}/{filename}",
            "filename": filename,
            "size_bytes": file_size,
            "storage": "Local Storage (Cấu hình thêm R2_ACCESS_KEY_ID trong .env để bật R2)",
        }


storage_service = StorageService()
