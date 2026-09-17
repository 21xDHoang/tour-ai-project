/**
 * Một khối nội dung trong trang: tiêu đề, số đếm, hành động, rồi nội dung.
 *
 * Thay cho `<Card title={...} extra={...}>`. Card của AntD mang sẵn phần đệm
 * trong riêng, cộng thêm đệm của khối cha — hai thẻ nằm cạnh nhau trên bảng
 * điều khiển vì thế mà thấp hơn hẳn dải chỉ số ngay phía trên chúng, dù cùng
 * một trang. Ở đây tiêu đề chỉ là một dòng chữ ngang hàng với số đếm, không
 * khung, không đệm.
 *
 * Số đếm đứng BÊN CẠNH tiêu đề chứ không nằm trong một viên màu: nó là bối
 * cảnh ("còn 24 đơn nữa"), không phải một chỉ số cần nổi. Viên màu để dành cho
 * trạng thái — thứ cần phân biệt bằng mắt trong một hàng dài.
 *
 * @param {node}    props.tieuDe   Tiêu đề khối
 * @param {string}  [props.dem]    Số đếm in mờ cạnh tiêu đề
 * @param {node}    [props.hanhDong] Một hành động duy nhất ở mép phải
 */
export default function Khoi({ tieuDe, dem, hanhDong, children, className = '' }) {
  return (
    <section className={`min-w-0 ${className}`}>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h2 className="font-display text-title text-ink-950">{tieuDe}</h2>
          {dem ? <span className="tnum shrink-0 text-body-s text-ink-600">{dem}</span> : null}
        </div>
        {hanhDong ? <div className="shrink-0">{hanhDong}</div> : null}
      </div>

      {children}
    </section>
  );
}

/**
 * Khung xương cho một khối biểu đồ — giữ đúng chiều cao để trang không nhảy
 * khi dữ liệu về.
 */
export function KhungBieuDo({ cao = 300, className = '' }) {
  return (
    <div
      className={`skeleton rounded-card ${className}`}
      style={{ height: cao }}
      aria-hidden="true"
    />
  );
}
