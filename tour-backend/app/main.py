# -*- coding: utf-8 -*-
"""
app/main.py - Cổng khởi chạy ứng dụng FastAPI (BƯỚC 4).

- Đăng ký CORSMiddleware cho phép frontend React (origin bất kỳ trong giai đoạn dev).
- Đăng ký toàn bộ router RESTful với prefix chung /api/v1.
- Tài liệu tương tác (Swagger): http://localhost:8000/docs
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import (
    admin_ops,
    ai,
    auth,
    bookings,
    cam_nang,
    customers,
    custom_tours,
    dashboard,
    guides,
    leads,
    payables,
    payments,
    payroll,
    reports,
    reviews,
    settlements,
    tours,
    upload,
    vouchers,
)

app = FastAPI(
    title="Hệ thống Quản lý Tour Du lịch Tích hợp AI (TourAI)",
    description=(
        "API RESTful cho Hệ thống Quản lý Tour Du lịch Tích hợp AI - "
        "học phần Ứng dụng trí tuệ nhân tạo (ĐH CNTT&TT Thái Nguyên). "
        "Bao gồm: Xác thực JWT (RBAC 4 vai trò), Đặt chỗ & giữ chỗ 24h, "
        "Thanh toán & Hủy tour, Phân công HDV, và 4 năng lực AI (Gemini)."
    ),
    version="1.0.0",
)

# Tạo thư mục uploads cục bộ nếu chưa có
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS: cho phép mọi nguồn trong giai đoạn phát triển
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(upload.router, prefix=API_PREFIX)
app.include_router(tours.router, prefix=API_PREFIX)
app.include_router(bookings.router, prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)
app.include_router(guides.router, prefix=API_PREFIX)
app.include_router(ai.router, prefix=API_PREFIX)
app.include_router(customers.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(leads.router, prefix=API_PREFIX)
app.include_router(custom_tours.router, prefix=API_PREFIX)
app.include_router(vouchers.router, prefix=API_PREFIX)
app.include_router(reviews.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(admin_ops.router, prefix=API_PREFIX)
app.include_router(cam_nang.router, prefix=API_PREFIX)
app.include_router(payroll.router, prefix=API_PREFIX)
app.include_router(settlements.router, prefix=API_PREFIX)
app.include_router(payables.router, prefix=API_PREFIX)


@app.get("/", tags=["meta"])
def health_check():
    """Kiểm tra cổng API còn hoạt động."""
    return {"service": "TourAI Backend", "status": "ok", "docs": "/docs"}
