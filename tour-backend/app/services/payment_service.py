# -*- coding: utf-8 -*-
"""
app/services/payment_service.py - Nghiệp vụ Thanh toán & Hủy tour.

Hiện thực 2 quy tắc miền:
  DR-03: Tiền cọc tối thiểu 30% TongTien trước khi xác nhận đặt cọc.
  DR-04: Phạt hủy tour theo số ngày còn lại tới ngày khởi hành:
         >= 7 ngày -> hoàn 100% cọc (MucPhat 0.0)
         3-6 ngày  -> phạt 50% cọc  (MucPhat 0.5)
         < 3 ngày  -> phạt 100% cọc (MucPhat 1.0)
"""
from datetime import date, datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import DatCho, NguoiDung
from app.models.common import now_naive_utc
from app.repositories.booking_repo import BookingRepository
from app.repositories.payment_repo import PaymentRepository
from app.repositories.tour_repo import TourRepository
from app.schemas.cancellation import HuyTourRequest
from app.schemas.payment import (
    ThanhToanCocRequest,
    ThanhToanDuRequest,
    VietQRWebhookRequest,
)

# Tỷ lệ cọc tối thiểu theo DR-03
TI_LE_COC_TOI_THIEU = Decimal("0.3")
# Sai số cho phép khi đối soát webhook ngân hàng (P1): ±1.000đ
_SAI_SO_COC = Decimal("1000")


def _q2(gia_tri) -> Decimal:
    """Làm tròn tiền về 2 chữ số thập phân."""
    return Decimal(gia_tri).quantize(Decimal("0.01"))


def _lay_nguoi_xu_ly(db: Session, nguoi_xu_ly_id: int | None) -> int:
    """Chọn người xử lý; nếu không truyền sẽ ưu tiên kế toán đầu tiên."""
    if nguoi_xu_ly_id is not None:
        return nguoi_xu_ly_id
    acc = (
        db.query(NguoiDung)
        .filter(NguoiDung.VaiTro == "Accountant")
        .order_by(NguoiDung.MaNguoiDung)
        .first()
    )
    if acc is None:
        acc = db.query(NguoiDung).order_by(NguoiDung.MaNguoiDung).first()
    if acc is None:
        raise HTTPException(400, "Chưa có tài khoản người dùng nào để xử lý giao dịch")
    return acc.MaNguoiDung


class PaymentService:
    """Service Thanh toán - chứa toàn bộ logic nghiệp vụ."""

    @staticmethod
    def confirm_deposit(
        db: Session,
        ma_dat_cho: int,
        request: ThanhToanCocRequest,
        nguoi_xu_ly_id: int | None = None,
    ):
        """Xác nhận đặt cọc cho đơn đang giữ chỗ (DR-03).

        - Đơn phải ở GiuCho / ChoCoc / ChoXacNhanCoc (P2: đơn khách đã báo
          "đã chuyển khoản" được ưu tiên xác nhận, không chờ hết hạn).
        - Đơn ChoXacNhanCoc đã tạm dừng đếm ngược 24h -> bỏ qua kiểm tra hết hạn.
        - SoTien >= 30% TongTien, nếu không -> từ chối 400.
        - Cập nhật DaDatCoc, chuyển TrangThai -> DaCoc, ghi giao dịch loại 'Coc'.
        """
        dat = BookingRepository.get_dat_cho_by_id(db, ma_dat_cho)
        if dat is None:
            raise HTTPException(404, "Không tìm thấy đơn đặt chỗ")
        if dat.TrangThai not in ("GiuCho", "ChoCoc", "ChoXacNhanCoc"):
            raise HTTPException(400, "Đơn không ở trạng thái cho phép đặt cọc")
        if dat.TrangThai != "ChoXacNhanCoc" and dat.HanGiuCho < now_naive_utc():
            raise HTTPException(400, "Đơn đã hết hạn giữ chỗ, không thể đặt cọc")

        # ---- DR-03: cọc tối thiểu 30% ----
        toi_thieu = _q2(Decimal(dat.TongTien) * TI_LE_COC_TOI_THIEU)
        if request.SoTien < toi_thieu:
            raise HTTPException(
                400,
                f"Tiền cọc tối thiểu phải đạt 30% tổng giá trị đơn (tối thiểu "
                f"{toi_thieu:,}đ, nhận được {request.SoTien:,}đ)",
            )

        xu_ly_id = _lay_nguoi_xu_ly(db, nguoi_xu_ly_id)

        dat.DaDatCoc = _q2(Decimal(dat.DaDatCoc) + request.SoTien)
        dat.TrangThai = "DaCoc"
        # Đơn đã được xác nhận cọc -> dừng tạm dừng đếm ngược (giữ HinhAnhChuyenKhoan để lưu vết)
        dat.SoGiayConLai = None
        PaymentRepository.create_thanh_toan(
            db,
            MaDatCho=ma_dat_cho,
            LoaiGiaoDich="Coc",
            SoTien=request.SoTien,
            PhuongThuc=request.PhuongThuc,
            NguoiXuLyID=xu_ly_id,
            GhiChu="Đặt cọc tour",
        )
        db.commit()
        db.refresh(dat)
        return dat

    @staticmethod
    def confirm_full_payment(
        db: Session,
        ma_dat_cho: int,
        request: ThanhToanDuRequest,
        nguoi_xu_ly_id: int | None = None,
    ):
        """Thanh toán phần còn lại -> hoàn tất đơn.

        - Đơn phải ở GiuCho (chưa cọc) hoặc DaCoc (đã cọc).
        - SoTien phải >= số tiền còn lại (TongTien - DaDatCoc).
        - Cập nhật DaDatCoc, chuyển TrangThai -> DaThanhToan, ghi giao dịch 'ThanhToan'.
        """
        dat = BookingRepository.get_dat_cho_by_id(db, ma_dat_cho)
        if dat is None:
            raise HTTPException(404, "Không tìm thấy đơn đặt chỗ")
        if dat.TrangThai not in ("GiuCho", "DaCoc"):
            raise HTTPException(400, "Đơn không ở trạng thái cho phép thanh toán")

        con_lai = _q2(Decimal(dat.TongTien) - Decimal(dat.DaDatCoc))
        if request.SoTien < con_lai:
            raise HTTPException(
                400,
                f"Số tiền thanh toán chưa đủ. Còn lại cần thanh toán: {con_lai:,}đ",
            )

        xu_ly_id = _lay_nguoi_xu_ly(db, nguoi_xu_ly_id)

        dat.DaDatCoc = _q2(Decimal(dat.DaDatCoc) + request.SoTien)
        dat.TrangThai = "DaThanhToan"
        PaymentRepository.create_thanh_toan(
            db,
            MaDatCho=ma_dat_cho,
            LoaiGiaoDich="ThanhToan",
            SoTien=request.SoTien,
            PhuongThuc=request.PhuongThuc,
            NguoiXuLyID=xu_ly_id,
            GhiChu="Thanh toán phần còn lại",
        )
        db.commit()
        db.refresh(dat)
        return dat

    @staticmethod
    def process_cancellation(
        db: Session,
        ma_dat_cho: int,
        request: HuyTourRequest,
    ):
        """Xử lý hủy tour theo chính sách phạt DR-04.

        - Chỉ hủy được đơn ở GiuCho / DaCoc / DaThanhToan.
        - Delta = (NgayKhoiHanh - NgayHuy).days; NgayHuy lấy ngày hiện tại.
        - Lưu hồ sơ HuyTour; nếu được hoàn tiền thì ghi giao dịch 'HoanTien'.
        - Trả lại chỗ cho lịch: SoChoCon += SoKhach; đơn chuyển TrangThai -> DaHuy.
        """
        dat = BookingRepository.get_dat_cho_by_id(db, ma_dat_cho)
        if dat is None:
            raise HTTPException(404, "Không tìm thấy đơn đặt chỗ")
        if dat.TrangThai not in ("GiuCho", "DaCoc", "DaThanhToan"):
            raise HTTPException(400, "Đơn không ở trạng thái cho phép hủy")

        lich = TourRepository.get_lich_khoi_hanh_by_id(db, dat.MaLich)
        if lich is None:
            raise HTTPException(404, "Không tìm thấy lịch khởi hành của đơn")

        # ---- P3: chặn hủy khi tour đã khởi hành (đồng bộ trạng thái hiển thị) ----
        if date.today() >= lich.NgayKhoiHanh:
            raise HTTPException(400, "Tour đã khởi hành, không thể hủy")

        # ---- DR-04: tính mức phạt theo số ngày còn lại ----
        ngay_huy = date.today()
        delta_ngay = (lich.NgayKhoiHanh - ngay_huy).days
        so_tien_da_coc = Decimal(dat.DaDatCoc)

        if delta_ngay >= 7:
            muc_phat = Decimal("0.0")
            so_tien_hoan = so_tien_da_coc
        elif delta_ngay >= 3:
            muc_phat = Decimal("0.5")
            so_tien_hoan = _q2(so_tien_da_coc * Decimal("0.5"))
        else:
            muc_phat = Decimal("1.0")
            so_tien_hoan = Decimal("0.0")

        xu_ly_id = _lay_nguoi_xu_ly(db, request.NguoiXuLyID)

        # Cập nhật đơn + hoàn chỗ cho lịch
        dat.TrangThai = "DaHuy"
        lich.SoChoCon += dat.SoKhach

        # Lưu hồ sơ hủy
        huy = PaymentRepository.create_huy_tour(
            db,
            MaDatCho=ma_dat_cho,
            LyDo=request.LyDo,
            MucPhat=muc_phat,
            SoTienHoan=so_tien_hoan,
            NguoiXuLyID=xu_ly_id,
        )

        # Nếu được hoàn tiền -> ghi giao dịch hoàn
        if so_tien_hoan > 0:
            PaymentRepository.create_thanh_toan(
                db,
                MaDatCho=ma_dat_cho,
                LoaiGiaoDich="HoanTien",
                SoTien=so_tien_hoan,
                PhuongThuc="ChuyenKhoan",
                NguoiXuLyID=xu_ly_id,
                GhiChu=f"Hoàn tiền hủy tour (còn {delta_ngay} ngày, mức phạt {muc_phat})",
            )

        db.commit()
        db.refresh(huy)
        return huy

    @staticmethod
    def reconcile_webhook(db: Session, payload: VietQRWebhookRequest) -> dict:
        """P1: Đối soát biến động số dư ngân hàng -> tự xác nhận cọc.

        Chỉ xử lý các đơn đang ChoXacNhanCoc (khách đã báo "đã chuyển khoản").
          - Khớp số tiền: abs(SoTien - 30%*TongTien) <= _SAI_SO_COC (1.000đ).
          - Nếu MoTa chứa mã đơn (vd "TOURAI-12" / "#12") -> ưu tiên đơn đó.
          - Nhiều ứng viên mà không có gợi ý mã đơn -> từ chối (tránh xác nhận nhầm).
          - Khớp -> DaCoc, DaDatCoc=SoTien, ghi giao dịch 'Coc' GhiChu webhook.
        Idempotent: chỉ truy vấn ChoXacNhanCoc nên đơn đã DaCoc/DaThanhToan
        không bị xử lý lại khi webhook gửi trùng.
        """
        ds = (
            db.query(DatCho)
            .filter(DatCho.TrangThai == "ChoXacNhanCoc")
            .all()
        )

        ung_vien = []
        for dat in ds:
            coc_toi_thieu = _q2(Decimal(dat.TongTien) * TI_LE_COC_TOI_THIEU)
            if abs(payload.SoTien - coc_toi_thieu) <= _SAI_SO_COC:
                ung_vien.append(dat)

        if not ung_vien:
            return {"matched": False, "ma_dat_cho": None}

        # Ưu tiên đơn có mã đơn xuất hiện trong nội dung chuyển khoản
        ma_mo_ta = str(payload.MoTa or "")
        khop_mo_ta = [d for d in ung_vien if str(d.MaDatCho) in ma_mo_ta]
        if len(khop_mo_ta) == 1:
            dat = khop_mo_ta[0]
        elif len(ung_vien) == 1:
            dat = ung_vien[0]
        else:
            # Nhiều ứng viên, thiếu thông tin phân biệt -> không tự xác nhận
            return {"matched": False, "ma_dat_cho": None}

        dat.TrangThai = "DaCoc"
        dat.DaDatCoc = _q2(payload.SoTien)
        dat.SoGiayConLai = None
        xu_ly_id = _lay_nguoi_xu_ly(db, None)
        PaymentRepository.create_thanh_toan(
            db,
            MaDatCho=dat.MaDatCho,
            LoaiGiaoDich="Coc",
            SoTien=_q2(payload.SoTien),
            PhuongThuc="ChuyenKhoan",
            NguoiXuLyID=xu_ly_id,
            GhiChu="Đối soát tự động webhook ngân hàng",
        )
        db.commit()
        db.refresh(dat)
        return {"matched": True, "ma_dat_cho": dat.MaDatCho}
