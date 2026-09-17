# -*- coding: utf-8 -*-
"""
tests/test_upload.py - Kiểm thử chức năng upload ảnh lên Cloudflare R2.
"""
import io
from fastapi.testclient import TestClient
from app.main import app
from app.utils.auth import create_access_token

client = TestClient(app)


def test_upload_image_endpoint():
    """Kiểm tra endpoint upload ảnh /api/v1/upload/image."""
    # Tạo token Admin giả lập để gọi API (MaNguoiDung = 1)
    token = create_access_token(data={"sub": "1", "role": "Admin"})
    headers = {"Authorization": f"Bearer {token}"}

    # Tạo một file ảnh JPEG giả lập
    file_content = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00"
    files = {"file": ("test_tour.jpg", io.BytesIO(file_content), "image/jpeg")}

    response = client.post("/api/v1/upload/image?folder=tours", files=files, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "url" in data["data"]
