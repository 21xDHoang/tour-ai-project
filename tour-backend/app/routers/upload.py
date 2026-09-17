# -*- coding: utf-8 -*-
"""
app/routers/upload.py - API tải lên file ảnh lên Cloudflare R2.
"""
from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.services.storage_service import storage_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/upload", tags=["Upload & Storage (Cloudflare R2)"])


@router.post(
    "/image",
    status_code=status.HTTP_201_CREATED,
    summary="Tải file ảnh lên Cloudflare R2",
    description="Nhận file ảnh (JPG, PNG, WEBP, GIF tối đa 10MB), tải lên Cloudflare R2 và trả về URL công khai.",
)
async def upload_image(
    file: UploadFile = File(..., description="File ảnh cần tải lên"),
    folder: str = Query("tours", description="Thư mục phân loại (tours, destinations, avatars)"),
    current_user=Depends(get_current_user),
):
    """API tải ảnh lên Object Storage (Cloudflare R2)."""
    result = await storage_service.upload_image(file=file, folder=folder)
    return {
        "success": True,
        "message": f"Tải ảnh thành công qua {result['storage']}",
        "data": result,
    }
