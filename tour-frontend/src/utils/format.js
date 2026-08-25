import dayjs from 'dayjs';

/** Định dạng số tiền kiểu VND (vd: 2.890.000 ₫). */
export function fmtVND(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Định dạng ngày DD/MM/YYYY. */
export function fmtDate(value) {
  if (!value) return '—';
  return dayjs(value).format('DD/MM/YYYY');
}

/** Định dạng ngày giờ DD/MM/YYYY HH:mm. */
export function fmtDateTime(value) {
  if (!value) return '—';
  return dayjs(value).format('DD/MM/YYYY HH:mm');
}

/** Nhãn & màu cho Trạng thái đơn đặt chỗ (Ant Tag). */
export const TRANG_THAI_DAT_CHO = {
  GiuCho: { label: 'Giữ chỗ 24h', color: 'blue' },
  ChoCoc: { label: 'Chờ cọc', color: 'gold' },
  HetHan: { label: 'Hết hạn', color: 'default' },
  DaCoc: { label: 'Đã cọc', color: 'cyan' },
  DaThanhToan: { label: 'Đã thanh toán', color: 'green' },
  DaHuy: { label: 'Đã hủy', color: 'red' },
};

/** Trạng thái tour. */
export const TRANG_THAI_TOUR = {
  DangBan: { label: 'Đang bán', color: 'green' },
  NgungBan: { label: 'Ngừng bán', color: 'red' },
};

/** Trạng thái lịch khởi hành. */
export const TRANG_THAI_LICH = {
  MoBan: { label: 'Mở bán', color: 'green' },
  DatKich: { label: 'Đủ điều kiện', color: 'blue' },
  HoanThanh: { label: 'Hoàn thành', color: 'default' },
  DaHuy: { label: 'Đã hủy', color: 'red' },
};

/** Vai trò -> nhãn tiếng Việt. */
export const VAI_TRO_LABEL = {
  Admin: 'Quản trị viên',
  Consultant: 'Tư vấn viên',
  Accountant: 'Kế toán',
  Customer: 'Khách hàng',
  TaiXe: 'Tài xế lái xe',
};

/** Trạng thái duyệt bảng lương. */
export const TRANG_THAI_LUONG = {
  ChoDuyet: { label: 'Chờ duyệt', color: 'gold' },
  DaDuyet: { label: 'Đã duyệt', color: 'green' },
};

/** Trạng thái Lead (phễu chuyển đổi). */
export const TRANG_THAI_LEAD = {
  Moi: { label: 'Mới', color: 'blue' },
  DangLienHe: { label: 'Đang liên hệ', color: 'gold' },
  DaBaoGia: { label: 'Đã báo giá', color: 'cyan' },
  DangChot: { label: 'Đang chốt', color: 'purple' },
  ThatBai: { label: 'Thất bại', color: 'red' },
};

/** Trạng thái yêu cầu tour thiết kế riêng. */
export const TRANG_THAI_TOUR_RIENG = {
  Moi: { label: 'Mới', color: 'blue' },
  DangBaoGia: { label: 'Đang báo giá', color: 'gold' },
  DaChot: { label: 'Đã chốt', color: 'green' },
  TuChoi: { label: 'Từ chối', color: 'red' },
};

/** Trạng thái kiểm duyệt phản hồi. */
export const TRANG_THAI_PHAN_HOI = {
  ChoDuyet: { label: 'Chờ duyệt', color: 'gold' },
  DaDuyet: { label: 'Đã duyệt', color: 'green' },
  TuChoi: { label: 'Từ chối', color: 'red' },
};

/** Loại giảm giá voucher. */
export const LOAI_GIAM = {
  PhanTram: { label: 'Theo %', color: 'blue' },
  Tien: { label: 'Số tiền', color: 'cyan' },
};

/** Loại đoàn tour riêng. */
export const LOAI_DOAN = {
  GiaDinh: 'Gia đình',
  DoanhNghiep: 'Doanh nghiệp',
  HoiNhom: 'Hội nhóm',
  TanTrang: 'Tân trang / Du lịch cưới',
};

/** Trạng thái tài khoản người dùng. */
export const TRANG_THAI_TAI_KHOAN = {
  Active: { label: 'Hoạt động', color: 'green' },
  Locked: { label: 'Đã khóa', color: 'red' },
};

/** Trạng thái lịch khởi hành khi quản trị (MoBan/NgungBan). */
export const TRANG_THAI_LICH_QUAN_TRI = {
  MoBan: { label: 'Mở bán', color: 'green' },
  NgungBan: { label: 'Ngừng bán', color: 'red' },
};

/** Danh mục bài viết cẩm nang du lịch. */
export const DANH_MUC_CAM_NANG = {
  TruocChuyenDi: 'Chuẩn bị trước chuyến đi',
  ChiPhiThanhToan: 'Chi phí & thanh toán',
  AnToan: 'An toàn trong chuyến đi',
  QuyTrinhDatTour: 'Quy trình đặt tour',
  MeoDuLich: 'Mẹo du lịch khác',
};

/** Trạng thái hiển thị bài viết cẩm nang. */
export const TRANG_THAI_BAI_VIET = {
  Hien: { label: 'Hiển thị', color: 'green' },
  An: { label: 'Ẩn', color: 'default' },
};

/** Trạng thái thanh toán khi tạo đơn thủ công (bàn đặt tour). */
export const TRANG_THAI_THANH_TOAN_MANUAL = {
  ChuaCoc: 'Chưa cọc',
  DaCoc: 'Đã cọc',
  DaThanhToan: 'Đã thanh toán đủ',
};

/** Loại hình du lịch của tour. */
export const LOAI_TOUR = {
  TraiNghiem: 'Du lịch trải nghiệm',
  NghiDuong: 'Du lịch nghỉ dưỡng',
  VanHoaLichSu: 'Du lịch văn hóa lịch sử',
};

/** Trạng thái công tác của hướng dẫn viên. */
export const TRANG_THAI_HDV = {
  Ranh: { label: 'Rảnh', color: 'green' },
  Ban: { label: 'Bận', color: 'red' },
  NghiPhep: { label: 'Nghỉ phép', color: 'gold' },
};

/** Loại hợp đồng lao động của HDV. */
export const TRANG_THAI_LAM_VIEC_HDV = {
  ChinhThuc: 'Chính thức',
  ThuViec: 'Thử việc',
};

/** Trạng thái hoạt động dẫn xuất của HDV. */
export const TRANG_THAI_HOAT_DONG_HDV = {
  Ranh: { label: 'Rảnh', color: 'green' },
  Ban: { label: 'Bận', color: 'red' },
  DangDanTour: { label: 'Đang dẫn tour', color: 'blue' },
  NghiPhep: { label: 'Nghỉ phép', color: 'gold' },
};
