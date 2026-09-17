/**
 * Màu biển báo theo loại tour.
 *
 * Ba loại tour ánh xạ vào ba màu biển báo có thật trong hệ thống biển báo
 * giao thông Việt Nam, chứ không phải màu danh mục tuỳ tiện:
 *   TraiNghiem    -> vàng  (biển cảnh báo nguy hiểm / dải chevron chỉ hướng cua)
 *   NghiDuong     -> xanh dương (biển chỉ dẫn)
 *   VanHoaLichSu  -> nâu   (biển chỉ dẫn du lịch — VN dùng nâu cho di tích)
 *
 * Mọi giá trị ở đây đều đã kiểm tương phản trên nền paper #F7F7F4:
 *   signal-400 #FFCD00 -> 1.5:1  (CHỈ dùng làm nền, không bao giờ làm chữ nhỏ)
 *   tide-500   #0E6E8C -> 5.4:1  (đạt AA cho chữ thường)
 *   heritage-500 #7A4A28 -> 6.9:1 (đạt AA cho chữ thường)
 */

export const SIGN_META = {
  TraiNghiem: {
    label: 'Trải nghiệm',
    tone: 'signal',
    hex: '#FFCD00',
    // Chữ đặt trên nền màu này phải dùng màu này để đủ tương phản.
    onHex: '#14161A',
    chipCls: 'bg-signal-50 text-signal-800 border-signal-200',
    fillCls: 'bg-signal-400 text-ink-950',
    textCls: 'text-signal-700',
    borderCls: 'border-signal-300',
    dotCls: 'bg-signal-400',
  },
  NghiDuong: {
    label: 'Nghỉ dưỡng',
    tone: 'tide',
    hex: '#0E6E8C',
    onHex: '#FFFFFF',
    chipCls: 'bg-tide-50 text-tide-700 border-tide-100',
    fillCls: 'bg-tide-500 text-white',
    textCls: 'text-tide-600',
    borderCls: 'border-tide-200',
    dotCls: 'bg-tide-500',
  },
  VanHoaLichSu: {
    label: 'Văn hoá',
    tone: 'heritage',
    hex: '#7A4A28',
    onHex: '#FFFFFF',
    chipCls: 'bg-heritage-50 text-heritage-700 border-heritage-100',
    fillCls: 'bg-heritage-500 text-white',
    textCls: 'text-heritage-600',
    borderCls: 'border-heritage-200',
    dotCls: 'bg-heritage-500',
  },
};

/** Màu biển báo mặc định khi tour chưa gán loại. */
export const SIGN_FALLBACK = {
  label: 'Hành trình',
  tone: 'ink',
  hex: '#585E67',
  onHex: '#FFFFFF',
  chipCls: 'bg-ink-100 text-ink-700 border-ink-200',
  fillCls: 'bg-ink-600 text-white',
  textCls: 'text-ink-600',
  borderCls: 'border-ink-200',
  dotCls: 'bg-ink-400',
};

/** Lấy meta màu biển báo theo mã loại tour (TraiNghiem | NghiDuong | VanHoaLichSu). */
export function signOf(loaiTour) {
  return SIGN_META[loaiTour] || SIGN_FALLBACK;
}

/**
 * Giọng màu cho trạng thái đơn đặt chỗ.
 *
 * Trạng thái đơn là thông tin khách phải liếc một lần là hiểu, nên màu ở đây
 * mã hoá MỨC ĐỘ CẦN HÀNH ĐỘNG chứ không phải trang trí:
 *   signal — đang chờ khách làm gì đó (giữ chỗ sắp hết, chờ cọc)
 *   tide   — đã qua tay khách, đang chờ phía công ty (đã cọc, đang đi tour)
 *   guide  — đã xong xuôi, không cần làm gì nữa
 *   ink    — trung tính (hết hạn)
 *   stop   — đã đóng (huỷ)
 * Năm giọng này thay cho bảng màu Ant (`blue`/`gold`/`cyan`/…) vốn không
 * thuộc hệ màu của site và không phân biệt được mức độ ưu tiên.
 */
const DON_TONE = {
  signal: 'bg-signal-50 text-signal-800 border-signal-200',
  tide: 'bg-tide-50 text-tide-700 border-tide-100',
  guide: 'bg-guide-50 text-guide-700 border-guide-200',
  ink: 'bg-ink-100 text-ink-600 border-ink-200',
  stop: 'bg-stop-50 text-stop-700 border-stop-200',
};

const TRANG_THAI_DON_TONE = {
  GiuCho: 'signal',
  ChoCoc: 'signal',
  ChoXacNhanCoc: 'signal',
  HetHan: 'ink',
  DaCoc: 'tide',
  DangDiTour: 'tide',
  DaThanhToan: 'guide',
  HoanThanh: 'guide',
  DaHuy: 'stop',
};

/** Lớp cho viên trạng thái đơn. Trạng thái lạ rơi về giọng trung tính. */
export function donPill(trangThai) {
  return pill(TRANG_THAI_DON_TONE, trangThai);
}

/* ============================================================================
   Trạng thái của phần nhân viên.
   ============================================================================
   Màu ở khu nhân viên chỉ mã hoá ĐÚNG HAI thứ: mức độ cần hành động (năm giọng
   trên) và loại tour (ba màu biển báo thật, xem SIGN_META). Mọi thứ khác — vai
   trò, khu vực, nguồn lead, loại đoàn — là dữ liệu phân loại, không tô màu.

   Quy tắc này thay cho bảng màu có sẵn của AntD (`orange`/`blue`/`purple`/
   `geekblue`/…) vốn được chọn theo cảm giác chứ không theo mức ưu tiên, nên
   người dùng không suy ra được gì từ màu.

   Một quyết định đáng nói: lead `ThatBai` và yêu cầu `TuChoi` mang giọng `ink`
   chứ KHÔNG phải `stop`. Đỏ để dành cho việc kinh doanh đã chốt rồi mới bị huỷ
   (đơn huỷ, lịch huỷ, tài khoản khoá, HDV đang bận) — những thứ cần người xử
   lý. Một lead chưa từng chuyển đổi thì không ai phải làm gì cả; tiêu đỏ cho nó
   là cách nhanh nhất để đỏ hết có nghĩa.

   NGOẠI LỆ thứ ba, chỉ tồn tại ở màn Kế toán: CHIỀU CỦA DÒNG TIỀN. Tiền vào và
   lãi dùng `guide`, tiền ra và lỗ dùng `stop`. Đây không phải màu trang trí —
   nó là cùng một thông tin với dấu +/− in ngay cạnh, và ở sổ quỹ thì cột "thu"
   hay "chi" là câu hỏi đầu tiên người đọc đặt ra. Điều kiện để được dùng: dấu
   phải luôn có mặt bằng chữ, màu chỉ nhắc lại. Chỗ nào không in được dấu thì
   không được tô màu.
   ========================================================================= */

/** Giọng `heritage` chỉ dùng cho vai trò khách hàng/tài xế — không phải việc nội bộ. */
const TONE = {
  ...DON_TONE,
  heritage: 'bg-heritage-50 text-heritage-700 border-heritage-200',
};

const TRANG_THAI_LEAD_TONE = {
  Moi: 'signal',
  DangLienHe: 'signal',
  DaBaoGia: 'tide',
  DangChot: 'tide',
  ThatBai: 'ink',
};

const TRANG_THAI_TOUR_RIENG_TONE = {
  Moi: 'signal',
  DangBaoGia: 'signal',
  DaChot: 'guide',
  TuChoi: 'ink',
};

const TRANG_THAI_DUYET_TONE = { ChoDuyet: 'signal', DaDuyet: 'guide', TuChoi: 'ink' };

const TRANG_THAI_LICH_TONE = {
  MoBan: 'guide',
  DatKich: 'tide',
  HoanThanh: 'ink',
  DaHuy: 'stop',
};

/**
 * Bật/tắt. `Expired` nằm cùng nhóm `stop` với `NgungBan`/`Locked` vì tuy không
 * ai chủ động huỷ, mã đã hết hạn thì cũng không dùng được nữa — cùng một việc
 * phải làm (phát hành mã khác), nên cùng một màu.
 */
const TRANG_THAI_BAT_TAT_TONE = {
  DangBan: 'guide',
  MoBan: 'guide',
  Active: 'guide',
  NgungBan: 'stop',
  Locked: 'stop',
  Expired: 'stop',
};

const TRANG_THAI_HDV_TONE = {
  Ranh: 'guide',
  Ban: 'stop',
  DangDanTour: 'tide',
  NghiPhep: 'ink',
};

const TRANG_THAI_NCC_TONE = { ChuaTra: 'stop', TraMotPhan: 'signal', DaTatToan: 'guide' };

const TRANG_THAI_BAI_VIET_TONE = { Hien: 'guide', An: 'ink' };

/** Quyết toán đoàn: chờ làm là `signal`, khoá sổ rồi là `guide`, còn lại trung tính. */
const TRANG_THAI_QUYET_TOAN_TONE = {
  ChuaQuyetToan: 'ink',
  ChoQuyetToan: 'signal',
  DaKhoaSo: 'guide',
};

export const VAI_TRO_TONE = {
  Admin: 'ink',
  Consultant: 'guide',
  Accountant: 'tide',
  Customer: 'heritage',
  TaiXe: 'heritage',
};

/**
 * Lớp cho viên trạng thái, theo bảng giọng truyền vào.
 *
 * Giá trị lạ rơi về giọng trung tính — cố ý. Thêm một trạng thái mới ở backend
 * thì viên đó xám chứ không vỡ giao diện, và cái xám đó là dấu hiệu để bổ sung
 * vào bảng.
 */
function pill(map, giaTri) {
  return TONE[map[giaTri]] || TONE.ink;
}

export const leadPill = (v) => pill(TRANG_THAI_LEAD_TONE, v);
export const tourRiengPill = (v) => pill(TRANG_THAI_TOUR_RIENG_TONE, v);

/**
 * Chấm màu mang cùng giọng với viên trạng thái — dùng ở đầu cột Kanban, nơi
 * cột đã nói trạng thái rồi nên không cần lặp lại bằng chữ.
 *
 * Bảng này phải là chuỗi lớp viết thẳng, không được ghép từ tên giọng: Tailwind
 * quét mã nguồn để tìm chuỗi lớp, một lớp dựng lúc chạy (`bg-${tone}-500`) không
 * có trong CSS và chấm sẽ mất màu trong im lặng.
 */
const TONE_DOT = {
  signal: 'bg-signal-400',
  tide: 'bg-tide-500',
  guide: 'bg-guide-500',
  ink: 'bg-ink-400',
  stop: 'bg-stop-500',
};
export const leadDot = (v) => TONE_DOT[TRANG_THAI_LEAD_TONE[v]] || TONE_DOT.ink;
/** Dùng chung cho kiểm duyệt đánh giá và duyệt lương — cùng hai trạng thái. */
export const duyetPill = (v) => pill(TRANG_THAI_DUYET_TONE, v);
export const lichPill = (v) => pill(TRANG_THAI_LICH_TONE, v);
/** Bật/tắt: tour đang bán hay ngừng bán, tài khoản hoạt động hay bị khoá. */
export const batTatPill = (v) => pill(TRANG_THAI_BAT_TAT_TONE, v);
export const hdvPill = (v) => pill(TRANG_THAI_HDV_TONE, v);
export const nccPill = (v) => pill(TRANG_THAI_NCC_TONE, v);
export const baiVietPill = (v) => pill(TRANG_THAI_BAI_VIET_TONE, v);
export const quyetToanPill = (v) => pill(TRANG_THAI_QUYET_TOAN_TONE, v);
export const vaiTroPill = (v) => pill(VAI_TRO_TONE, v);

/**
 * Cảm xúc khách hàng — ba mức CÓ THỨ TỰ (tốt → lẫn → kém), không phải ba hạng
 * mục ngang hàng. Đây là chỗ duy nhất mà thang đỏ–vàng–xanh mang nghĩa thật,
 * nên nó đứng đúng trên ba token sẵn có: guide (đã tốt), signal (cần để mắt),
 * stop (có vấn đề).
 *
 * `hex` dùng cho BIỂU ĐỒ — mảng đặc, lớn — nên lấy sắc đậm của mỗi họ để miếng
 * bánh còn tách được khỏi nền thẻ trắng. `chipCls` dùng cho viên trạng thái,
 * nơi chữ nằm TRÊN nền màu nên phải là nền nhạt + chữ đậm.
 */
export const CAM_XUC_META = {
  TichCuc: {
    label: 'Tích cực',
    hex: '#0B5D3B',
    chipCls: 'border-guide-200 bg-guide-50 text-guide-700',
  },
  TrungLap: {
    label: 'Trung lập',
    hex: '#E0B000',
    chipCls: 'border-signal-200 bg-signal-50 text-signal-800',
  },
  TieuCuc: {
    label: 'Tiêu cực',
    hex: '#C62828',
    chipCls: 'border-stop-200 bg-stop-50 text-stop-700',
  },
};

/**
 * Lớp viên cho một nhãn cảm xúc. Trả về rỗng khi mã lạ — `CAM_XUC_META` không
 * phải một bảng giọng chung, thêm một mã mới ở backend thì viên đó mất màu chứ
 * không khoác màu của một cảm xúc khác.
 */
export const camXucChip = (v) => CAM_XUC_META[v]?.chipCls || '';

/**
 * Hai dãy của biểu đồ "Doanh thu & dòng tiền theo tháng".
 *
 * Cố ý KHÔNG lấy hai màu đầu của `CHART_COLORS`: màu thứ hai ở đó là vàng biển
 * báo #FFCD00, mà một cột vàng trên nền thẻ trắng chỉ đạt 1,5:1 — đủ để nhận ra
 * có một hình ở đó, không đủ để đọc ra hình đó cao bao nhiêu. Vàng giữ vai trò
 * điểm nhấn (viên trạng thái, gờ mục đang chọn); chỗ này cần hai khối đặc,
 * tương phản cao, so được chiều cao bằng mắt.
 */
export const MAU_DONG_TIEN = ['#0B5D3B', '#0E6E8C'];

/** Chuỗi màu cho biểu đồ, xếp theo thứ tự cố định để nhất quán giữa các trang. */
export const CHART_COLORS = [
  '#0B5D3B',
  '#FFCD00',
  '#0E6E8C',
  '#7A4A28',
  '#C62828',
  '#57A47F',
  '#B08A00',
  '#47A3C2',
];
