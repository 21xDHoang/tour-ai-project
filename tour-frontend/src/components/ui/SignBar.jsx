import Chevrons from './Chevrons';
import { signOf } from '../../utils/signs';

/**
 * Thanh biển báo — thiết bị chữ ký của giao diện.
 *
 * Một dải mực mảnh chạy ngang, mang đúng ba thông tin cần thiết: khối chevron
 * đánh dấu loại hành trình, địa danh, và số ngày. Nó thay thế cụm 5 badge
 * chồng lên ảnh card ở bản cũ (điểm đến + loại tour + giảm giá + số ngày + sao).
 *
 * Màu khối chevron lấy từ hệ thống biển báo thật, xem src/utils/signs.js.
 *
 * @param {'signal'|'tide'|'heritage'} [props.tone]  Ghi đè màu; mặc định suy ra từ loaiTour
 * @param {string} [props.loaiTour]   Mã loại tour để tự chọn màu biển báo
 * @param {string} [props.mark]       Chữ nằm trong khối màu, cạnh chevron. Đây là
 *                                    chỗ đặt địa danh: khối màu là thứ mắt bắt
 *                                    được trước, nên nó phải mang thông tin
 *                                    quan trọng nhất, không phải nhãn loại tour.
 * @param {string} props.place        Dòng chữ trên nền mực, ví dụ loại hành trình
 * @param {string} [props.meta]       Nhãn phải, ví dụ "4N3Đ"
 * @param {'sm'|'md'} [props.size]
 */
export default function SignBar({
  tone,
  loaiTour,
  mark,
  place,
  meta,
  size = 'md',
  className = '',
}) {
  const sign = signOf(loaiTour);
  // `tone` cho phép ép màu ngoài hệ loại tour (vd thanh biển ở hero dùng vàng).
  const fill =
    {
      signal: 'bg-signal-400 text-ink-950',
      tide: 'bg-tide-500 text-white',
      heritage: 'bg-heritage-500 text-white',
      ink: 'bg-ink-600 text-white',
      guide: 'bg-guide-500 text-white',
    }[tone] || sign.fillCls;

  const isSm = size === 'sm';

  /**
   * Cỡ nhỏ dùng cho thẻ tour, nơi bề ngang chỉ khoảng 300px.
   *
   * `.label-sign` giãn cách 0.14em — ở 12px là gần 1.7px mỗi ký tự, cộng lại
   * hơn 35px cho cả ba nhãn. Thẻ hẹp không đủ chỗ nên phải thắt giãn cách lại,
   * nếu không nhãn loại tour bị cắt còn "TRẢI N…".
   */
  const labelCls = isSm ? 'label-sign text-[11px] tracking-[0.05em]' : 'label-sign';

  return (
    <div
      className={`sign-bar flex items-stretch ${
        isSm ? 'h-8' : 'h-[38px]'
      } ${className}`}
    >
      {/* Khối chevron — mỗi loại hành trình một màu biển báo. */}
      <div
        className={`flex shrink-0 items-center justify-center gap-[3px] px-3 ${fill}`}
      >
        <Chevrons width={isSm ? 20 : 24} height={isSm ? 10 : 11} />
        {/* Chặn trần để địa danh dài không đẩy các ô còn lại ra ngoài thẻ. */}
        {mark ? (
          <span className={`${labelCls} max-w-[7.5rem] truncate`}>{mark}</span>
        ) : null}
      </div>

      {/* Phần chạy trên nền mực. Co giãn và cắt trước tiên khi thiếu chỗ. */}
      {place ? (
        <div className="flex min-w-0 flex-1 items-center px-3">
          <span className={`${labelCls} truncate text-white`}>{place}</span>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Số ngày / quãng đường. */}
      {meta ? (
        <div className="flex shrink-0 items-center border-l border-white/15 px-3">
          <span className={`${labelCls} tnum text-ink-300`}>{meta}</span>
        </div>
      ) : null}
    </div>
  );
}
