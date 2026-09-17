/**
 * Thanh lọc — một dải điều khiển duy nhất nằm trên bảng dữ liệu.
 *
 * Bản cũ có bốn kiểu thanh lọc khác nhau, và chỗ nào cũng nhồi chung bộ lọc với
 * số tổng vào một hàng `flex flex-wrap`: hai ô chọn, ba con số tiền và một nút
 * xuất Excel chen nhau, không có nhãn nào ngoài chữ gợi ý trong ô.
 *
 * Hai thứ được sửa ở đây:
 *   1. Bộ lọc và số liệu tách sang hai khe. Số liệu là thứ ĐỌC, bộ lọc là thứ
 *      BẤM — trộn chúng vào một hàng thì mắt phải phân loại lại từ đầu mỗi lần.
 *   2. Mỗi ô lọc có nhãn thật nằm trên. Chữ gợi ý trong ô biến mất ngay khi
 *      chọn giá trị, để lại một ô chữ số không nói lên điều gì.
 */

/**
 * Một ô lọc: nhãn cố định bên trên, điều khiển bên dưới.
 *
 * @param {string} props.nhan Nhãn — luôn hiện, kể cả khi đã chọn giá trị
 */
export function OLoc({ nhan, children, width = 180 }) {
  return (
    <div className="shrink-0" style={{ width }}>
      <div className="label-sign mb-1.5 text-ink-600">{nhan}</div>
      {children}
    </div>
  );
}

/**
 * @param {node}    props.children Các ô lọc, thường là vài <OLoc>
 * @param {node}    [props.right]  Khe phải: số tổng, nút xuất tệp
 * @param {boolean} [props.sticky] Ghim dưới thanh tiêu đề khi cuộn bảng dài
 */
export default function ThanhLoc({ children, right, sticky = false, className = '' }) {
  return (
    <div
      className={`flex flex-wrap items-end gap-x-3 gap-y-2.5 rounded-card border border-ink-200 bg-white px-3.5 py-3 ${
        sticky ? 'sticky top-16 z-30' : ''
      } ${className}`}
    >
      {children}
      {right ? <div className="ml-auto flex flex-wrap items-center gap-3">{right}</div> : null}
    </div>
  );
}
