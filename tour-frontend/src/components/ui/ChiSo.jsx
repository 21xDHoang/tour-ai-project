/**
 * Dải chỉ số — thay cho các ô <Statistic> rời rạc ở phần nhân viên.
 *
 * Bản cũ xếp 4–7 thẻ AntD riêng lẻ thành hai hàng, mỗi thẻ một bóng, một viền,
 * một khoảng đệm. Trên màn Kế toán, bảy thẻ đó chiếm gần hai màn hình phía trên
 * bảng — thứ nhân viên cần nhất lại nằm dưới cùng.
 *
 * Ở đây cả dải là MỘT tấm panel, các ô ngăn nhau bằng đường kẻ mảnh. Nhờ vậy
 * cùng lượng số liệu chỉ chiếm một dải cao khoảng 90px, và mắt đọc ngang một
 * lần là hết thay vì phải nhảy giữa các khối rời.
 *
 * Kỹ thuật: nền dải là màu đường kẻ, mỗi ô phủ nền trắng, khe 1px giữa các ô
 * chính là đường kẻ. Cách này tự đúng ở mọi số cột và mọi lúc xuống dòng —
 * không cần chia ô đầu/cuối hàng như cách dùng `divide-x`.
 */

/**
 * Một ô số liệu.
 *
 * @param {string} props.nhan   Tên chỉ số, in theo giọng nhãn biển báo
 * @param {node}   props.giaTri Số liệu — đã định dạng sẵn ở nơi gọi
 * @param {string} [props.donVi] Đơn vị nhỏ đi kèm số (₫, đơn, %)
 * @param {node}   [props.phu]   Dòng giải thích dưới số
 * @param {boolean} [props.manh] Ô chính của dải: nền mực, chữ trắng
 */
export function ChiSo({ nhan, giaTri, donVi, phu, manh = false }) {
  return (
    <div className={`flex flex-col justify-between gap-2 p-4 ${manh ? 'bg-ink-950' : 'bg-white'}`}>
      <div className={`label-sign ${manh ? 'text-ink-400' : 'text-ink-600'}`}>{nhan}</div>

      <div className="flex items-baseline gap-1">
        <span
          className={`tnum font-display text-[26px] font-extrabold leading-none tracking-tight ${
            manh ? 'text-white' : 'text-ink-950'
          }`}
        >
          {giaTri}
        </span>
        {donVi ? (
          <span
            className={`font-display text-[13px] font-bold ${manh ? 'text-ink-300' : 'text-ink-500'}`}
          >
            {donVi}
          </span>
        ) : null}
      </div>

      {phu ? (
        <div className={`text-[12px] leading-snug ${manh ? 'text-ink-300' : 'text-ink-600'}`}>
          {phu}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Lớp lưới dùng chung cho dải thật và dải khung xương — hai cái phải trùng khít
 * thì lúc dữ liệu về con số mới không nhảy chỗ.
 *
 * @param {number} cot Số cột ở màn rộng. Màn hẹp luôn xếp chồng 1 cột vì số
 *   liệu tiền mà bóp vào nửa màn hình là không đọc được.
 */
function luoi(cot) {
  const cotLop =
    {
      3: 'sm:grid-cols-3',
      4: 'sm:grid-cols-2 lg:grid-cols-4',
      5: 'sm:grid-cols-2 lg:grid-cols-5',
    }[cot] || 'sm:grid-cols-2';

  return `grid grid-cols-1 gap-px overflow-hidden rounded-card border border-ink-200 bg-ink-200 ${cotLop}`;
}

/** Dải bọc các ô chỉ số. */
export default function ChiSoRail({ cot = 3, children, className = '' }) {
  return <div className={`${luoi(cot)} ${className}`}>{children}</div>;
}

/**
 * Dải chỉ số đang tải — giữ đúng hình dạng và chiều cao của dải thật.
 *
 * Bảng điều khiển nào cũng mở ra là gọi API, và nếu để nguyên dải trống thì
 * người dùng đọc được một hàng số 0 trong lúc chờ. Số 0 đó là một lời khẳng
 * định sai ("hôm nay không có doanh thu") chứ không phải một trạng thái chờ.
 */
export function KhungChiSo({ cot = 3, so = cot, className = '' }) {
  return (
    <div className={`${luoi(cot)} ${className}`}>
      {Array.from({ length: so }).map((_, i) => (
        <div key={i} className="flex min-h-[94px] flex-col justify-between gap-2 bg-white p-4">
          <div className="skeleton h-3 w-2/3" />
          <div className="skeleton h-6 w-3/5" />
        </div>
      ))}
    </div>
  );
}
