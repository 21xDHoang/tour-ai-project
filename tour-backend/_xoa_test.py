# -*- coding: utf-8 -*-
"""Xóa điểm đến test (MaDiemDen=18) vừa tạo để giữ DB demo sạch."""
from app.database import SessionLocal
from app.models import DiemDen

db = SessionLocal()
try:
    n = db.query(DiemDen).filter(DiemDen.MaDiemDen == 18).delete()
    db.commit()
    print("Deleted rows:", n)
finally:
    db.close()
