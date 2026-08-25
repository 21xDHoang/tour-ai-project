"""
app/models/ - 18 SQLAlchemy Models.

15 bảng gốc khớp Data Dictionary + 3 bảng mới BƯỚC tái cấu trúc:
YeuCauTuVan (Lead), YeuCauTourRieng (Custom Tour), MaGiamGia (Voucher).
"""
from app.models.ai_de_xuat_huong_dan_vien import AIDeXuatHuongDanVien
from app.models.ai_phan_tich_phan_hoi import AIPhanTichPhanHoi
from app.models.ai_tu_van_tour import AITuVanTour
from app.models.bang_luong import BangLuong
from app.models.cam_nang import CamNang
from app.models.chi_tiet_dat_cho import ChiTietDatCho
from app.models.cong_no_ncc import CongNoNhaCungCap
from app.models.dat_cho import DatCho
from app.models.diem_den import DiemDen
from app.models.huong_dan_vien import HuongDanVien
from app.models.huy_tour import HuyTour
from app.models.khach_hang import KhachHang
from app.models.lich_khoi_hanh import LichKhoiHanh
from app.models.ma_giam_gia import MaGiamGia
from app.models.nguoi_dung import NguoiDung
from app.models.phan_cong_hdv import PhanCongHDV
from app.models.phan_hoi import PhanHoi
from app.models.phi_chi import PhiChi
from app.models.quyet_toan_tour import QuyetToanTour
from app.models.thanh_toan import ThanhToan
from app.models.tour import Tour
from app.models.yeu_cau_tour_rieng import YeuCauTourRieng
from app.models.yeu_cau_tu_van import YeuCauTuVan

__all__ = [
    "NguoiDung",
    "KhachHang",
    "DiemDen",
    "Tour",
    "LichKhoiHanh",
    "HuongDanVien",
    "PhanCongHDV",
    "DatCho",
    "ChiTietDatCho",
    "ThanhToan",
    "HuyTour",
    "PhanHoi",
    "MaGiamGia",
    "YeuCauTuVan",
    "YeuCauTourRieng",
    "AITuVanTour",
    "AIDeXuatHuongDanVien",
    "AIPhanTichPhanHoi",
    "CamNang",
    "BangLuong",
    "CongNoNhaCungCap",
    "PhiChi",
    "QuyetToanTour",
]
